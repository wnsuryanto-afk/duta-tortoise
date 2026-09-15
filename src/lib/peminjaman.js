/**
 * peminjaman.js — satu daftar peminjaman, satu cara menyegarkannya.
 *
 * ToolLoan adalah satu-satunya tabel peminjaman sejak 15-09-2026 (ItemBorrow
 * ditandai usang). Tapi ia dibaca dari empat tempat dengan empat kunci cache
 * berbeda: halaman Alat Kerja memecahnya jadi aktif/dikembalikan, widget
 * dashboard memakai kunci aktif, dialog pengembalian memakai kunci per-pemakai,
 * dan tab Peminjaman di halaman Stok memuat semuanya sekaligus.
 *
 * Kalau tiap layar hanya menyegarkan kuncinya sendiri, meminjam dari satu
 * layar meninggalkan layar lain menampilkan keadaan lama — persis jenis
 * ketidaksesuaian yang membuat dua tabel terpisah dulu terasa "wajar".
 */
export const KUNCI_PEMINJAMAN = [
  ["tool-loans"],
  ["tool-loans-active"],
  ["tool-loans-returned"],
  ["my-active-loans"],
];

/** Segarkan setiap layar yang menampilkan peminjaman, dari mana pun perubahannya. */
export function segarkanPeminjaman(qc) {
  if (!qc) return;
  for (const queryKey of KUNCI_PEMINJAMAN) {
    qc.invalidateQueries({ queryKey });
  }
}
