// ─────────────────────────────────────────────────────────────────────────────
// SATU DEFINISI: HPP seekor kura.
//
// Sebelum berkas ini ada, HPP dihitung di dua tempat di dalam SaleWizard —
// StepReview memakai costData.biayaPerEkor, handleSave memakai
// costData.biayaPerEkorRata. Angka yang dilihat pemilik di layar review bukan
// angka yang tersimpan di catatan penjualan. Keduanya sekarang memanggil
// hitungHppKura().
//
// Tiga aturan yang mudah salah dan menjadi alasan berkas ini ada:
//
// 1. Kura hasil tetasan sendiri BUKAN bermodal nol. Induknya dirawat,
//    diberi makan, dan menempati kandang selama telurnya dierami — 91 sampai
//    99 hari. Biaya itu nyata dan harus melekat pada anaknya. Kode lama
//    menulis purchasePrice = 0 untuk setiap kura berkode BB-, sehingga
//    32 penjualan baby tercatat bermargin 99% padahal sebenarnya 85–95%.
//
// 2. Pembagi biaya induk adalah telur yang MENETAS, bukan seluruh telur.
//    Telur gagal tidak menghasilkan apa-apa; biayanya ditanggung yang
//    berhasil. Akibatnya clutch dengan hatch rate rendah menghasilkan anak
//    yang lebih mahal — dan memang begitulah kenyataannya: clutch 9 Maret
//    (hatch rate 28%) menghasilkan anak seharga Rp 26.980 biaya induk,
//    clutch 8 April (92%) hanya Rp 7.891.
//
// 3. Lama di peternakan dihitung dalam bulan PECAHAN. differenceInMonths
//    memotong ke bawah, jadi baby yang dijual lima hari setelah menetas
//    tercatat nol rupiah biaya perawatan.
// ─────────────────────────────────────────────────────────────────────────────

import { selisihHari as hariAntara } from "@/lib/safeDate";

export const HARI_PER_BULAN = 30;

function angka(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Lama dalam hari, tidak pernah negatif.
 *
 * Hitungannya sendiri ada di lib/safeDate.js. Yang khas di sini hanyalah
 * penjepitan ke nol: "dipelihara minus dua hari" bukan keadaan yang bisa
 * terjadi, jadi tanggal yang terbalik dibaca sebagai belum berjalan, bukan
 * sebagai biaya negatif yang mengurangi HPP kura lain.
 *
 * Salinan lama berkas ini membaca teks tanggal sebagai tengah malam UTC lalu
 * membandingkannya dengan `new Date()` waktu lokal — tujuh jam yang tergeser,
 * yang bisa menjadi satu hari penuh saat dibulatkan, pada sebagian kura saja,
 * tergantung jam berapa halamannya dibuka.
 */
export function selisihHari(mulai, selesai) {
  return Math.max(0, hariAntara(mulai, selesai) ?? 0);
}

/** Kura yang lahir di peternakan ini, bukan dibeli. */
export function lahirDiFarm(kura) {
  if (!kura) return false;
  if (kura.source === "hasil_sendiri") return true;
  return typeof kura.code === "string" && kura.code.startsWith("BB-");
}

/**
 * Lama kura berada di peternakan, dalam bulan pecahan.
 * Kura hasil sendiri dihitung dari birth_date (tanggal menetas), kura beli
 * dari purchase_date lalu created_date.
 */
export function bulanDiFarm(kura, tanggalAkhir) {
  if (!kura) return 0;
  const akhir = tanggalAkhir || new Date();
  const mulai = lahirDiFarm(kura)
    ? kura.birth_date
    : (kura.purchase_date || kura.created_date);
  if (!mulai) return 0;
  return selisihHari(mulai, akhir) / HARI_PER_BULAN;
}

function pejantanSama(a, b) {
  if (!a || !b) return false;
  if (a.male_id && b.male_id) return a.male_id === b.male_id;
  return !!a.male_name && a.male_name === b.male_name;
}

/** Jumlah telur yang benar-benar menetas dalam satu clutch. */
export function jumlahMenetas(clutch) {
  const recs = Array.isArray(clutch?.egg_records) ? clutch.egg_records : [];
  const dariButir = recs.filter(r => r?.status === "menetas").length;
  if (dariButir > 0) return dariButir;
  return angka(clutch?.hatched_count);
}

/**
 * Lama pengeraman: dari telur diletakkan sampai butir pertama menetas.
 *
 * Sumber yang dipakai adalah hatch_date paling awal di egg_records, bukan
 * completed_date. completed_date adalah tanggal clutch DITUTUP di aplikasi —
 * pada clutch 8 April 2026 itu 14 Juli, enam hari setelah 21 dari 22 butir
 * sebenarnya menetas pada 8 Juli. Memakainya menambahkan enam hari biaya
 * induk yang tidak pernah terjadi.
 */
export function hariPengeraman(clutch) {
  if (!clutch) return 0;
  const recs = Array.isArray(clutch.egg_records) ? clutch.egg_records : [];
  const tanggalMenetas = recs
    .filter(r => r?.status === "menetas" && r?.hatch_date)
    .map(r => r.hatch_date)
    .sort();
  const selesai = tanggalMenetas[0]
    || clutch.hatch_date
    || clutch.completed_date
    || clutch.estimated_hatch_start;
  return selisihHari(clutch.egg_laying_date, selesai);
}

/**
 * Biaya induk yang dibebankan ke satu ekor anak.
 *
 * Betina dibebankan penuh — ia hanya mengerami satu clutch pada satu waktu.
 * Pejantan dibagi ke seluruh clutch yang ia buahi pada musim yang sama;
 * membebankan dia penuh ke setiap clutch menghitung kura yang sama dua kali.
 *
 * Catatan keterbatasan: pembagi pejantan dihitung dari clutch yang ADA saat
 * fungsi ini dipanggil. Clutch baru dari pejantan yang sama pada musim yang
 * sama akan menurunkan angkanya untuk penjualan berikutnya. Nilai yang sudah
 * tersimpan di catatan Sale tidak ikut berubah — itu disengaja, HPP dibekukan
 * pada saat penjualan.
 */
export function biayaIndukPerAnak(clutch, semuaBreeding = [], tarifPerBulan = 0) {
  const kosong = { perAnak: 0, hari: 0, menetas: 0, betina: 0, jantan: 0, pembagiJantan: 1 };
  if (!clutch || angka(tarifPerBulan) <= 0) return kosong;

  const hari = hariPengeraman(clutch);
  if (hari <= 0) return kosong;

  const menetas = jumlahMenetas(clutch);
  if (menetas <= 0) return { ...kosong, hari };

  const harian = angka(tarifPerBulan) / HARI_PER_BULAN;
  const biayaSatuInduk = hari * harian;

  const clutchPejantan = (semuaBreeding || []).filter(
    b => b && pejantanSama(b, clutch) && b.season_year === clutch.season_year
  );
  const pembagiJantan = Math.max(1, clutchPejantan.length);

  const betina = biayaSatuInduk;
  const jantan = biayaSatuInduk / pembagiJantan;

  return {
    perAnak: Math.round((betina + jantan) / menetas),
    hari,
    menetas,
    betina: Math.round(betina),
    jantan: Math.round(jantan),
    pembagiJantan,
  };
}

/** Clutch yang menghasilkan seekor bayi, lewat egg_records[].tortoise_id/code. */
export function cariClutchBayi(breedings = [], kura) {
  if (!kura) return null;
  for (const b of breedings || []) {
    const recs = Array.isArray(b?.egg_records) ? b.egg_records : [];
    const cocok = recs.some(r =>
      (kura.id && r?.tortoise_id === kura.id) ||
      (kura.code && r?.tortoise_code === kura.code)
    );
    if (cocok) return b;
  }
  // Cadangan hanya untuk kura hasil sendiri: pada kura induk, last_breeding_id
  // menunjuk clutch yang IA hasilkan, bukan clutch asalnya.
  if (lahirDiFarm(kura) && kura.last_breeding_id) {
    return (breedings || []).find(b => b?.id === kura.last_breeding_id) || null;
  }
  return null;
}

/**
 * HPP lengkap seekor kura = modal + perawatan + ongkir.
 *
 * modal      — harga beli untuk kura yang dibeli; biaya induk selama
 *              pengeraman untuk kura hasil tetasan sendiri.
 * perawatan  — lama di peternakan (bulan pecahan) x tarif per ekor per bulan.
 * ongkir     — biaya kirim penjualan ini.
 */
/**
 * Berapa dari ongkos kirim yang benar-benar masuk HPP.
 *
 * Satu aturan, satu tempat. Sebelum ini jumlahnya ditulis ulang di tiga
 * tempat — di dalam hitungHppKura, di pratinjau laba SaleForm, dan sekali lagi
 * saat SaleForm menyimpan — dan ketiganya menambahkan ongkir tanpa syarat.
 * Rumus yang disalin adalah rumus yang akan berbeda-beda saat salah satunya
 * diubah.
 *
 * @param {number|string} ongkir
 * @param {"penjual"|"pembeli"} ditanggung  kosong/tidak dikenal = "penjual",
 *        karena itulah perilaku sebelum kolomnya ada; penjualan lama tidak
 *        boleh berubah angkanya surut.
 * @returns {number}
 */
export function ongkirUntukHpp(ongkir, ditanggung = "penjual") {
  return ditanggung === "pembeli" ? 0 : angka(ongkir);
}

export function hitungHppKura({
  kura,
  breedings = [],
  tarifPerBulan = 0,
  hargaBeliInput = null,
  ongkir = 0,
  /**
   * Siapa yang menanggung ongkos kirim: "penjual" atau "pembeli".
   *
   * ── Kenapa ini perlu ada ──────────────────────────────────────────────
   *
   * Sebelum ini ongkir SELALU ditambahkan ke HPP, jadi setiap penjualan
   * dihitung seolah peternakan yang membayar kurirnya. Padahal sering
   * pembeli yang menanggung — entah membayar kurir langsung, entah
   * menggantinya ke peternakan.
   *
   * Pada kedua cara itu pengaruhnya ke laba NOL:
   *   pembeli bayar kurir langsung  uang tidak lewat peternakan sama sekali
   *   pembeli mengganti             masuk +ongkir, keluar -ongkir
   * Jadi aturannya satu: ongkir masuk HPP HANYA bila ditanggung penjual.
   *
   * Bawaannya "penjual" dengan sengaja — itu perilaku sebelum kolom ini
   * ada, sehingga penjualan lama yang kolomnya kosong tetap dihitung
   * persis seperti semula dan angkanya tidak berubah surut.
   */
  ongkirDitanggung = "penjual",
  tanggalJual = null,
  // Biaya obat & barang gudang yang pernah dibebankan ke kura ini. Dihitung
  // pemanggil lewat biayaBarangKura() di lib/pemakaianBarang.js, dari catatan
  // pengambilan barang yang menyebut kode kura ini.
  //
  // Sebelum ini ada, HPP seekor kura hanya berisi modal + perawatan bulanan.
  // Kura yang diobati berbulan-bulan dan kura yang tidak pernah sakit punya
  // harga pokok yang sama persis, jadi marginnya menipu ke arah yang sama
  // setiap kali: kura bermasalah terlihat paling menguntungkan.
  biayaObat = 0,
} = {}) {
  const dariFarm = lahirDiFarm(kura);

  let clutch = null;
  let induk = null;
  let modal = 0;

  if (dariFarm) {
    clutch = cariClutchBayi(breedings, kura);
    induk = biayaIndukPerAnak(clutch, breedings, tarifPerBulan);
    modal = induk.perAnak;
  } else {
    const diisi = hargaBeliInput !== null && hargaBeliInput !== "" && hargaBeliInput !== undefined;
    modal = diisi ? angka(hargaBeliInput) : angka(kura?.purchase_price);
  }

  const bulan = bulanDiFarm(kura, tanggalJual);
  const perawatan = Math.round(bulan * angka(tarifPerBulan));
  const ongkirNilai = angka(ongkir);
  const ditanggungPembeli = ongkirDitanggung === "pembeli";
  // Yang dibebankan ke HPP, bukan yang tertulis di nota. Keduanya dikembalikan
  // terpisah supaya layar bisa menampilkan "Rp 50.000 — ditanggung pembeli"
  // tanpa angka itu ikut memakan laba.
  const biayaKirim = ongkirUntukHpp(ongkirNilai, ongkirDitanggung);
  const obat = angka(biayaObat);

  return {
    modal,
    perawatan,
    obat,
    ongkir: biayaKirim,
    ongkirNilai,
    ongkirDitanggung: ditanggungPembeli ? "pembeli" : "penjual",
    total: modal + perawatan + obat + biayaKirim,
    bulan,
    dariFarm,
    clutch,
    induk,
    // Benar hanya bila kura DIBELI tetapi harga belinya belum pernah diisi.
    modalKosong: !dariFarm && modal === 0,
    // Benar bila kura hasil sendiri tetapi clutch asalnya tidak ketemu —
    // biaya induknya jadi nol dan HPP-nya terlalu murah.
    indukTakKetemu: dariFarm && !clutch,
  };
}

export function marginPersen(harga, hpp) {
  const h = angka(harga);
  if (h <= 0) return 0;
  return Math.round(((h - angka(hpp)) / h) * 100);
}
