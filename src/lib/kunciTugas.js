/**
 * kunciTugas.js — SATU cara mencocokkan baris `completed_tasks` di
 * DailyChecklist, dipakai frontend dan backend.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Kunci ini menentukan baris mana di `completed_tasks` yang dianggap "tugas
 * yang sama". Ia dipakai untuk tiga hal yang semuanya penting:
 *
 *   · `onMaintenanceDone` (backend) memutuskan apakah tugas sudah tercatat,
 *     supaya satu pekerjaan tidak masuk dua kali ke poin yang diklaim;
 *   · `syncPhotoToChecklist` menempelkan foto bukti ke baris yang benar;
 *   · `poinKeChecklist` menuliskan poin Inisiatif yang baru dinilai.
 *
 * Sampai 7 Oktober 2026 kunci yang sama ditulis TIGA kali: di
 * `src/lib/photoVerification.js`, di `src/lib/syncPhotoToChecklist.js`, dan di
 * `base44/functions/onMaintenanceDone/entry.ts`. Ketiganya identik hari ini,
 * dan di situlah bahayanya — bila satu digeser, yang terjadi bukan galat:
 * pencarian barisnya gagal, penulisan dilewati dengan diam, dan fotonya atau
 * poinnya tidak pernah sampai. Semua jalur itu sudah menangani "baris tidak
 * ditemukan" sebagai keadaan normal, karena automasinya memang bisa belum
 * selesai.
 *
 * ── Kenapa kandang kosong dan placeholder dianggap sama ─────────────────────
 *
 * Kolom `notes` pada baris checklist dipakai dua arti: nama kandang ("W1",
 * "Baby 2") untuk tugas berkandang, dan penanda jenis untuk yang tidak
 * berkandang ("Tugas Harian", "Suplemen", "Inisiatif"). Penanda jenis bukan
 * kandang, jadi ia dinormalkan menjadi kosong — kalau tidak, satu tugas tanpa
 * kandang yang penandanya berubah dari "Tugas Tambahan" menjadi "Inisiatif"
 * akan terbaca sebagai dua tugas berbeda.
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

export default kunciTugas;
