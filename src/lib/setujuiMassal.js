import { base44 } from "@/api/base44Client";
import { logActivity } from "@/lib/logActivity";
import { bolehMenyetujui } from "@/lib/persetujuanPoin";
import { poinDiklaim } from "@/lib/poinChecklist";

/**
 * setujuiMassal.js — SATU cara menyetujui banyak checklist sekaligus.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Sebelum ini ada DUA tombol "Setujui semua" di aplikasi, ditulis terpisah,
 * dan keduanya berbeda dalam hal yang penting:
 *
 *   KeputusanHariIni        per-baris try/catch (bagus), tetapi tidak
 *                           mencatat approved_at maupun approved_by_email,
 *                           dan tidak memeriksa hak menyetujui sama sekali.
 *
 *   KepalaFeederDashboard   perulangan TANPA try/catch. Satu kegagalan di
 *                           tengah melempar keluar, `setApproveAllLoading(false)`
 *                           tidak pernah dijalankan, dan tombolnya berputar
 *                           selamanya — sementara sebagian checklist sudah
 *                           disetujui tanpa ada yang tahu yang mana. Juga
 *                           melewati aturan "checklist kepala_feeder hanya
 *                           untuk manajer/owner", padahal yang menekannya
 *                           justru kepala_feeder.
 *
 * Poin menjadi UANG: total_poin di slip gaji diambil dari approved_points.
 * Dua jalur massal yang boleh berbeda berarti dua definisi "disetujui" yang
 * menghasilkan angka upah berbeda, dan tidak ada error yang muncul.
 *
 * ── Tiga hal yang dijamin di sini ───────────────────────────────────────────
 *
 * 1. HAK DIPERIKSA PER BARIS, bukan sekali untuk seluruh antrean. Antrean
 *    bisa memuat checklist milik penyetujunya sendiri dan milik kepala_feeder
 *    sekaligus; aturannya ada di persetujuanPoin.js dan tidak boleh dilewati
 *    hanya karena tombolnya massal.
 *
 * 2. SATU KEGAGALAN TIDAK MENGHENTIKAN SISANYA, dan yang gagal disebutkan
 *    namanya. Berhenti diam-diam di baris ke-12 dari 43 adalah bentuk
 *    kegagalan yang paling sulit ditemukan: 31 orang tidak dibayar dan
 *    layarnya tetap terlihat normal.
 *
 * 3. STEMPEL AUDIT SELALU DITULIS — approved_at dan approved_by_email, bukan
 *    hanya nama. Nama saja tidak bisa dicocokkan ke User tanpa menebak, dan
 *    audit mingguan perlu tahu persetujuan mana yang bukan milik pembukanya.
 *
 * ── Yang TIDAK dilakukan di sini ────────────────────────────────────────────
 *
 * Memotong poin. Persetujuan massal selalu menyetujui angka yang diklaim
 * penuh — memotong menuntut alasan tertulis per orang (periksaAlasanPotong),
 * dan alasan yang sama untuk 43 orang bukan alasan. Yang perlu dipotong
 * dibuka satu per satu.
 */

/**
 * Pilah antrean menjadi tiga: yang siap disetujui massal, yang DITANDAI
 * sehingga sebaiknya dibuka dulu, dan yang tidak boleh disetujui orang ini.
 *
 * Murni — tidak menyentuh jaringan — supaya layarnya bisa menampilkan
 * angkanya di pertanyaan konfirmasi sebelum apa pun ditulis.
 *
 * @param {object[]} checklists  antrean apa adanya
 * @param {object}   penilai     { email, role } yang menekan tombol
 * @param {object}   settings    CompanySettings (untuk approver_roles)
 * @param {function} tandai      (checklist) => string|null — alasan singkat
 *                               kenapa baris ini sebaiknya dilihat dulu
 * @param {function} peran       (checklist) => string — peran pemilik checklist,
 *                               karena DailyChecklist tidak menyimpannya
 */
export function pilahMassal({
  checklists = [],
  penilai,
  settings,
  tandai = () => null,
  peran = (c) => c?.employee_role || "",
} = {}) {
  const siap = [];
  const ditandai = [];
  const takBerwenang = [];

  for (const c of checklists || []) {
    if (!c || c.status !== "submitted") continue;
    const izin = bolehMenyetujui({
      penilai,
      checklist: { ...c, employee_role: peran(c) },
      settings,
    });
    if (!izin.boleh) {
      takBerwenang.push({ checklist: c, sebab: izin.sebab });
      continue;
    }
    const alasan = tandai(c);
    if (alasan) ditandai.push({ checklist: c, alasan });
    else siap.push(c);
  }

  const poin = (daftar) => daftar.reduce((s, c) => s + poinDiklaim(c), 0);
  return {
    siap,
    ditandai,
    takBerwenang,
    poinSiap: poin(siap),
    poinDitandai: poin(ditandai.map((x) => x.checklist)),
  };
}

/**
 * Setujui sebuah daftar checklist, satu per satu, pada klaim penuhnya.
 *
 * Mengembalikan `{ berhasil, gagal }` — `gagal` berisi `{ nama, pesan }` per
 * baris, bukan satu pesan gabungan: yang menekan tombol perlu tahu SIAPA yang
 * belum dibayar, bukan sekadar berapa banyak.
 *
 * @param {object[]} daftar     checklist yang sudah dipilah dan boleh disetujui
 * @param {object}   penilai    { email, full_name }
 * @param {string}   sumber     disebut di catatan aktivitas, mis. "Beranda"
 * @param {function} namaOrang  (checklist) => string
 * @param {function} onKemajuan (sudah, total) => void — untuk bilah kemajuan
 */
export async function setujuiMassal({
  daftar = [],
  penilai,
  sumber = "persetujuan massal",
  namaOrang = (c) => c?.employee_name || c?.employee_email || "—",
  onKemajuan = () => {},
} = {}) {
  const gagal = [];
  let berhasil = 0;
  const total = daftar.length;

  for (let i = 0; i < total; i++) {
    const c = daftar[i];
    const nama = namaOrang(c);
    const poin = poinDiklaim(c);
    try {
      await base44.entities.DailyChecklist.update(c.id, {
        status: "approved",
        approved_by: penilai?.full_name || penilai?.email || "",
        approved_by_email: penilai?.email || "",
        approved_at: new Date().toISOString(),
        approved_points: poin,
      });
      berhasil++;
      /*
       * Catatan aktivitas menyebut bahwa ini MASSAL dan tanpa dibuka satu
       * per satu. Tiga bulan kemudian, selisih antara poin yang diklaim dan
       * yang biasanya lolos pemeriksaan hanya bisa dijelaskan kalau tercatat
       * bahwa hari itu tidak ada yang diperiksa.
       *
       * Gagal mencatat TIDAK membatalkan persetujuannya — poinnya sudah
       * tersimpan, hanya jejaknya yang hilang, dan menghapus poin yang sudah
       * sah demi catatan adalah akibat yang lebih buruk.
       */
      try {
        await logActivity({
          action: "approve",
          entity_type: "DailyChecklist",
          entity_id: c.id,
          entity_name: `${nama} — ${c.date}`,
          changes_summary:
            `Menyetujui checklist ${nama} (${c.date}): ${poin} poin — ` +
            `${sumber}, klaim penuh tanpa dibuka satu per satu`,
        });
      } catch { /* jejaknya saja yang hilang */ }
    } catch (e) {
      gagal.push({ nama, pesan: e?.message || "gagal" });
    }
    onKemajuan(i + 1, total);
  }

  return { berhasil, gagal };
}

/** Kunci cache yang harus disegarkan setelah persetujuan massal. */
export const KUNCI_SEGARKAN = [
  "checklists-all",
  "checklists-pending-count",
  "owner-pending-approval",
  "my-checklist-today",
  "checklist-today",
  "kf-checklists",
  "kf-month-checklists",
];
