/**
 * Mencocokkan nama barang dari invoice marketplace dengan nama barang di
 * daftar belanja.
 *
 * Keduanya menyebut benda yang sama dengan cara yang berbeda. Daftar belanja
 * ditulis orang gudang: "Vitamin E bubuk 50% [VIT-REP01] - ONLINE". Invoice
 * ditulis penjual: "VITAMIN E POWDER 50% 100gr (Promo!)". Mencocokkan string
 * mentah tidak akan pernah kena.
 *
 * Jadi keduanya diperas dulu ke kumpulan kata yang berarti: huruf kecil,
 * kode dalam kurung siku dibuang, satuan dan angka dibuang (karena "100gr"
 * di invoice bukan penanda barang yang sama — barang yang sama bisa dijual
 * dalam beberapa ukuran), lalu dihitung berapa kata yang beririsan.
 *
 * Hasil kecocokan TIDAK PERNAH disimpan diam-diam. Ia hanya mengisi kolom
 * yang masih bisa diubah orang sebelum menekan simpan — karena tebakan yang
 * salah dan tidak terlihat jauh lebih mahal daripada kolom yang dibiarkan
 * kosong.
 */

/** Kata yang muncul di mana-mana sehingga tidak membedakan apa pun. */
const KATA_UMUM = new Set([
  "online", "promo", "diskon", "gratis", "ongkir", "free", "new", "original",
  "asli", "termurah", "murah", "grosir", "eceran", "pack", "paket", "isi",
  "untuk", "dan", "dengan", "per", "pcs", "pc", "botol", "sachet", "strip",
  "bungkus", "kg", "gr", "gram", "ml", "liter", "ltr", "lt", "cc", "box",
  "dus", "karung", "sak", "bks", "kemasan", "ukuran", "size", "besar", "kecil",
]);

/** Peras satu nama jadi kumpulan kata yang berarti. */
export function kataKunci(nama) {
  return new Set(
    String(nama || "")
      .toLowerCase()
      .replace(/\[[^\]]*\]/g, " ")        // buang kode SKU dalam kurung siku
      .replace(/\([^)]*\)/g, " ")         // buang catatan dalam kurung biasa
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/^\d+(kg|gr|gram|ml|l|ltr|cc|pcs|pc)?$/i, "")) // "100gr", "5"
      .filter((w) => w.length >= 3 && !KATA_UMUM.has(w))
  );
}

/**
 * Skor kemiripan 0..1 — irisan kata dibagi jumlah kata pada nama terpendek.
 * Memakai yang terpendek, bukan gabungan, supaya "Vitamin E" tetap cocok
 * dengan "Vitamin E Powder 50% Kemasan Ekonomis" yang jauh lebih panjang.
 */
export function skorKemiripan(a, b) {
  const ka = kataKunci(a);
  const kb = kataKunci(b);
  if (ka.size === 0 || kb.size === 0) return 0;
  let sama = 0;
  for (const w of ka) if (kb.has(w)) sama += 1;
  return sama / Math.min(ka.size, kb.size);
}

/** Di bawah ini terlalu meragukan untuk mengisi kolom apa pun secara otomatis. */
export const AMBANG_COCOK = 0.6;

/**
 * Pasangkan setiap item invoice dengan satu kandidat, tanpa pemakaian ganda.
 *
 * @param {Array} itemInvoice  hasil scan — dipakai .nama dan .subtotal
 * @param {Array} kandidat     daftar belanja
 * @param {Function} namaKandidat  cara membaca nama dari satu kandidat
 * @returns {{ pasangan: Array<{kandidat, item, skor}>, takCocok: Array }}
 */
export function pasangkanItem(itemInvoice, kandidat, namaKandidat) {
  const terpakai = new Set();
  const pasangan = [];
  const takCocok = [];

  // Urutkan dari skor tertinggi lebih dulu supaya pasangan terbaik yang menang
  // saat dua item invoice memperebutkan kandidat yang sama.
  const semua = [];
  (itemInvoice || []).forEach((item, i) => {
    (kandidat || []).forEach((k) => {
      const skor = skorKemiripan(item?.nama, namaKandidat(k));
      if (skor >= AMBANG_COCOK) semua.push({ i, item, kandidat: k, skor });
    });
  });
  semua.sort((a, b) => b.skor - a.skor);

  const itemTerpakai = new Set();
  for (const c of semua) {
    if (terpakai.has(c.kandidat.id) || itemTerpakai.has(c.i)) continue;
    terpakai.add(c.kandidat.id);
    itemTerpakai.add(c.i);
    pasangan.push({ kandidat: c.kandidat, item: c.item, skor: c.skor });
  }
  (itemInvoice || []).forEach((item, i) => {
    if (!itemTerpakai.has(i)) takCocok.push(item);
  });

  return { pasangan, takCocok };
}
