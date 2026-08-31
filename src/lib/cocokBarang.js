/**
 * cocokBarang.js — mencocokkan nama barang dari struk marketplace ke barang
 * gudang.
 *
 * Kenapa ini perlu ada sendiri: nama di marketplace tidak pernah sama dengan
 * nama di gudang. Contoh nyata dari pesanan 25 Agustus 2026:
 *
 *   "Onemed Alkohol 70% Antiseptik Luka Steril 100 ML"
 *      → gudang: "Alkohol 70% - botol kecil 100 ml (Onemed)"
 *   "WONDER OXYTOCIN 5ML 10ML 20ML - 10ML"
 *      → gudang: "Oxytocin 10 IU/ml (Wonder/Lactagen)"
 *   "Saline Wound Irrigation OneMed / Cairan 500 ml"
 *      → gudang: "Infus NaCl 0.9% 500ml (Otsu-NS)"
 *
 * Dari 16 baris pesanan nyata, 13 punya padanan di gudang dan NOL yang cocok
 * lewat nama persis. Pencocokan nama persis — yang dipakai penerimaan barang
 * saat ini — akan membuat 13 barang gudang BARU yang kembar, dengan stok
 * bertambah di barang baru sementara barang lama tetap nol.
 *
 * ── Aturan yang disengaja ──
 *
 * Fungsi ini TIDAK PERNAH memutuskan sendiri. Ia mengembalikan daftar kandidat
 * berperingkat dengan skornya, dan menyerahkan keputusan ke orang. Menebak
 * barang gudang mana yang dimaksud berarti menambah stok ke item yang salah —
 * kesalahan yang tidak terlihat sampai seseorang mencari barangnya di rak.
 */

/** Kata yang tidak membedakan apa pun — dibuang sebelum membandingkan. */
const KATA_BUANG = new Set([
  "original", "ori", "asli", "murni", "premium", "grosir", "ecer", "eceran",
  "repack", "pack", "isi", "pcs", "pc", "botol", "box", "dus", "strip", "sachet",
  "obat", "cairan", "untuk", "dan", "atau", "dengan", "tanpa", "campuran",
  "steril", "medis", "kesehatan", "hewan", "reptil", "free", "gratis", "promo",
  "termurah", "terlengkap", "best", "seller", "new", "baru",
]);

/** Merek yang sering jadi ekor nama dan bukan identitas barangnya. */
const MEREK = new Set([
  "onemed", "otsu", "terumo", "wonder", "lactagen", "generik", "widatra",
  "ethica", "bralifex", "mundipharma", "hibitane", "savlon", "ikamicetin",
  "mycostatin", "burnazin", "baytril", "enrolin", "flagyl", "panacur",
  "metacam", "meloxivet", "camry", "kirin", "omron", "beurer", "pyrex",
  "sensi", "zoomed", "bio", "agani", "injekvit", "vigantol",
]);

/** Pecah nama jadi kata bermakna: huruf kecil, tanpa tanda baca, tanpa kata umum. */
export function kataKunci(nama) {
  return String(nama || "")
    .toLowerCase()
    .replace(/[^a-z0-9%.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((k) => k.length > 1 && !KATA_BUANG.has(k));
}

/**
 * Angka + satuan yang menempel, mis. "100ml", "5%", "10 ml", "1kg".
 * Ini yang paling membedakan: NaCl 100 ml dan NaCl 500 ml adalah dua barang.
 */
export function ukuran(nama) {
  const s = String(nama || "").toLowerCase().replace(/\s+/g, "");
  const hasil = new Set();
  for (const m of s.matchAll(/(\d+(?:[.,]\d+)?)\s*(ml|l|mg|g|gr|kg|cc|iu|%)/g)) {
    let angka = parseFloat(m[1].replace(",", "."));
    let satuan = m[2];
    // Samakan satuan yang setara supaya 3cc dan 3ml dianggap sama.
    if (satuan === "cc") satuan = "ml";
    if (satuan === "gr") satuan = "g";
    if (satuan === "l") { angka *= 1000; satuan = "ml"; }
    if (satuan === "kg") { angka *= 1000; satuan = "g"; }
    hasil.add(`${angka}${satuan}`);
  }
  return hasil;
}

/**
 * Skor kemiripan 0..1 antara nama struk dan nama gudang.
 *
 * Ukuran diberi bobot besar dan bisa MENGURANGI skor: dua nama yang
 * kata-katanya mirip tapi ukurannya berbeda (NaCl 100 ml vs NaCl 500 ml)
 * justru harus dijauhkan, bukan didekatkan.
 */
export function skorCocok(namaStruk, namaGudang) {
  const a = kataKunci(namaStruk);
  const b = kataKunci(namaGudang);
  if (a.length === 0 || b.length === 0) return 0;

  const setB = new Set(b);
  let sama = 0;
  for (const k of new Set(a)) {
    if (setB.has(k)) { sama += 1; continue; }
    // Kata yang satu memuat yang lain, mis. "oxytocin" vs "oxytocin10iu".
    if (b.some((x) => x.length > 3 && (x.includes(k) || k.includes(x)))) sama += 0.6;
  }
  const dasar = sama / Math.max(new Set(a).size, new Set(b).size);

  const ua = ukuran(namaStruk);
  const ub = ukuran(namaGudang);
  let bonus = 0;
  if (ua.size && ub.size) {
    const beririsan = [...ua].some((x) => ub.has(x));
    bonus = beririsan ? 0.25 : -0.35; // ukuran beda = hampir pasti barang lain
  }
  return Math.max(0, Math.min(1, dasar + bonus));
}

/** Ambang di mana sebuah kandidat layak ditawarkan sama sekali. */
export const AMBANG_TAWAR = 0.3;

/** Ambang di mana kecocokan cukup kuat untuk dipilihkan lebih dulu — tetap bisa diubah orang. */
export const AMBANG_YAKIN = 0.6;

/**
 * Kandidat barang gudang untuk satu baris struk, terurut dari paling mirip.
 *
 * @returns {Array<{item, skor, yakin}>}
 */
export function cariKandidat(namaStruk, barangGudang = [], batas = 5) {
  return (barangGudang || [])
    .filter((w) => w && w.is_active !== false)
    .map((item) => {
      const skor = Math.max(
        skorCocok(namaStruk, item.name),
        // SKU kadang ikut tertulis di catatan pesanan.
        item.sku && String(namaStruk).toLowerCase().includes(String(item.sku).toLowerCase()) ? 1 : 0,
      );
      return { item, skor, yakin: skor >= AMBANG_YAKIN };
    })
    .filter((k) => k.skor >= AMBANG_TAWAR)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, batas);
}

/**
 * Apakah angka-angka satu baris struk masuk akal?
 *
 * Marketplace menampilkan angka yang ambigu: kadang harga satuan, kadang
 * subtotal baris. Pada pesanan Zoetics 25 Agustus, 3 x Rp 2.500 + 5 x Rp 1.500
 * = Rp 15.000, tetapi total pesanannya Rp 13.000. Selisihnya bisa voucher,
 * bisa juga karena angka yang tertera memang subtotal, bukan harga satuan.
 *
 * Menebak di sini berarti menulis angka rupiah yang salah ke catatan keuangan.
 * Jadi fungsi ini hanya MELAPORKAN ketidakcocokannya, dan layar yang memakainya
 * wajib meminta orang memastikan.
 */
export function periksaAngka({ jumlah, hargaSatuan, subtotal }) {
  const q = Number(jumlah) || 0;
  const h = Number(hargaSatuan) || 0;
  const s = Number(subtotal) || 0;
  if (!q || !h) return { cocok: null, pesan: "" };
  const hitung = q * h;
  if (!s) return { cocok: null, pesan: `${q} × ${h.toLocaleString("id-ID")} = ${hitung.toLocaleString("id-ID")}` };
  if (Math.abs(hitung - s) <= 1) return { cocok: true, pesan: "" };
  return {
    cocok: false,
    pesan: `${q} × ${h.toLocaleString("id-ID")} = ${hitung.toLocaleString("id-ID")}, tapi subtotal tertulis ${s.toLocaleString("id-ID")}. Angka di struk bisa berarti harga satuan ATAU subtotal — pastikan dulu.`,
  };
}
