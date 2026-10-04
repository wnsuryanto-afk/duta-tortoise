/**
 * cek-keyakinan.mjs — uji bahwa `ai_confidence` dibaca pada skala yang benar,
 * DAN bahwa tidak ada sisi baca yang kembali membandingkannya mentah-mentah.
 *
 * Kenapa penjaga ini ada. Prompt yang meminta angka keyakinan ke AI tidak
 * pernah menyebut skalanya, jadi modelnya menjawab dengan skala yang ia
 * pilih sendiri. Data nyata pada 30-09-2026 berisi keduanya: 164 nilai
 * berupa pecahan (0.3 … 0.95) dan 6 nilai berupa persen (10, 95, 100).
 * Seluruh sisi baca menganggapnya persen.
 *
 * Tidak ada yang error. Angkanya hanya jadi masuk akal terbalik:
 *
 *   · ambang "tampilkan apresiasi bila >= 60" tidak pernah benar untuk
 *     0.95 → 330 pesan tertulis untuk dua kiper tidak pernah tampil;
 *   · penanda "perlu diperiksa bila < 70" SELALU benar untuk 0.95 →
 *     setiap tugas tampak meragukan bagi penyetuju;
 *   · label "keyakinan {nilai}%" menampilkan "0.95%" untuk keyakinan 95%.
 *
 * Penjaga lain di repo ini memeriksa BENTUK kode. Yang ini memeriksa
 * JAWABANNYA, dengan angka yang benar-benar tersimpan di peternakan —
 * lalu memeriksa bentuknya juga, supaya perbandingan mentah tidak
 * menyelinap kembali lewat berkas baru.
 *
 * Jalankan:  node scripts/cek-keyakinan.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const dir = mkdtempSync(join(tmpdir(), "cek-keyakinan-"));
let gagal = 0;

function cek(nama, dapat, harus) {
  if (JSON.stringify(dapat) !== JSON.stringify(harus)) {
    gagal++;
    console.error(`GAGAL  ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harus: ${JSON.stringify(harus)}`);
  }
}

// ── Bagian 1: jawabannya ────────────────────────────────────────────
try {
  execFileSync("npx", ["esbuild", "src/lib/keyakinanAI.js",
    "--bundle", "--format=cjs", "--platform=node", `--outfile=${join(dir, "k.cjs")}`,
  ], { cwd: AKAR, stdio: "pipe" });
} catch (e) {
  console.log("Gagal membundel keyakinanAI:\n" + (e.stderr?.toString() || e.message));
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}
const { persenKeyakinan, layakTampil } = await import("file://" + join(dir, "k.cjs"))
  .then((m) => m.default || m);
rmSync(dir, { recursive: true, force: true });

// Nilai-nilai ini bukan karangan: inilah himpunan nilai unik ai_confidence
// yang benar-benar tersimpan di DailyChecklist pada 30-09-2026.
const TERSIMPAN = [0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 10, 95, 100];
const PECAHAN = TERSIMPAN.filter((n) => n <= 1);

cek("pecahan 0.95 jadi 95", persenKeyakinan(0.95), 95);
cek("pecahan 0.3 jadi 30", persenKeyakinan(0.3), 30);
// Nilai tepat 1 ambigu (1% atau 100%). Dibaca 100% karena muncul
// berdampingan dengan 0.95 dan 0.9 di data yang sama.
cek("pecahan 1 jadi 100", persenKeyakinan(1), 100);
cek("persen 95 tetap 95", persenKeyakinan(95), 95);
cek("persen 10 tetap 10", persenKeyakinan(10), 10);
cek("null jadi null", persenKeyakinan(null), null);
cek("undefined jadi null", persenKeyakinan(undefined), null);
// Keyakinan 0 adalah angka yang sah — `!nilai` akan salah di sini.
cek("nol tetap nol, bukan null", persenKeyakinan(0), 0);
cek("bukan angka jadi null", persenKeyakinan("tidak ada"), null);
cek("negatif dijepit ke 0", persenKeyakinan(-0.5), 0);
cek("di atas 100 dijepit ke 100", persenKeyakinan(150), 100);

// Inti perbaikannya, dinyatakan sebagai selisih SEBELUM vs SESUDAH.
const ambangLama = (n) => n == null || n >= 60;
cek("dengan kode lama, TIDAK SATU PUN nilai pecahan lolos ambang tampil",
  PECAHAN.filter(ambangLama), []);
cek("dengan kode baru, delapan dari sebelas lolos",
  PECAHAN.filter((n) => layakTampil(n)), [0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1]);

const perluLama = (n) => n != null && n < 70;
const perluBaru = (n) => { const p = persenKeyakinan(n); return p != null && p < 70; };
cek("dengan kode lama, SEMUA pecahan ditandai perlu diperiksa",
  PECAHAN.filter(perluLama).length, PECAHAN.length);
cek("dengan kode baru, hanya yang memang rendah",
  PECAHAN.filter(perluBaru), [0.3, 0.4, 0.5, 0.6]);

cek("label yang dilihat penyetuju untuk 0.95", `${Math.round(persenKeyakinan(0.95) ?? 0)}%`, "95%");

// ── Bagian 2: bentuknya ─────────────────────────────────────────────
//
// Jawaban yang benar hari ini tidak menjaga apa pun kalau berkas baru
// boleh membandingkan `ai_confidence` mentah-mentah lagi. Pemindai ini
// mencari pola itu di seluruh src/.
const DIKECUALIKAN = new Set([
  // Satu-satunya tempat yang BOLEH menyentuh nilai mentahnya.
  "src/lib/keyakinanAI.js",
  // Sisi tulis: menormalkan sebelum menyimpan, jadi memang menyebut
  // nama kolomnya di sebelah persenKeyakinan().
  "src/lib/photoVerification.js",
]);

function berkasJs(d, keluar = []) {
  for (const nama of readdirSync(d)) {
    const p = join(d, nama);
    if (statSync(p).isDirectory()) { berkasJs(p, keluar); continue; }
    if (/\.(js|jsx)$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

// Perbandingan langsung: ai_confidence lalu < > <= >= terhadap sebuah angka.
const POLA = /ai_confidence\s*(?:\|\|\s*\d+\s*)?(?:<|>|<=|>=)\s*\d/;
const temuan = [];
for (const p of berkasJs(join(AKAR, "src"))) {
  const rel = relative(AKAR, p);
  if (DIKECUALIKAN.has(rel)) continue;
  // Komentar dibuang lebih dulu: penjelasan soal cacat ini memuat contoh
  // kodenya, dan penjaga yang tersandung komentarnya sendiri tidak berguna.
  const isi = kupasKomentar(readFileSync(p, "utf8"));
  isi.split("\n").forEach((baris, i) => {
    if (POLA.test(baris)) temuan.push(`${rel}:${i + 1}  ${baris.trim().slice(0, 90)}`);
  });
}
if (temuan.length) {
  gagal++;
  console.error(
    `GAGAL  ${temuan.length} perbandingan langsung ai_confidence terhadap angka.\n` +
    `   Skalanya tidak bisa dipastikan dari nilainya — pakai persenKeyakinan()\n` +
    `   dari src/lib/keyakinanAI.js, atau daftarkan berkasnya di DIKECUALIKAN\n` +
    `   beserta alasannya.\n` +
    temuan.map((t) => "   " + t).join("\n")
  );
}

if (gagal === 0) {
  console.log(`Keyakinan AI terbaca pada skala yang benar (${TERSIMPAN.length} nilai nyata diperiksa, tidak ada perbandingan mentah).`);
}
process.exit(gagal === 0 ? 0 : 1);
