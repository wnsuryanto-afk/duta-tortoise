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
  // Perbandingan `!== true`, bukan `!nilai`. Keduanya sama untuk boolean, tapi
  // berbeda begitu kolomnya berisi hal lain: `!"false"` bernilai false, jadi
  // catatan bertanda string "false" akan DIKELUARKAN dari laporan padahal
  // maksudnya sebaliknya. Bentuk ini sama persis dengan kembarannya di
  // base44/shared/laporan.ts — dua sisi harus menjawab sama untuk baris yang
  // sama, kalau tidak laporan di layar dan ringkasan WhatsApp berbeda isi.
  return !!rec && rec.excluded_from_reports !== true && rec.is_test_data !== true;
}

/** Saring sekumpulan catatan ke yang boleh masuk laporan. */
export function hanyaLaporan(records = []) {
  return records.filter(masukLaporan);
}

/**
 * Penanda yang HARUS ikut ketika satu catatan menurunkan catatan lain.
 *
 * Kembarannya di base44/shared/laporan.ts; di sanalah kejadian 5 Oktober 2026
 * diceritakan lengkap. Singkatnya: satu centang pemilik melahirkan
 * MaintenanceLog bertanda data uji DAN DailyChecklist tanpa tanda, karena yang
 * kedua dibuat dari yang pertama lalu membuang tandanya.
 *
 * Catatan turunan mewarisi kenyataan catatan sumbernya.
 */
export function tandaLaporan(sumber) {
  return {
    is_test_data: sumber?.is_test_data === true,
    excluded_from_reports: sumber?.excluded_from_reports === true,
  };
}

/**
 * Akun yang checklist-nya SELALU data uji, berapa pun Mode Uji disetel.
 *
 * Pemilik memakai layar kiper untuk mencoba aplikasinya, bukan untuk bekerja di
 * kandang. Tanpa aturan ini percobaannya terhitung sebagai poin, kehadiran, dan
 * beban kerja tim — dan masuk antrean Approval Poin, tempat ia tidak bisa
 * dikeluarkan oleh dirinya sendiri karena checklist milik sendiri harus
 * disetujui orang lain.
 */
export const AKUN_SELALU_UJI = ["wnsuryanto@gmail.com"];

/**
 * Penanda untuk DailyChecklist yang BARU dibuat.
 *
 * ── Kenapa ini ada, bukan ditulis ulang di tiap pintu ───────────────────────
 *
 * Ada TIGA pintu yang membuat DailyChecklist, dan sampai 9 Oktober 2026
 * ketiganya menjawab berbeda tentang pertanyaan yang sama:
 *
 *   TugasHariIni        Mode Uji + aturan akun pemilik   ✓ lengkap
 *   GuidedHariIni       Mode Uji saja                    ✗ aturan akun hilang
 *   claimIncidentalTask tidak sama sekali                ✗ keduanya hilang
 *   onMaintenanceDone   tidak sama sekali                ✗ (sisi backend;
 *                       sekarang mewarisi dari lognya lewat tandaLaporan)
 *
 * Pintu mana yang dipakai ditentukan oleh tombol mana yang ditekan kiper, bukan
 * oleh kenyataan pekerjaannya. Jadi kenyataan catatannya ditentukan oleh tombol.
 */
export function tandaChecklistBaru({ email, modeUji = false } = {}) {
  const akun = String(email || "").trim().toLowerCase();
  if (modeUji || AKUN_SELALU_UJI.includes(akun)) {
    return { is_test_data: true, excluded_from_reports: true };
  }
  return {};
}
