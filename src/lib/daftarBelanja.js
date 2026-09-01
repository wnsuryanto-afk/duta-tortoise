/**
 * daftarBelanja.js — SATU definisi untuk daftar belanja.
 *
 * Dua aturan yang sebelumnya ditulis ulang di tiap layar dan tidak pernah sama:
 *
 * 1. "Barang ini sudah menunggu di daftar belanja?"
 *    Beranda dan halaman Pembelian sama-sama mencocokkan lewat NAMA. Nama di
 *    daftar belanja adalah label kurasi lengkap — "Chlorhexidine 0,05%
 *    [ALT-0114] - APOTEK - antiseptik luka dalam" — sementara nama di gudang
 *    "Chlorhexidine 0.05% (Hibitane/Savlon)". Tidak pernah cocok. Akibatnya
 *    beranda menawarkan "Tambah 46 ke daftar belanja" padahal 17 di antaranya
 *    sudah terdaftar, dan menekannya membuat baris kembar.
 *
 *    Pencocokan sekarang lewat SKU dan id gudang lebih dulu — keduanya identitas
 *    yang stabil — dan nama hanya sebagai jaring terakhir.
 *
 * 2. "Bagaimana bentuk baris belanja yang lahir dari barang gudang?"
 *    Beranda tidak pernah menulis item_sku maupun warehouse_item_id, halaman
 *    Pembelian menulis warehouse_item_id saja. Baris tanpa keduanya hanya bisa
 *    dicocokkan lewat nama saat barangnya datang — dan itu menebak.
 *
 * CATATAN KOLOM: ShoppingList hanya punya `nama_barang`. `item_name` adalah
 * sisa impor generasi pertama, tidak ada di skema, isinya sudah lama tidak
 * sinkron dengan `item_sku` di baris yang sama, dan sudah dihapus dari seluruh
 * data. Jangan menghidupkannya kembali sebagai cadangan.
 */

const RAPI = (v) => String(v ?? "").trim().toLowerCase();

/** Status baris yang masih menunggu dibeli. */
export const STATUS_MENUNGGU = "belum_dibeli";

/**
 * Kumpulan penanda identitas satu baris belanja: SKU, id gudang, dan nama.
 * Dipakai untuk mencocokkan tanpa bergantung pada satu kolom saja.
 */
export function penandaBaris(baris) {
  return [
    baris?.item_sku ? `sku:${RAPI(baris.item_sku)}` : "",
    baris?.warehouse_item_id ? `id:${baris.warehouse_item_id}` : "",
    baris?.nama_barang ? `nama:${RAPI(baris.nama_barang)}` : "",
  ].filter(Boolean);
}

/** Penanda yang sama, dibaca dari sisi barang gudang / pakan. */
export function penandaBarang(item) {
  return [
    item?.sku ? `sku:${RAPI(item.sku)}` : "",
    item?.id ? `id:${item.id}` : "",
    item?.name ? `nama:${RAPI(item.name)}` : "",
  ].filter(Boolean);
}

/** Set penanda semua baris yang masih menunggu dibeli. */
export function penandaMenunggu(daftarBelanja = []) {
  const s = new Set();
  (daftarBelanja || [])
    .filter((b) => b && b.status === STATUS_MENUNGGU)
    .forEach((b) => penandaBaris(b).forEach((k) => s.add(k)));
  return s;
}

/** Apakah barang gudang ini sudah punya baris yang menunggu dibeli? */
export function sudahDidaftar(item, penanda) {
  return penandaBarang(item).some((k) => penanda.has(k));
}

/**
 * Bentuk baris belanja yang lahir dari sebuah barang gudang/pakan.
 *
 * `item_sku` dan `warehouse_item_id` selalu diisi bila ada: keduanya yang
 * dipakai penerimaan barang untuk menambah stok ke item yang benar. Tanpa
 * keduanya, penerimaan mencocokkan lewat nama dan bisa membuat barang gudang
 * baru yang kembar.
 */
export function barisDariBarang(item, opsi = {}) {
  const jumlah = Math.max(1, Math.ceil(Number(opsi.jumlah ?? item?.minimum_stock) || 1));
  // Kalau harga tidak disebut, pakai harga beli barangnya — sama dengan
  // kembaran backend di base44/shared/daftarBelanja.ts.
  //
  // Versi lama tidak pernah mengisi harga sama sekali, sementara kembaran
  // backend-nya sudah menerimanya sejak awal — melenceng tanpa ketahuan karena
  // cek-kembar belum membandingkan fungsi ini. Akibatnya baris yang ditambah
  // otomatis dari beranda selalu bertotal Rp 0, dan "perkiraan total belanja"
  // hanya menjumlahkan baris yang kebetulan diisi tangan: 16 dari 32 baris
  // berharga nol pada 31-08-2026, jadi angkanya tidak bisa dipakai memutuskan
  // apa pun.
  const harga = Number(opsi.hargaPerUnit ?? item?.purchase_price) || 0;
  return {
    nama_barang: item?.name || "",
    jumlah,
    satuan: item?.unit || "pcs",
    priority: opsi.priority || prioritasDariBarang(item, opsi.urgensi),
    status: STATUS_MENUNGGU,
    ...(item?.sku ? { item_sku: item.sku } : {}),
    ...(item?.id ? { warehouse_item_id: item.id } : {}),
    ...(harga > 0 ? { harga_est_per_unit: harga, total_est: harga * jumlah } : {}),
    ...(opsi.notes ? { notes: opsi.notes } : {}),
  };
}


/** Total perkiraan belanja dari baris-baris yang menunggu. */
export function totalPerkiraan(daftarBelanja = []) {
  return (daftarBelanja || [])
    .filter((b) => b && b.status === STATUS_MENUNGGU)
    .reduce((s, b) => s + (Number(b.total_est) || 0), 0);
}

/*
  Prioritas baris belanja TIDAK boleh diketik tangan.

  Tombol "masukkan ke daftar belanja" di beranda dulu menulis "segera" untuk
  setiap baris tanpa kecuali, dan impor awal juga menaruh "segera" di mana-mana.
  Hasilnya 26 dari 32 baris bertanda segera pada 01-09-2026 — kalau semua
  mendesak, tidak ada yang mendesak, dan kolomnya berhenti bisa dipakai
  menyaring apa pun.

  Aturannya sekarang dibaca dari keadaan barangnya sendiri, dengan ambang yang
  SENGAJA sama dengan tingkatUrgensi() di lib/urgensiStok.js. Kalau ambang di
  sini dan di sana berbeda, beranda akan menyebut sebuah barang gawat sementara
  daftar belanjanya menulis "bulan ini".
*/
const AMBANG_SEGERA_HARI = 3;
const AMBANG_MINGGU_INI_HARI = 14;

/**
 * Prioritas belanja sebuah barang: "segera" | "minggu_ini" | "bulan_ini".
 *
 * @param item barang gudang / pakan
 * @param urgensi hasil nilaiUrgensiStok untuk barang itu bila ada:
 *   { sisaHari, menguncSOP }. Bawaannya barang itu sendiri, karena
 *   nilaiUrgensiStok menempelkan kedua kolom itu ke salinan barangnya.
 *   Tanpa data pemakaian, keputusan jatuh ke stok dan minimumnya saja.
 */
export function prioritasDariBarang(item, urgensi = item || {}) {
  const menguncSOP = !!urgensi.menguncSOP;
  const sisaHari = Number(urgensi.sisaHari);
  const wajib = !!(item && item.is_mandatory);
  const stok = Number(item && item.current_stock) || 0;
  const minimum = Number(item && item.minimum_stock) || 0;
  if (menguncSOP) return "segera";
  if (stok <= 0) return wajib ? "segera" : "minggu_ini";
  if (Number.isFinite(sisaHari) && sisaHari >= 0 && sisaHari <= AMBANG_SEGERA_HARI) return "segera";
  if (Number.isFinite(sisaHari) && sisaHari >= 0 && sisaHari <= AMBANG_MINGGU_INI_HARI) return "minggu_ini";
  if (minimum > 0 && stok <= minimum) return "minggu_ini";
  return "bulan_ini";
}
