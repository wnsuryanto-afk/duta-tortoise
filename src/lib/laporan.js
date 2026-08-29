/**
 * laporan.js — SATU syarat "catatan ini boleh masuk laporan".
 *
 * Ada dua penanda untuk mengeluarkan catatan dari laporan, dan keduanya harus
 * dihormati bersamaan:
 *
 *   excluded_from_reports — dikecualikan manual oleh pemilik lewat ExcludeToggle.
 *   is_test_data          — dibuat saat "Mode Uji", ketika pemilik mencoba
 *                           aplikasi sebagai peran lain.
 *
 * Layar pemilih Mode Uji menjanjikan dengan kata-kata sendiri: data yang
 * tersimpan "ditandai is_test_data agar tidak masuk laporan/hitung poin".
 * Janji itu ditepati di lima tempat — tugas harian, poin, tren mingguan,
 * kluster penyakit, dan perhitungan HPP — tetapi TIDAK di dua puluh tempat
 * lainnya, termasuk seluruh permukaan keuangan: Laporan Keuangan, laba/rugi,
 * ekspor bulanan, dan beranda pemilik maupun investor.
 *
 * Akibatnya satu penjualan percobaan yang dibuat pemilik saat menguji aplikasi
 * masuk sebagai pemasukan sungguhan di laporan keuangan, sementara perhitungan
 * HPP yang menyaringnya dengan benar menunjukkan angka yang berbeda untuk bulan
 * yang sama.
 */

/** Apakah catatan ini boleh dihitung dalam laporan? */
export function masukLaporan(rec) {
  return !!rec && !rec.excluded_from_reports && !rec.is_test_data;
}

/** Saring sekumpulan catatan ke yang boleh masuk laporan. */
export function hanyaLaporan(records = []) {
  return records.filter(masukLaporan);
}
