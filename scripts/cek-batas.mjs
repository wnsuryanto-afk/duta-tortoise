#!/usr/bin/env node
/**
 * PENJAGA: cek-batas
 *
 * SDK Base44 memakai limit BAWAAN 50 baris kalau argumen `limit` tidak
 * ditulis. Tidak ada galat. Tidak ada tanda. Baris ke-51 hilang.
 *
 * Penjaga ini menjaga dua hal:
 *
 *  1. Fungsi backend (Deno) HARUS menulis limit secara eksplisit pada
 *     setiap .list()/.filter(). Tidak ada pembungkus otomatis di sana.
 *
 *  2. Frontend boleh menulis tanpa limit, TAPI hanya selama pembungkus
 *     di src/api/base44Client.js masih ada. Kalau pembungkus itu hilang
 *     atau ada kode lain yang membuat klien SDK sendiri, 200-an
 *     pemanggilan di src/ langsung kembali terpotong di 50 tanpa satu
 *     pun baris kode berubah. Karena itu keberadaan pembungkus ikut
 *     diperiksa di sini.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const AKAR = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

function semuaBerkas(dir, cocok, hasil = []) {
  for (const nama of readdirSync(dir)) {
    if (nama === "node_modules" || nama === ".git" || nama === "dist") continue;
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) semuaBerkas(p, cocok, hasil);
    else if (cocok(nama)) hasil.push(p);
  }
  return hasil;
}

// Nama entitas diambil dari skema, bukan didaftar manual.
const ENTITAS = readdirSync(join(AKAR, "base44/entities"))
  .filter((f) => f.endsWith(".jsonc"))
  .map((f) => f.slice(0, -6))
  .concat([
    "User", "UserProfile", "WhatsAppLog", "WhatsAppSettings", "TreatmentLog",
    "TreatmentSchedule", "WarehouseItem", "WarningLetter", "VetContact",
    "TutorialContent", "ItemUsage", "ItemBorrow", "EnclosureHistory",
    "DeathRecord",
  ]);
const POLA = new RegExp(
  `\\b(${[...new Set(ENTITAS)].sort((a, b) => b.length - a.length).join("|")})\\.(list|filter)\\s*\\(`,
  "g"
);

/** Kembalikan argumen tingkat atas dari pemanggilan yang '(' -nya di indeks i. */
function argumenDari(teks, i) {
  let dalam = 0, mulai = i + 1, keluar = [], j = i, kutip = null;
  while (j < teks.length) {
    const c = teks[j];
    if (kutip) {
      if (c === "\\") { j += 2; continue; }
      if (c === kutip) kutip = null;
    } else if (c === '"' || c === "'" || c === "`") kutip = c;
    else if (c === "(" || c === "[" || c === "{") dalam++;
    else if (c === ")" || c === "]" || c === "}") {
      dalam--;
      if (dalam === 0) { keluar.push(teks.slice(mulai, j)); return { args: keluar, akhir: j }; }
    } else if (c === "," && dalam === 1) { keluar.push(teks.slice(mulai, j)); mulai = j + 1; }
    j++;
  }
  return { args: keluar, akhir: j };
}

const masalah = [];

// ── 1. Fungsi backend wajib limit eksplisit ──────────────────────────
for (const p of semuaBerkas(join(AKAR, "base44/functions"), (n) => n === "entry.ts" || n === "entry.js")) {
  const teks = readFileSync(p, "utf8");
  POLA.lastIndex = 0;
  let m;
  while ((m = POLA.exec(teks))) {
    const metode = m[2];
    const { args } = argumenDari(teks, m.index + m[0].length - 1);
    const bersih = args.map((a) => a.trim());
    const perlu = metode === "list" ? 2 : 3;
    const adaLimit = bersih.length >= perlu && bersih[perlu - 1] !== "";
    if (!adaLimit) {
      const baris = teks.slice(0, m.index).split("\n").length;
      masalah.push(`${relative(AKAR, p)}:${baris}  ${m[1]}.${metode}() tanpa limit`);
    }
  }
}

// ── 2. Pembungkus frontend harus utuh ────────────────────────────────
const klien = readFileSync(join(AKAR, "src/api/base44Client.js"), "utf8");
for (const wajib of ["BATAS_AMBIL", "new Proxy", "klienAsli.entities"]) {
  if (!klien.includes(wajib)) {
    masalah.push(
      `src/api/base44Client.js  kehilangan "${wajib}" — pembungkus batas ambil rusak, ` +
      `seluruh pemanggilan tanpa limit di src/ kembali terpotong di 50 baris`
    );
  }
}

// Hanya base44Client.js yang boleh membuat klien SDK.
for (const p of semuaBerkas(join(AKAR, "src"), (n) => n.endsWith(".js") || n.endsWith(".jsx"))) {
  const rel = relative(AKAR, p);
  if (rel === "src/api/base44Client.js") continue;
  if (/createClient\s*\(/.test(readFileSync(p, "utf8"))) {
    masalah.push(`${rel}  membuat klien SDK sendiri — lewati pembungkus batas ambil`);
  }
}

// Nilai BATAS_AMBIL di kedua sisi harus sama.
const angkaSrc = klien.match(/BATAS_AMBIL\s*=\s*(\d+)/)?.[1];
const angkaFn = readFileSync(join(AKAR, "base44/shared/batas.ts"), "utf8").match(/BATAS_AMBIL\s*=\s*(\d+)/)?.[1];
if (angkaSrc !== angkaFn) {
  masalah.push(`BATAS_AMBIL berbeda: src=${angkaSrc} vs base44/shared=${angkaFn}`);
}

if (masalah.length) {
  console.error(`Ada ${masalah.length} pengambilan data yang bisa terpotong diam-diam:\n`);
  for (const s of masalah) console.error("  " + s);
  console.error(
    `\nPerbaiki dengan menulis limit eksplisit, mis. .filter({...}, null, BATAS_AMBIL)\n` +
    `atau persempit filter di sisi server.`
  );
  process.exit(1);
}
console.log(`Semua pengambilan data punya batas eksplisit (batas = ${angkaFn} baris).`);
