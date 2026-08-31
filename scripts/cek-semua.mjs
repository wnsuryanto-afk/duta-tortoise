/**
 * cek-semua.mjs — jalankan semua penjaga sekaligus.
 *
 * Semuanya lahir dari kesalahan nyata yang terjadi di aplikasi ini, dan
 * semuanya memeriksa hal yang TIDAK ditangkap oleh `vite build`:
 *
 *   cek-impor       fungsi pustaka dipakai tanpa di-import → komponen crash
 *                   saat dirender, build tetap hijau
 *   cek-kolom-hantu kolom ditulis tapi tidak ada di skema → datanya dibuang
 *                   diam-diam, tanpa error
 *   cek-kembar      pustaka frontend dan kembaran backend-nya melenceng →
 *                   layar dan otomatisasi malam menjawab beda
 *   cek-unggah      UploadFile dikirimi Blob tanpa nama berkas → ditolak
 *                   server, dan dua pemakainya menelan errornya
 *   cek-entitas     tabel yang dibaca tapi tak pernah ditulis (layar selalu
 *                   kosong), ditulis tapi tak pernah dibaca (data hilang), atau
 *                   menganggur menunggu ditulisi orang yang salah sangka
 *
 * Jalankan:  node scripts/cek-semua.mjs
 */
import { execFileSync } from "child_process";

const PENJAGA = ["cek-impor.mjs", "cek-kolom-hantu.mjs", "cek-kembar.mjs", "cek-unggah.mjs", "cek-entitas.mjs"];
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

console.log(gagal === 0 ? "\nSemua penjaga lolos." : `\n${gagal} penjaga gagal.`);
process.exit(gagal ? 1 : 0);
