import { masukLaporan } from "./laporan";
import { dilacak } from "./stokMenipis";
/**
 * urgensiStok.js — SUMBER TUNGGAL penilaian "seberapa gawat sebuah barang".
 *
 * Sebelumnya perhitungan sisa hari hanya ada di dalam StockPredictionPage,
 * sementara Ringkasan Pagi memakai ukuran yang sama sekali berbeda
 * (current_stock < minimum_stock). Akibatnya dua layar bisa menyebut barang
 * yang sama "aman" dan "kritis" pada saat bersamaan.
 *
 * Ambang di bawah ini adalah keputusan pemilik peternakan, bukan tebakan:
 * sebuah barang naik ke kartu keputusan bila sisa pakainya 3 hari atau kurang.
 */

/** Sisa pakai ≤ ambang ini → gawat, harus diputuskan hari ini. */
export const AMBANG_GAWAT_HARI = 3;

/** Sisa pakai ≤ ambang ini → waspada, cukup masuk daftar belanja rutin. */
export const AMBANG_WASPADA_HARI = 14;

/** Jendela penghitungan rata-rata pemakaian harian. */
const JENDELA_HARI = 30;

/**
 * Status pergerakan stok yang benar-benar mengubah stok.
 *
 * StockMovement bisa berstatus menunggu_approval atau ditolak. Keduanya belum
 * (atau tidak akan) mengurangi stok, jadi menghitungnya sebagai pemakaian
 * membuat perkiraan habisnya terlalu cepat. WarehouseTransaction tidak punya
 * status sama sekali — barisnya baru dibuat setelah stoknya berubah.
 */
const STATUS_TERPAKAI = ["selesai", "disetujui"];

/**
 * Apakah satu baris riwayat berarti barangnya benar-benar dipakai/keluar?
 *
 * Nama field-nya `type`, bukan `transaction_type`. Yang lama dibaca di sini
 * selama ini padahal tidak ada di skema StockMovement maupun
 * WarehouseTransaction, sehingga penyaringnya tidak pernah cocok sekali pun:
 * pemakaian selalu terhitung nol, sisa hari pakai selalu Infinity, dan setiap
 * barang selalu dinilai "aman — belum ada data pemakaian". Prediksi Stok hanya
 * pernah menyebut barang yang stoknya sudah nol, yang bukan prediksi.
 *
 * `transaction_type` tetap ikut dibaca untuk berjaga-jaga bila ada data lama.
 */
export function adalahPemakaian(t) {
  if (!t) return false;
  if (!masukLaporan(t)) return false;
  if (t.status && !STATUS_TERPAKAI.includes(t.status)) return false;
  const jenis = t.type || t.transaction_type;
  return jenis === "keluar" || jenis === "pakai";
}

/**
 * Satukan dua buku riwayat stok yang dipakai aplikasi ini.
 *
 * StockMovement adalah buku yang sebenarnya — delapan layar menulis ke sana.
 * WarehouseTransaction hanya ditulis satu layar gudang. Perkiraan pemakaian
 * dulu membaca yang kedua saja, jadi hampir semua pemakaian tidak terlihat.
 */
export function gabungRiwayatPemakaian(...daftar) {
  return daftar.flat().filter(Boolean);
}

/**
 * Perkiraan sisa hari pakai sebuah barang.
 *
 * @returns {number} `-1` bila stok sudah habis, `Infinity` bila belum ada data
 *   pemakaian sama sekali (tidak bisa disebut aman maupun gawat), atau jumlah
 *   hari perkiraan.
 */
export function hitungSisaHari(item, transactions = []) {
  if (!item) return Infinity;
  if (!item.current_stock || item.current_stock <= 0) return -1;

  const batas = Date.now() - JENDELA_HARI * 86400000;

  const terpakai = transactions.reduce((total, t) => {
    if (t.item_id !== item.id && t.item_name !== item.name) return total;
    if (!adalahPemakaian(t)) return total;
    const waktu = Date.parse(t.created_date || t.date || "");
    if (!Number.isFinite(waktu) || waktu < batas) return total;
    return total + Math.abs(t.quantity || 0);
  }, 0);

  const rataHarian = terpakai / JENDELA_HARI;
  if (rataHarian > 0) return item.current_stock / rataHarian;

  // Tanpa riwayat pemakaian, pakai takaran ideal harian bila barangnya punya.
  const ideal = item.daily_ideal || 0;
  if (ideal > 0) return item.current_stock / ideal;

  return Infinity;
}

/**
 * SKU yang dibutuhkan SOP aktif tapi stoknya kosong.
 *
 * Barang seperti ini menghentikan pekerjaan tim hari itu juga, jadi ia selalu
 * gawat berapa pun sisa harinya — logika yang sama dipakai kartu "Harus Dibeli".
 *
 * @returns {{ idMengunci: Set<string>, skuHilang: string[] }}
 */
export function barangPenguncikSOP(sopTasks = [], warehouse = []) {
  const perSku = {};
  warehouse.forEach((w) => { if (w.sku) perSku[w.sku] = w; });

  const dibutuhkan = new Set();
  sopTasks.forEach((t) => (t.required_skus || []).forEach((sku) => dibutuhkan.add(sku)));

  const idMengunci = new Set();
  const skuHilang = [];
  dibutuhkan.forEach((sku) => {
    const w = perSku[sku];
    if (!w || (w.current_stock || 0) <= 0) {
      skuHilang.push(sku);
      if (w?.id) idMengunci.add(w.id);
    }
  });

  return { idMengunci, skuHilang };
}

/**
 * Tingkat urgensi satu barang: "gawat" | "waspada" | "aman".
 *
 * Barang tanpa data pemakaian tidak pernah dinaikkan ke "gawat" hanya karena
 * datanya kosong — menebak-nebak di sini berarti mengisi kartu keputusan
 * dengan hal yang belum tentu masalah.
 */
export function tingkatUrgensi({ sisaHari, menguncSOP = false, wajib = false }) {
  if (menguncSOP) return "gawat";
  // Stok nol pada barang yang TIDAK ditandai wajib bukan kabar buruk: 43 dari
  // 125 barang gudang berstok nol karena memang sengaja tidak distok — obat
  // resep dokter, suku cadang lampu, alat yang dipinjam saat perlu. Aturan
  // lama menaikkan semuanya ke "gawat", jadi beranda menyebut 46 barang
  // setiap hari dan tidak satu pun bisa dipadamkan dengan bekerja.
  //
  // Gerbang `is_mandatory` ini SENGAJA sama dengan stokHabis() di
  // lib/stokMenipis.js. Dua berkas ini sama-sama mengaku sumber tunggal;
  // selama ambangnya beda, beranda dan daftar belanja akan selalu berbeda
  // angka betapapun rapinya masing-masing.
  if (sisaHari === -1) return wajib ? "gawat" : "aman";
  if (!Number.isFinite(sisaHari)) return "aman";
  if (sisaHari <= AMBANG_GAWAT_HARI) return "gawat";
  if (sisaHari <= AMBANG_WASPADA_HARI) return "waspada";
  return "aman";
}

const URUTAN = { gawat: 0, waspada: 1, aman: 2 };

/**
 * Nilai seluruh barang sekaligus, terurut dari yang paling mendesak.
 *
 * @returns {Array} salinan tiap barang + `sisaHari`, `tingkat`, `menguncSOP`,
 *   dan `alasan` — kalimat siap tampil yang menjelaskan kenapa ia mendesak.
 */
export function nilaiUrgensiStok(warehouse = [], transactions = [], sopTasks = []) {
  const { idMengunci } = barangPenguncikSOP(sopTasks, warehouse);

  // Saringan `dilacak` ditaruh DI SINI, bukan di tiap pemanggil. Sebelumnya
  // tiap layar harus ingat menyaringnya sendiri, dan KeputusanHariIni lupa —
  // sehingga tiga barang bertanda [DUPLIKAT - ABAIKAN] tetap muncul di kartu
  // keputusan beranda meski sudah dinonaktifkan berhari-hari sebelumnya.
  return warehouse
    .filter(dilacak)
    .map((item) => {
      const sisaHari = hitungSisaHari(item, transactions);
      const menguncSOP = idMengunci.has(item.id);
      const wajib = !!item.is_mandatory;
      const tingkat = tingkatUrgensi({ sisaHari, menguncSOP, wajib });
      return { ...item, sisaHari, menguncSOP, tingkat, alasan: alasanUrgensi({ sisaHari, menguncSOP }) };
    })
    .sort((a, b) => {
      const beda = URUTAN[a.tingkat] - URUTAN[b.tingkat];
      if (beda !== 0) return beda;
      const sa = Number.isFinite(a.sisaHari) ? a.sisaHari : 9999;
      const sb = Number.isFinite(b.sisaHari) ? b.sisaHari : 9999;
      return sa - sb;
    });
}

/** Kalimat pendek yang menjelaskan kenapa sebuah barang mendesak. */
export function alasanUrgensi({ sisaHari, menguncSOP }) {
  if (menguncSOP) return "menghentikan SOP";
  if (sisaHari === -1) return "stok habis";
  if (!Number.isFinite(sisaHari)) return "belum ada data pemakaian";
  const hari = Math.max(0, Math.round(sisaHari));
  if (hari === 0) return "habis hari ini";
  return `sisa ${hari} hari`;
}
