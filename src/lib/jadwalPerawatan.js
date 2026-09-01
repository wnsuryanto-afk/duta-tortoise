/**
 * jadwalPerawatan.js - SATU DEFINISI kapan sebuah jadwal perawatan berlaku.
 *
 * Sebelum berkas ini ada, layar kiper menyaring jadwal dengan aturan pendek:
 * tampilkan yang "harian", dan yang "mingguan" bila hari ini ada di dalam
 * weekly_days. Aturan itu diam-diam membuang SEPULUH dari empat belas jadwal:
 *
 *   - Enam jadwal mingguan punya weekly_days KOSONG. Daftar kosong tidak
 *     pernah memuat hari apa pun, jadi keenamnya tidak pernah tampil. Padahal
 *     di tugas SOP (lib/kepatuhanSOP.js) daftar kosong berarti kebalikannya:
 *     "berlaku setiap hari". Satu bentuk data, dua arti yang bertolak belakang.
 *
 *   - Empat frekuensi lain - musiman, bulanan, dua_mingguan, quarterly -
 *     tidak pernah ditangani sama sekali, jadi selalu jatuh ke "tidak".
 *
 * Yang paling mahal dari kesepuluh itu: "Boost Kalsium Betina (Musim Bertelur)"
 * dan "Cek Kloaka Betina (Tanda Mau Bertelur)", keduanya musiman. Catatan pada
 * jadwal itu sendiri berbunyi "Defisiensi kalsium saat gravid = risiko egg
 * binding" - dan B119 mati karena egg binding pada 24 Juni 2026. Pencegahannya
 * ada di aplikasi, tertulis lengkap, dan tidak pernah sampai ke tangan kiper.
 *
 * Jadwal yang menyala tetapi tidak pernah muncul lebih buruk daripada jadwal
 * yang mati: yang mati terlihat mati, yang seperti ini terlihat sudah beres.
 */

/** Hari ini dalam angka 0-6 (0 = Minggu), dari objek Date. */
function hariMinggu(d) {
  return d.getDay();
}

/**
 * Selisih hari penuh antara dua tanggal, memakai tengah malam lokal supaya
 * jam pemberian tidak menggeser hitungan.
 */
function selisihHari(dari, sampai) {
  const a = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate());
  const b = new Date(sampai.getFullYear(), sampai.getMonth(), sampai.getDate());
  return Math.round((b - a) / 86400000);
}

/**
 * Apakah jadwal ini berlaku pada tanggal tertentu?
 *
 * @param {object} jadwal   satu TreatmentSchedule
 * @param {object} keadaan  { hari, musimBertelur, racikanTersedia, mulai }
 *   - hari            Date yang diperiksa (bawaan: hari ini)
 *   - musimBertelur   apakah musim bertelur sedang dinyatakan aktif oleh pemilik
 *   - racikanTersedia apakah racikan Duta Repro sedang ada stoknya
 *   - mulai           titik hitung untuk frekuensi berinterval (bawaan: 1 Jan tahun berjalan)
 */
export function berlakuHariIni(jadwal, keadaan = {}) {
  if (!jadwal || jadwal.is_active !== true) return false;

  const hari = keadaan.hari instanceof Date ? keadaan.hari : new Date();

  // ATURAN MUNDUR RACIKAN TIDAK LAGI DI SINI.
  //
  // Aturannya sekarang ada di sesuaikanMundurRacikan() di bawah, karena ia
  // perlu MENGUBAH jadwal (mempersempit ke jantan), bukan sekadar menjawab
  // ya/tidak. jadwalBerlaku() memanggilnya lebih dulu, jadi pemakai pustaka
  // ini tidak perlu tahu bedanya. Kalau Anda memanggil berlakuHariIni()
  // langsung, jalankan sesuaikanMundurRacikan() lebih dulu.

  const f = jadwal.frequency;

  if (f === "harian") return true;

  if (f === "dua_harian") {
    const n = Number(jadwal.frequency_interval_days) || 2;
    const mulai = keadaan.mulai instanceof Date ? keadaan.mulai : new Date(hari.getFullYear(), 0, 1);
    return selisihHari(mulai, hari) % n === 0;
  }

  if (f === "mingguan") {
    const daftar = Array.isArray(jadwal.weekly_days) ? jadwal.weekly_days : [];
    // Daftar kosong = berlaku setiap hari dalam seminggu. Arti yang sama dengan
    // tugas SOP; sebelumnya di sini artinya "tidak pernah".
    return daftar.length === 0 || daftar.includes(hariMinggu(hari));
  }

  if (f === "dua_mingguan") {
    const n = Number(jadwal.frequency_interval_days) || 14;
    const mulai = keadaan.mulai instanceof Date ? keadaan.mulai : new Date(hari.getFullYear(), 0, 1);
    return selisihHari(mulai, hari) % n === 0;
  }

  if (f === "bulanan") {
    const tgl = Array.isArray(jadwal.monthly_dates) ? jadwal.monthly_dates : [];
    // Tanpa tanggal yang ditentukan, jatuh ke tanggal 1 - satu hari yang pasti,
    // bukan setiap hari. Jadwal bulanan yang muncul tiap hari akan diabaikan.
    return tgl.length === 0 ? hari.getDate() === 1 : tgl.includes(hari.getDate());
  }

  if (f === "quarterly") {
    const n = Number(jadwal.frequency_interval_days) || 90;
    const mulai = keadaan.mulai instanceof Date ? keadaan.mulai : new Date(hari.getFullYear(), 0, 1);
    return selisihHari(mulai, hari) % n === 0;
  }

  if (f === "tahunan") {
    const tgl = Array.isArray(jadwal.monthly_dates) ? jadwal.monthly_dates : [];
    return hari.getMonth() === 0 && (tgl.length === 0 ? hari.getDate() === 1 : tgl.includes(hari.getDate()));
  }

  if (f === "musiman") {
    // Musim bertelur tidak dihitung dari kalender.
    //
    // Yang menentukan bukan bulan, melainkan tanda di lapangan - betina mulai
    // gelisah, menggali, mencari tempat. Pemilik yang melihatnya, bukan
    // aplikasi. Maka jadwal musiman mengikuti satu sakelar yang dinyalakan
    // manusia (CompanySettings.musim_bertelur_aktif), dan selama sakelar itu
    // menyala ia berlaku setiap hari.
    return keadaan.musimBertelur === true;
  }

  return false;
}


/**
 * Sesuaikan satu jadwal terhadap keberadaan racikan Duta Repro.
 *
 * KENAPA ADA: racikan Duta Repro HANYA diberikan kepada betina - 15 g/ekor,
 * dan tugas SOP-nya memang tertulis "SEMUA kura BETINA". Tetapi jadwal kalsium
 * dan vitamin E yang mundur karenanya berlaku untuk SEMUA kura. Aturan lama
 * mematikan jadwal itu seluruhnya begitu racikan ada stoknya, sehingga 28 kura
 * JANTAN berhenti menerima 10 g kalsium per hari - tanpa satu pun layar yang
 * memberi tahu, karena dari luar jadwalnya terlihat "sudah tergantikan".
 *
 * Kura jantan tidak pernah menerima racikan itu. Tidak ada yang menggantikan
 * apa pun untuk mereka.
 *
 * @returns jadwal yang berlaku (kadang dipersempit ke jantan), atau null bila
 *   isinya memang sudah seluruhnya digantikan racikan.
 */
export function sesuaikanMundurRacikan(jadwal, racikanTersedia) {
  if (!jadwal) return null;
  if (jadwal.nonaktif_bila_racikan_ada !== true) return jadwal;
  if (racikanTersedia !== true) return jadwal;

  const untuk = jadwal.gender_filter || "semua";

  // Khusus betina: isinya benar-benar sudah ada di racikan. Mundur seluruhnya.
  if (untuk === "betina") return null;

  // Khusus jantan: racikan tidak menyentuh mereka sama sekali. Tetap jalan.
  if (untuk === "jantan") return jadwal;

  // Untuk semua kura: yang tergantikan hanya bagian betinanya. Sisakan jantan.
  return { ...jadwal, gender_filter: "jantan" };
}

/** Saring satu daftar jadwal untuk hari tertentu. */
export function jadwalBerlaku(daftar = [], keadaan = {}) {
  return (daftar || [])
    .map((j) => sesuaikanMundurRacikan(j, keadaan.racikanTersedia === true))
    .filter((j) => j && berlakuHariIni(j, keadaan));
}
