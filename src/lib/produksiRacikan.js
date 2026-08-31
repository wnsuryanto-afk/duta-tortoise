/**
 * produksiRacikan.js — satu definisi "meracik batch dari bahan gudang".
 *
 * Tiga hal yang salah pada versi pertama, dan ketiganya diam:
 *
 * 1. SATUAN TIDAK PERNAH DIKONVERSI. Resep menulis takaran dalam KILOGRAM;
 *    bahan racikan di gudang disimpan dalam GRAM. Kodenya mengurangi angka
 *    resep langsung dari angka stok — jadi "kalsium 7 kg" memotong 7 GRAM dari
 *    stok 15.000 gram. Satu batch 21 kg mengurangi total 21 gram bahan.
 *    Pemeriksa kecukupan stok pun selalu lolos (15.000 ≥ 7), sehingga tidak
 *    pernah ada yang menahan produksi meski bahannya sebenarnya kurang.
 *
 * 2. PEMAKAIAN BAHAN TIDAK DICATAT. Stok diubah langsung tanpa StockMovement,
 *    jadi pemakaian terbesar di peternakan ini tidak terlihat oleh perkiraan
 *    sisa hari maupun laporan mana pun.
 *
 * 3. BIAYANYA DIBUANG. Hasil jadinya dibuat sebagai barang baru di tabel pakan
 *    dengan price_per_unit 0, sementara VIT-REP00 di gudang tetap nol
 *    selamanya. Harga bahan yang susah payah diisi — kalsium Rp 4,20/gram,
 *    fenugreek Rp 69,90/gram — tidak pernah sampai ke racikan jadinya.
 *    Vitamin yang diberikan ke seluruh kura betina tiap hari tercatat gratis.
 *
 * Berkas ini memusatkan hitungannya supaya layar produksi, pemeriksa stok, dan
 * perhitungan biaya membaca angka yang sama.
 */

/** Berapa satuan barang dalam 1 kilogram. */
const PER_KG = {
  gram: 1000, g: 1000, gr: 1000,
  kg: 1, kilogram: 1,
  ml: 1000, cc: 1000,     // pendekatan 1 kg ≈ 1 liter untuk bahan cair
  liter: 1, l: 1,
};

/**
 * Faktor pengali dari takaran resep (kg) ke satuan barang di gudang.
 * Satuan yang tidak dikenal (pcs, botol, sachet) dianggap 1 — barang seperti
 * itu memang tidak ditakar per kilogram.
 */
export function faktorSatuan(satuanBarang) {
  return PER_KG[String(satuanBarang || "").trim().toLowerCase()] ?? 1;
}

/**
 * Rincian kebutuhan satu kali produksi.
 *
 * @param {object} resep         PelletRecipe
 * @param {number} jumlahKg      berapa kg yang akan diproduksi
 * @param {Array}  semuaBarang   gabungan WarehouseItem + FeedStock
 * @returns {Array} tiap baris: { ing, item, butuh, satuan, hargaSatuan, biaya, cukup, adaHarga }
 */
export function rincianBahan(resep, jumlahKg, semuaBarang = []) {
  const skala = Number(jumlahKg) / (Number(resep?.yield_kg) || 1);
  return (resep?.ingredients || []).map((ing) => {
    const item = semuaBarang.find((i) => i.id === ing.item_id) || null;
    const satuan = item?.unit || ing.unit || "kg";
    // Takaran resep SELALU kg. Inilah konversi yang dulu hilang.
    const butuh = (Number(ing.quantity_kg) || 0) * skala * faktorSatuan(satuan);
    const hargaSatuan = Number(item?.purchase_price ?? item?.price_per_unit) || 0;
    return {
      ing,
      item,
      satuan,
      butuh,
      hargaSatuan,
      biaya: Math.round(butuh * hargaSatuan),
      cukup: !!item && (Number(item.current_stock) || 0) >= butuh,
      adaHarga: hargaSatuan > 0,
    };
  });
}

/** Bahan yang stoknya kurang atau barangnya hilang — penghalang produksi. */
export function masalahBahan(rincian = []) {
  return rincian
    .filter((r) => !r.item || !r.cukup)
    .map((r) =>
      !r.item
        ? `${r.ing.item_name}: barangnya tidak ada di gudang`
        : `${r.ing.item_name}: butuh ${bulat(r.butuh)} ${r.satuan}, stok cuma ${bulat(r.item.current_stock)} ${r.satuan}`
    );
}

/** Bahan yang stoknya cukup tapi harganya belum diisi — biaya jadi terlalu murah. */
export function bahanTanpaHarga(rincian = []) {
  return rincian.filter((r) => r.item && !r.adaHarga).map((r) => r.ing.item_name);
}

export function totalBiaya(rincian = []) {
  return rincian.reduce((t, r) => t + r.biaya, 0);
}

/**
 * Harga pokok hasil racikan, per satuan barang keluarannya.
 *
 * @param {number} biaya       total biaya bahan
 * @param {number} jumlahKg    hasil produksi dalam kg
 * @param {string} satuanHasil satuan barang keluaran (gram/kg/…)
 */
export function hppHasil(biaya, jumlahKg, satuanHasil) {
  const jumlahDalamSatuan = (Number(jumlahKg) || 0) * faktorSatuan(satuanHasil);
  if (jumlahDalamSatuan <= 0) return 0;
  return biaya / jumlahDalamSatuan;
}

/** Jumlah hasil produksi, dinyatakan dalam satuan barang keluarannya. */
export function jumlahHasil(jumlahKg, satuanHasil) {
  return (Number(jumlahKg) || 0) * faktorSatuan(satuanHasil);
}

/**
 * Barang tujuan hasil produksi.
 *
 * Duta Repro punya tempatnya sendiri di gudang (VIT-REP00 "RACIKAN batch
 * jadi"). Versi lama mengabaikannya dan membuat barang baru di tabel pakan,
 * jadi ada dua barang untuk satu racikan dan yang di gudang tetap nol.
 *
 * Urutannya: id yang ditunjuk resep dulu, lalu nama yang sama persis di
 * gudang, baru pakan. Menebak lewat nama ditaruh paling belakang karena itu
 * pencocokan yang paling mudah meleset.
 */
export function cariBarangHasil(resep, warehouseItems = [], feedItems = []) {
  const rapi = (s) => String(s || "").trim().toLowerCase();
  if (resep?.output_item_id) {
    const w = warehouseItems.find((i) => i.id === resep.output_item_id);
    if (w) return { item: w, jenis: "warehouse" };
    const f = feedItems.find((i) => i.id === resep.output_item_id);
    if (f) return { item: f, jenis: "feedstock" };
  }
  const w = warehouseItems.find((i) => rapi(i.name) === rapi(resep?.name));
  if (w) return { item: w, jenis: "warehouse" };
  const f = feedItems.find((i) => rapi(i.name) === rapi(resep?.name));
  if (f) return { item: f, jenis: "feedstock" };
  return { item: null, jenis: "feedstock" };
}

function bulat(n) {
  const x = Number(n) || 0;
  return x >= 100 ? Math.round(x).toLocaleString("id-ID") : x.toFixed(2).replace(/\.00$/, "");
}
