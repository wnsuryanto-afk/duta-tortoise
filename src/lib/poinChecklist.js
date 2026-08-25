/**
 * poinChecklist.js — SUMBER TUNGGAL perhitungan poin sebuah DailyChecklist.
 *
 * Sebelumnya lima layar penggajian masing-masing menulis ulang rumus
 *
 *     c.approved_points || c.total_points_claimed || <jumlah completed_tasks>
 *
 * dan rumus itu punya lubang: `||` menganggap angka 0 sebagai "kosong".
 * Ketika owner menyetujui sebuah checklist tetapi menurunkan poinnya menjadi
 * 0 — dengan membuka centang semua task atau mengetik 0 di kolom poin manual —
 * SOPApproval menyimpan approved_points: 0, lalu rumus di atas jatuh ke
 * total_points_claimed dan membayar penuh jumlah yang baru saja ditolak.
 * Keputusan owner tidak berpengaruh sama sekali.
 *
 * Fungsi ini menutup lubang tersebut dengan membedakan "nol" dari "belum
 * pernah diisi", dan menjadikan aturannya satu tempat saja.
 */

/** Jumlah poin yang diklaim keeper, dari total tersimpan atau dihitung ulang. */
function poinDiklaim(checklist) {
  const tersimpan = Number(checklist.total_points_claimed);
  if (Number.isFinite(tersimpan)) return tersimpan;
  const tasks = checklist.completed_tasks;
  if (!Array.isArray(tasks)) return 0;
  return tasks.reduce((jumlah, t) => jumlah + (Number(t?.points) || 0), 0);
}

/**
 * Poin sebuah checklist untuk keperluan penggajian dan rekap.
 *
 * @param {object|null|undefined} checklist
 * @param {object} [opsi]
 * @param {boolean} [opsi.hitungBelumDitinjau=false]
 *   Apakah checklist berstatus "submitted" (sudah dikirim, belum ditinjau
 *   owner) ikut dihitung memakai poin klaim keeper. Sengaja dijadikan
 *   parameter eksplisit karena ini keputusan kebijakan, bukan teknis:
 *   slip mingguan hanya menghitung yang sudah disetujui, sedangkan rekap
 *   bulanan selama ini ikut menghitung yang belum ditinjau. Setiap pemanggil
 *   menyatakan pilihannya sendiri agar perbedaannya terlihat dan mudah
 *   diseragamkan bila nanti diputuskan.
 * @returns {number} poin, tidak pernah negatif atau NaN
 */
export function poinChecklist(checklist, { hitungBelumDitinjau = false } = {}) {
  if (!checklist || typeof checklist !== "object") return 0;

  // Ditolak tidak pernah menghasilkan poin, apa pun isi field lainnya.
  if (checklist.status === "rejected") return 0;

  if (checklist.status === "approved") {
    const disetujui = Number(checklist.approved_points);
    // Angka apa pun dipakai apa adanya, termasuk 0 — itu keputusan owner.
    if (Number.isFinite(disetujui)) return Math.max(0, disetujui);
    // Hanya bila field-nya memang tidak pernah diisi (data lama, dari sebelum
    // approved_points ada) barulah jatuh ke poin klaim.
    return Math.max(0, poinDiklaim(checklist));
  }

  // Status "submitted" atau kosong: belum ditinjau owner.
  if (!hitungBelumDitinjau) return 0;
  return Math.max(0, poinDiklaim(checklist));
}

/** Menjumlahkan poin sekumpulan checklist dengan aturan yang sama. */
export function totalPoinChecklist(daftar, opsi) {
  if (!Array.isArray(daftar)) return 0;
  return daftar.reduce((jumlah, c) => jumlah + poinChecklist(c, opsi), 0);
}
