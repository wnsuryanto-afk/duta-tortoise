/**
 * cek-impor.mjs — cari fungsi pustaka yang DIPAKAI tapi tidak di-import.
 *
 * Kelas bug yang paling berbahaya di aplikasi ini, karena tidak terlihat sama
 * sekali sebelum sampai ke tangan orang:
 *
 *   - Vite/esbuild TIDAK gagal. Identifier yang tidak dikenal hanyalah variabel
 *     global yang belum ada; itu sah secara sintaks.
 *   - Errornya baru muncul saat komponennya dirender — sebagai layar kosong
 *     atau widget yang hilang, tanpa pesan yang menjelaskan apa-apa.
 *
 * Yang sudah pernah terjadi karenanya, semuanya dalam satu hari:
 *   UrgentAlerts, AIChatbot, MonthlyReportExport  → memanggil perluDiperhatikan
 *     dan kawan-kawan tanpa import. Peringatan stok di beranda, jawaban chatbot
 *     soal stok, dan bagian "Stok Kritis" di PDF laporan bulanan semuanya mati.
 *
 * Penyebabnya sebuah skrip yang memeriksa apakah teks "lib/stokMenipis" sudah
 * ada di berkas — dan teks itu memang ada, di dalam KOMENTAR yang baru saja
 * ditulis. Pemeriksaan di sini memakai daftar nama yang di-import sungguhan,
 * bukan pencocokan teks.
 *
 * Jalankan:  node scripts/cek-impor.mjs
 */
import fs from "fs";
import path from "path";

/** Semua nama yang diekspor src/lib/*.js — inilah permukaan yang berisiko. */
function namaEkspor(dir) {
  const peta = new Map(); // nama → berkas asal
  for (const fn of fs.readdirSync(dir)) {
    if (!fn.endsWith(".js") && !fn.endsWith(".jsx")) continue;
    const s = fs.readFileSync(path.join(dir, fn), "utf8");
    for (const m of s.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/gm)) {
      if (!peta.has(m[1])) peta.set(m[1], `${dir}/${fn}`);
    }
  }
  return peta;
}

function berkas(dir, keluar = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

const ekspor = namaEkspor("src/lib");
let gagal = 0;
let diperiksa = 0;

for (const p of berkas("src")) {
  if (p.startsWith("src/lib/")) continue; // pustaka boleh saling pakai
  const s = fs.readFileSync(p, "utf8");

  // Nama yang benar-benar di-import (menangani import multi-baris).
  const diimport = new Set();
  for (const m of s.matchAll(/import\s*\{([^}]*)\}\s*from/gs)) {
    for (const bagian of m[1].split(",")) {
      const nama = bagian.trim().split(/\s+as\s+/)[0].trim();
      if (nama) diimport.add(nama);
    }
  }
  // Nama yang didefinisikan di berkas ini sendiri.
  const lokal = new Set(
    [...s.matchAll(/(?:^|\s)(?:function|const|let|var|class)\s+(\w+)/g)].map((m) => m[1]),
  );

  // Buang komentar dan string sebelum mencari pemakaian — inilah yang dulu
  // membuat skrip lama tertipu oleh path di dalam komentar.
  const kode = s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');

  for (const [nama, asal] of ekspor) {
    if (diimport.has(nama) || lokal.has(nama)) continue;
    diperiksa++;
    // Dipakai sebagai pemanggilan fungsi atau nilai, bukan sebagai properti
    // objek lain (x.nama) — itu hal yang berbeda.
    const dipakai = new RegExp(`(?<![.\\w$])${nama}\\s*[\\(,\\)\\]}]`).test(kode);
    if (dipakai) {
      console.error(`TANPA IMPORT  ${p}\n    memakai ${nama}() — ada di ${asal}`);
      gagal++;
    }
  }
}

if (gagal === 0) {
  console.log(`Semua pemakaian pustaka punya import (${ekspor.size} nama ekspor diperiksa).`);
  process.exit(0);
}
console.error(`\n${gagal} pemakaian tanpa import. Build TIDAK akan gagal karena ini —`);
console.error("errornya baru muncul saat komponennya dirender.");
process.exit(1);
