/**
 * kategoriBarang.js — satu definisi "barang ini aset atau biaya".
 *
 * Aturan ini menentukan apakah sebuah pembelian muncul di laba rugi atau tidak.
 * Sebelumnya ia hidup sebagai satu baris di tengah alur penerimaan:
 *
 *     if (it.kategori !== "alat_kerja") totalBiaya += ...
 *
 * Ditulis terbalik seperti itu, aturannya berbunyi "semua yang bukan alat kerja
 * adalah biaya" — dan karena SELURUH perlengkapan medis peternakan ini
 * berkategori alat_kerja (jarum, spuit, kasa, alkohol semuanya ber-SKU ALT),
 * belanja habis pakai ikut diperlakukan sebagai aset. Jarum suntik seharga
 * Rp 975 tercatat sebagai harta perusahaan dan tidak pernah muncul sebagai
 * biaya. Sekitar Rp 85.000 belanja Agustus 2026 hilang dari laba rugi dengan
 * cara ini sebelum ketahuan.
 *
 * Sekarang aturannya ditulis maju: yang jadi aset HANYA barang tahan lama.
 * Barang habis pakai punya kategorinya sendiri, `habis_pakai`, supaya tidak
 * perlu menumpang di alat kerja ataupun tenggelam di "lainnya".
 *
 * Catatan SKU: barang yang dipindah ke `habis_pakai` TETAP memakai awalan ALT
 * pada SKU lamanya. Label QR-nya sudah tercetak dan tertempel di rak; mengganti
 * kode berarti label fisiknya berbohong.
 */

/** Kategori barang gudang yang dicatat sebagai ASET, bukan biaya. */
export const KATEGORI_ASET = ["alat_kerja", "peralatan"];

/** True bila pembelian kategori ini tidak boleh masuk laba rugi. */
export function dicatatSebagaiAset(kategori) {
  return KATEGORI_ASET.includes(String(kategori || ""));
}

/** Kebalikannya, ditulis eksplisit supaya terbaca di tempat pemakaian. */
export function masukBiaya(kategori) {
  return !dicatatSebagaiAset(kategori);
}

/** Kategori yang boleh dipilih saat mencatat pembelian. */
export const KATEGORI_PEMBELIAN = [
  "obat",
  "vitamin",
  "habis_pakai",
  "alat_kerja",
  "pakan",
  "lainnya",
];

/** Kategori pembelian → kategori FinanceTransaction. */
export const KATEGORI_FINANCE = {
  obat: "obat_perawatan",
  vitamin: "vitamin_suplemen",
  habis_pakai: "obat_perawatan",
  pakan: "pakan",
  lainnya: "operasional",
};
