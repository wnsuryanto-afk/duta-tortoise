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
 * Status clutch yang berarti masih BERJALAN.
 *
 * Disalin dari lib/breedingUtils.STATUS_CLUTCH_AKTIF alih-alih diimpor:
 * breedingUtils mengimpor dari berkas ini, dan saling-impor membuat salah
 * satunya menerima `undefined` saat bundel dimuat. Nilainya dijaga tetap sama
 * oleh cek-ronda.mjs.
 */
const STATUS_MASIH_BERJALAN = ["bertelur", "inkubasi"];

/**
 * Apakah clutch ini sudah punya hasil yang bisa dihitung?
 *
 * Statusnya didahulukan; `hatched_count` dipakai sebagai jaring pengaman untuk
 * data lama yang tetasannya tercatat tapi statusnya tertinggal.
 *
 * ── Kenapa clutch yang MASIH BERJALAN dikecualikan dari jaring itu ───────
 *
 * EggGrid menulis `hatched_count` setiap kali SATU telur ditandai menetas,
 * tanpa mengubah status clutch-nya. Penetasan kura berlangsung berhari-hari,
 * jadi clutch berstatus "inkubasi" dengan 5 dari 28 telur sudah menetas
 * adalah keadaan yang normal — bukan clutch yang statusnya tertinggal.
 *
 * Jaring pengaman lama menganggapnya SUDAH SELESAI: 28 telurnya masuk
 * penyebut sementara 23 di antaranya masih punya kesempatan menetas, dan
 * tingkat keberhasilan kebun terbaca 18% pada hari-hari paling produktifnya.
 * Itu cacat yang sama dengan kartu "tingkat penetasan" yang baru dibereskan,
 * hanya bersembunyi satu lapis lebih dalam.
 *
 * Penetasan pertama diperkirakan 31 Okt 2026 — sesudah itu keadaan ini tidak
 * lagi teoretis.
 */
export function adaHasil(breeding) {
  if (!breeding) return false;
  if (STATUS_ADA_HASIL.includes(breeding.status)) return true;
  if (STATUS_MASIH_BERJALAN.includes(breeding.status)) return false;
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
 * Ringkasan hatch rate dari BARIS TELUR, bukan dari angka ringkas clutch.
 *
 * `hatchRate()` di atas menyaring per CLUTCH: clutch yang belum ada hasilnya
 * dikeluarkan seluruhnya. Fungsi ini menyaring per TELUR: telur yang masih
 * "belum_dicek" dikeluarkan dari penyebut, meskipun clutch-nya sudah ditutup.
 *
 * Bedanya baru terlihat pada clutch yang ditutup sementara sebagian telurnya
 * belum sempat diperiksa. `hatchRate()` menghitung telur itu sebagai gagal;
 * fungsi ini tidak menghitungnya sama sekali. Untuk data Duta Tortoise saat
 * ini keduanya menghasilkan angka yang sama persis (49/72 = 68,1%) karena
 * setiap clutch yang selesai sudah diperiksa seluruh telurnya.
 *
 * Aturan ini dulu ditulis DUA KALI di BreedingStatsSection — sekali untuk grafik
 * bulanan, sekali untuk ringkasan tahunan — dengan jalur cadangan yang berbeda
 * di antara keduanya.
 *
 * @returns {{ dicek: number, menetas: number, persen: number }}
 */
export function ringkasTelurDicek(breedings = []) {
  let dicek = 0;
  let menetas = 0;
  for (const b of breedings || []) {
    for (const e of b?.egg_records || []) {
      if (e?.status === "belum_dicek") continue;
      dicek += 1;
      if (e?.status === "menetas") menetas += 1;
    }
  }
  // Jalur cadangan untuk clutch lama yang tidak punya baris per telur sama
  // sekali: pakai angka ringkasnya, dan hanya dari clutch yang sudah ada
  // hasilnya — sama dengan aturan hatchRate() di atas.
  if (dicek === 0) {
    const selesai = (breedings || []).filter(adaHasil);
    dicek = selesai.reduce((s, c) => s + (Number(c.egg_count) || 0), 0);
    menetas = selesai.reduce((s, c) => s + (Number(c.hatched_count) || 0), 0);
  }
  return { dicek, menetas, persen: dicek > 0 ? (menetas / dicek) * 100 : 0 };
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

/**
 * Hitung ulang angka ringkas sebuah clutch dari baris per telurnya.
 *
 * Yang paling sering salah adalah `fertile_count`. Telur berstatus "gagal"
 * adalah telur yang SUDAH terbukti fertil saat candling lalu mati di dalam
 * cangkang — ia tetap telur fertil. EggGrid menyimpannya sebagai
 * `menetas + fertile`, tanpa `gagal`, padahal berkas yang sama sudah menulis
 * aturan yang benar untuk lencana di layar:
 *
 *     // fertile TOTAL = fertile_only + menetas + gagal
 *
 * Jadi layar menampilkan "Fertile: 22" sementara yang tersimpan 20. Untuk
 * clutch C14 x A29 (16 Maret 2026) selisih itu nyata: 20 menetas + 2 gagal =
 * 22 telur fertil dari 23, hanya 1 yang infertil. Tersimpan 20.
 *
 * Bukan sekadar angka yang meleset. Fertilitas mengukur PEJANTAN; daya tetas
 * mengukur INKUBATOR. Menyamakan `fertile_count` dengan `hatched_count`
 * membuat telur yang mati karena suhu inkubator terbaca sebagai kegagalan
 * pejantan — dan Ranking Indukan, halaman yang dipakai memutuskan indukan mana
 * yang dipertahankan, menjumlahkan persis angka itu.
 *
 * @param {Array} records baris egg_records
 * @returns {{hatched_count, failed_count, fertile_count, infertile_count, belum_dicek}}
 */
export function ringkasDariBarisTelur(records = []) {
  const baris = Array.isArray(records) ? records : [];
  const n = (s) => baris.filter((e) => e?.status === s).length;
  const menetas = n("menetas");
  const gagal = n("gagal");
  const fertilSaja = n("fertile");
  return {
    hatched_count: menetas,
    failed_count: gagal,
    // menetas dan gagal adalah anak dari fertil, bukan saudaranya.
    fertile_count: menetas + gagal + fertilSaja,
    infertile_count: n("infertil"),
    belum_dicek: n("belum_dicek"),
  };
}

/**
 * Berapa telur FERTIL pada satu clutch — satu jawaban, bukan dua.
 *
 * Telur yang menetas jelas fertil. Telur yang mati di dalam cangkang juga
 * fertil: ia terbukti dibuahi saat candling lalu gagal berkembang. Yang
 * berstatus "fertile" di baris telur hanyalah yang MASIH berjalan — belum
 * menetas, belum gagal.
 *
 * Menghitung fertil sebagai `status === "fertile"` saja karena itu
 * mengembalikan NOL untuk clutch yang seluruh telurnya sudah menetas. Untuk
 * C14 x A29 (16 Mar 2026) jawabannya 0, padahal 22 dari 23 telurnya fertil.
 *
 * Bedanya bukan sekadar angka. Fertilitas mengukur PEJANTAN, daya tetas
 * mengukur INKUBATOR — laporan bulanan yang menyebut fertilitas nol akan
 * menuding pejantan untuk kegagalan yang bukan miliknya.
 *
 * Baris per telur didahulukan; `fertile_count` yang tersimpan dipakai untuk
 * clutch lama yang tidak punya baris sama sekali.
 */
export function fertilClutch(clutch) {
  const baris = clutch?.egg_records;
  if (Array.isArray(baris) && baris.length > 0) {
    return ringkasDariBarisTelur(baris).fertile_count;
  }
  return Number(clutch?.fertile_count) || 0;
}
