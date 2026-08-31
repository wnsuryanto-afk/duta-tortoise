/**
 * daftarBelanja.ts — kembaran backend dari src/lib/daftarBelanja.js.
 *
 * Deno tidak bisa mengimpor dari src/, jadi aturan ini terpaksa ditulis dua
 * kali. Bila salah satu diubah, yang lain HARUS ikut diubah — kalau tidak,
 * beranda dan otomatisasi malam akan berbeda pendapat tentang barang apa yang
 * sudah menunggu dibeli, dan yang satu membuat baris kembar yang tidak terlihat
 * oleh yang lain.
 *
 * Dua hal yang diperbaiki dibanding versi lama di belanjaOtomatis:
 *
 * 1. Baris yang DIBATALKAN dulu ikut dihitung sebagai "sudah ada" (saringannya
 *    `status !== "sudah_dibeli"`). Akibatnya barang yang pemilik batalkan tidak
 *    akan pernah ditawarkan lagi oleh otomatisasi — selamanya, tanpa pesan
 *    apa pun. Hanya baris berstatus "belum_dibeli" yang menghalangi.
 *
 * 2. Pencocokan memakai tiga penanda (SKU, id gudang, nama), bukan hanya SKU
 *    atau nama. Nama di daftar belanja adalah label kurasi lengkap —
 *    "Chlorhexidine 0,05% [ALT-0114] - APOTEK" — dan tidak akan pernah sama
 *    persis dengan nama di gudang.
 */

const RAPI = (v: unknown) => String(v ?? "").trim().toLowerCase();

export const STATUS_MENUNGGU = "belum_dibeli";

/** Penanda identitas satu baris belanja. */
export function penandaBaris(baris: any): string[] {
  return [
    baris?.item_sku ? `sku:${RAPI(baris.item_sku)}` : "",
    baris?.warehouse_item_id ? `id:${baris.warehouse_item_id}` : "",
    baris?.nama_barang ? `nama:${RAPI(baris.nama_barang)}` : "",
  ].filter(Boolean);
}

/** Penanda yang sama, dibaca dari sisi barang gudang / pakan. */
export function penandaBarang(item: any): string[] {
  return [
    item?.sku ? `sku:${RAPI(item.sku)}` : "",
    item?.id ? `id:${item.id}` : "",
    item?.name ? `nama:${RAPI(item.name)}` : "",
  ].filter(Boolean);
}

/** Set penanda semua baris yang masih menunggu dibeli. */
export function penandaMenunggu(daftarBelanja: any[] = []): Set<string> {
  const s = new Set<string>();
  (daftarBelanja || [])
    .filter((b) => b && b.status === STATUS_MENUNGGU)
    .forEach((b) => penandaBaris(b).forEach((k) => s.add(k)));
  return s;
}

/** Apakah barang ini sudah punya baris yang menunggu dibeli? */
export function sudahDidaftar(item: any, penanda: Set<string>): boolean {
  return penandaBarang(item).some((k) => penanda.has(k));
}

/**
 * Bentuk baris belanja dari sebuah barang gudang/pakan.
 *
 * item_sku dan warehouse_item_id selalu diisi bila ada: keduanya yang dipakai
 * penerimaan barang untuk menambah stok ke item yang benar. Tanpa itu,
 * penerimaan mencocokkan lewat nama dan bisa membuat barang gudang kembar.
 */
export function barisDariBarang(
  item: any,
  opsi: { priority?: string; notes?: string; jumlah?: number; hargaPerUnit?: number } = {},
) {
  const jumlah = Math.max(1, Math.ceil(Number(opsi.jumlah ?? item?.minimum_stock) || 1));
  // Kalau harga tidak disebut, pakai harga beli barangnya — sama dengan
  // kembaran frontend di src/lib/daftarBelanja.js.
  const harga = Number(opsi.hargaPerUnit ?? item?.purchase_price) || 0;
  return {
    nama_barang: item?.name || "",
    jumlah,
    satuan: item?.unit || "pcs",
    priority: opsi.priority || "minggu_ini",
    status: STATUS_MENUNGGU,
    ...(item?.sku ? { item_sku: item.sku } : {}),
    ...(item?.id ? { warehouse_item_id: item.id } : {}),
    ...(harga > 0 ? { harga_est_per_unit: harga, total_est: harga * jumlah } : {}),
    ...(opsi.notes ? { notes: opsi.notes } : {}),
  };
}
