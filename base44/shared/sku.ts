/**
 * sku.ts — membuat SKU barang gudang & stok pakan.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────
 *
 * SKU bukan hiasan. potongStokPakan mencocokkan bahan lewat SKU, bukan
 * nama atau id, jadi barang tanpa SKU tidak bisa dipilih sebagai bahan
 * terpakai dan tidak akan pernah memotong stok.
 *
 * Diperiksa 30-09-2026:
 *
 *   WarehouseItem  133 baris, SEMUANYA punya SKU.
 *   FeedStock       12 baris, 3 aktif — dan dua yang benar-benar ada
 *                   isinya tidak punya SKU:
 *                       Melon BS   400 kg    sku: null
 *                       Rumput      65 kg    sku: null
 *                   Sembilan yang ber-SKU semuanya nonaktif, stok 0.
 *
 * Sebabnya: PakanHarianForm membuat baris FeedStock secara otomatis
 * ("Auto-created dari Pakan Harian") tanpa SKU. Jadi justru bahan yang
 * BENAR-BENAR dipakai tim yang tidak bisa dijadikan bahan terpakai,
 * sementara daftar ber-SKU-nya berisi barang nonaktif bersisa nol.
 *
 * Ada tombol "Generate SKU Massal" di Stok & Gudang yang membereskannya
 * sekali jalan, tapi selama sisi pembuatnya tidak ikut diperbaiki, hal
 * yang sama lahir lagi tiap kali jenis pakan baru dicatat.
 *
 * ── Kenapa dikembarkan dengan sisi server ───────────────────────────
 *
 * Logika yang sama sudah ada di base44/functions/backfillSKU. Dua salinan
 * yang boleh berbeda berarti SKU yang dibuat saat pencatatan bisa
 * berbenturan dengan SKU yang dibuat saat backfill. Keduanya kini memakai
 * base44/shared/sku.ts, dan scripts/cek-kembar.mjs menjaga keduanya tetap
 * menjawab sama.
 */

/** Awalan SKU per kategori FeedStock. */
export const PREFIKS_PAKAN: Record<string, string> = {
  sayuran: "SYR", buah: "BUH", rumput: "RPT", pelet: "PLT",
  suplemen: "SPM", hay: "HAY", lainnya: "LNN",
};

/** Awalan SKU per kategori WarehouseItem. */
export const PREFIKS_GUDANG: Record<string, string> = {
  obat: "OBT", vitamin: "VIT", suplemen: "SPM", peralatan: "ALT",
  habis_pakai: "ALT", alat_kerja: "ALT", pakan: "PKN", lainnya: "LNN",
};

/**
 * SKU berikutnya untuk sebuah awalan, diambil dari yang TERBESAR yang
 * sudah ada — bukan dari jumlah barisnya.
 *
 * Memakai jumlah baris akan mendaur ulang nomor begitu satu barang
 * dihapus, dan dua barang ber-SKU sama membuat pemotongan stok mengenai
 * barang yang keliru.
 */
export function skuBerikutnya(prefiks: string, skuYangAda: string[] = []): string {
  const angka = (skuYangAda || [])
    .filter((s: string) => typeof s === "string" && s.startsWith(prefiks + "-"))
    .map((s: string) => parseInt(s.slice(prefiks.length + 1), 10))
    .filter((n: number) => Number.isFinite(n));
  const maks = angka.length > 0 ? Math.max(...angka) : 0;
  return `${prefiks}-${String(maks + 1).padStart(4, "0")}`;
}

/** SKU untuk satu baris FeedStock baru. */
export function skuPakanBaru(kategori: string, skuYangAda: string[] = []): string {
  return skuBerikutnya(PREFIKS_PAKAN[kategori] || "LNN", skuYangAda);
}

/** SKU untuk satu baris WarehouseItem baru. */
export function skuGudangBaru(kategori: string, skuYangAda: string[] = []): string {
  return skuBerikutnya(PREFIKS_GUDANG[kategori] || "LNN", skuYangAda);
}
