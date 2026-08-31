/**
 * populasiKura.js — SATU definisi "kura ini masih ada di peternakan".
 *
 * Pertanyaan sesederhana "berapa kura yang ada" dijawab berbeda-beda di lima
 * tempat, dan setiap jawaban dipakai untuk keputusan yang berbeda:
 *
 *   ["aktif"]                                         Beranda owner, hitungan isi kandang
 *   ["aktif","baby","sakit","breeding"]                Halaman Kandang, Catatan Kematian
 *   ["aktif","baby","sakit","breeding","karantina"]    Pengaman hapus
 *
 * Selisihnya bukan soal angka yang meleset sedikit. Kura sakit yang tinggal di
 * kandang A1 tidak dihitung sebagai penghuni A1 di beranda, sehingga kandang
 * yang sudah penuh bisa terlihat lapang — persis saat pemilik memutuskan ke
 * mana kura berikutnya dipindahkan.
 *
 * Definisinya dibalik di sini: yang dipakai bukan daftar status yang DIHITUNG,
 * melainkan daftar status yang JELAS SUDAH KELUAR. Menambah status baru ke
 * skema tidak lagi diam-diam mengeluarkan kura dari seluruh hitungan populasi.
 */

/** Status yang berarti kura sudah tidak ada lagi di peternakan. */
export const STATUS_KELUAR = ["mati", "terjual", "diarsipkan"];

/**
 * Apakah kura ini masih ada di peternakan dan masih perlu diurus?
 *
 * Mencakup yang sakit, breeding, dan karantina — semuanya masih menempati
 * kandang, masih makan, dan masih perlu datanya lengkap.
 */
export function diPeternakan(kura) {
  if (!kura) return false;
  if (kura.is_archived) return false;
  return !STATUS_KELUAR.includes(kura.status);
}

/** Kura yang sehat dan berjalan normal — bukan sakit, bukan karantina. */
export function aktifSehat(kura) {
  return !!kura && !kura.is_archived && kura.status === "aktif";
}

/**
 * Kura yang sedang sakit.
 *
 * Ditulis ulang di empat layar dengan tiga bentuk berbeda: dua memakai
 * `status === "sakit" || is_currently_sick`, satu menambah `!is_archived`,
 * satu hanya membaca `is_currently_sick`. Kura yang sudah diarsipkan tetap
 * terhitung sakit di sebagian layar.
 */
export function sedangSakit(kura) {
  if (!kura || kura.is_archived) return false;
  return kura.status === "sakit" || kura.is_currently_sick === true;
}

/** Seluruh kura yang masih ada di peternakan. */
export function hanyaDiPeternakan(tortoises = []) {
  return tortoises.filter(diPeternakan);
}
