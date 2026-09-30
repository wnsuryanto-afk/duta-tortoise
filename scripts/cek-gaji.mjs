/**
 * cek-gaji.mjs — satu periode gaji, dan tidak ada yang terkunci dari
 * slipnya sendiri.
 *
 * ── Dua hal yang dijaga, dan kenapa ─────────────────────────────────
 *
 * 1. SATU JENIS PERIODE.
 *
 *    hitungGaji.js pernah memuat peringatan ini, ditulis sendiri oleh
 *    yang membangunnya:
 *
 *      "Slip MINGGUAN adalah sistem lama dan masih hidup berdampingan
 *       (period_type "weekly", otomatisasi A5 siapkanSlipMingguan).
 *       Selama keduanya aktif, satu periode bisa dibayar dua kali."
 *
 *    Peringatan itu benar dan berumur panjang: layar penerbit berhenti
 *    menawarkan mingguan sejak D30, tetapi fungsi otomatisnya tetap ada
 *    berbulan-bulan sesudahnya, tinggal menunggu satu saklar. Saklarnya
 *    tidak pernah menyala — `siapkan_slip_terakhir` null — jadi tidak
 *    ada uang yang pernah dibayar dua kali. Itu keberuntungan, bukan
 *    penjagaan.
 *
 *    Sejak 30-09-2026 gaji dibayar BULANAN, tanggal 1. Penjaga ini
 *    menolak kode mana pun yang membuat slip mingguan baru.
 *
 * 2. PINTU YANG TIDAK BOLEH HILANG.
 *
 *    Empat pintu gaji dilebur jadi dua pada tanggal yang sama. Dua di
 *    antara yang lama — "Slip Gaji" dan "Kasbon" — dibuka juga oleh
 *    keeper dan kepala_feeder; dua lainnya hanya oleh pengelola.
 *    Melebur keempatnya jadi SATU pintu, yang terdengar paling
 *    sederhana, akan mengunci keeper dari slip dan kasbonnya sendiri
 *    tanpa satu pun error.
 *
 *    Ini bukan kekhawatiran teoretis: penggabungan yang terlihat seperti
 *    penyederhanaan tetapi mencabut satu-satunya pintu sebuah peran
 *    sudah pernah terjadi di aplikasi ini. Penjaga ini memastikan setiap
 *    peran yang DIGAJI tetap punya jalan ke layar gajinya.
 *
 * Jalankan:  node scripts/cek-gaji.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const AKAR = process.cwd();
const temuan = [];

/* ── 1. Tidak ada yang membuat slip mingguan baru ──────────────────── */

function berkas(dir, keluar = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx|ts)$/.test(n)) keluar.push(p);
  }
  return keluar;
}

const sumber = [
  ...berkas(join(AKAR, "src")),
  ...(existsSync(join(AKAR, "base44/functions")) ? berkas(join(AKAR, "base44/functions")) : []),
];

let payloadDiperiksa = 0;
for (const p of sumber) {
  const rel = relative(AKAR, p);
  const asli = readFileSync(p, "utf8");
  // Komentar dibuang: penjelasan di berkas ini dan di hitungGaji.js
  // menyebut "weekly" justru untuk menerangkan kenapa ia dilarang.
  const s = asli
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((b) => !b.trim().startsWith("//") && !b.trim().startsWith("*")).join("\n");

  for (const m of s.matchAll(/period_type\s*:\s*["'](\w+)["']/g)) {
    payloadDiperiksa++;
    if (m[1] === "weekly") {
      const baris = s.slice(0, m.index).split("\n").length;
      temuan.push(`${rel}:${baris}  menulis period_type "weekly" — gaji dibayar bulanan sejak 30-09-2026`);
    }
  }
}

if (existsSync(join(AKAR, "base44/functions/siapkanSlipMingguan"))) {
  temuan.push('base44/functions/siapkanSlipMingguan/  penerbit slip mingguan hidup lagi');
}

/* ── 2. Setiap peran bergaji punya pintu ke layar gajinya ──────────── */

const dir = mkdtempSync(join(tmpdir(), "cek-gaji-"));
const bundel = (masuk, keluar) =>
  execFileSync("npx", ["esbuild", masuk, "--bundle", "--format=cjs", "--platform=node",
    "--outfile=" + join(dir, keluar), "--log-level=error",
    "--alias:@=" + join(AKAR, "src")], { cwd: AKAR });

bundel("src/lib/permissions.js", "perm.cjs");
bundel("src/lib/hitungGaji.js", "gaji.cjs");
const perm = await import("file://" + join(dir, "perm.cjs")).then((m) => m.default || m);
const gaji = await import("file://" + join(dir, "gaji.cjs")).then((m) => m.default || m);

/*
 * Section yang menampilkan slip & kasbon MILIK SENDIRI. Bila kelak
 * pintunya berganti nama, yang benar adalah memperbarui daftar ini
 * dengan sadar — bukan membiarkan penjaganya diam karena namanya tidak
 * ketemu lagi.
 */
const PINTU_SENDIRI = ["salary-slip"];

const navSrc = readFileSync(join(AKAR, "src/lib/navigation.js"), "utf8");
for (const sec of PINTU_SENDIRI) {
  if (!navSrc.includes(`section: "${sec}"`)) {
    temuan.push(`navigation.js  tidak ada pintu dengan section "${sec}" — layar gaji milik sendiri hilang dari menu`);
  }
}

for (const peran of gaji.PERAN_BERGAJI) {
  const bisa = PINTU_SENDIRI.some((sec) => perm.canAccess(peran, sec));
  if (!bisa) {
    temuan.push(`permissions.js  peran "${peran}" digaji aplikasi ini tetapi tidak bisa membuka satu pun layar gajinya sendiri`);
  }
}

rmSync(dir, { recursive: true, force: true });

/* ── hasil ─────────────────────────────────────────────────────────── */

if (temuan.length) {
  console.error(
    `${temuan.length} masalah pada modul gaji.\n\n` +
    temuan.map((t) => "  " + t).join("\n") + "\n",
  );
  process.exit(1);
}
console.log(
  `Gaji: satu periode (${payloadDiperiksa} payload period_type diperiksa, semuanya bulanan), ` +
  `${gaji.PERAN_BERGAJI.length} peran bergaji punya pintu ke slipnya sendiri.`,
);
process.exit(0);
