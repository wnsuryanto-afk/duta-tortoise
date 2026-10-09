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

/**
 * Penanda yang HARUS ikut ketika satu catatan menurunkan catatan lain.
 *
 * ── Satu centang, dua catatan, dua jawaban berbeda ──────────────────────────
 *
 * Pada 5 Oktober 2026 pukul 19.30 pemilik mencentang "Kalibrasi sendok takar
 * Duta Repro" di layar kiper. Dua catatan lahir dari satu centang itu:
 *
 *   MaintenanceLog   is_test_data: true,  excluded_from_reports: true   ✓
 *   DailyChecklist   is_test_data: false, excluded_from_reports: false  ✗
 *
 * Yang pertama benar: `TugasHariIni` tahu checklist milik pemilik selalu data
 * uji — dia memakai layar kiper untuk mencoba aplikasinya, bukan untuk bekerja
 * di kandang. Yang kedua dibuat `onMaintenanceDone` DARI catatan pertama itu,
 * dan membuangnya.
 *
 * Yang tidak bertanda justru yang dipakai: ia masuk antrean Approval Poin, ikut
 * hitungan KPI, ikut slip gaji, dan ikut hitungan milestone poin. Dan di antrean
 * itu ia tidak bisa dihapus dari sana oleh pemiliknya sendiri — "checklist milik
 * sendiri harus disetujui orang lain" — jadi lencana "1 menunggu" menyala terus
 * tanpa ada yang bisa mematikannya.
 *
 * Aturannya satu kalimat: catatan turunan mewarisi kenyataan catatan sumbernya.
 * Tidak ada keputusan baru di sini; yang ada hanya penolakan untuk melupakan
 * keputusan yang sudah diambil di hulu.
 */
export function tandaLaporan(sumber: CatatanLaporan | null | undefined) {
  return {
    is_test_data: sumber?.is_test_data === true,
    excluded_from_reports: sumber?.excluded_from_reports === true,
  };
}
