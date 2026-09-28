/**
 * password.js — satu aturan untuk kata sandi baru.
 *
 * Dipisahkan dari layarnya supaya bisa diuji, dan supaya kalau nanti ada
 * tempat kedua yang mengganti kata sandi (mis. admin menyetel ulang milik
 * orang lain), aturannya tidak lahir dua kali dengan angka yang berbeda.
 */

/** Panjang minimum. Dinyatakan di satu tempat supaya pesannya tidak pernah berselisih dengan pemeriksaannya. */
export const MIN_PANJANG = 8;

/**
 * Apa yang masih salah dengan isian kata sandi baru?
 *
 * @returns {string|null} kalimat masalahnya, atau null bila sudah boleh dikirim.
 */
export function periksaPasswordBaru({ lama = "", baru = "", ulang = "" } = {}) {
  if (!lama) return "Isi kata sandi Anda sekarang.";
  if (!baru) return "Isi kata sandi barunya.";
  if (baru.length < MIN_PANJANG) return `Kata sandi baru minimal ${MIN_PANJANG} karakter.`;
  if (baru === lama) return "Kata sandi baru masih sama dengan yang sekarang.";
  if (!ulang) return "Ulangi kata sandi barunya.";
  if (baru !== ulang) return "Ulangan kata sandi belum sama.";
  return null;
}
