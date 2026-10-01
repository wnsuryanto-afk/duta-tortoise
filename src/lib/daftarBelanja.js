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
// Nilai yang sama ada di AMBANG_GAWAT_HARI / AMBANG_WASPADA_HARI
// (lib/urgensiStok.js). Tidak diimpor karena kembaran backend berkas ini
// berjalan di Deno dan tidak bisa membaca src/ — lihat scripts/cek-kembar.mjs.
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

/** Nama dirapikan untuk dibandingkan: spasi ganda dan huruf besar diabaikan. */
function kunciNama(teks) {
  return String(teks || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/* ── Dari cabang perbaikan, digabungkan 27 September 2026 ──────────────────
 *
 * Berkas ini lahir dua kali di dua garis pengembangan yang terpisah, dengan
 * nama yang sama tetapi isi yang berbeda: sisi yang hidup menangani "barang ini
 * sudah menunggu di daftar belanja?", sisi cabang menangani "baris mana yang
 * cocok dengan barang yang baru datang?". Keduanya dipakai, jadi keduanya
 * disimpan.
 */

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

/**
 * Barang yang DIBUAT SENDIRI, bukan dibeli.
 *
 * ── Kenapa fungsi ini ada ───────────────────────────────────────────
 *
 * VIT-REP00 "RACIKAN Vitamin Reproduksi Betina" adalah hasil meracik 12
 * bahan, bukan barang yang bisa dipesan. Stoknya nol dan batas minimumnya
 * 3.000 gram, jadi penilai stok menandainya gawat, dan tombol "masukkan
 * barang gawat ke daftar belanja" di beranda memasukkannya seperti barang
 * lain.
 *
 * Itu sudah pernah ketahuan. Pada 31-08-2026 barisnya dibatalkan dengan
 * keterangan yang menjelaskan persis duduk perkaranya — "yang perlu
 * dibeli adalah bahannya (Fermipan, Vitamin E, Vitamin D3), lalu
 * diproduksi lewat Stok & Gudang → tab Resep".
 *
 * Tiga minggu kemudian, 20-09-2026, barisnya masuk lagi.
 *
 * Keterangan pada satu baris yang dibatalkan tidak menghalangi apa pun:
 * ia menunggu dibaca, sementara yang memasukkannya kembali adalah tombol.
 * Jadi aturannya sekarang dihitung dari datanya sendiri — sebuah barang
 * yang menjadi `output_item_id` sebuah resep tidak pernah ditawarkan
 * untuk dibeli.
 *
 * Bahannya tetap ditawarkan seperti biasa, dan memang itu yang benar:
 * ketiga bahan pemblokir Duta Repro sudah ada di daftar belanja bertanda
 * "segera" — yang keliru hanya barang jadinya.
 *
 * @param {Array} resep daftar PelletRecipe
 * @returns {Set<string>} id WarehouseItem yang merupakan hasil racikan
 */
/*
 * DIPINDAHKAN 02-10-2026 ke lib/stokMenipis.js, dan diteruskan dari sini.
 *
 * Aturan ini dipakai golonganStok() untuk memisahkan golongan `perluDiracik`,
 * jadi ia harus tinggal serumah dengan golonganStok — kalau tidak, sisi
 * backend-nya (base44/shared/stok.ts) perlu mengimpor kembaran berkas ini
 * hanya demi dua fungsi kecil.
 *
 * Diteruskan, bukan dihapus: KeputusanHariIni.jsx dan cek-ronda.mjs
 * mengimpornya dari sini sejak 01-10-2026.
 */
export { idBarangRacikan, diracikSendiri } from "./stokMenipis";
