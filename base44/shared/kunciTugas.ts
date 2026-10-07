/**
 * Satu cara mencocokkan baris `completed_tasks` — sisi backend.
 *
 * Kembarannya di frontend ada di src/lib/kunciTugas.js. Deno tidak bisa
 * mengimpor src/, jadi aturannya ditulis dua kali; kalau salah satu diubah,
 * ubah keduanya. Penjaga scripts/cek-kembar.mjs memeriksanya.
 *
 * Kunci ini menentukan baris mana yang dianggap "tugas yang sama". Bila kedua
 * sisi bergeser, yang terjadi bukan galat: `onMaintenanceDone` menganggap
 * tugasnya belum tercatat dan menambahkannya lagi (poin yang diklaim membengkak),
 * sementara penulis di sisi frontend tidak menemukan barisnya dan melewati
 * penulisan dengan diam — fotonya atau poinnya tidak pernah sampai.
 *
 * Kolom `notes` dipakai dua arti: nama kandang ("W1", "Baby 2") untuk tugas
 * berkandang, dan penanda jenis ("Tugas Harian", "Suplemen", "Inisiatif") untuk
 * yang tidak berkandang. Penanda jenis bukan kandang, jadi ia dinormalkan
 * menjadi kosong.
 */

/** Penanda jenis yang BUKAN nama kandang. */
export const PENANDA_BUKAN_KANDANG = new Set([
  "",
  "tugas harian",
  "suplemen",
  "tugas_harian",
]);

/** Nama kandang yang dinormalkan; penanda jenis menjadi kosong. */
export function normalKandang(kandang) {
  const v = (kandang || "").toString().trim().toLowerCase();
  return PENANDA_BUKAN_KANDANG.has(v) ? "" : v;
}

/** Judul tugas yang dinormalkan. */
export function normalJudul(judul) {
  return (judul || "").toString().trim().toLowerCase();
}

/** Kunci "tugas yang sama" untuk satu baris completed_tasks. */
export function kunciTugas(judul, kandang) {
  return `${normalJudul(judul)}__${normalKandang(kandang)}`;
}

/** Posisi baris yang cocok di dalam daftar, atau -1. */
export function cariTugas(daftar, judul, kandang) {
  const kunci = kunciTugas(judul, kandang);
  return (daftar || []).findIndex((t) => kunciTugas(t?.task_title, t?.notes) === kunci);
}
