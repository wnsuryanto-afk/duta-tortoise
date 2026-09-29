/**
 * pantauInkubator.js — apakah telur yang sedang dierami benar-benar dipantau?
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Diperiksa 30 September 2026, saat menelusuri modul-modul area Kura:
 *
 *   clutch berstatus "bertelur" (sedang dierami)   7
 *   jumlah telur di dalamnya                       145
 *   catatan IncubatorReading yang pernah dibuat    2
 *   pembacaan terakhir                             1 Juni 2026
 *   telur tertua yang sedang dierami masuk         12 Agustus 2026
 *
 * Artinya: sejak telur pertama dari kelompok ini masuk inkubator, **belum ada
 * satu pun pembacaan suhu atau kelembapan**. Sulcata menetas pada 80–105 hari
 * di suhu 31°C; suhu menentukan bukan hanya berhasil-tidaknya menetas, tetapi
 * juga lamanya. Tanpa satu pun angka, tidak ada yang bisa dijawab kalau nanti
 * ada clutch yang gagal.
 *
 * Halaman "Inkubator" dan formulir pencatatnya sudah ada dan lengkap — ini
 * bukan alat yang kurang. Yang kurang sesuatu yang mengingatkan bahwa ia ada,
 * pola yang sudah berulang di aplikasi ini (RempesanLog, Perkawinan).
 *
 * ── Ambang yang TIDAK dikarang ─────────────────────────────────────────────
 *
 * Berkas ini sengaja tidak memutuskan "berapa hari sekali seharusnya dicatat"
 * — itu keputusan pemeliharaan, dan mengarangnya hanya akan membuat
 * peringatannya diabaikan seperti peringatan lain yang pernah menyala untuk
 * semua orang sekaligus.
 *
 * Yang dipakai adalah FAKTA yang tidak perlu ambang: apakah ada pembacaan
 * SEJAK telur tertua yang kini dierami masuk inkubator. Kalau tidak ada,
 * kalimatnya bukan "sudah lewat jadwal" melainkan "belum pernah sekalipun".
 */

/** Clutch yang sedang dierami: sudah bertelur, belum menetas, belum selesai. */
export function clutchDierami(breedings = []) {
  return (breedings || []).filter(
    (b) =>
      b?.egg_laying_date &&
      !b.hatch_date &&
      b.status !== "selesai" &&
      b.status !== "gagal" &&
      !b.is_archived,
  );
}

/**
 * Keadaan pemantauan inkubator hari ini.
 *
 * @returns {{ clutch, telur, sejak, pembacaanTerakhir, hariSejakPembacaan,
 *             belumPernahSejakMasuk }}
 *   `sejak` = tanggal telur TERTUA yang kini dierami masuk.
 *   `belumPernahSejakMasuk` = tidak ada satu pun pembacaan sejak tanggal itu.
 */
export function pantauInkubator(breedings = [], readings = [], hariIni = new Date()) {
  const dierami = clutchDierami(breedings);
  const telur = dierami.reduce((s, b) => s + (Number(b.egg_count) || 0), 0);
  const tanggal = dierami.map((b) => String(b.egg_laying_date)).sort();
  const sejak = tanggal[0] || null;

  // Pembacaan memakai `date_time` ("2026-06-01T17:10"), bukan `date`.
  const waktu = (readings || [])
    .map((r) => String(r?.date_time || "").slice(0, 10))
    .filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t))
    .sort();
  const pembacaanTerakhir = waktu.length ? waktu[waktu.length - 1] : null;

  const acuan = hariIni instanceof Date ? hariIni : new Date(hariIni);
  const hariSejakPembacaan = pembacaanTerakhir
    ? Math.floor((acuan - new Date(pembacaanTerakhir)) / 86400000)
    : null;

  return {
    clutch: dierami.length,
    telur,
    sejak,
    pembacaanTerakhir,
    hariSejakPembacaan,
    // Perbandingan teks tanggal "YYYY-MM-DD" aman dan tepat; keduanya bentuk
    // yang sama, jadi tidak perlu diubah jadi Date dulu.
    belumPernahSejakMasuk: !!sejak && (!pembacaanTerakhir || pembacaanTerakhir < sejak),
  };
}
