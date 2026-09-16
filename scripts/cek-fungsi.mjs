/**
 * cek-fungsi.mjs — pastikan berkas yang BENAR-BENAR dijalankan adalah berkas
 * yang diedit orang.
 *
 * ── KENAPA ─────────────────────────────────────────────────────────
 *
 * 14 fungsi backend menyimpan kodenya DUA KALI: entry.ts dan main.ts,
 * isinya sama persis, dan function.jsonc menunjuk main.ts sebagai yang
 * dijalankan. Setiap fungsi lain di aplikasi ini memakai entry.ts, jadi
 * entry.ts-lah yang dibuka orang — dan saya — lebih dulu.
 *
 * Mengedit entry.ts pada salah satu dari 14 fungsi itu TIDAK mengubah apa
 * pun di produksi. Tidak ada error, tidak ada peringatan build, penjaga
 * mana pun tetap hijau, dan kode yang berjalan tetap yang lama. Cacat
 * paling sunyi yang bisa dimiliki sebuah repo: perbaikan yang terlihat
 * selesai tapi tidak pernah dipasang.
 *
 * ── YANG DIPERIKSA ─────────────────────────────────────────────────
 *
 *   1. Berkas yang ditunjuk `entry` di function.jsonc memang ada.
 *   2. Bila entry.ts dan main.ts sama-sama ada, isinya harus identik.
 *      Begitu melenceng, salah satunya adalah kode mati — dan tidak ada
 *      cara melihat yang mana tanpa membaca function.jsonc.
 *
 * Jalankan:  node scripts/cek-fungsi.mjs
 */
import fs from "fs";
import path from "path";

const AKAR = "base44/functions";
const masalah = [];
let diperiksa = 0;

for (const nama of fs.readdirSync(AKAR)) {
  const dir = path.join(AKAR, nama);
  if (!fs.statSync(dir).isDirectory()) continue;
  const konfig = path.join(dir, "function.jsonc");
  if (!fs.existsSync(konfig)) continue;
  diperiksa++;

  let j;
  try {
    j = JSON.parse(fs.readFileSync(konfig, "utf8").replace(/^\s*\/\/.*$/gm, ""));
  } catch (e) {
    masalah.push(`${nama}: function.jsonc tidak bisa dibaca — ${e.message}`);
    continue;
  }

  const entry = j.entry || "entry.ts";
  if (!fs.existsSync(path.join(dir, entry))) {
    masalah.push(`${nama}: function.jsonc menunjuk "${entry}", berkasnya tidak ada`);
    continue;
  }

  const a = path.join(dir, "entry.ts");
  const b = path.join(dir, "main.ts");
  if (fs.existsSync(a) && fs.existsSync(b)) {
    if (fs.readFileSync(a, "utf8") !== fs.readFileSync(b, "utf8")) {
      const mati = entry === "main.ts" ? "entry.ts" : "main.ts";
      masalah.push(
        `${nama}: entry.ts dan main.ts BERBEDA.\n` +
        `      Yang dijalankan: ${entry}. Yang lain (${mati}) adalah kode mati.\n` +
        `      Kalau perubahan Anda ada di ${mati}, perubahan itu TIDAK berjalan.`,
      );
    }
  }
}

if (masalah.length === 0) {
  console.log(`Semua fungsi menjalankan berkas yang benar (${diperiksa} fungsi diperiksa).`);
  process.exit(0);
}
console.error("BERKAS FUNGSI TIDAK SINKRON — kode yang Anda edit mungkin tidak berjalan:\n");
for (const m of masalah) console.error(`  ${m}`);
console.error("\nSalin berkas yang benar ke kembarannya, atau hapus salinan yang tidak dipakai.");
process.exit(1);
