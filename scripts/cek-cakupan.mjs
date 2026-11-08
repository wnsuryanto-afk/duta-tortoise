/**
 * cek-cakupan.mjs — setiap halaman harus ADA di daftar kasus penjaga tata letak.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 8 Nov 2026 pemiliknya mengirim foto layar Breeding & Telur: baris tabnya
 * meluap, "Pembiakan" menempel ke "Telur & Inkubasi" tanpa jarak sedikit pun.
 * Pada hari yang sama cek-lebar melaporkan:
 *
 *     Tidak ada tulisan terpotong (157 kasus pada layar 360px, dan pada
 *     wadah 320/420/560/720px di layar 1280px).
 *
 * Kedua kalimat itu benar sekaligus. Yang tidak disebut laporan itu: dari 58
 * halaman di src/pages, 25 TIDAK ADA di scripts/render/kasus.jsx sama sekali
 * — Dashboard, Keuangan, Kas Kecil, Kesehatan, Penjualan, Perawatan, SOP,
 * Breeding & Telur, dan 17 lainnya. Penjaganya tidak melewatkannya; ia tidak
 * pernah diberi tahu bahwa halaman-halaman itu ada.
 *
 * Angka "157 kasus" terbaca seperti cakupan. Ia bukan cakupan — ia panjang
 * sebuah daftar yang ditulis tangan, dan daftar tulisan tangan selalu
 * tertinggal dari folder yang isinya bertambah. Penjaga yang hijau untuk
 * halaman yang tidak pernah digambar lebih buruk daripada tidak ada penjaga:
 * ia memberi rasa aman yang tidak dibayar apa pun, dan justru karena hijau
 * tidak ada yang akan memeriksanya lagi.
 *
 * ── Dua hal yang dijaga ──────────────────────────────────────────────
 *
 * 1. Setiap berkas di src/pages punya setidaknya satu kasus di kasus.jsx.
 *    Pengecualian harus tertulis DI SINI beserta alasannya — bukan hilang
 *    diam-diam.
 *
 * 2. Setiap nama di daftar pengecualian benar-benar ada. Pengecualian untuk
 *    halaman yang sudah dihapus adalah lubang yang menganga untuk halaman
 *    baru yang kebetulan bernama sama.
 *
 * Jalankan:  node scripts/cek-cakupan.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const KASUS = "scripts/render/kasus.jsx";
const temuan = [];

/*
 * Halaman yang sengaja TIDAK diukur, masing-masing dengan alasannya.
 *
 * Daftar ini pendek dengan sengaja. Menambah nama ke sini adalah keputusan
 * yang harus bisa dibaca orang berikutnya, bukan jalan pintas supaya penjaga
 * ini hijau.
 */
const DIKECUALIKAN = {
  OAuthConsent:
    "layar persetujuan OAuth: hanya bisa digambar dengan parameter alamat " +
    "dari penyedia identitas, dan tanpa parameter itu ia memang kosong.",
};

const halaman = readdirSync(join(AKAR, "src/pages"))
  .filter((n) => n.endsWith(".jsx"))
  .map((n) => n.replace(/\.jsx$/, ""))
  .sort();

const isiKasus = kupasKomentar(readFileSync(join(AKAR, KASUS), "utf8"));

/*
 * Dianggap terukur bila halamannya DIIMPOR oleh kasus.jsx.
 *
 * Memeriksa impor, bukan teks judul kasus: judul ditulis bebas ("RingkasanAngka
 * dengan data") dan tidak selalu memuat nama berkasnya, sedangkan impor adalah
 * satu-satunya cara komponennya benar-benar sampai ke harness.
 */
const diimpor = new Set(
  [...isiKasus.matchAll(/from\s+["']@\/pages\/([A-Za-z0-9_]+)(?:\.jsx)?["']/g)].map((m) => m[1]),
);

/* ── 1. Tidak ada halaman yang luput ───────────────────────────────── */

const luput = halaman.filter((h) => !diimpor.has(h) && !(h in DIKECUALIKAN));
if (luput.length) {
  temuan.push(
    `${luput.length} halaman tidak ada di ${KASUS}, jadi tidak pernah digambar\n` +
    `      maupun diukur oleh cek-lebar dan cek-lipat:\n\n` +
    luput.map((h) => `        src/pages/${h}.jsx`).join("\n") + `\n\n` +
    `      Tambahkan satu kasus untuk masing-masing — biasanya cukup\n` +
    `      ["${luput[0]} tanpa data", <${luput[0]} />] — atau, bila memang ada\n` +
    `      alasan ia tidak bisa digambar, tuliskan alasannya di DIKECUALIKAN\n` +
    `      pada berkas ini.`,
  );
}

/* ── 2. Pengecualian menunjuk halaman yang benar-benar ada ──────────── */

for (const [nama, alasan] of Object.entries(DIKECUALIKAN)) {
  if (!halaman.includes(nama)) {
    temuan.push(
      `Pengecualian "${nama}" menunjuk halaman yang tidak ada lagi di src/pages.\n` +
      `      Alasannya tercatat: ${alasan}\n` +
      `      Hapus dari DIKECUALIKAN, supaya halaman baru bernama sama tidak\n` +
      `      ikut lolos tanpa pernah diukur.`,
    );
  }
  if (diimpor.has(nama)) {
    temuan.push(
      `Pengecualian "${nama}" ternyata SUDAH ada di ${KASUS}.\n` +
      `      Hapus dari DIKECUALIKAN: pengecualian yang tidak mengecualikan\n` +
      `      apa pun hanya menyesatkan pembaca berikutnya.`,
    );
  }
}

if (temuan.length) {
  console.error(
    `${temuan.length} masalah cakupan penjaga tata letak.\n\n` +
    `"157 kasus" bukan cakupan — itu panjang daftar yang ditulis tangan.\n` +
    `Daftar tulisan tangan selalu tertinggal dari folder yang isinya bertambah.\n\n` +
    temuan.map((t) => "  " + t).join("\n\n") + "\n",
  );
  process.exit(1);
}

const jumlahKasus = (isiKasus.match(/^\s{2}\["/gm) || []).length;
console.log(
  `Cakupan tata letak lengkap: ${halaman.length} halaman di src/pages, ` +
  `${halaman.length - Object.keys(DIKECUALIKAN).length} terukur, ` +
  `${Object.keys(DIKECUALIKAN).length} dikecualikan dengan alasan tertulis ` +
  `(${jumlahKasus} kasus di ${KASUS}).`,
);
process.exit(0);
