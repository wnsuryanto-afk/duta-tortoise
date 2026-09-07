/**
 * daftarBelanja.js — mencocokkan baris daftar belanja dengan barang yang datang.
 *
 * Kenapa berkas ini ada:
 *
 * Penerimaan barang dulu hanya menutup baris daftar belanja bila pesanannya
 * membawa `shopping_list_id` — artinya hanya pesanan yang memang LAHIR dari
 * daftar belanja. Padahal sebagian besar pesanan dicatat langsung: dari 20
 * pembelian yang ada, hanya 6 yang membawa penunjuk itu.
 *
 * Akibatnya barangnya datang, stoknya bertambah, dan baris "belum dibeli"-nya
 * tetap berdiri seolah belum pernah dibeli. Pada 6 September 2026 daftar
 * belanja masih meminta:
 *
 *     Oxytocin 10 IU/ml           3 ampul   — stok sebenarnya 22 ampul
 *     Vitamin B Kompleks Injeksi  5 ampul   — stok sebenarnya 505 ampul
 *     Kasa Steril + Plester       1 box     — stok sebenarnya 2 box
 *     NaCl flakon 100 ml          2 botol   — stok sebenarnya 6 botol
 *     Infus NaCl 500 ml           2 botol   — stok sebenarnya 4 botol
 *     Dextrose 5%                 1 botol   — stok sebenarnya 4 botol
 *     Spuit 10 ml                 3 pcs     — stok sebenarnya 6 pcs
 *
 * Ketujuhnya sudah datang pada 31 Agustus 2026 dan tercatat rapi sebagai
 * PembelianBarang berstatus "diterima_penuh". Yang tidak terjadi hanyalah
 * penutupan baris belanjanya.
 */

/** Kunci nama yang tahan beda spasi dan besar-kecil huruf. */
function kunciNama(teks) {
  return String(teks || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Baris daftar belanja yang ditutup oleh satu barang yang diterima.
 *
 * Urutan pencocokan sengaja: penunjuk dulu, nama paling belakang. Nama adalah
 * pencocokan yang paling mudah meleset — nama di daftar belanja sering
 * ditulis panjang ("Oxytocin 10 IU/ml [OBT-0104] - APOTEK/POULTRY") sementara
 * nama barang gudang pendek. Karena itu nama hanya dipakai bila tidak ada satu
 * pun penunjuk yang cocok.
 *
 * Mengembalikan ARRAY: satu barang bisa menutup lebih dari satu baris bila
 * daftar belanja terlanjur punya baris kembar untuk barang yang sama.
 */
export function cocokkanBarisBelanja(daftar = [], itemPesanan = {}, barangGudang = null) {
  const terbuka = (daftar || []).filter((b) => b && b.status === "belum_dibeli");
  if (terbuka.length === 0) return [];

  // 1. Penunjuk langsung dari pesanannya sendiri.
  if (itemPesanan.shopping_list_id) {
    const langsung = terbuka.filter((b) => b.id === itemPesanan.shopping_list_id);
    if (langsung.length > 0) return langsung;
  }

  // 2. Penunjuk ke barang gudang — cara paling andal setelah id barisnya.
  const idBarang = barangGudang?.id || itemPesanan.warehouse_item_id || "";
  if (idBarang) {
    const lewatId = terbuka.filter((b) => b.warehouse_item_id === idBarang);
    if (lewatId.length > 0) return lewatId;
  }

  // 3. SKU.
  const sku = String(itemPesanan.item_sku || barangGudang?.sku || "").trim();
  if (sku) {
    const lewatSku = terbuka.filter((b) => String(b.item_sku || "").trim() === sku);
    if (lewatSku.length > 0) return lewatSku;
  }

  // 4. Nama — hanya bila tidak ada penunjuk sama sekali, dan hanya bila
  //    keduanya sama persis. Pencocokan longgar di sini akan menutup baris
  //    yang salah, dan baris yang tertutup keliru tidak akan pernah dibeli.
  const nama = kunciNama(barangGudang?.name || itemPesanan.nama_barang);
  if (!nama) return [];
  return terbuka.filter((b) => kunciNama(b.nama_barang) === nama);
}
