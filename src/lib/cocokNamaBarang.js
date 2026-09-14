/**
 * Mencocokkan nama barang dari invoice marketplace dengan barang di daftar
 * belanja.
 *
 * Keduanya menyebut benda yang sama dengan cara berbeda. Daftar belanja
 * ditulis orang gudang dengan pola tetap:
 *   "Maltodextrin Food Grade 1 kg [VIT-REP09] - SHOPEE (GROSESORIS)"
 * Invoice ditulis penjual:
 *   "MALTODEKSTRIN FOOD GRADE 1KG PROMO MURAH TERMURAH"
 *
 * Mencocokkan rasio kata yang sama tidak bekerja di sini. "Bubuk Jahe Asli"
 * vs "Jahe Powder" cuma berbagi satu kata dari dua, padahal jelas barang yang
 * sama; sementara "Suntikan 1ml" vs "Suntikan 5ml" berbagi hampir semuanya
 * padahal beda barang.
 *
 * Yang benar-benar menentukan adalah kata KHAS: nama barang di peternakan ini
 * hampir selalu memuat satu kata teknis yang tidak dipakai barang lain —
 * Maltodextrin, Spirulina, Fenugreek, Enrofloxacin, Temulawak, Rosella. Kalau
 * kata itu ada di dua sisi, itu barang yang sama. Kalau tidak ada, kecocokan
 * apa pun dari kata umum ("bubuk", "vitamin", "botol") tidak cukup.
 *
 * Kekhasan tidak ditebak dari daftar kata buatan saya — ia dihitung dari
 * daftar belanja yang sedang dipakai: kata yang hanya muncul di satu barang
 * adalah kata khas barang itu.
 *
 * Hasilnya TIDAK PERNAH disimpan diam-diam. Ia hanya mengisi kolom yang masih
 * bisa diubah sebelum tombol simpan ditekan, dan setiap isian otomatis diberi
 * tanda — tebakan yang salah dan tidak terlihat jauh lebih mahal daripada
 * kolom yang dibiarkan kosong.
 */

/**
 * Potong ekor konvensi gudang: "nama [SKU] - PLATFORM - catatan".
 * Sama seperti namaPendek() di base44/functions/sendDailySummary/entry.ts —
 * konvensi penamaannya satu, jadi cara memotongnya juga harus satu.
 * Isi tanda kurung biasa DIPERTAHANKAN, karena di sana justru merek berada:
 * "(Baytril Inject)", "(Ikamicetin)" — dan itu yang dipakai penjual.
 */
function batang(nama) {
  return String(nama || "").split(" [")[0].split(" - ")[0];
}

/** Kata yang muncul di mana-mana sehingga tidak membedakan apa pun. */
const KATA_UMUM = new Set([
  "online", "shopee", "tokopedia", "lazada", "promo", "diskon", "gratis",
  "ongkir", "free", "new", "original", "asli", "murah", "termurah", "grosir",
  "eceran", "pack", "paket", "isi", "untuk", "dan", "atau", "dengan", "per",
  "via", "generik", "pcs", "botol", "sachet", "strip", "bungkus", "tube",
  "ampul", "box", "dus", "karung", "sak", "bks", "kemasan", "ukuran", "size",
  "besar", "kecil", "halus", "murni", "food", "grade", "bahan", "racikan",
  "kualitas", "terbaik", "ready", "stock", "stok", "bubuk", "powder", "cair",
  "liquid", "serbuk", "obat", "hewan",
]);

/** Peras satu nama jadi kumpulan kata yang berarti. */
export function kataKunci(nama) {
  return new Set(
    batang(nama)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      // Angka dan satuan dibuang: barang yang sama dijual dalam banyak ukuran,
      // jadi "500", "1kg", "10" bukan penanda identitas.
      .map((w) => (/^\d/.test(w) ? "" : w))
      .filter((w) => w.length >= 4 && !KATA_UMUM.has(w))
  );
}

/**
 * Bangun pencocok untuk satu daftar kandidat.
 * Kekhasan dihitung sekali di sini, bukan per pasangan.
 */
export function buatPencocok(kandidat, namaKandidat) {
  const daftar = (kandidat || []).map((k) => ({ k, kata: kataKunci(namaKandidat(k)) }));
  const hitung = new Map();
  for (const d of daftar) for (const w of d.kata) hitung.set(w, (hitung.get(w) || 0) + 1);

  /** Kata khas = hanya dimiliki satu kandidat di daftar ini. */
  const khas = (w) => hitung.get(w) === 1;

  return { daftar, khas };
}

/**
 * Skor satu pasangan. Mengembalikan { skor, lewat, kataKhas }.
 *   lewat = true hanya bila ada minimal satu kata KHAS yang sama.
 */
export function nilaiPasangan(kataItem, entri, khas) {
  const sama = [];
  for (const w of kataItem) if (entri.kata.has(w)) sama.push(w);
  if (sama.length === 0) return { skor: 0, lewat: false, kataKhas: [] };
  const kataKhasSama = sama.filter(khas);
  const skor = sama.length / Math.max(1, Math.min(kataItem.size, entri.kata.size));
  return { skor, lewat: kataKhasSama.length > 0, kataKhas: kataKhasSama };
}

/**
 * Pasangkan item invoice dengan kandidat, satu lawan satu.
 * Yang tidak punya kata khas yang sama sengaja dibiarkan tidak cocok.
 *
 * @param {Array} itemInvoice  hasil scan — dipakai .nama dan .subtotal
 * @param {Array} kandidat     daftar belanja yang dipilih
 * @param {Function} namaKandidat  cara membaca nama dari satu kandidat
 */
export function pasangkanItem(itemInvoice, kandidat, namaKandidat) {
  const { daftar, khas } = buatPencocok(kandidat, namaKandidat);

  const semua = [];
  (itemInvoice || []).forEach((item, i) => {
    const kata = kataKunci(item?.nama);
    if (kata.size === 0) return;
    for (const entri of daftar) {
      const n = nilaiPasangan(kata, entri, khas);
      if (n.lewat) semua.push({ i, item, kandidat: entri.k, skor: n.skor, kataKhas: n.kataKhas });
    }
  });
  // Skor tertinggi menang saat dua item memperebutkan kandidat yang sama.
  semua.sort((a, b) => b.skor - a.skor);

  const kandidatTerpakai = new Set();
  const itemTerpakai = new Set();
  const pasangan = [];
  for (const c of semua) {
    if (kandidatTerpakai.has(c.kandidat.id) || itemTerpakai.has(c.i)) continue;
    kandidatTerpakai.add(c.kandidat.id);
    itemTerpakai.add(c.i);
    pasangan.push(c);
  }

  const takCocok = (itemInvoice || []).filter((_, i) => !itemTerpakai.has(i));
  return { pasangan, takCocok };
}
