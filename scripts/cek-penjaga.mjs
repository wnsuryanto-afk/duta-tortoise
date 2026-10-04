/**
 * cek-penjaga.mjs — penjaga yang menjaga penjaganya sendiri.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * Lima penjaga membuang komentar dengan satu baris yang sama sebelum
 * memeriksa kode:
 *
 *     s.replace(/\/\*[\s\S]*?\*\//g, "")
 *
 * Baris itu tidak tahu apa-apa soal tanda kutip, dan satu atribut yang ada
 * di hampir setiap formulir unggah foto memuat tanda komentar di dalam teks:
 *
 *     <input type="file" accept="image/*" ... />
 *
 * Semua kode sesudahnya ikut terhapus sampai ketemu penutup komentar
 * berikutnya. Diukur 4 Okt 2026: 13 berkas, 13.799 karakter kode nyata,
 * tidak pernah dilihat kelima penjaga itu. Yang terparah
 * `src/pages/EditProfilePage.jsx` — tiga perempat berkasnya.
 *
 * Di `HatchDialog.jsx` yang hilang persis mencakup payload `babyData` dan
 * pemanggilan `Tortoise.bulkCreate`. cek-modeuji.mjs melaporkan "semua
 * pencatatan menghormati Mode Uji" tanpa pernah melihat keduanya.
 *
 * Penjaga yang hijau karena tidak bisa melihat kodenya lebih buruk daripada
 * tidak ada penjaga: ia memberi rasa aman yang tidak dibayar apa pun — dan
 * tidak ada yang akan memeriksanya lagi, justru karena hijau.
 *
 * ── Dua hal yang dijaga ──────────────────────────────────────────────
 *
 * 1. Tidak ada skrip di scripts/ yang mengupas komentar sendiri. Satu-satunya
 *    jalan adalah lib/kupasKomentar.mjs.
 * 2. kupasKomentar menjawab benar untuk enam bentuk yang mudah salah.
 *
 * Jalankan:  node scripts/cek-penjaga.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const temuan = [];

/* ── 1. Tidak ada pengupas komentar tandingan ──────────────────────── */

const SUMBER = "scripts/lib/kupasKomentar.mjs";
const POLA_NAIF = /replace\s*\(\s*\/\\\/\\\*\[\\s\\S\]\*\?\\\*\\\/\//;

let diperiksa = 0;
for (const nama of readdirSync(join(AKAR, "scripts"))) {
  if (!nama.endsWith(".mjs")) continue;
  /*
   * Berkas ini sendiri dilewati: ia MENYEBUT pola terlarang itu di dalam
   * pesan kesalahannya sendiri, dan penjaga yang menuduh dirinya sendiri
   * adalah penjaga yang langsung dimatikan orang.
   */
  if (nama === "cek-penjaga.mjs") continue;
  const rel = `scripts/${nama}`;
  const isi = readFileSync(join(AKAR, "scripts", nama), "utf8");
  diperiksa++;
  if (POLA_NAIF.test(isi)) {
    temuan.push(
      `${rel}  mengupas komentar sendiri dengan /\\/\\*[\\s\\S]*?\\*\\// — ` +
      `pola itu ikut memakan kode sesudah teks yang memuat "/*", seperti accept="image/*". ` +
      `Pakai kupasKomentar() dari ${SUMBER}.`,
    );
  }
}

/* ── 2. kupasKomentar menjawab benar ───────────────────────────────── */

/*
 * Kasusnya bukan karangan: kelimanya diambil dari bentuk yang benar-benar
 * ada di src/, dan yang terakhir (pembagian, bukan regex) ada untuk
 * memastikan penanganan regex tidak kebablasan ke arah sebaliknya.
 */
const kasus = [
  [`<input accept="image/*" />\nconst a = 1;`, "const a = 1;", 'tanda komentar di dalam atribut accept'],
  [`const u = "http://x"; const b = 2;`, "const b = 2;", "// di dalam teks berkutip"],
  ["const re = /https?:\\/\\//; const c = 3;", "const c = 3;", "regex yang memuat //"],
  [`const t = \`a/*b\`; const e = 5;`, "const e = 5;", "/* di dalam template"],
  [`const f = 10 / 2; const g = 6;`, "const g = 6;", "pembagian, bukan regex"],
];
for (const [kode, harusAda, kenapa] of kasus) {
  const hasil = kupasKomentar(kode);
  if (!hasil.includes(harusAda)) {
    temuan.push(`kupasKomentar membuang kode yang sah (${kenapa}): "${kode}" -> "${hasil}"`);
  }
}

// Dan komentar yang SUNGGUHAN tetap harus hilang — kalau tidak, penjaga
// yang membaca kodenya akan tersandung penjelasan tentang cacat itu sendiri.
const komentarUji = [
  ["/* buang */ const h = 7;", "buang"],
  ["const i = 8; // buang juga", "buang juga"],
];
for (const [kode, tidakBolehAda] of komentarUji) {
  if (kupasKomentar(kode).includes(tidakBolehAda)) {
    temuan.push(`kupasKomentar tidak membuang komentar: "${kode}"`);
  }
}

// Nomor baris harus tetap: beberapa penjaga melaporkan `berkas:baris`.
const banyakBaris = "const a = 1;\n// komentar\nconst b = 2;\n/* dua\n   baris */\nconst c = 3;";
if (kupasKomentar(banyakBaris).split("\n").length !== banyakBaris.split("\n").length) {
  temuan.push("kupasKomentar mengubah jumlah baris — nomor baris di laporan penjaga jadi meleset");
}

if (temuan.length) {
  console.error(`${temuan.length} masalah pada penjaganya sendiri.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(`Penjaga memakai satu pengupas komentar (${diperiksa} skrip diperiksa, ${kasus.length + komentarUji.length + 1} kasus pengupasan diuji).`);
process.exit(0);
