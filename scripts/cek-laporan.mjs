/**
 * cek-laporan.mjs — memastikan angka uang yang ditampilkan sudah disaring.
 *
 * Dua penanda mengeluarkan catatan dari laporan: `excluded_from_reports`
 * (dikecualikan pemilik, dan otomatis saat penjualan dibatalkan) dan
 * `is_test_data` (dibuat saat Mode Uji). Aturannya satu, di lib/laporan.js.
 *
 * Kenapa penjaga ini ada. Aturannya sudah ditulis sejak lama, lengkap dengan
 * catatan bahwa ia "ditepati di lima tempat tetapi TIDAK di dua puluh tempat
 * lainnya, termasuk seluruh permukaan keuangan". Catatan itu benar dan tetap
 * benar sampai 15-09-2026: satu penjualan Rp 9.522.500 yang sudah ditandai
 * dikecualikan masih ikut terhitung di Laporan Penjualan, target tahunan,
 * beranda admin, halaman CRM, dan jawaban chatbot.
 *
 * Komentar tidak menahan apa pun. Penjaga menahan.
 *
 * Yang diperiksa: setiap berkas yang MEMBACA Sale atau FinanceTransaction
 * harus menyebut masukLaporan/hanyaLaporan — kecuali yang terdaftar di
 * DIKECUALIKAN di bawah, masing-masing dengan alasannya.
 */
import fs from "fs";
import path from "path";

/**
 * Berkas yang memang harus melihat SEMUA baris, termasuk yang dikecualikan.
 * Setiap entri wajib punya alasan — kalau alasannya tidak bisa ditulis,
 * berkasnya kemungkinan besar memang perlu menyaring.
 */
const DIKECUALIKAN = new Map([
  ["src/lib/transaksiPenjualan.js", "menghapus & menyamakan penanda; justru baris dikecualikan yang dicarinya"],
  ["src/components/common/DeleteConfirmDialog.jsx", "menghitung baris terkait sebelum menghapus; harus melihat semuanya"],
  ["src/components/owner/TransaksiKembar.jsx", "pencari transaksi kembar; menyaring akan menyembunyikan kembarannya"],
  ["src/components/sales/SaleWizard.jsx", "membuat penjualan baru & mencari pembeli; bukan permukaan laporan"],
  ["src/pages/IncompleteDataPage.jsx", "memeriksa kelengkapan data, termasuk baris yang dikecualikan"],
  ["src/components/dashboard/IncompleteDataWidget.jsx", "sama seperti halaman kelengkapan data"],
]);

const AKAR = process.cwd();
const POLA_BACA = /entities\.(Sale|FinanceTransaction)\.(list|filter)\s*\(/;
const POLA_SARING = /masukLaporan|hanyaLaporan/;

function berkas(dir, keluar = []) {
  if (!fs.existsSync(dir)) return keluar;
  for (const nama of fs.readdirSync(dir)) {
    if (nama === "node_modules" || nama === "dist") continue;
    const p = path.join(dir, nama);
    if (fs.statSync(p).isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx)$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

const bocor = [];
const kecualiTakTerpakai = new Set(DIKECUALIKAN.keys());

for (const p of berkas(path.join(AKAR, "src"))) {
  const isi = fs.readFileSync(p, "utf8");
  if (!POLA_BACA.test(isi)) continue;
  const rel = path.relative(AKAR, p);
  if (DIKECUALIKAN.has(rel)) { kecualiTakTerpakai.delete(rel); continue; }
  if (!POLA_SARING.test(isi)) bocor.push(rel);
}

if (bocor.length > 0) {
  console.log(`${bocor.length} berkas membaca Sale/FinanceTransaction tanpa menyaring:`);
  for (const b of bocor) console.log(`  ${b}`);
  console.log(
    "\nBungkus kuerinya dengan .then(hanyaLaporan) dari @/lib/laporan,\n" +
    "atau daftarkan berkasnya di DIKECUALIKAN beserta alasannya.",
  );
  process.exit(1);
}

if (kecualiTakTerpakai.size > 0) {
  console.log("Entri DIKECUALIKAN yang sudah tidak membaca Sale/FinanceTransaction:");
  for (const k of kecualiTakTerpakai) console.log(`  ${k}`);
  console.log("\nHapus dari daftar supaya pengecualiannya tidak diam-diam melebar.");
  process.exit(1);
}

console.log(`Semua permukaan uang sudah disaring (${DIKECUALIKAN.size} berkas dikecualikan dengan alasan).`);
