/**
 * cek-muat.mjs — tiap halaman yang dimuat per rute harus lewat muatHalaman.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 9 Nov 2026 pemiliknya membuka /area/kura dan mendapat layar merah:
 *
 *     Failed to fetch dynamically imported module:
 *     .../src/pages/HubPage.jsx
 *
 * Sejak halaman dipecah per rute (8 Nov 2026, 4.605 KB → 1.056 KB), tiap
 * halaman diunduh sendiri saat pertama dibuka. Itu memangkas unduhan awal —
 * dan menambah satu cara baru untuk gagal: satu unduhan meleset, satu
 * halaman mati.
 *
 * ── Kenapa bukan cuma "coba lagi" ────────────────────────────────────
 *
 * Diukur di peramban sungguhan terhadap dev server aplikasi ini, dengan
 * permintaan ke HubPage.jsx diblokir sekali lalu dibuka lagi:
 *
 *   1. blokir menyala                    → GAGAL   (1 permintaan terkirim)
 *   2. blokir DIMATIKAN, impor URL sama  → GAGAL   (tetap 1 permintaan)
 *   3. URL dibedakan "?coba=2"           → BERHASIL
 *
 * Baris kedua itu intinya: percobaan ulang tidak mengirim permintaan baru
 * sama sekali. Peta modul peramban menyimpan KEGAGALAN sebuah URL selama
 * halamannya hidup. Jadi `lazy(() => import(...))` telanjang tidak punya
 * jalan pulih mana pun — termasuk lewat tombol "Coba Lagi" di layar error,
 * yang hanya menggambar ulang.
 *
 * src/lib/muatHalaman.js yang menanganinya: coba sekali, ulang dengan URL
 * yang dibedakan, lalu muat ulang halaman satu kali.
 *
 * ── Yang ditolak ─────────────────────────────────────────────────────
 *
 * `lazy(` di src/App.jsx. Satu halaman yang terlewat adalah satu halaman
 * yang mengunci dirinya sendiri saat unduhannya meleset — dan yang terlewat
 * tidak akan ketahuan sampai jaringan seseorang tersendat tepat di halaman
 * itu.
 *
 * Juga diperiksa: setiap halaman yang DIRUTEKAN memang dimuat lewat
 * muatHalaman, bukan diimpor statis diam-diam — impor statis mengembalikan
 * halaman itu ke bundel awal dan membatalkan pemecahannya tanpa satu pun
 * tanda.
 *
 * Komentar dibuang lebih dulu lewat lib/kupasKomentar.mjs: berkas App.jsx
 * MENJELASKAN pemuatnya di dalam komentarnya sendiri, dan penjaga yang
 * menuduh penjelasan itu adalah penjaga yang langsung dimatikan orang.
 *
 * Jalankan:  node scripts/cek-muat.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const BERKAS = "src/App.jsx";
const PEMUAT = "src/lib/muatHalaman.js";

const temuan = [];
const isi = readFileSync(join(AKAR, BERKAS), "utf8");
const kode = kupasKomentar(isi);
const baris = kode.split("\n");

/* ── 1. Tidak ada lazy() telanjang ────────────────────────────────── */

baris.forEach((b, i) => {
  if (/\blazy\s*\(/.test(b)) {
    temuan.push(
      `${BERKAS}:${i + 1} memakai lazy() telanjang.\n` +
      `      Pakai muatHalaman() dari @/lib/muatHalaman — lazy() tidak punya\n` +
      `      jalan pulih saat unduhannya meleset.\n` +
      `      ${b.trim().slice(0, 76)}`,
    );
  }
});

/* ── 2. Tiap halaman yang dirutekan dimuat lewat muatHalaman ──────── */

const dimuat = new Set();
for (const m of kode.matchAll(/const\s+(\w+)\s*=\s*muatHalaman\(\s*\(\)\s*=>\s*import\(/g)) {
  dimuat.add(m[1]);
}

// Komponen yang diimpor STATIS di App.jsx — rangka, bukan halaman.
const statis = new Set();
for (const m of kode.matchAll(/^import\s+(\w+)\s+from\s+["'][^"']+["'];?$/gm)) {
  statis.add(m[1]);
}

const dirutekan = new Set();
for (const m of kode.matchAll(/element=\{<(\w+)\s*\/?>/g)) dirutekan.add(m[1]);

for (const nama of dirutekan) {
  if (dimuat.has(nama)) continue;
  if (!statis.has(nama)) continue;           // bukan halaman yang dikenali di sini
  // Rangka yang memang harus ada lebih dulu, masing-masing dengan alasan.
  const RANGKA = new Map([
    ["AppLayout", "rangka aplikasi: menu dan kepala halaman harus tergambar lebih dulu"],
    ["PageNotFound", "layar 404 harus bisa tampil justru ketika unduhan lain gagal"],
    ["UserNotRegisteredError", "layar galat masuk, dipakai sebelum ada halaman mana pun"],
  ]);
  if (RANGKA.has(nama)) continue;
  temuan.push(
    `${BERKAS}: <${nama}/> dirutekan tetapi diimpor STATIS.\n` +
    `      Impor statis mengembalikannya ke bundel awal dan membatalkan\n` +
    `      pemecahan per rute tanpa satu pun tanda. Pakai muatHalaman(), atau\n` +
    `      daftarkan di RANGKA pada ${"scripts/cek-muat.mjs"} dengan alasannya.`,
  );
}

/* ── 3. Pemuatnya memang ada dan masih mengerjakan ketiga lapisnya ── */

const pemuat = kupasKomentar(readFileSync(join(AKAR, PEMUAT), "utf8"));
for (const [pola, apa] of [
  [/muat=1/, "percobaan ulang dengan URL yang dibedakan"],
  [/sudahPernahMuatUlang/, "penjaga agar muat ulang hanya sekali"],
  [/lupakanMuatUlang\(simpanan\)/, "penanda muat ulang dilupakan setelah berhasil"],
]) {
  if (!pola.test(pemuat)) {
    temuan.push(`${PEMUAT}: ${apa} hilang — lapis itulah yang membuat pemulihannya mungkin.`);
  }
}

if (temuan.length) {
  console.error(
    `${temuan.length} masalah pada pemuatan halaman per rute.\n\n` +
    temuan.map((t) => "  " + t).join("\n") + "\n",
  );
  process.exit(1);
}
console.log(
  `Semua halaman dimuat lewat muatHalaman (${dimuat.size} halaman, ` +
  `${dirutekan.size} komponen dirutekan, 3 lapis pemulihan utuh).`,
);
process.exit(0);
