/**
 * cek-batch.mjs — setiap jalur yang MENGURANGI stok gudang harus ikut
 * menurunkan sisa batch.
 *
 * ── KENAPA ─────────────────────────────────────────────────────────
 *
 * Jumlah barang di gudang disimpan dua kali: `WarehouseItem.current_stock`
 * dan jumlah `BatchBarang.jumlah_sisa` seluruh batchnya. Keduanya harus
 * bergerak bersama. Kalau salah satu jalur lupa, keduanya berpisah pelan-
 * pelan — dan tidak ada yang melempar error, karena dua-duanya tetap angka
 * yang masuk akal.
 *
 * Yang membaca angka batch bukan hal sepele: peringatan kedaluwarsa, urutan
 * pengambilan FEFO, dan cetak label. Batch yang sisanya lebih besar dari
 * kenyataan membuat aplikasi menyuruh memakai botol yang sudah tidak ada.
 *
 * 17-09-2026 ditemukan EMPAT jalur mengurangi stok gudang dan hanya DUA
 * yang menurunkan sisa batch:
 *
 *   AmbilBarangScan   ✓
 *   HealthForm        ✓ (baru ditambahkan sebelumnya)
 *   Tombol +/- stok   ✗  → diperbaiki
 *   Produksi racikan  ✗  → diperbaiki
 *   PelletRecipePage  ✗  → halaman dihapus, salinan kedua yang lebih buruk
 *
 * ── CARA MEMERIKSANYA ──────────────────────────────────────────────
 *
 * Berkas yang memanggil `WarehouseItem.update` DAN menyebut `current_stock`
 * harus juga menyebut `potongBatchGudang` / `rencanaPotongBatch`, atau ada
 * di DIKECUALIKAN dengan alasan tertulis. Alasannya wajib — pengecualian
 * tanpa alasan adalah cara penjaga berubah jadi hiasan.
 *
 * Jalankan:  node scripts/cek-batch.mjs
 */
import fs from "fs";
import path from "path";

const DIKECUALIKAN = {
  "src/components/stok/StokInventoryTab.jsx":
    "Menyimpan formulir edit barang (stok diketik langsung, bukan dikurangi " +
    "pemakaian). Tombol +/- di berkas yang sama SUDAH memanggil potongBatchGudang.",
  "src/components/stok/PecahBatchDialog.jsx":
    "Membuat batch, bukan memakai barang. Hanya menyentuh expired_date.",
  "src/pages/PembelianPage.jsx":
    "Barang MASUK dari pembelian — batch lahir di sini, tidak dikurangi.",
  "src/components/pettycash/BoughtItemDialog.jsx":
    "Koreksi stok setelah belanja kas kecil: barang masuk, bukan keluar.",
  "base44/functions/potongStokPakan/entry.ts":
    "Hanya FeedStock (pakan). Pakan tidak memakai BatchBarang.",
  "base44/functions/migrasiKategori/entry.ts": "Migrasi satu kali, tidak mengubah jumlah.",
  "base44/functions/migrasiKategoriPakan/entry.ts": "Migrasi satu kali, tidak mengubah jumlah.",
  "base44/functions/migrasiStrukturStok/entry.ts": "Migrasi satu kali, tidak mengubah jumlah.",
};

function berkas(dir, keluar = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "scripts"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx|ts)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

const lolos = [];
let diperiksa = 0;
for (const p of berkas(".")) {
  const s = fs.readFileSync(p, "utf8");
  if (!/entities\.WarehouseItem\.update/.test(s)) continue;
  if (!/current_stock/.test(s)) continue;
  diperiksa++;
  const rapi = p.replace(/^\.\//, "");
  if (DIKECUALIKAN[rapi]) continue;
  if (/potongBatchGudang|rencanaPotongBatch/.test(s)) continue;
  lolos.push(rapi);
}

if (lolos.length === 0) {
  console.log(
    `Semua jalur pengurangan stok gudang menurunkan sisa batch ` +
    `(${diperiksa} berkas diperiksa, ${Object.keys(DIKECUALIKAN).length} dikecualikan dengan alasan).`,
  );
  process.exit(0);
}
console.error("STOK GUDANG BERKURANG TANPA MENURUNKAN SISA BATCH:\n");
for (const p of lolos) console.error(`  ${p}`);
console.error(
  "\nPanggil potongBatchGudang(base44, batchAktif, itemId, jumlah) sesudah\n" +
  "mengurangi current_stock — atau tambahkan berkas ini ke DIKECUALIKAN di\n" +
  "scripts/cek-batch.mjs DENGAN ALASAN tertulis.",
);
process.exit(1);
