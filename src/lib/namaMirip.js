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
