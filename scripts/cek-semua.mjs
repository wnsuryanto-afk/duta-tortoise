/**
 * cek-semua.mjs — jalankan semua penjaga sekaligus.
 *
 * Semuanya lahir dari kesalahan nyata yang terjadi di aplikasi ini, dan
 * semuanya memeriksa hal yang TIDAK ditangkap oleh `vite build`:
 *
 *   cek-impor       fungsi pustaka dipakai tanpa di-import → komponen crash
 *                   saat dirender, build tetap hijau
 *   cek-kolom-hantu kolom ditulis tapi tidak ada di skema → datanya dibuang
 *   cek-timbang     aturan "siapa perlu ditimbang" menjawab salah → kura
 *                   sakit terlewat, atau rotasi yang tak selesai kembali
 *   cek-batch       stok gudang berkurang tanpa menurunkan sisa batch →
 *                   dua angka untuk satu rak, keduanya masuk akal
 *   cek-fungsi      berkas fungsi yang dijalankan ≠ yang diedit → perbaikan
 *                   yang terlihat selesai tapi tidak pernah terpasang
 *   cek-kolom-baca  kolom dibaca tapi tidak ada di skema → filter nol baris,
 *                   alarm mati, dan laporan yang terlihat bersih
 *                   diam-diam, tanpa error
 *   cek-kepatuhan   angka kepatuhan SOP menjawab salah → bonus dan
 *                   kepercayaan kiper dihitung dari angka yang bocor
 *   cek-kembar      pustaka frontend dan kembaran backend-nya melenceng →
 *                   layar dan otomatisasi malam menjawab beda
 *   cek-unggah      UploadFile dikirimi Blob tanpa nama berkas → ditolak
 *                   server, dan dua pemakainya menelan errornya
 *   cek-laporan     angka uang yang ditampilkan tanpa menyaring penjualan
 *                   yang dikecualikan atau data Mode Uji
 *   cek-entitas     tabel yang dibaca tapi tak pernah ditulis (layar selalu
 *                   kosong), ditulis tapi tak pernah dibaca (data hilang), atau
 *                   menganggur menunggu ditulisi orang yang salah sangka
 *   eslint          variabel yang dipakai tapi tidak ada (no-undef). Halaman
 *                   Pembelian pernah mati karena satu sisa nama variabel di
 *                   daftar dependensi useMemo — build tetap hijau.
 *
 * Jalankan:  node scripts/cek-semua.mjs
 */
import { execFileSync } from "child_process";

// cek-render ditambahkan 03-09-2026. Lima penjaga sebelumnya memeriksa apakah
// kodenya SAH; tidak satu pun pernah MENJALANKANNYA. Penjaga baru ini merender
// komponen layar kiper, dan pada hari pertama langsung menemukan tombol yang
// melempar TypeError saat data user belum termuat.
const PENJAGA = ["cek-impor.mjs", "cek-kolom-hantu.mjs", "cek-kolom-baca.mjs", "cek-fungsi.mjs", "cek-batch.mjs", "cek-timbang.mjs", "cek-kepatuhan.mjs", "cek-kembar.mjs", "cek-unggah.mjs", "cek-entitas.mjs", "cek-batas.mjs", "cek-laporan.mjs", "cek-render.mjs"];
let gagal = 0;

for (const p of PENJAGA) {
  process.stdout.write(`\n── ${p} ${"─".repeat(Math.max(0, 46 - p.length))}\n`);
  try {
    process.stdout.write(execFileSync("node", [`scripts/${p}`], { encoding: "utf8" }));
  } catch (e) {
    process.stdout.write(e.stdout || "");
    process.stderr.write(e.stderr || "");
    gagal++;
  }
}

// ESLint ikut dijalankan di sini, bukan berdiri sendiri — penjaga yang harus
// diingat orang untuk dijalankan terpisah adalah penjaga yang tidak dijalankan.
process.stdout.write(`\n── eslint ${"─".repeat(40)}\n`);
try {
  execFileSync("npx", ["eslint", ".", "--quiet"], { encoding: "utf8", stdio: "pipe" });
  process.stdout.write("Tidak ada variabel tak dikenal atau impor menganggur.\n");
} catch (e) {
  process.stdout.write(e.stdout || "");
  process.stderr.write(e.stderr || "");
  gagal++;
}

console.log(gagal === 0 ? "\nSemua penjaga lolos." : `\n${gagal} penjaga gagal.`);
process.exit(gagal ? 1 : 0);
