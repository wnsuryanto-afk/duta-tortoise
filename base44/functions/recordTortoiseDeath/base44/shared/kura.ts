/**
 * Satu definisi "kura ini masih ada" dan "clutch ini masih berjalan" — backend.
 *
 * Kembarannya di frontend: src/lib/populasiKura.js dan src/lib/breedingUtils.js.
 * Deno tidak bisa mengimpor src/, jadi aturannya ditulis dua kali; kalau salah
 * satu diubah, ubah keduanya.
 *
 * ── Kenapa clutchAktif() ada ──
 *
 * Sebuah clutch yang telurnya sedang dierami bisa berstatus "bertelur" ATAU
 * "inkubasi" — keduanya berarti telurnya masih ada dan belum ketahuan hasilnya.
 * Enam layar di aplikasi memakai pasangan itu. Empat fungsi backend memakai
 * "inkubasi" saja:
 *
 *   pengingatInkubator    → pengingat catat suhu tidak pernah muncul
 *   kelolaTaskKondisional → task inkubator tidak pernah dinyalakan
 *   kepalaFeederDigital   → laporan pagi tidak menyebut telurnya
 *   autoNotifications     → notifikasi terkait telur tidak terbit
 *
 * Ini bukan selisih teoretis. Per 30 Agustus 2026 satu-satunya clutch yang
 * sedang dierami (C23 x A40, 22 telur, 12 Agustus) berstatus "bertelur" —
 * jadi keempat fungsi itu diam pada satu-satunya clutch yang perlu diurus,
 * termasuk fungsi yang dibuat khusus untuk membangunkan pencatatan inkubator.
 */

/** Status yang berarti kura sudah tidak ada lagi di peternakan. */
export const STATUS_KELUAR = ["mati", "terjual", "diarsipkan"];

/**
 * Apakah kura ini masih ada di peternakan dan masih perlu diurus?
 *
 * Didefinisikan lewat PENGECUALIAN, bukan daftar status yang boleh ikut:
 * status baru yang ditambahkan ke skema kelak otomatis terhitung sebagai masih
 * ada, bukan diam-diam hilang dari setiap hitungan.
 */
export function diPeternakan(t: any): boolean {
  if (!t) return false;
  if (t.is_archived) return false;
  return !STATUS_KELUAR.includes(t.status);
}

/** Status clutch yang berarti telurnya masih ada dan belum ketahuan hasilnya. */
export const STATUS_CLUTCH_AKTIF = ["bertelur", "inkubasi"];

/** Apakah clutch ini masih berjalan? */
export function clutchAktif(b: any): boolean {
  if (!b) return false;
  if (b.is_archived) return false;
  return STATUS_CLUTCH_AKTIF.includes(b.status);
}

/** Jumlah telur yang sedang dierami dari sekumpulan clutch. */
export function telurSedangDierami(breedings: any[] = []): number {
  return (breedings || [])
    .filter(clutchAktif)
    .reduce((s: number, b: any) => s + (Number(b.egg_count) || 0), 0);
}
