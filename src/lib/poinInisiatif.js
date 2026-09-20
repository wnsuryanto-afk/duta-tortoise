/**
 * poinInisiatif.js — SATU aturan penilaian tugas Inisiatif.
 *
 * ── Apa yang terjadi selama ini ─────────────────────────────────────────────
 *
 * Keeper bisa mencatat pekerjaan di luar SOP lewat tombol "Tambah Pekerjaan".
 * Sejak 23 Juni sampai 20 September 2026 mereka memakainya **234 kali**.
 *
 * Seluruh 234 catatan itu: `poin_earned: 0`, `approval_status: "pending"`,
 * `approved_by: null`. Tidak satu pun pernah dinilai.
 *
 * Isinya bukan pekerjaan sepele. Di antaranya: "Nambal kolam azola",
 * "Nguras kolam", "Nambal tempat minum yg bocor w1w2 e5", "Bersihkan pepaya
 * rubuh", "Mindah kura ketempat smula", "Bantu bersihkan tanah di polybag".
 * Semuanya berfoto.
 *
 * Penyebabnya dua, dan keduanya di kode:
 *
 *   1. `ExtraTaskForm` menulis `poin_earned: 0` secara harfiah saat membuat
 *      catatan. Nol itu bukan hasil penilaian — itu nilai awal yang tidak
 *      pernah diganti.
 *   2. Tombol penilaiannya ada, tetapi hanya muncul pada `showTeamView` —
 *      layar tim yang jarang dibuka — dan tidak ada satu pun pengingat bahwa
 *      ada yang menunggu dinilai.
 *
 * Akibatnya sederhana: orang yang berinisiatif mendapat nol, setiap kali,
 * selama tiga bulan. Itu bukan kelalaian penilaian, itu ketiadaan penilaian.
 *
 * ── Aturan di sini ──────────────────────────────────────────────────────────
 *
 * Pilihan poin dan batas harian diambil dari CompanySettings, bukan ditulis
 * mati, supaya bisa diubah lewat MCP tanpa membangun ulang aplikasi.
 *
 * Batas harian berlaku pada YANG MENERIMA, bukan pada yang menilai. Penilai
 * tetap boleh menilai tugas berikutnya — tugasnya tetap tercatat dinilai dan
 * catatannya tetap tersimpan — tetapi poin di atas batas tidak ditambahkan,
 * dan layar mengatakannya apa adanya alih-alih diam-diam memotong.
 */

/** Pilihan poin bawaan bila pengaturan belum menyimpannya. */
export const OPSI_POIN_BAWAAN = [0, 5, 10, 15];

/** Batas poin Inisiatif per orang per hari, bawaan. */
export const MAKS_HARIAN_BAWAAN = 30;

/** Pilihan poin dari pengaturan, disaring ke angka yang masuk akal. */
export function opsiPoin(settings) {
  const dari = settings?.poin_tambahan_opsi;
  if (!Array.isArray(dari)) return OPSI_POIN_BAWAAN;
  const bersih = dari
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  return bersih.length > 0 ? bersih : OPSI_POIN_BAWAAN;
}

/** Batas harian dari pengaturan. Nol dihormati — artinya Inisiatif tidak berpoin. */
export function maksHarian(settings) {
  const n = Number(settings?.poin_tambahan_maks_harian);
  return Number.isFinite(n) && n >= 0 ? n : MAKS_HARIAN_BAWAAN;
}

/** Apakah catatan ini tugas Inisiatif yang masih menunggu dinilai? */
export function menungguPenilaian(log) {
  if (!log?.is_extra) return false;
  return !log.approval_status || log.approval_status === "pending";
}

/** Apakah catatan ini sudah dinilai (termasuk dinilai nol)? */
export function sudahDinilai(log) {
  return !!log?.is_extra && ["approved", "rejected"].includes(log.approval_status);
}

/**
 * Poin Inisiatif yang SUDAH diterima orang ini pada tanggal ini.
 *
 * Hanya menghitung yang sudah dinilai. Yang masih menunggu belum menjadi poin
 * siapa pun, jadi ia tidak boleh ikut memakan kuota.
 */
export function poinTerpakaiHari(logs = [], email, tanggal, { kecualikanId } = {}) {
  if (!email || !tanggal) return 0;
  return (logs || [])
    .filter((l) => l?.is_extra && sudahDinilai(l))
    .filter((l) => !l.excluded_from_reports && !l.is_test_data)
    .filter((l) => l.done_by_email === email && l.period_key === tanggal)
    .filter((l) => (kecualikanId ? l.id !== kecualikanId : true))
    .reduce((t, l) => t + Number(l.poin_earned || 0), 0);
}

/**
 * Berapa poin yang benar-benar bisa diberikan, setelah batas harian.
 *
 * Mengembalikan `{ diberikan, diminta, sisaKuota, terpotong, pesan }`.
 * `terpotong` true berarti penilai memilih lebih besar dari sisa kuota —
 * dan `pesan` menjelaskannya, karena memotong diam-diam adalah kesalahan
 * yang sama dengan memotong poin checklist tanpa alasan.
 */
export function hitungPemberian({ diminta, logs, email, tanggal, settings, kecualikanId }) {
  const maks = maksHarian(settings);
  const terpakai = poinTerpakaiHari(logs, email, tanggal, { kecualikanId });
  const sisaKuota = Math.max(0, maks - terpakai);
  const mintaBersih = Math.max(0, Number(diminta) || 0);
  const diberikan = Math.min(mintaBersih, sisaKuota);
  const terpotong = diberikan < mintaBersih;

  let pesan = "";
  if (terpotong && sisaKuota === 0) {
    pesan = `Batas ${maks} poin Inisiatif per hari sudah terpakai — tugas ini tetap tercatat dinilai, tetapi poinnya nol.`;
  } else if (terpotong) {
    pesan = `Sisa kuota hari ini ${sisaKuota} poin dari batas ${maks}, jadi yang diberikan ${diberikan}, bukan ${mintaBersih}.`;
  }

  return { diberikan, diminta: mintaBersih, sisaKuota, terpotong, maks, terpakai, pesan };
}

/** Tugas Inisiatif yang menunggu dinilai, terbaru dulu. */
export function inisiatifMenunggu(logs = [], { email } = {}) {
  return (logs || [])
    .filter(menungguPenilaian)
    .filter((l) => !l.excluded_from_reports && !l.is_test_data)
    .filter((l) => (email ? l.done_by_email === email : true))
    .sort((a, b) => String(b.period_key || "").localeCompare(String(a.period_key || "")));
}
