/**
 * suratPeringatan.js — SATU definisi "surat peringatan ini masih berlaku".
 *
 * Sebelum berkas ini ada, dua layar menjawabnya dengan cara yang berbeda:
 *
 *   - Detail Karyawan menghitung masa berlakunya dari tanggal surat: aktif
 *     selama belum lewat 6 bulan. Ini yang benar, dan ini pula yang ditulis
 *     di keterangan field `is_active` pada skemanya.
 *   - Beranda Owner menyaring `w.status === "aktif" || !w.status`. Field
 *     `status` tidak ada di skema WarningLetter, jadi `w.status` selalu
 *     undefined dan `!w.status` selalu benar: SETIAP surat peringatan yang
 *     pernah terbit terhitung masih aktif, selamanya. Karyawan yang ditegur
 *     dua tahun lalu tetap dihitung, dan angkanya tidak pernah bisa turun.
 *
 * Field `is_active` sendiri tidak bisa dipakai sendirian: tidak ada satu pun
 * tempat di aplikasi ini — formulir HR maupun fungsi backend — yang pernah
 * menulisnya. Nilainya selalu `true` bawaan skema, jadi menyaring dengan
 * `is_active !== false` sama saja dengan tidak menyaring apa pun.
 *
 * Karena itu masa berlaku dihitung dari tanggalnya (yang selalu terisi dan
 * mengurus dirinya sendiri seiring waktu), sementara `is_active: false` tetap
 * dihormati sebagai pencabutan lebih awal bila kelak ada layar yang menulisnya.
 */

/** Berapa lama sebuah surat peringatan berlaku, dalam bulan. */
export const MASA_BERLAKU_BULAN = 6;

/**
 * Apakah surat peringatan ini masih berlaku pada tanggal tertentu?
 *
 * Surat tanpa tanggal tidak dianggap berlaku — masa berlakunya tidak bisa
 * dihitung, dan menganggapnya aktif berarti menahannya selamanya.
 *
 * @param {object} surat data WarningLetter
 * @param {Date} [sekarang] tanggal acuan, default hari ini
 */
export function suratMasihBerlaku(surat, sekarang = new Date()) {
  if (!surat) return false;
  // Dicabut lebih awal secara eksplisit.
  if (surat.is_active === false) return false;
  if (!surat.date) return false;
  const habis = new Date(surat.date);
  if (Number.isNaN(habis.getTime())) return false;
  habis.setMonth(habis.getMonth() + MASA_BERLAKU_BULAN);
  return habis > sekarang;
}

/** Surat-surat yang masih berlaku, dari sekumpulan surat peringatan. */
export function suratAktif(daftar = [], sekarang = new Date()) {
  return daftar.filter((s) => suratMasihBerlaku(s, sekarang));
}

/** Urutan tingkat peringatan, dari yang paling ringan. */
const URUTAN_TINGKAT = ["SP1", "SP2", "SP3"];

/**
 * Surat berlaku dengan tingkat tertinggi — itulah posisi karyawan sekarang.
 * Bila tingkatnya sama, yang paling baru yang dipakai.
 */
export function suratTertinggi(daftar = [], sekarang = new Date()) {
  return suratAktif(daftar, sekarang).reduce((teratas, s) => {
    if (!teratas) return s;
    const a = URUTAN_TINGKAT.indexOf(s.level);
    const b = URUTAN_TINGKAT.indexOf(teratas.level);
    if (a !== b) return a > b ? s : teratas;
    return (s.date || "") > (teratas.date || "") ? s : teratas;
  }, null);
}
