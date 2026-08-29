/**
 * hasilInkubasi.js — kapan sebuah clutch dianggap sudah ada hasilnya.
 *
 * Ada DUA cara menutup satu clutch, dan keduanya berakhir di status yang
 * berbeda:
 *
 *   - Dialog "Catat Hasil Menetas"  → status "menetas"
 *   - Tombol "Selesaikan Inkubasi"  → status "selesai"
 *
 * Ranking Indukan hanya menghitung yang berstatus "menetas". Akibatnya setiap
 * clutch yang ditutup lewat tombol "Selesaikan Inkubasi" tidak pernah masuk
 * hitungan: telurnya tidak dihitung, tetasannya tidak dihitung, dan hatch rate
 * pasangan itu jatuh ke 0% — padahal telurnya menetas. Halaman itu justru yang
 * dipakai memutuskan indukan mana yang dipertahankan, jadi angka yang salah di
 * sana berujung pada indukan bagus yang dilepas.
 *
 * Keduanya sama-sama berarti "hasilnya sudah dicatat", jadi keduanya dihitung.
 */

/** Status clutch yang berarti hasilnya sudah dicatat dan boleh dihitung. */
export const STATUS_ADA_HASIL = ["menetas", "selesai", "gagal"];

/**
 * Apakah clutch ini sudah punya hasil yang bisa dihitung?
 *
 * Statusnya didahulukan; `hatched_count` dipakai sebagai jaring pengaman untuk
 * data lama yang tetasannya tercatat tapi statusnya tertinggal.
 */
export function adaHasil(breeding) {
  if (!breeding) return false;
  if (STATUS_ADA_HASIL.includes(breeding.status)) return true;
  return Number(breeding.hatched_count) > 0;
}

/**
 * Hatch rate sekumpulan clutch, dalam persen.
 *
 * Hanya clutch yang sudah ada hasilnya yang masuk penyebut — clutch yang masih
 * dierami belum gagal, dan memasukkannya akan menekan angka pasangan yang
 * kebetulan sedang banyak mengerami.
 */
export function hatchRate(breedings = []) {
  const selesai = breedings.filter(adaHasil);
  const telur = selesai.reduce((s, c) => s + (Number(c.egg_count) || 0), 0);
  const menetas = selesai.reduce((s, c) => s + (Number(c.hatched_count) || 0), 0);
  return telur > 0 ? (menetas / telur) * 100 : 0;
}

/**
 * Ringkasan produksi sekumpulan clutch — dipakai ketiga tabel Ranking Indukan
 * (per pasangan, per pejantan, per induk betina) supaya ketiganya tidak lagi
 * menghitung dengan rumusnya masing-masing.
 */
export function ringkasProduksi(clutches = []) {
  const selesai = clutches.filter(adaHasil);
  const telurSelesai = selesai.reduce((s, c) => s + (Number(c.egg_count) || 0), 0);
  const totalTelur = clutches.reduce((s, c) => s + (Number(c.egg_count) || 0), 0);
  return {
    totalClutch: clutches.length,
    /** Seluruh telur yang pernah tercatat, termasuk yang masih dierami. */
    totalTelur,
    /**
     * Telur yang BENAR-BENAR jadi penyebut hatchRate — hanya dari clutch yang
     * sudah ada hasilnya. Dibuka supaya layar bisa menuliskan pecahannya utuh;
     * menampilkan `totalMenetas` di sebelah `totalTelur` beserta hatchRate
     * menghasilkan tiga angka yang tidak mungkin semuanya benar sekaligus.
     */
    telurAdaHasil: telurSelesai,
    totalMenetas: selesai.reduce((s, c) => s + (Number(c.hatched_count) || 0), 0),
    /** Telur yang masih dierami — selisih kedua angka telur di atas. */
    telurMasihDierami: totalTelur - telurSelesai,
    clutchAdaHasil: selesai.length,
    hatchRate: hatchRate(clutches),
  };
}
