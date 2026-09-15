/**
 * Satu definisi "stok ini perlu diperhatikan" — sisi backend.
 *
 * Kembarannya di frontend: src/lib/stokMenipis.js. Deno tidak bisa mengimpor
 * src/, jadi aturannya ditulis dua kali; kalau salah satu diubah, ubah keduanya.
 *
 * ── Enam ambang untuk satu pertanyaan ──
 *
 * Sebelum berkas ini ada, "stok menipis" dijawab berbeda-beda:
 *
 *   autoNotifications     current_stock <= minimum_stock * 3   (ambang 300%)
 *   onStockMovementSaved  current_stock <= minimum_stock
 *   sendDailySummary      current_stock <  minimum_stock
 *   kepalaFeederDigital   minimum_stock > 0 && current_stock <= 0
 *   UrgentAlerts (layar)  current_stock <= minimum_stock
 *   lib/stokMenipis       yang benar
 *
 * Tidak satu pun dari yang lama menyaring `is_active`, dan hanya sebagian yang
 * menghormati `is_mandatory`. Akibatnya pada data peternakan ini: dari 46 barang
 * gudang berstok nol, saringan longgar meloloskan 46 — termasuk 18 barang yang
 * minimumnya 0 dan memang sengaja tidak distok (obat resep dokter), dan barang
 * yang sudah dinonaktifkan pemilik. Peringatan yang menyala untuk semua barang
 * sama saja dengan tidak ada peringatan.
 *
 * Sembilan record pakan juga seluruhnya dinonaktifkan pemilik; tanpa saringan
 * `dilacak` mereka akan terus muncul di ringkasan WhatsApp harian sebagai
 * "perlu dibeli".
 */

function angka(nilai: any): number {
  const n = Number(nilai);
  return Number.isFinite(n) ? n : 0;
}

/** Barang ini masih dilacak? Yang dinonaktifkan pemilik tidak ikut diperiksa. */
export function dilacak(item: any): boolean {
  return item?.is_active !== false;
}

/**
 * Stok habis.
 *
 * Dua jalan, dan yang kedua ditambahkan 15-09-2026:
 *
 *   1. Barang ditandai wajib ada (`is_mandatory`) dan stoknya nol.
 *   2. Barang punya `minimum_stock > 0` dan stoknya nol.
 *
 * Gate `is_mandatory` ada supaya barang yang memang sengaja dibiarkan nol —
 * obat resep dokter, misalnya — tidak ikut berteriak. Tapi barang itu
 * minimumnya 0. Begitu seseorang mengetik minimum, ia sedang menyatakan bahwa
 * ia mau diberi tahu; menuntut centang kedua untuk hal yang sama membuat
 * pernyataan pertama tidak ada artinya.
 *
 * Akibat nyata sebelum diperbaiki: tujuh barang berstok NOL dengan minimum
 * yang sudah diisi tidak pernah masuk peringatan mana pun — termasuk Kasa
 * Basah, Chlorhexidine, dan Baskom Rendam Kura-kura. Keduanya lolos dari
 * `stokHabis` (tidak wajib) dan dari `stokMenipis` (yang mensyaratkan stok
 * masih di atas nol).
 */
export function stokHabis(item: any): boolean {
  const sekarang = angka(item?.current_stock);
  if (sekarang > 0) return false;
  return !!item?.is_mandatory || angka(item?.minimum_stock) > 0;
}

/**
 * Stok menipis: masih ada, tapi sudah di bawah batas minimum.
 *
 * Barang tanpa `minimum_stock` tidak pernah dianggap menipis — batasnya belum
 * ditentukan, dan `0 <= 0` bukan alasan membunyikan alarm.
 */
export function stokMenipis(item: any): boolean {
  const sekarang = angka(item?.current_stock);
  const minimum = angka(item?.minimum_stock);
  return sekarang > 0 && minimum > 0 && sekarang < minimum;
}

/** Perlu diperhatikan: dilacak, DAN habis atau menipis. */
export function perluDiperhatikan(item: any): boolean {
  return dilacak(item) && (stokHabis(item) || stokMenipis(item));
}

/** Saring gabungan barang gudang + pakan ke yang perlu diperhatikan. */
export function stokPerluDiperhatikan(barangGudang: any[] = [], pakan: any[] = []): any[] {
  return [
    ...(barangGudang || []).filter(perluDiperhatikan).map((i) => ({ ...i, _sumber: "gudang" })),
    ...(pakan || []).filter(perluDiperhatikan).map((i) => ({ ...i, _sumber: "pakan" })),
  ];
}

/** Berapa hari sebelum kedaluwarsa sebuah barang mulai diperingatkan. */
export const HARI_PERINGATAN_KADALUARSA = 30;

/**
 * Akan kedaluwarsa dalam `hari` ke depan. Yang sudah lewat tidak dihitung di
 * sini — itu keadaan lain dan ditangani sudahKadaluarsa().
 *
 * Ditambahkan ke sisi backend 15-09-2026. Sebelumnya aturan ini hanya ada di
 * frontend, dan tidak satu pun otomatisasi memeriksanya — jadi kedaluwarsa
 * hanya terlihat oleh orang yang kebetulan membuka halaman stok.
 */
export function akanKadaluarsa(item: any, hari = HARI_PERINGATAN_KADALUARSA, sekarang = new Date()): boolean {
  if (!item?.expired_date) return false;
  const tanggal = new Date(item.expired_date);
  if (Number.isNaN(tanggal.getTime())) return false;
  const selisih = Math.ceil((tanggal.getTime() - sekarang.getTime()) / 86400000);
  return selisih >= 0 && selisih <= hari;
}

/** Sudah lewat tanggal kedaluwarsanya. */
export function sudahKadaluarsa(item: any, sekarang = new Date()): boolean {
  if (!item?.expired_date) return false;
  const tanggal = new Date(item.expired_date);
  if (Number.isNaN(tanggal.getTime())) return false;
  return tanggal.getTime() < sekarang.getTime();
}

/**
 * Kedaluwarsa efektif sebuah BATCH — sisi backend.
 *
 * Kembarannya di frontend: src/lib/kedaluwarsaBatch.js. Kalau salah satu
 * diubah, ubah keduanya.
 *
 * DUA HAL YANG SALAH SAYA LAKUKAN 15-09-2026, dicatat supaya tidak terulang:
 *
 *   1. Kolomnya di BatchBarang bernama `tanggal_expired`, BUKAN `expired_date`
 *      (itu nama di WarehouseItem). Pemeriksaan pertama yang saya pasang
 *      membaca kolom yang tidak ada, jadi ia akan diam selamanya — persis
 *      jenis cacat yang seharian itu saya cari.
 *   2. Tanggal cetak saja tidak cukup. Botol multi-dosis yang sudah dibuka
 *      punya batas pakainya sendiri, dan untuk INJEKVIT B PLEX (100 dosis)
 *      atau Wonder Oxytocin (10 dosis) botolnya bisa terbuka berbulan-bulan.
 *
 * Angka `hari_pakai_setelah_dibuka` bukan milik aplikasi: selama belum diisi
 * dokter hewan, hanya tanggal cetak yang berlaku. Menebak berarti menyatakan
 * aman obat yang sudah tidak.
 */
export function kedaluwarsaEfektifBatch(batch: any, item: any): { tanggal: Date | null; sebab: string | null } {
  const keTanggal = (v: any) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const cetak = keTanggal(batch?.tanggal_expired);
  const dibuka = keTanggal(batch?.tanggal_buka);
  const hari = Number(item?.hari_pakai_setelah_dibuka);
  let setelahBuka: Date | null = null;
  if (dibuka && Number.isFinite(hari) && hari > 0) {
    setelahBuka = new Date(dibuka.getTime());
    setelahBuka.setDate(setelahBuka.getDate() + hari);
  }
  if (cetak && setelahBuka) {
    return setelahBuka < cetak ? { tanggal: setelahBuka, sebab: "buka" } : { tanggal: cetak, sebab: "cetak" };
  }
  if (setelahBuka) return { tanggal: setelahBuka, sebab: "buka" };
  if (cetak) return { tanggal: cetak, sebab: "cetak" };
  return { tanggal: null, sebab: null };
}

/** Sisa hari sampai batch ini jatuh tempo. null bila tanggalnya belum diketahui. */
export function sisaHariBatch(batch: any, item: any, sekarang = new Date()): number | null {
  const { tanggal } = kedaluwarsaEfektifBatch(batch, item);
  if (!tanggal) return null;
  const a = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  const b = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
