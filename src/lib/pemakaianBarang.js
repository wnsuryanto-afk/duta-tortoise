/**
 * pemakaianBarang.js — satu definisi "barang keluar dari gudang, dipakai siapa,
 * untuk apa, dan biayanya menempel ke mana".
 *
 * Kenapa berkas ini ada: sampai 31 Agustus 2026, aplikasi ini TIDAK PUNYA
 * SATU PUN catatan barang keluar. Nol, sejak hari pertama. Stok hanya bisa
 * naik. Akibatnya berantai:
 *
 *   - Prediksi Stok tidak pernah bisa memprediksi apa pun.
 *   - "Wajib distok" jadi klaim yang tidak bisa diuji ke kenyataan.
 *   - Harga pokok seekor kura tidak mengandung biaya obat sepeser pun, jadi
 *     kura yang diobati berbulan-bulan dan kura yang sehat terlihat sama
 *     mahalnya.
 *
 * Aturan "baris ini berarti barang benar-benar dipakai" TIDAK ditulis ulang di
 * sini — ia sudah ada sebagai adalahPemakaian() di urgensiStok.js dan dipakai
 * perhitungan sisa hari. Dua salinan pasti melenceng.
 */

import { adalahPemakaian } from "./urgensiStok";

/** Keperluan pengambilan yang berarti biaya menempel ke seekor kura. */
export const KEPERLUAN_KURA = "pengobatan_kura";

/**
 * Barang dikeluarkan karena lewat tanggal, bukan karena dipakai.
 *
 * Sebelum ini ada, satu-satunya cara mengurangi stok obat kedaluwarsa adalah
 * mencatatnya sebagai "Lainnya" — yang berarti buku mencatat obat itu DIPAKAI.
 * Dua akibatnya: biayanya masuk sebagai biaya perawatan, dan perkiraan
 * pemakaian menghitungnya sebagai kecepatan pakai, lalu menyuruh membeli lagi
 * sebanyak yang dibuang. Alarm kedaluwarsa yang berujung pada pembelian ulang
 * otomatis adalah alarm yang membuat keadaan lebih buruk.
 */
export const KEPERLUAN_BUANG = "dibuang_kedaluwarsa";

/**
 * Keperluan yang masuk akal untuk barang gudang (obat, vitamin, habis pakai).
 * Keperluan pakan sengaja tidak ada di sini — pakan punya alurnya sendiri.
 */
export const KEPERLUAN_GUDANG = [
  { nilai: "pengobatan_kura", label: "Pengobatan kura", perluKura: true },
  { nilai: "kebersihan", label: "Kebersihan kandang", perluKura: false },
  { nilai: "perbaikan", label: "Perbaikan / pemeliharaan", perluKura: false },
  { nilai: KEPERLUAN_BUANG, label: "Dibuang — lewat tanggal", perluKura: false },
  { nilai: "lainnya", label: "Lainnya", perluKura: false },
];

export function perluPilihKura(keperluan) {
  return KEPERLUAN_GUDANG.find((k) => k.nilai === keperluan)?.perluKura === true;
}

const RAPI = (s) => String(s || "").trim().toUpperCase();

/** Apakah pengambilan ini dibebankan ke kura tertentu? */
export function untukKura(pergerakan, kodeKura) {
  if (!adalahPemakaian(pergerakan)) return false;
  if (!kodeKura) return false;
  return RAPI(pergerakan.tortoise_code) === RAPI(kodeKura);
}

/**
 * Total biaya barang gudang yang pernah dibebankan ke seekor kura.
 *
 * Dipakai hitungHppKura(). Dikembalikan beserta barisnya supaya layar bisa
 * menunjukkan obat apa saja yang membentuk angka itu — HPP yang tidak bisa
 * ditelusuri ke barisnya hanya angka yang harus dipercaya.
 *
 * @returns {{ total: number, baris: Array }}
 */
export function biayaBarangKura(pergerakan = [], kura) {
  const kode = kura?.code || kura?.tortoise_code || kura;
  const baris = pergerakan.filter((m) => untukKura(m, kode));
  const total = baris.reduce((t, m) => t + (Number(m.total_value) || 0), 0);
  return { total: Math.round(total), baris };
}

/**
 * Total nilai barang yang SUDAH dibebankan ke kura tertentu, seluruh kura.
 *
 * Dipakai useCostPerTortoise untuk mengeluarkannya dari kolam biaya bersama.
 * Tanpa pengurangan ini, obat terhitung DUA KALI: sekali saat dibeli (masuk
 * total pengeluaran, lalu dibagi rata ke semua kura sebagai tarif perawatan
 * bulanan), dan sekali lagi saat diambil untuk seekor kura (menempel langsung
 * ke harga pokoknya). Rupiah yang sama, dua tempat.
 *
 * @param {string} awalanBulan opsional "YYYY-MM" untuk membatasi ke satu bulan
 */
export function biayaTerbebanKura(pergerakan = [], awalanBulan = null) {
  return pergerakan.reduce((t, m) => {
    if (!adalahPemakaian(m)) return t;
    if (!RAPI(m.tortoise_code)) return t;
    if (awalanBulan && !String(m.date || "").startsWith(awalanBulan)) return t;
    return t + (Number(m.total_value) || 0);
  }, 0);
}

/**
 * Susun satu baris pergerakan "barang keluar untuk pengobatan".
 *
 * Dipakai layar pindai DAN formulir kesehatan, supaya keduanya menulis bentuk
 * yang sama persis. Dua penyusun terpisah pasti melenceng — dan yang melenceng
 * di sini adalah angka yang menempel ke harga pokok seekor kura.
 */
export function barisPengambilan({ item, jumlah, hargaSatuan, nilai, keperluan, kodeKura, tanggal, user, catatan, stokSetelah }) {
  return {
    item_id: item.id,
    item_type: "warehouse",
    item_name: item.name,
    item_sku: item.sku || "",
    type: "keluar",
    quantity: Number(jumlah) || 0,
    unit: item.unit || "pcs",
    unit_price: hargaSatuan,
    total_value: nilai,
    stock_after: stokSetelah,
    keperluan: keperluan || KEPERLUAN_KURA,
    tortoise_code: kodeKura || "",
    date: tanggal,
    status: "selesai",
    by_email: user?.email || "",
    by_name: user?.full_name || user?.email || "",
    notes: catatan || "",
  };
}

/**
 * Nilai satu pengambilan: jumlah × harga beli barang saat ini.
 *
 * Harga diambil dari purchase_price barang, BUKAN dari batch. Selama batch
 * belum dipakai konsisten, memakai harga batch untuk sebagian barang dan
 * harga barang untuk sisanya menghasilkan dua ukuran biaya dalam satu laporan.
 */
export function nilaiPengambilan(item, jumlah) {
  const harga = Number(item?.purchase_price) || 0;
  const qty = Number(jumlah) || 0;
  return { hargaSatuan: harga, total: Math.round(harga * qty) };
}

/**
 * Cari barang gudang dari hasil pindaian QR.
 *
 * Label rak berisi SKU (mis. "OBT-0102"); label batch berisi kode batch
 * (mis. "BATCH-T0102-260831-1"). Keduanya harus bisa dipindai oleh layar yang
 * sama — memaksa orang ingat label mana yang boleh dipindai adalah cara pasti
 * membuat fiturnya tidak dipakai.
 *
 * @returns {{ item: object|null, batch: object|null, kode: string }}
 */
export function cariDariPindaian(teks, warehouse = [], batches = []) {
  const kode = RAPI(teks);
  if (!kode) return { item: null, batch: null, kode };

  const batch = batches.find((b) => RAPI(b.batch_code) === kode) || null;
  if (batch) {
    const item =
      warehouse.find((w) => w.id === batch.item_id) ||
      warehouse.find((w) => RAPI(w.sku) === RAPI(batch.item_sku)) ||
      null;
    return { item, batch, kode };
  }

  const item = warehouse.find((w) => RAPI(w.sku) === kode) || null;
  return { item, batch: null, kode };
}

/**
 * Kode batch yang benar-benar unik.
 *
 * Versi pertama memakai `sku.slice(-6)` — dan enam huruf terakhir sebuah SKU
 * justru MEMBUANG awalan yang membedakannya. "VIT-0102" dan "ALT-0102"
 * keduanya menjadi "T-0102", jadi Vitamin B Kompleks dan Suntikan 3cc
 * mendapat kode batch yang sama persis; begitu pula Oxytocin dengan Jarum 25G,
 * dan Elektrolit dengan Alkohol. Enam dari dua puluh batch hasil penerimaan
 * 31-08-2026 kembar seperti ini.
 *
 * Kalau labelnya sempat tercetak dan ditempel, memindainya akan memunculkan
 * barang yang salah — dan stok yang salah itulah yang berkurang. Kebetulan
 * belum satu pun label dicetak saat ini ketahuan.
 *
 * @param {string} sku SKU LENGKAP, bukan potongannya.
 * @param {string} tanggalYymmdd mis. "260831"
 * @param {string[]} kodeTerpakai kode batch yang sudah ada, untuk menghindari bentrok
 */
export function kodeBatch(sku, tanggalYymmdd, kodeTerpakai = []) {
  const dasar = `BATCH-${RAPI(sku) || "TANPA-SKU"}-${tanggalYymmdd}`;
  const dipakai = new Set(kodeTerpakai.map(RAPI));
  let n = 1;
  while (dipakai.has(`${dasar}-${n}`)) n += 1;
  return `${dasar}-${n}`;
}

/**
 * Rencana pengurangan batch saat barang keluar dari gudang.
 *
 * Ada DUA jalur yang mengeluarkan barang, dan sampai sekarang keduanya tidak
 * melakukan hal yang sama:
 *
 *   AmbilBarangScan  → WarehouseItem.current_stock ✓  StockMovement ✓  BatchBarang.jumlah_sisa ✓
 *   HealthForm       → WarehouseItem.current_stock ✓  StockMovement ✓  BatchBarang.jumlah_sisa ✗
 *
 * Jadi mengobati seekor kura lewat formulir kesehatan menurunkan stok gudang
 * tanpa menurunkan sisa batch mana pun. Total gudang dan jumlah sisa seluruh
 * batch perlahan berpisah, dan yang membaca angka batch — peringatan
 * kedaluwarsa, dasbor admin, cetak label — akan menunjukkan barang yang
 * sebenarnya sudah habis dipakai.
 *
 * Belum ada kerusakan pada data sekarang: seluruh 23 batch masih utuh karena
 * belum satu pun pengobatan dicatat lewat jalur itu. Pemotongan pertama lewat
 * formulir kesehatan-lah yang akan memulai selisihnya.
 *
 * Urutannya FEFO — yang paling cepat kedaluwarsa dipakai lebih dulu; batch
 * tanpa tanggal kedaluwarsa dipakai terakhir, karena ia tidak mendesak.
 * Batch yang sudah dibuka didahulukan di antara tanggal yang sama, supaya
 * kemasan terbuka habis sebelum membuka yang baru.
 *
 * Fungsi ini MURNI — ia hanya menghitung. Yang memanggil yang menyimpan.
 *
 * @returns {{rencana: Array<{id: string, jumlah_sisa: number, diambil: number}>, kurang: number}}
 *   `kurang` > 0 berarti batch yang tercatat tidak cukup untuk menutup jumlah
 *   yang diambil — bukan alasan menggagalkan pencatatan (barangnya nyata-nyata
 *   sudah dipakai), tapi perlu diberitahukan.
 */
export function rencanaPotongBatch(batches = [], itemId, jumlah) {
  let sisaDiambil = Number(jumlah) || 0;
  if (sisaDiambil <= 0) return { rencana: [], kurang: 0 };

  const kandidat = (batches || [])
    .filter((b) => b && b.item_id === itemId && b.status !== "habis" && (Number(b.jumlah_sisa) || 0) > 0)
    .sort((a, b) => {
      const ta = a.tanggal_expired || "9999-12-31";
      const tb = b.tanggal_expired || "9999-12-31";
      if (ta !== tb) return ta < tb ? -1 : 1;
      const ba = a.tanggal_buka ? 0 : 1;
      const bb = b.tanggal_buka ? 0 : 1;
      if (ba !== bb) return ba - bb;
      return String(a.tanggal_terima || "").localeCompare(String(b.tanggal_terima || ""));
    });

  const rencana = [];
  for (const b of kandidat) {
    if (sisaDiambil <= 0) break;
    const tersedia = Number(b.jumlah_sisa) || 0;
    const diambil = Math.min(tersedia, sisaDiambil);
    rencana.push({ id: b.id, jumlah_sisa: tersedia - diambil, diambil });
    sisaDiambil -= diambil;
  }

  return { rencana, kurang: sisaDiambil };
}
