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
 * Stok habis untuk barang yang ditandai wajib ada.
 *
 * Gate `is_mandatory` sengaja dipertahankan: tanpa itu setiap barang yang
 * memang sengaja dibiarkan nol ikut berteriak.
 */
export function stokHabis(item: any): boolean {
  return !!item?.is_mandatory && angka(item.current_stock) <= 0;
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
