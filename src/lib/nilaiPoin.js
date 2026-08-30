/**
 * nilaiPoin.js - SATU DEFINISI berapa rupiah nilai satu poin.
 *
 * Angka ini disimpan di DUA tempat, dan ketiga jalur yang memakainya sempat
 * mendahulukan tempat yang berbeda:
 *
 *   - hitungGaji.js (slip mingguan manual)  : SalaryConfig.point_value menang
 *   - siapkanSlipMingguan (A5, otomatis)    : CompanySettings.nilai_per_poin menang
 *   - BonusBulanIni (layar kiper)           : CompanySettings.nilai_per_poin saja
 *
 * Pada 30 Agustus 2026 kedua tempat itu berisi angka yang BERBEDA:
 * CompanySettings.nilai_per_poin = 75, SalaryConfig.point_value = 50. Artinya
 * kiper melihat poinnya bernilai Rp 75 di ponselnya, sementara slip gajinya
 * dihitung Rp 50. Untuk 3.329 poin sebulan, selisihnya Rp 83.225 - untuk satu
 * orang, satu bulan.
 *
 * Yang berbahaya bukan angka mana yang benar, melainkan bahwa keduanya hidup
 * berdampingan tanpa ada yang bertabrakan secara kasat mata. Kiper hanya tahu
 * gajinya "kurang dari yang dijanjikan aplikasi", dan tidak ada satu pun layar
 * yang bisa menjelaskan kenapa.
 *
 * Urutannya sekarang: CompanySettings lebih dulu.
 *
 * Alasannya bukan karena angkanya lebih besar, melainkan karena itulah yang
 * DILIHAT KIPER dan yang disunting pemilik di halaman Pengaturan Poin. Nilai
 * yang dijanjikan di layar adalah janji; slip harus mengikutinya, bukan
 * sebaliknya. SalaryConfig.point_value tetap dipakai sebagai cadangan untuk
 * peran yang punya tarif khusus dan bila pengaturan umum belum diisi.
 */

/** Nilai rupiah satu poin untuk satu peran. */
export function nilaiPerPoin(settings, config) {
  const umum = Number(settings?.nilai_per_poin) || 0;
  if (umum > 0) return umum;
  const peran = Number(config?.point_value) || 0;
  if (peran > 0) return peran;
  return 0;
}

/**
 * Apakah kedua sumber berisi angka berbeda? Dipakai untuk memperingatkan
 * pemilik, bukan untuk memilih diam-diam. Selisih yang tidak diberitahukan
 * akan ditemukan oleh kiper di slip gajinya - tempat paling buruk untuk
 * menemukannya.
 */
export function nilaiPoinBentrok(settings, config) {
  const umum = Number(settings?.nilai_per_poin) || 0;
  const peran = Number(config?.point_value) || 0;
  if (umum <= 0 || peran <= 0) return null;
  if (umum === peran) return null;
  return { umum, peran, dipakai: umum };
}
