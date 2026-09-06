/**
 * Satu syarat "catatan ini boleh masuk laporan" — sisi backend.
 *
 * Kembarannya di frontend ada di src/lib/laporan.js. Deno tidak bisa mengimpor
 * src/, jadi aturannya ditulis dua kali; kalau salah satu diubah, ubah keduanya.
 *
 * Dua penanda, dan keduanya harus dihormati bersamaan:
 *
 *   excluded_from_reports — dikecualikan manual oleh pemilik. Dipasang lewat
 *                           ExcludeToggle, DAN otomatis saat sebuah penjualan
 *                           dibatalkan (SalesList → "[DIBATALKAN]").
 *   is_test_data          — dibuat saat Mode Uji, ketika pemilik mencoba
 *                           aplikasi sebagai peran lain.
 *
 * Memeriksa hanya salah satunya bukan setengah benar, melainkan salah pada
 * separuh kasus. Penjualan yang dibatalkan hanya membawa excluded_from_reports;
 * catatan Mode Uji hanya membawa is_test_data. Fungsi yang memeriksa satu
 * penanda saja akan tetap menghitung yang lain sebagai uang sungguhan.
 */

export type CatatanLaporan = {
  is_test_data?: boolean;
  excluded_from_reports?: boolean;
};

/** Apakah catatan ini boleh dihitung dalam laporan? */
export function masukLaporan(rec: CatatanLaporan | null | undefined): boolean {
  return !!rec && rec.excluded_from_reports !== true && rec.is_test_data !== true;
}

/** Saring sekumpulan catatan ke yang boleh masuk laporan. */
export function hanyaLaporan<T extends CatatanLaporan>(records: T[] = []): T[] {
  return (records || []).filter(masukLaporan);
}
