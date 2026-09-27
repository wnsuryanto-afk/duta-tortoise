/**
 * poinChecklist.js — SATU jawaban untuk "berapa poin checklist ini?".
 *
 * Sebelum berkas ini ada, pertanyaan itu dijawab di sembilan tempat dengan
 * empat aturan berbeda, dan dua di antaranya salah dengan cara yang menghabiskan
 * uang.
 *
 * ── Cacat 1: klaim yang BELUM DISETUJUI ikut dibayar ─────────────────────────
 *
 * Layar gaji bulanan, hitungGaji, BonusBulanIni, dan Poin & Bonus Tim semuanya
 * menyaring dengan `status !== "rejected"` — yang berarti checklist berstatus
 * `submitted` ikut masuk. Untuk checklist begitu `approved_points` masih 0
 * (nilai bawaannya), dan rumusnya:
 *
 *     c.approved_points || c.total_points_claimed
 *
 * membuat `0 || 197` jatuh ke 197. Jadi klaim yang belum diperiksa siapa pun
 * dihitung PENUH.
 *
 * Ini bukan kemungkinan teoretis. Pemilik memangkas klaim dengan tangan, sering
 * dan dalam:
 *     4 Agu 2026  Angsolo      369 diklaim → 145 disetujui
 *     2 Agu 2026  Angsolo      427 diklaim → 203 disetujui
 *    26 Jul 2026  Sholehuddin  628 diklaim → 270 disetujui
 *    10 Jul 2026  Angsolo      140 diklaim →  10 disetujui
 *
 * Pada 30 Agustus 2026 checklist Angsolo berisi 197 poin dan belum disetujui.
 * Dengan nilai Rp 75/poin, layar-layar di atas menampilkan Rp 14.775 yang belum
 * tentu ada. Pada hari seperti 26 Juli selisihnya mencapai 358 poin — Rp 26.850
 * dalam satu hari. Yang paling merugikan bukan angkanya, melainkan urutannya:
 * angka itu MUNCUL dulu di layar karyawan, lalu menyusut setelah diperiksa.
 *
 * ── Cacat 2: menyetujui NOL poin membayar klaim penuh ────────────────────────
 *
 * `0 || total_points_claimed` juga berarti bahwa checklist yang sudah diperiksa
 * dan diputuskan bernilai nol poin — pemilik membuka semua centangnya lalu
 * menekan Setujui — tetap dibayar sebesar klaim aslinya. Belum pernah terjadi di
 * data (yang bernilai nol semuanya berstatus `rejected`), tetapi jaraknya hanya
 * satu klik, dan pemangkasan memang rutin dilakukan.
 *
 * Karena itu di sini `approved_points` diperiksa sebagai ANGKA, bukan dengan
 * `||`. Nol yang berasal dari keputusan manusia harus tetap nol.
 *
 * ── Kenapa tidak sekadar mengganti `||` jadi `??` ────────────────────────────
 *
 * Karena catatan lama boleh jadi tidak punya `approved_points` sama sekali, dan
 * untuk mereka jatuh ke klaim memang jawaban yang benar. Yang perlu dibedakan
 * adalah "nol karena diputuskan" dari "kosong karena belum ada kolomnya" —
 * dan itu tidak bisa dilakukan oleh satu operator pun.
 */

/** Jumlah poin dari daftar tugas, dipakai bila kedua ringkasannya kosong. */
function poinDariTugas(c) {
  const tugas = Array.isArray(c?.completed_tasks) ? c.completed_tasks : [];
  return tugas.reduce((t, x) => t + Number(x?.points || 0), 0);
}

/** Poin yang DIKLAIM checklist ini, terlepas dari sudah diperiksa atau belum. */
export function poinDiklaim(c) {
  if (!c) return 0;
  const ringkas = Number(c.total_points_claimed || 0);
  return ringkas > 0 ? ringkas : poinDariTugas(c);
}

/**
 * Poin yang SUDAH MENJADI HAK — satu-satunya angka yang boleh menjadi rupiah.
 *
 * Hanya checklist yang disetujui yang menghasilkan poin. Yang masih menunggu
 * belum menghasilkan apa pun; pakai `poinMenunggu` bila ingin menyebutnya
 * terpisah di layar.
 */
export function poinDisetujui(c) {
  if (!c || c.status !== "approved") return 0;
  if (typeof c.approved_points === "number") return c.approved_points;
  return poinDiklaim(c);
}

/** Poin yang sudah diklaim tetapi belum diperiksa siapa pun. */
export function poinMenunggu(c) {
  if (!c || c.status !== "submitted") return 0;
  return poinDiklaim(c);
}

/** Apakah catatan ini boleh ikut dihitung? (bukan data uji, tidak dikecualikan) */
function terhitung(c) {
  return !!c && !c.is_test_data && !c.excluded_from_reports;
}

/**
 * Ringkasan poin sekumpulan checklist: yang sudah jadi hak, dan yang masih
 * menggantung. Layar yang menampilkan uang memakai `disetujui`; `menunggu` ada
 * supaya bisa disebut apa adanya alih-alih menghilang tanpa penjelasan.
 */
export function ringkasPoin(checklists = []) {
  let disetujui = 0;
  let menunggu = 0;
  let jumlahMenunggu = 0;
  for (const c of checklists || []) {
    if (!terhitung(c)) continue;
    disetujui += poinDisetujui(c);
    const m = poinMenunggu(c);
    if (m > 0) {
      menunggu += m;
      jumlahMenunggu++;
    }
  }
  return { disetujui, menunggu, jumlahMenunggu };
}

/**
 * Bila satu orang punya lebih dari satu checklist pada tanggal yang sama,
 * inilah yang dipakai: yang sudah diputuskan lebih dulu, lalu yang paling awal
 * dibuat.
 *
 * `daftar[0]` — yang dipakai di tiga tempat sebelum ini — menyerahkan pilihannya
 * pada urutan sekehendak basis data, jadi dua jalur yang membaca tanggal yang
 * sama bisa menempel pada baris yang berbeda. Checklist hari itu dibuat oleh
 * tiga jalur (tab Checklist SOP, Tugas Hari Ini, dan klaim tugas insidentil),
 * jadi baris kembar bukan hal yang mustahil: pada 30 Mei 2026 satu orang punya
 * empat baris untuk satu hari.
 */
export function checklistSah(daftar = []) {
  const hidup = (daftar || []).filter(Boolean);
  if (hidup.length === 0) return null;
  const urutanStatus = { approved: 0, rejected: 1, submitted: 2, draft: 3 };
  return hidup.slice().sort((a, b) => {
    const sa = urutanStatus[a.status] ?? 9;
    const sb = urutanStatus[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    return String(a.created_date || "").localeCompare(String(b.created_date || ""));
  })[0];
}
