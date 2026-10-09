/**
 * jendelaSurut.js — jendela pembayaran surut Inisiatif, sisi layar.
 *
 * Kembaran angka ini ada di `base44/shared/bayarSurut.ts` (JENDELA), dan di
 * sanalah alasannya ditulis lengkap: 28 Juli hari `||` menjadi `??`, 6 Oktober
 * hari terakhir sebelum layar penilaian berfungsi.
 *
 * Deno tidak bisa mengimpor `src/`, jadi angkanya memang ditulis dua kali —
 * tetapi penjaga cek-ronda MEMBANDINGKAN keduanya saat berjalan, bukan sekadar
 * mempercayai komentar ini. Kalau yang satu digeser dan yang lain tidak, kartu
 * di layar akan menghitung catatan yang berbeda dari yang dibayar fungsinya,
 * dan ia akan terus menawarkan pekerjaan yang sudah selesai — atau diam padahal
 * masih ada yang tertinggal.
 */
export const JENDELA_SURUT = { dari: "2026-07-28", sampai: "2026-10-06" };
