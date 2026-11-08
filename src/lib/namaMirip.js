/**
 * namaMirip.js — menangkap SALAH KETIK pada nama barang, sebelum ia jadi
 * baris kembar yang menampung stok sendiri.
 *
 * ── Cacat yang ditemukan 18 Oktober 2026 ────────────────────────────────────
 *
 * Stok pakan punya dua baris rumput:
 *
 *     Rumput    658,97 kg
 *     Reumput    30    kg   ← dibuat 10 Okt, satu pergerakan, lalu diam
 *
 * Keduanya dicatat Angsolo pada hari yang sama, berselang detik: ia mengetik
 * nama pakan di Pakan Harian, tidak ada yang cocok persis, dan formulir itu
 * membuat baris FeedStock BARU tanpa bertanya. Tiga puluh kilogram rumput
 * sejak itu duduk di tempat yang tidak pernah diberikan ke kura mana pun.
 *
 * ── Kenapa kemiripan() di miripTugas.js TIDAK dipakai ───────────────────────
 *
 * Diuji lebih dulu terhadap pasangan yang sebenarnya, dan hasilnya kebalikan
 * dari yang dibutuhkan:
 *
 *     kemiripan("Reumput", "Rumput")    = 0,00   ← typo-nya LOLOS
 *     kemiripan("Melon", "Melon BS")    = 1,00   ← barang SAH diblokir
 *
 * Sebabnya ia membandingkan KATA, bukan huruf — ia dibuat untuk judul tugas
 * ("Pakan adabra" vs "Kasik pakan adabra"). "Reumput" dan "Rumput" tidak
 * berbagi satu kata pun, sementara "Melon" adalah bagian utuh dari
 * "Melon BS". Memakainya di sini akan memblokir pencatatan pakan harian
 * yang benar sambil tetap melewatkan typo yang dicari.
 *
 * Jadi berkas ini memakai JARAK HURUF, dan itu alat yang berbeda untuk
 * pekerjaan yang berbeda — bukan salinan kedua dari aturan yang sama.
 *
 * ── Kenapa awalan dikecualikan ──────────────────────────────────────────────
 *
 * "Melon BS" bukan salah ketik "Melon" — BS itu mutu sortir, dan keduanya
 * memang barang berbeda dengan harga berbeda. Begitu juga "Rumput Gajah /
 * Sudan" terhadap "Rumput". Nama yang MEMUAT nama lain secara utuh hampir
 * selalu perincian, bukan kekeliruan; yang mencurigakan adalah nama yang
 * sama panjangnya tetapi berbeda satu-dua huruf.
 */

/** Jarak huruf maksimum yang masih dianggap salah ketik. */
export const JARAK_TYPO = 2;

/** Nama sependek ini terlalu mudah bertabrakan untuk dinilai. */
export const PANJANG_MINIMAL = 4;

function bersih(nama) {
  return String(nama || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Jarak Levenshtein — berapa penyisipan, penghapusan, dan penggantian huruf
 * yang memisahkan dua kata.
 *
 * Ditulis dengan dua baris berjalan, bukan matriks penuh: daftar pakan dan
 * gudang bisa ratusan baris, dan fungsi ini dipanggil sekali untuk tiap
 * baris setiap kali satu nama baru diketik.
 */
export function jarakHuruf(a, b) {
  const s = bersih(a);
  const t = bersih(b);
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  let sebelum = Array.from({ length: t.length + 1 }, (_, i) => i);
  let kini = new Array(t.length + 1);

  for (let i = 1; i <= s.length; i++) {
    kini[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const biaya = s[i - 1] === t[j - 1] ? 0 : 1;
      kini[j] = Math.min(kini[j - 1] + 1, sebelum[j] + 1, sebelum[j - 1] + biaya);
    }
    [sebelum, kini] = [kini, sebelum];
  }
  return sebelum[t.length];
}

/** Salah satu nama memuat nama lain secara utuh sebagai awalan kata. */
export function perincianDari(a, b) {
  const s = bersih(a);
  const t = bersih(b);
  if (!s || !t || s === t) return false;
  const [pendek, panjang] = s.length <= t.length ? [s, t] : [t, s];
  /* Harus di batas kata: "Melon" perincian "Melon BS", tetapi "Rum" bukan
     perincian "Rumput" — potongan kata di tengah justru tanda typo. */
  return panjang.startsWith(pendek + " ") || panjang.startsWith(pendek + "-");
}

/**
 * Nama yang sudah ada dan tampak seperti versi benar dari `nama`.
 *
 * `null` bila tidak ada — dan itu keadaan yang jauh lebih sering, jadi
 * pemanggilnya tidak perlu memperlakukan hasil kosong sebagai kekhususan.
 *
 * Nama yang SAMA PERSIS tidak dilaporkan: itu bukan salah ketik, itu barang
 * yang memang sudah ada, dan pemanggilnya menanganinya lebih dulu.
 */
export function namaKembar(nama, daftar = []) {
  const s = bersih(nama);
  if (s.length < PANJANG_MINIMAL) return null;

  for (const lain of daftar || []) {
    const t = bersih(typeof lain === "string" ? lain : lain?.name);
    if (!t || t === s || t.length < PANJANG_MINIMAL) continue;
    if (perincianDari(s, t)) continue;
    /* Beda panjang yang jauh bukan salah ketik, berapa pun jaraknya. */
    if (Math.abs(s.length - t.length) > JARAK_TYPO) continue;
    if (jarakHuruf(s, t) <= JARAK_TYPO) return typeof lain === "string" ? lain : lain?.name;
  }
  return null;
}

/**
 * SATU keputusan: baris stok pakan mana yang menampung catatan ini?
 *
 * ── Cacat yang ditutupnya ───────────────────────────────────────────
 *
 * PakanHarianForm dulu menanyakan dua hal, di dua tempat, dengan kunci yang
 * BERBEDA:
 *
 *     penjaga   sudahPersis = daftar.some(f => nama(f) === nama(diketik))
 *     pencari   feedItem    = daftar.find(f => nama(f) === nama(diketik)
 *                                            && f.unit === satuan)
 *
 * Penjaganya melihat NAMA saja; pencarinya melihat NAMA DAN SATUAN. Celahnya
 * persis di antara keduanya: mengetik nama yang sudah ada dengan satuan yang
 * berbeda membuat `sudahPersis` benar — jadi penjaga salah-ketik dilewati —
 * sementara pencarinya tidak menemukan apa-apa dan membuat BARIS BARU. Diam,
 * tanpa satu pun peringatan.
 *
 * Hanya ada dua satuan di formulir itu, kg dan keranjang, jadi celahnya
 * berjarak dua klik: catat "Rumput" dalam keranjang sekali saja, dan kebun
 * punya dua baris Rumput — satu berisi 1.348,97 kg, satu lagi menampung
 * keranjang yang tidak pernah ditimbang siapa pun.
 *
 * Itu bukan kemungkinan teoretis. Per 8 Nov 2026 daftar pakan sudah memuat
 * DUA baris "Pakan Lainnya": 410 kg dan 71,97 keranjang. Yang keranjang lahir
 * 8 Sep 2026 dari cacat lain yang sudah diperbaiki — tetapi barisnya tetap
 * tinggal, masih aktif, masih terbaca sebagai stok.
 *
 * ── Kenapa satu fungsi, bukan satu pemeriksaan tambahan ───────────────────
 *
 * Menambahkan pemeriksaan kedua di formulir akan meninggalkan dua aturan yang
 * masih bisa bergeser sendiri-sendiri — yaitu bentuk yang melahirkan cacat
 * ini. Di sini penjaga dan pencarinya adalah SATU panggilan: yang memutuskan
 * "boleh atau tidak" juga yang memulangkan baris yang dipakai. Keduanya tidak
 * mungkin lagi berselisih, karena keduanya tidak lagi dua.
 *
 * @param {string} nama    nama pakan yang diketik
 * @param {string} satuan  "kg" | "keranjang"
 * @param {object[]} daftar baris FeedStock apa adanya
 * @returns {{boleh: boolean, cocok: object|null, sebab: string, bentrok: object|null}}
 *   boleh   — penyimpanan boleh lanjut
 *   cocok   — baris yang HARUS dipakai; null berarti baris baru memang benar
 *   sebab   — kalimat untuk layar bila tidak boleh
 *   bentrok — baris bernama sama bersatuan lain, bila itu sebabnya
 */
export function pilihBarisPakan({ nama, satuan, daftar = [] } = {}) {
  const s = bersih(nama);
  if (!s) return { boleh: true, cocok: null, sebab: "", bentrok: null };

  const samaNama = (daftar || []).filter((f) => bersih(f?.name) === s);

  // 1. Nama DAN satuan cocok — inilah barisnya, tidak ada yang perlu ditanya.
  const persis = samaNama.find((f) => f?.unit === satuan) || null;
  if (persis) return { boleh: true, cocok: persis, sebab: "", bentrok: null };

  /*
   * 2. Nama cocok, satuan TIDAK. Inilah celahnya. Tidak diblokir diam-diam
   *    dan tidak diloloskan diam-diam — disebutkan, beserta isinya, supaya
   *    yang mencatat bisa memutuskan dengan tahu apa yang sudah ada.
   *
   *    Memisah satuan kadang memang benar: "Mentimun" pernah ada dalam kg
   *    sementara yang datang hari itu terhitung keranjang. Tetapi itu
   *    keputusan, bukan kecelakaan, dan tempatnya di Stok & Gudang — bukan
   *    di formulir pakan harian yang diisi sambil berdiri di kandang.
   */
  if (samaNama.length > 0) {
    const lain = samaNama[0];
    const isi = Number(lain?.current_stock) || 0;
    return {
      boleh: false,
      cocok: null,
      bentrok: lain,
      sebab:
        `"${lain.name}" sudah ada dalam ${lain.unit} (${isi} ${lain.unit}). ` +
        `Mencatatnya dalam ${satuan} akan membuat baris stok KEDUA dengan nama ` +
        `yang sama. Ganti satuannya ke ${lain.unit}, atau buat barisnya sendiri ` +
        `di Stok & Gudang kalau memang dua satuan yang berbeda.`,
    };
  }

  // 3. Nama belum ada sama sekali — baru periksa salah ketik.
  const kembar = namaKembar(nama, daftar);
  if (kembar) {
    return {
      boleh: false,
      cocok: null,
      bentrok: null,
      sebab:
        `"${String(nama).trim()}" sangat mirip "${kembar}" yang sudah ada. ` +
        `Tulis persis "${kembar}" bila memang itu, atau nama yang jelas berbeda bila bukan.`,
    };
  }

  // 4. Benar-benar baru.
  return { boleh: true, cocok: null, sebab: "", bentrok: null };
}

/**
 * Baris pakan bernama sama yang terpecah ke lebih dari satu satuan.
 *
 * Bukan untuk digabung otomatis: berapa kilogram satu keranjang hanya
 * diketahui orang yang mengangkatnya, dan menebaknya akan mengarang angka
 * stok. Yang dikembalikannya adalah daftar untuk DIPUTUSKAN.
 */
export function pakanTerpecahSatuan(daftar = []) {
  const peta = new Map();
  for (const f of daftar || []) {
    const s = bersih(f?.name);
    if (!s) continue;
    if (!peta.has(s)) peta.set(s, []);
    peta.get(s).push(f);
  }
  const keluar = [];
  for (const baris of peta.values()) {
    const satuan = new Set(baris.map((f) => f?.unit).filter(Boolean));
    if (satuan.size > 1) keluar.push(baris);
  }
  return keluar.sort((a, b) => String(a[0]?.name || "").localeCompare(String(b[0]?.name || "")));
}
