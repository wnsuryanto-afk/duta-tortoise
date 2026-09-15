/**
 * profilUser.js — satu cara memilih profil seseorang.
 *
 * UserProfile menyimpan 29 baris untuk 10 orang (15-09-2026). Sembilan belas
 * di antaranya bernama "[DUPLIKAT-HAPUS]" — pembersihan lama yang mengganti
 * NAMANYA tapi tidak pernah menghapus barisnya. Baris-baris itu masih membawa
 * email dan nomor rekening asli, jadi tetap ikut terjaring setiap kali sebuah
 * layar mencari profil menurut email.
 *
 * Dan dua orang punya dua profil yang sama-sama sah:
 *
 *   Ali Santoso Mulyanata  31 Mei  NIK + BCA 2320434214 + HP 081359810879
 *                           4 Jun  kosong, hp "-", is_complete false  ← lebih baru
 *   Diana Susantio         24 Mei  NIK + BCA 2320330222 + HP 083129432777
 *                           4 Jun  kosong, hp "-", is_complete false  ← lebih baru
 *
 * Yang lebih baru justru yang kosong. Jadi "ambil yang terbaru" salah, dan
 * "ambil yang pertama" juga salah — urutannya tidak dijamin.
 *
 * upsertUserProfile.js sudah memilih dengan benar sejak lama (buang tanda
 * hapus, utamakan is_complete). Tapi aturan itu hanya ada di sana, sementara
 * halaman Gaji Bulanan, Detail Karyawan, dan dua layar kelengkapan data
 * masing-masing memakai `.find()` biasa. Halaman gaji yang memilih profil
 * kosong berarti slip tanpa nomor rekening.
 */

export const TANDA_HAPUS = "[DUPLIKAT-HAPUS]";

/** Baris nisan dari pembersihan lama — bukan profil siapa pun lagi. */
export function bukanTandaHapus(p) {
  return !!p && p.full_name !== TANDA_HAPUS;
}

/** Buang semua baris nisan dari sekumpulan profil. */
export function profilAktif(daftar = []) {
  return (daftar || []).filter(bukanTandaHapus);
}

/**
 * Profil terbaik untuk satu orang.
 *
 * Urutan pilihan sengaja sama dengan upsertUserProfile():
 *   1. bukan baris nisan
 *   2. is_complete === true
 *   3. kalau tetap seri, yang paling akhir diubah
 *
 * @param {Array} daftar semua UserProfile yang sudah diambil
 * @param {{email?: string, userId?: string}} orang
 * @returns {object|null}
 */
export function profilUntuk(daftar = [], orang = {}) {
  const { email, userId } = orang;
  if (!email && !userId) return null;
  const cocok = profilAktif(daftar).filter((p) =>
    (email && p.user_email === email) || (userId && p.user_id === userId),
  );
  if (cocok.length === 0) return null;
  if (cocok.length === 1) return cocok[0];
  const lengkap = cocok.filter((p) => p.is_complete === true);
  const kandidat = lengkap.length > 0 ? lengkap : cocok;
  return [...kandidat].sort((a, b) =>
    String(b.updated_date || b.created_date || "").localeCompare(
      String(a.updated_date || a.created_date || ""),
    ),
  )[0];
}
