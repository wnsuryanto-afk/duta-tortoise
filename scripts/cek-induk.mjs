/**
 * cek-induk.mjs — telur yang induknya PERKIRAAN tidak boleh menilai indukan.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 11 Nov 2026 pemiliknya menggali tanah dan menemukan telur. Sebagian pecah,
 * sebagian bisa diselamatkan. Tidak ada yang melihat betina mana yang
 * bertelur — yang ada hanya perkiraan dari kandang tempat telur itu
 * ditemukan.
 *
 * Formulir Breeding MEWAJIBKAN nama betina, dan setiap statistik betina
 * mengatribusikan telur lewat female_id lalu female_name. Jadi satu nama
 * tebakan langsung menjadi kredit produksi betina itu — di angka yang
 * dipakai memutuskan indukan mana yang produktif, mana yang dipensiunkan,
 * dan mana yang dijual.
 *
 * ── Yang dijaga ──────────────────────────────────────────────────────
 *
 *   1. Aturannya hidup di src/lib/indukPerkiraan.js dan hanya di situ.
 *      Berkas lain TIDAK boleh membaca kolom `induk_perkiraan` sendiri —
 *      itu bentuk awal dari salinan kedua yang pelan-pelan berselisih,
 *      persis seperti yang sudah terjadi pada hitung mundur menetas,
 *      kedaluwarsa, dan golongan stok di aplikasi ini.
 *
 *   2. Kedua titik atribusi memanggilnya: peringkat() di peringkatIndukan.js
 *      (menjaga ketiga ranking sekaligus) dan cocokkanBetina() di
 *      produksiBetina.js.
 *
 * Yang SENGAJA tidak dijaga: hitungan kebun. Jumlah telur, isi inkubator,
 * dan daya tetas kebun memang harus memasukkan clutch ini — telurnya nyata,
 * dan bayinya akan dijual seperti bayi lain. Yang tidak sah hanyalah
 * menilai SEEKOR kura dari telur yang belum tentu miliknya.
 *
 * Komentar dibuang lebih dulu lewat lib/kupasKomentar.mjs: berkas-berkas itu
 * menjelaskan aturan ini di dalam komentarnya sendiri.
 *
 * Jalankan:  node scripts/cek-induk.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const SUMBER = "src/lib/indukPerkiraan.js";

/* Titik atribusi yang WAJIB menanyakan aturannya. */
const WAJIB = new Map([
  ["src/lib/peringkatIndukan.js", "peringkat() mengelompokkan clutch per pasangan/jantan/betina"],
  ["src/lib/produksiBetina.js", "cocokkanBetina() memetakan clutch ke baris kura betina"],
]);

const temuan = [];

/* ── 1. Aturannya ada ──────────────────────────────────────────────── */

if (!existsSync(join(AKAR, SUMBER))) {
  temuan.push(`${SUMBER} hilang — aturannya tidak punya rumah lagi.`);
} else {
  const sumber = kupasKomentar(readFileSync(join(AKAR, SUMBER), "utf8"));
  for (const nama of ["indukDinilai", "tanggalPasti", "labelPerkiraan"]) {
    if (!new RegExp(`export function ${nama}\\b`).test(sumber)) {
      temuan.push(`${SUMBER}: ${nama}() hilang.`);
    }
  }
}

/* ── 2. Kedua titik atribusi memanggilnya ──────────────────────────── */

for (const [rel, kenapa] of WAJIB) {
  const p = join(AKAR, rel);
  if (!existsSync(p)) continue;
  const kode = kupasKomentar(readFileSync(p, "utf8"));
  if (!/indukDinilai\s*\(/.test(kode)) {
    temuan.push(
      `${rel} tidak memanggil indukDinilai().\n` +
      `      ${kenapa}, jadi tanpa itu nama induk TEBAKAN ikut dinilai\n` +
      `      sebagai produksi seekor kura.`,
    );
  }
}

/* ── 3. Tidak ada pembaca kolom tandingan ──────────────────────────── */

function berkas(dir, keluar = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

/*
 * Formulir Breeding BOLEH menyentuh kolomnya: di situlah orang menyalakan
 * tandanya, dan tidak ada aturan yang bisa dipinjam untuk itu.
 */
const BOLEH_MENYENTUH = new Map([
  [SUMBER, "di sinilah aturannya tinggal"],
  ["src/components/breeding/BreedingForm.jsx", "tempat tandanya dinyalakan orang"],
]);

let diperiksa = 0;
for (const p of berkas(join(AKAR, "src"))) {
  const rel = relative(AKAR, p).split("\\").join("/");
  if (BOLEH_MENYENTUH.has(rel)) continue;
  const kode = kupasKomentar(readFileSync(p, "utf8"));
  if (!/induk_perkiraan|tanggal_perkiraan/.test(kode)) continue;
  diperiksa++;
  temuan.push(
    `${rel} membaca kolom induk_perkiraan/tanggal_perkiraan sendiri.\n` +
    `      Pakai indukDinilai() / tanggalPasti() / labelPerkiraan() dari\n` +
    `      ${SUMBER}. Aturan yang punya dua pembaca selalu berakhir berselisih.`,
  );
}

if (temuan.length) {
  console.error(
    `${temuan.length} masalah pada aturan induk perkiraan.\n\n` +
    temuan.map((t) => "  " + t).join("\n") + "\n",
  );
  process.exit(1);
}
console.log(
  `Telur berinduk perkiraan tidak menilai indukan ` +
  `(${WAJIB.size} titik atribusi memanggil aturannya, ${BOLEH_MENYENTUH.size} berkas boleh menyentuh kolomnya).`,
);
process.exit(0);
