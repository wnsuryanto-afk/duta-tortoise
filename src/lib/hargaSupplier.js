/**
 * hargaSupplier.js — membaca harga yang DITULIS ORANG di postingan, jadi angka
 * yang bisa dibandingkan.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Lead supplier masuk dari tangkapan layar media sosial, dan harganya ikut
 * apa adanya — sebagai kalimat, bukan angka. Tujuh lead pertama (17 Okt 2026)
 * berbunyi persis begini:
 *
 *   "10.000/3kg, 8.000/3kg, 6.000/3kg, 5.000/2kg"   ← empat harga sekaligus
 *   "4rb per kg"
 *   "nego"
 *   "Obral"
 *   ""                                               ← tidak disebut
 *
 * Pertanyaan pemiliknya — "harga yang paling ideal" — tidak bisa dijawab
 * sebelum kalimat-kalimat itu jadi angka per kilogram. Dan ia tidak bisa
 * dijawab dengan menebak: "nego" dan "Obral" BUKAN angka, dan memperlakukannya
 * sebagai nol akan membuat penjual yang tidak menyebut harga selalu menang
 * sebagai "termurah".
 *
 * ── Kenapa hanya satuan berat yang dibandingkan ─────────────────────────────
 *
 * "5.000/ikat" tidak bisa disandingkan dengan "4.000/kg" tanpa tahu seberat
 * apa satu ikat — dan itu berbeda antar penjual, antar sayur, antar hari.
 * Menebaknya berarti membuat peringkat yang terlihat tegas tetapi tidak
 * berdasar pada apa pun.
 *
 * Jadi yang dihitung per kilogram hanya yang satuannya memang berat. Sisanya
 * TETAP DITAMPILKAN, dengan satuannya sendiri, dan ditandai tidak bisa
 * dibandingkan. Kalimat aslinya selalu ikut dibawa, supaya yang membaca bisa
 * menilai sendiri apa yang dilewatkan pembacanya.
 */

/** Satuan berat yang diketahui, beserta beratnya dalam kilogram. */
const BERAT_KG = {
  kg: 1,
  kilo: 1,
  kilogram: 1,
  kgs: 1,
  ons: 0.1,
  hg: 0.1,
  gram: 0.001,
  gr: 0.001,
  g: 0.001,
};

/**
 * Satuan yang sah tetapi TIDAK bisa ditimbang dari teksnya.
 *
 * Didaftar tegas, bukan ditangkap sebagai "apa saja yang bukan berat": kata
 * asing yang tidak dikenali lebih baik dilaporkan sebagai tidak dikenali
 * daripada diam-diam dianggap satu buah.
 */
const SATUAN_LAIN = [
  "ikat", "karung", "buah", "biji", "butir", "pack", "pak", "bungkus",
  "dus", "box", "kardus", "sak", "keranjang", "peti", "tandan", "sisir",
  "pcs", "pt", "polybag", "bal",
];

/** Kata yang berarti "harga belum disebut", bukan harga nol. */
const BUKAN_ANGKA = ["nego", "negotiable", "obral", "murah", "hubungi", "wa", "chat", "inbox", "pm", "tanya"];

/**
 * Angka Indonesia jadi bilangan.
 *
 * Menangani "10.000", "10000", "4rb", "4 ribu", "1,5jt", "15k".
 * Titik di sini SELALU pemisah ribuan dan koma SELALU desimal — itu aturan
 * penulisan Indonesia, dan membalikkannya membuat "10.000" terbaca sepuluh.
 */
export function bacaAngka(teks) {
  const t = String(teks || "").toLowerCase().trim();
  if (!t) return null;
  const m = t.match(/^([\d.,]+)\s*(rb|ribu|k|jt|juta|m)?$/);
  if (!m) return null;

  const angka = Number(m[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(angka)) return null;

  const kali = { rb: 1000, ribu: 1000, k: 1000, jt: 1_000_000, juta: 1_000_000, m: 1_000_000 }[m[2]] || 1;
  return angka * kali;
}

/**
 * Baca satu kalimat harga jadi daftar harga yang terpisah.
 *
 * Satu kalimat bisa memuat beberapa harga — "10.000/3kg, 8.000/3kg" adalah
 * dua penawaran, bukan satu. Masing-masing dikembalikan sendiri.
 *
 * @returns array {nominal, jumlah, satuan, perKg, bisaDibanding, asli}
 */
export function bacaHarga(teks) {
  const asli = String(teks || "").trim();
  if (!asli) return [];

  const rendah = asli.toLowerCase();
  /*
    Kalimat yang hanya berisi "nego"/"obral" dikembalikan sebagai SATU baris
    tanpa angka, bukan sebagai daftar kosong. Daftar kosong terbaca "tidak ada
    penawaran"; yang benar adalah "ada penawaran, harganya belum disebut".
  */
  const adaAngka = /\d/.test(rendah);
  if (!adaAngka) {
    const kata = BUKAN_ANGKA.find((k) => rendah.includes(k));
    return [{ nominal: null, jumlah: null, satuan: null, perKg: null, bisaDibanding: false, asli, sebab: kata ? `"${kata}"` : "tidak ada angka" }];
  }

  const hasil = [];
  const satuanPola = [...Object.keys(BERAT_KG), ...SATUAN_LAIN].sort((a, b) => b.length - a.length).join("|");
  /*
    Bentuk yang ditangkap: <angka> <pemisah> [<jumlah>] <satuan>
    Pemisahnya "/", "per", atau spasi — ketiganya dipakai di tujuh lead
    pertama ("10.000/3kg", "4rb per kg").
  */
  const pola = new RegExp(
    `([\\d.,]+\\s*(?:rb|ribu|k|jt|juta)?)\\s*(?:\\/|per\\s+|\\s)\\s*(\\d+(?:[.,]\\d+)?)?\\s*(${satuanPola})\\b`,
    "gi",
  );

  for (const m of rendah.matchAll(pola)) {
    const nominal = bacaAngka(m[1]);
    if (nominal === null) continue;
    const jumlah = m[2] ? Number(String(m[2]).replace(",", ".")) : 1;
    const satuan = m[3].toLowerCase();
    const kgPerSatuan = BERAT_KG[satuan];

    hasil.push({
      nominal,
      jumlah,
      satuan,
      /* Dibulatkan ke rupiah penuh: pecahan sen pada harga sayur adalah
         ketelitian yang tidak dimiliki sumbernya. */
      perKg: kgPerSatuan && jumlah > 0 ? Math.round(nominal / (jumlah * kgPerSatuan)) : null,
      bisaDibanding: !!kgPerSatuan && jumlah > 0,
      asli,
      sebab: kgPerSatuan ? "" : `satuan "${satuan}" tidak bisa ditimbang dari teksnya`,
    });
  }

  if (hasil.length === 0) {
    return [{ nominal: null, jumlah: null, satuan: null, perKg: null, bisaDibanding: false, asli, sebab: "bentuk harganya tidak dikenali" }];
  }
  return hasil;
}

/**
 * Harga per kilogram TERENDAH dari sebuah kalimat, bila ada yang bisa dihitung.
 *
 * Yang terendah, bukan yang pertama: "10.000/3kg, 5.000/2kg" menyebut 3.333
 * dan 2.500 per kg, dan yang menentukan dalam perbandingan adalah yang
 * termurah. `null` berarti tidak satu pun bisa dibandingkan — dan itu harus
 * dibedakan dari nol.
 */
export function hargaTerendahPerKg(teks) {
  const bisa = bacaHarga(teks).filter((h) => h.bisaDibanding);
  if (bisa.length === 0) return null;
  return Math.min(...bisa.map((h) => h.perKg));
}

/**
 * Pecah daftar barang yang ditulis dalam satu kalimat.
 *
 * "Sayur (tomat, jagung manis, terong, gondes)" → empat nama.
 * Kurung dibuang, kata pengantar sebelum kurung ikut dibuang karena ia
 * kategori ("Sayur"), bukan barang. "dll" dibuang: ia bukan nama sayur.
 */
export function bacaBarang(teks) {
  const t = String(teks || "").trim();
  if (!t) return [];

  const dalamKurung = t.match(/\(([^)]*)\)/);
  const inti = dalamKurung ? dalamKurung[1] : t;

  /*
    TIDAK dipecah pada "atau".

    "Waluh atau labu kuning" adalah SATU barang dengan dua nama — waluh
    memang labu kuning — dan memecahnya membuat satu penjual terbaca sebagai
    dua pasar terpisah, masing-masing dengan "1 penjual". Terlihat saat
    keluaran nyata dibaca, 17 Okt 2026.

    "dan" tetap dipecah: "tomat dan terong" memang dua barang. Kalau suatu
    saat ada yang menulis "A dan B" untuk satu barang, yang terjadi hanyalah
    satu baris berlebih di daftar — jauh lebih ringan daripada menyatukan dua
    barang yang berbeda harganya.
  */
  return inti
    .split(/[,;/]|\bdan\b/i)
    .map((x) => x.trim().replace(/^[-•·]\s*/, ""))
    .filter(Boolean)
    .filter((x) => !/^(dll|dsb|lain-?lain|lainnya|sayur|buah)$/i.test(x))
    .map((x) => x.replace(/\s+/g, " "));
}
