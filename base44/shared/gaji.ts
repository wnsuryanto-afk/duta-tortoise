/**
 * gaji.ts — kembaran backend untuk tetapan gaji di src/lib/hitungGaji.js.
 *
 * Isinya SATU angka, dan satu angka itu sudah pernah menimbulkan cacat
 * yang tidak menimbulkan error sama sekali.
 *
 * "Rp 100.000 per periode" berarti per MINGGU selama gaji dibayar
 * mingguan, dan per BULAN sejak 30-09-2026. Satuannya berubah arti,
 * nilainya tidak — jadi pelunasan kasbon melambat empat kali lipat
 * tanpa ada yang melihatnya.
 *
 * Saat angkanya dikoreksi jadi Rp 400.000, ia ternyata tersalin di
 * SEPULUH tempat. Sembilan di frontend; yang kesepuluh di sini, di
 * jalur yang justru benar-benar memotong — otomatisasi onSalarySlipPaid
 * yang menulis deduction_log saat slip ditandai dibayar. Kalau yang
 * kesepuluh terlewat, layar akan menjanjikan Rp 400.000 sementara
 * server memotong Rp 100.000, dan tidak ada satu pun error.
 *
 * Nilainya WAJIB sama persis dengan POTONGAN_KASBON_BAWAAN di
 * src/lib/hitungGaji.js. scripts/cek-gaji.mjs memeriksanya, dan menolak keduanya
 * kalau berselisih.
 */

/** Potongan kasbon bawaan per BULAN bila kasbon tidak menentukan sendiri. */
export const POTONGAN_KASBON_BAWAAN = 400000;
