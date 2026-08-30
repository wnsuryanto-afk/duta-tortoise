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

  // ── Jadwal yang mundur saat racikan tersedia ──
  //
  // Kalsium, asam folat, dan vitamin E sudah terkandung di dalam racikan Duta
  // Repro. Menjalankan keduanya berarti dosis dobel: kalsium 20 g dan folat 2x
  // sehari. Tetapi jadwal lamanya TIDAK dimatikan, hanya mundur - kalau racikan
  // habis dan belum diracik ulang, jadwal ini hidup kembali dengan sendirinya.
  // Mematikannya permanen akan membuat betina kehilangan kalsium tepat pada
  // jeda antar-batch, yaitu keadaan yang justru memicu egg binding.
  if (jadwal.nonaktif_bila_racikan_ada === true && keadaan.racikanTersedia === true) {
    return false;
  }

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

/** Saring satu daftar jadwal untuk hari tertentu. */
export function jadwalBerlaku(daftar = [], keadaan = {}) {
  return (daftar || []).filter((j) => berlakuHariIni(j, keadaan));
}
