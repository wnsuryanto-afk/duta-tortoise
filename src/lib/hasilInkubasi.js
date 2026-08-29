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

/**
 * Jumlah telur sebuah clutch — SATU jawaban untuk pertanyaan yang selama ini
 * dijawab dua kali dengan angka berbeda.
 *
 * Sebuah clutch menyimpan jumlah telurnya di dua tempat: `egg_count` yang
 * diketik pengguna, dan `egg_records` yang berisi satu baris per telur beserta
 * statusnya. Keduanya bisa berselisih, dan aplikasi ini sudah tahu: EggGrid
 * menampilkan lencana "Data telur perlu dicek ulang" saat keduanya beda.
 *
 * Selisihnya lahir di formulir clutch. `egg_records` hanya dibuat bila masih
 * kosong, jadi mengubah `egg_count` pada clutch yang sudah ada tidak pernah
 * ikut mengubah barisnya. Isi 10 telur, lalu koreksi jadi 12, dan barisnya
 * tetap 10 selamanya.
 *
 * Yang dipakai adalah jumlah BARIS bila barisnya ada. Alasannya: status
 * "menetas" melekat pada baris, bukan pada `egg_count`. Membagi jumlah telur
 * menetas dengan angka yang bukan asal-usulnya menghasilkan persentase yang
 * tidak merujuk apa pun — bisa di atas 100% bila `egg_count` dikoreksi ke
 * bawah.
 */
export function jumlahTelurClutch(clutch) {
  const baris = clutch?.egg_records;
  if (Array.isArray(baris) && baris.length > 0) return baris.length;
  return Number(clutch?.egg_count) || 0;
}

/**
 * Persentase keberhasilan satu clutch.
 *
 * Dua tombol menutup sebuah clutch — "Selesaikan Inkubasi" di EggGrid dan
 * dialog penetasan — dan keduanya dulu menghitung dengan penyebut yang
 * berbeda: EggGrid memakai jumlah baris, dialog penetasan memakai `egg_count`.
 * Untuk clutch yang kedua angkanya berselisih, hasil yang tersimpan karena itu
 * bergantung pada tombol mana yang ditekan.
 */
export function hatchRateClutch(clutch, menetas) {
  const telur = jumlahTelurClutch(clutch);
  const jadi = Number(
    menetas !== undefined ? menetas : clutch?.hatched_count
  ) || 0;
  return telur > 0 ? Math.round((jadi / telur) * 100) : 0;
}

/**
 * Selaraskan `egg_records` dengan `egg_count` yang baru.
 *
 * Menambah telur berarti menambahkan baris "belum_dicek" di belakang.
 * Mengurangi telur hanya boleh membuang baris yang BELUM dicek — baris yang
 * sudah punya hasil adalah catatan telur yang benar-benar ada, dan
 * membuangnya menghapus kejadian yang sudah tercatat. Bila pengurangan tidak
 * bisa dipenuhi tanpa mengorbankan baris berhasil, barisnya dibiarkan lebih
 * banyak dan lencana peringatan di EggGrid tetap muncul.
 */
export function selaraskanEggRecords(eggRecords, eggCount) {
  const baris = Array.isArray(eggRecords) ? [...eggRecords] : [];
  const target = Number(eggCount) || 0;
  if (target === baris.length) return baris;

  if (target > baris.length) {
    for (let i = baris.length; i < target; i += 1) {
      baris.push({
        egg_number: i + 1,
        status: "belum_dicek",
        check_date: null,
        hatch_date: null,
        notes: "",
      });
    }
    return baris;
  }

  // Buang dari belakang, hanya yang belum dicek.
  const hasil = [...baris];
  while (hasil.length > target) {
    const terakhir = hasil[hasil.length - 1];
    if (terakhir?.status && terakhir.status !== "belum_dicek") break;
    hasil.pop();
  }
  return hasil.map((b, i) => ({ ...b, egg_number: i + 1 }));
}
