/**
 * cek-kembar.mjs — penjaga terhadap pergeseran diam-diam antara pustaka
 * frontend (src/lib/*.js) dan kembarannya di backend (base44/shared/*.ts).
 *
 * Deno tidak bisa mengimpor dari src/, jadi setiap aturan bersama terpaksa
 * ditulis dua kali. Selama dua salinan itu ada, salah satunya bisa diubah
 * sendirian — dan tidak ada error apa pun yang muncul. Yang terjadi hanyalah
 * layar dan otomatisasi malam mulai menjawab beda untuk pertanyaan yang sama.
 *
 * Contoh nyata yang ditemukan skrip ini: masukLaporan() memakai `!nilai` di
 * frontend dan `nilai !== true` di backend. Sama untuk boolean, berbeda begitu
 * kolomnya berisi hal lain.
 *
 * Jalankan:  node scripts/cek-kembar.mjs
 * Keluar dengan kode 1 bila ada yang melenceng.
 */
import fs from "fs";

const PASANGAN = [
  ["src/lib/stokMenipis.js",   "base44/shared/stok.ts",          ["stokHabis", "stokMenipis", "perluDiperhatikan", "dilacak"]],
  ["src/lib/laporan.js",       "base44/shared/laporan.ts",       ["masukLaporan"]],
  ["src/lib/populasiKura.js",  "base44/shared/kura.ts",          ["diPeternakan"]],
  ["src/lib/breedingUtils.js", "base44/shared/kura.ts",          ["clutchAktif"]],
  ["src/lib/daftarBelanja.js", "base44/shared/daftarBelanja.ts", ["penandaBaris", "penandaBarang", "penandaMenunggu", "sudahDidaftar", "barisDariBarang", "prioritasDariBarang"]],
];

// Perbandingan sengaja "buta" terhadap hal yang memang boleh beda antara
// JavaScript dan TypeScript: nama parameter, anotasi tipe, komentar, spasi.
// Yang dibandingkan hanya bentuk logikanya.
function badan(src, nama) {
  const re = new RegExp(`export function ${nama}\\s*\\(([^)]*)\\)\\s*(?::[^{]+)?\\{([\\s\\S]*?)\\n\\}`);
  const m = src.match(re);
  if (!m) return null;
  const params = m[1].split(",").map((p) => p.trim().split(/[:=\s]/)[0]).filter(Boolean);
  let t = m[2];
  t = t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
  for (const p of params) t = t.replace(new RegExp(`\\b${p}\\b`, "g"), "_");
  t = t.replace(/:\s*(boolean|number|string|any|unknown|Set<string>|string\[\]|any\[\])/g, "");
  t = t.replace(/<string>/g, "").replace(/\s+/g, "");
  return t;
}

let gagal = 0;
let diperiksa = 0;
for (const [fe, be, fns] of PASANGAN) {
  const sf = fs.readFileSync(fe, "utf8");
  const sb = fs.readFileSync(be, "utf8");
  for (const fn of fns) {
    diperiksa++;
    const a = badan(sf, fn);
    const b = badan(sb, fn);
    if (a === null || b === null) {
      console.error(`HILANG      ${fn} tidak ada di ${a === null ? fe : be}`);
      gagal++;
      continue;
    }
    if (a !== b) {
      console.error(`MELENCENG   ${fn}\n    ${fe}\n      ${a}\n    ${be}\n      ${b}`);
      gagal++;
    }
  }
}
if (gagal === 0) console.log(`Semua kembaran cocok (${diperiksa} fungsi diperiksa).`);
process.exit(gagal ? 1 : 0);
