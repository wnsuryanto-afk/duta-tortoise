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
 * Keperluan yang masuk akal untuk barang gudang (obat, vitamin, habis pakai).
 * Keperluan pakan sengaja tidak ada di sini — pakan punya alurnya sendiri.
 */
export const KEPERLUAN_GUDANG = [
  { nilai: "pengobatan_kura", label: "Pengobatan kura", perluKura: true },
  { nilai: "kebersihan", label: "Kebersihan kandang", perluKura: false },
  { nilai: "perbaikan", label: "Perbaikan / pemeliharaan", perluKura: false },
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
