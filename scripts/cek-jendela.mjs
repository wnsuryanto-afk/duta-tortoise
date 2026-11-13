/**
 * cek-jendela.mjs — jendela menetas dihitung di satu berkas, bukan lima.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 13 Nov 2026 pemiliknya bertanya kenapa label kotak telur tidak memberi
 * tahu kapan telurnya menetas. Ditelusuri, satu aturan punya LIMA salinan
 * dan dua angka yang berbeda:
 *
 *   breedingCalendarUtils.js   HATCH_MIN_DAYS 80 / HATCH_MAX_DAYS 105
 *   BreedingForm.jsx           addDays(..., 80) dan addDays(..., 105)
 *   labelRingkas.js            membaca kolom estimated_hatch_start/_end
 *   labelUtils.js              bertelur + 90 hari, TETAP
 *   BreedingForm.jsx (lagi)    d.getTime() + 90 * 86400000, di pratinjau
 *                              label yang digambar ulang di dalam formulir
 *
 * Dua yang terakhir salah, dan salahnya diam. 90 bukan 80 dan bukan 105 —
 * ia tidak cocok dengan ujung mana pun. Untuk clutch A35 × A46 yang
 * bertelur 4 Sep 2026:
 *
 *   label 80 mm & pratinjaunya   "3 Desember 2026"
 *   jendela sebenarnya           23 November – 18 Desember 2026
 *
 * Sepuluh hari. Label itu menempel di kotak telurnya, dan pemiliknya
 * melaporkan pada hari yang sama bahwa ada telur yang menetas tanpa
 * terpantau. Label yang menjanjikan tanggal sepuluh hari terlalu lambat
 * adalah salah satu sebabnya.
 *
 * Yang kelima ditemukan oleh penjaga ini sendiri, pada hari ia ditulis —
 * sesudah empat yang lain dibetulkan dengan tangan, dan justru yang kelima
 * itulah yang dilihat orang paling sering: pratinjau di dalam formulir,
 * saat clutchnya dicatat, sebelum labelnya pernah dicetak.
 *
 * ── Yang ditolak ─────────────────────────────────────────────────────
 *
 * Di dalam src/: satu baris yang menambahkan hari ke sebuah tanggal
 * (`addDays(`, `86400000`, atau `1000 * 60 * 60 * 24`) BERSAMA salah satu
 * angka jendela menetas — 80, 90, atau 105.
 *
 * 90 ikut ditolak meski bukan angka yang benar justru KARENA ia pernah
 * dipakai dua kali: angka yang salah tidak kembali dengan mengumumkan
 * dirinya.
 *
 * ── Kenapa polanya sesempit itu ──────────────────────────────────────
 *
 * Aturan yang lebih luas — misalnya menolak setiap `addDays` di dekat
 * `egg_laying_date` — akan menuduh hitungan yang benar: jadwal candling
 * H+30, jendela bertelur +30/+45 dari kawin, dan tenggat tugas. Penjaga
 * yang menuduh kode benar akan dimatikan orang, bukan dipatuhi.
 *
 * Yang dikejar hanya bentuk yang mustahil benar: angka jendela menetas
 * yang ditulis telanjang sebagai hitungan hari, di luar berkas yang
 * memegangnya.
 *
 * Jalankan:  node scripts/cek-jendela.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

/** Menambahkan hari ke sebuah tanggal. */
const POLA_TAMBAH = [
  { pola: /\baddDays\s*\(/, sebut: "addDays(...)" },
  { pola: /86400000/, sebut: "86400000" },
  { pola: /1000\s*\*\s*60\s*\*\s*60\s*\*\s*24/, sebut: "1000*60*60*24" },
];

/** Angka jendela menetas, termasuk 90 yang pernah salah dipakai. */
const POLA_ANGKA = /(?<![\w.])(80|90|105)(?![\w.])/;

const DIKECUALIKAN = new Map([
  [
    "src/lib/jendelaMenetas.js",
    "di sinilah HARI_MENETAS_MIN/MAX dan jendelaMenetas() didefinisikan",
  ],
]);

function berkas(dir, keluar = []) {
  let isi;
  try {
    isi = readdirSync(dir, { withFileTypes: true });
  } catch {
    return keluar;
  }
  for (const e of isi) {
    const p = join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

const temuan = [];
let diperiksa = 0;

for (const p of berkas(join(AKAR, "src"))) {
  const rel = relative(AKAR, p).split("\\").join("/");
  if (DIKECUALIKAN.has(rel)) continue;
  diperiksa++;
  const baris = kupasKomentar(readFileSync(p, "utf8")).split("\n");
  baris.forEach((b, i) => {
    if (!POLA_ANGKA.test(b)) return;
    const cara = POLA_TAMBAH.find((s) => s.pola.test(b));
    if (cara) temuan.push(`${rel}:${i + 1}  ${cara.sebut}\n      ${b.trim().slice(0, 96)}`);
  });
}

if (temuan.length) {
  console.error(
    `${temuan.length} tempat menghitung jendela menetas sendiri.\n\n` +
    `Jendela menetas sulcata adalah bertelur + 80 sampai + 105 hari. Aturan\n` +
    `itu sempat punya LIMA salinan, dan dua di antaranya memakai 90 — angka\n` +
    `yang tidak cocok dengan ujung mana pun. Untuk clutch yang bertelur\n` +
    `4 Sep 2026, label kotaknya mencetak "3 Desember" sementara telurnya\n` +
    `boleh menetas sejak 23 November: sepuluh hari terlalu lambat, di kertas\n` +
    `yang menempel di kotak telurnya.\n\n` +
    `Pakai yang sudah ada di src/lib/jendelaMenetas.js:\n` +
    `  jendelaMenetas(breeding)      { mulai, sampai } dari clutch\n` +
    `  jendelaDariBertelur(tgl)      { mulai, sampai } dari tanggal saja\n` +
    `  HARI_MENETAS_MIN / _MAX       80 dan 105, bila memang butuh angkanya\n\n` +
    `Hitungan hari yang BUKAN jendela menetas tidak ditolak: candling H+30,\n` +
    `jendela bertelur +30/+45 dari kawin, dan tenggat tugas memakai angka\n` +
    `lain dan lewat begitu saja.\n\n` +
    temuan.map((t) => "  " + t).join("\n")
  );
  process.exit(1);
}
console.log(
  `Jendela menetas hanya dihitung di satu berkas ` +
  `(${diperiksa} berkas src diperiksa, ${DIKECUALIKAN.size} dikecualikan dengan alasan).`
);
process.exit(0);
