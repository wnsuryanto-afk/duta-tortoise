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
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

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

  // Nama yang benar-benar di-import: bentuk bernama, default, dan namespace.
  const diimport = new Set();
  for (const m of s.matchAll(/import\s*\{([^}]*)\}\s*from/gs)) {
    for (const bagian of m[1].split(",")) {
      const nama = bagian.trim().split(/\s+as\s+/)[0].trim();
      if (nama) diimport.add(nama);
    }
  }
  for (const m of s.matchAll(/import\s+(\w+)\s*(?:,|from)/g)) diimport.add(m[1]);
  for (const m of s.matchAll(/import\s+\*\s+as\s+(\w+)/g)) diimport.add(m[1]);

  // Nama yang didefinisikan di berkas ini sendiri — termasuk yang datang lewat
  // destructuring. Tanpa ini, prop komponen seperti
  // `function DataLengkapFilter({ isIncomplete })` akan dikira pemakaian
  // fungsi pustaka bernama sama, dan laporannya jadi penuh temuan palsu.
  const lokal = new Set(
    [...s.matchAll(/(?:^|\s)(?:function|const|let|var|class)\s+(\w+)/g)].map((m) => m[1]),
  );

  /*
   * Nama yang lahir dari destructuring. Dua bentuk, dan KEDUANYA pernah
   * membuat penjaga ini melapor temuan palsu sepanjang hari:
   *
   *   const { menunggu: poinMenunggu } = ringkasPoin(...)
   *     Nama lokalnya `poinMenunggu` — sisi KANAN titik dua. Versi lama
   *     mengambil sisi kiri, jadi `poinMenunggu` tidak pernah tercatat
   *     sebagai lokal dan dilaporkan "memakai poinMenunggu() tanpa import".
   *
   *   const [sudahDibayar, setSudahDibayar] = useState(true)
   *     Destructuring larik tidak diperiksa sama sekali. Setiap useState
   *     yang namanya kebetulan sama dengan ekspor pustaka jadi temuan palsu.
   *
   * Penjaga yang selalu merah lebih buruk daripada tidak ada penjaga: ia
   * melatih orang mengabaikan seluruh rangkaiannya. Itu yang terjadi di
   * sini — tiga penjaga lain yang benar-benar menemukan masalah ikut
   * tidak terbaca.
   */
  const catatLokal = (daftar) => {
    for (const bagian of daftar.split(",")) {
      let nama = bagian.trim().replace(/^\.\.\./, "");
      if (!nama) continue;
      // Buang nilai bawaan lebih dulu: `{ a = 1 }`, `{ a: b = 1 }`.
      nama = nama.split("=")[0].trim();
      // Lalu ambil sisi KANAN titik dua bila ada — itulah nama lokalnya.
      const titikDua = nama.lastIndexOf(":");
      if (titikDua !== -1) nama = nama.slice(titikDua + 1).trim();
      if (/^\w+$/.test(nama)) lokal.add(nama);
    }
  };
  for (const m of s.matchAll(/\{([^{}]*)\}\s*(?:=|=>|\)|,)/g)) catatLokal(m[1]);
  for (const m of s.matchAll(/(?:const|let|var)\s*\[([^\]]*)\]\s*=/g)) catatLokal(m[1]);

  // Buang komentar dan string sebelum mencari pemakaian — inilah yang dulu
  // membuat skrip lama tertipu oleh path di dalam komentar.
  const kode = kupasKomentar(s)
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
