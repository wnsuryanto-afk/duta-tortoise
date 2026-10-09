/**
 * cek-modeuji.mjs — setiap baris baru pada tabel yang punya `is_test_data`
 * harus membawa penanda Mode Uji.
 *
 * ── Kenapa penjaga ini ada ──────────────────────────────────────────
 *
 * Layar pemilih Mode Uji berjanji dengan kata-katanya sendiri: data yang
 * tersimpan "ditandai is_test_data agar tidak masuk laporan/hitung poin".
 * Janji itu hanya ditepati oleh pemanggil yang ingat menyertakan
 * `...testModeTag`.
 *
 * Dan `is_test_data` punya default `false` di skemanya. Jadi yang lupa
 * bukan sekadar kehilangan penanda — barisnya tersimpan bertanda "BUKAN
 * data uji", tidak bisa dibedakan dari data sungguhan oleh laporan mana
 * pun, selamanya. Tidak ada error, tidak ada angka yang terlihat janggal.
 *
 * Dua kali dalam satu hari cacat ini ditemukan dengan membaca kode satu
 * per satu:
 *
 *   CatatBiayaPage            pengeluaran Mode Uji jadi pengeluaran nyata
 *   SakitFormDialog           catatan sakit dari layar KIPER — layar yang
 *   SakitFromTemuanDialog     justru paling sering dibuka pemilik saat
 *                             mencoba aplikasi sebagai kiper
 *
 * Membaca satu per satu tidak bisa diandalkan berulang kali. Ini yang
 * mengandalkannya.
 *
 * Yang diperiksa, dua hal:
 *
 * 1. Tiap `entities.X.create({...})` ATAU `entities.X.bulkCreate(...)`
 *    di src/ dengan X punya kolom
 *    `is_test_data`: payload literalnya harus memuat `testModeTag`,
 *    `tandaUji`, atau `is_test_data`. Pemanggilan yang mengirim VARIABEL
 *    (bukan objek literal) dilewati — isinya tidak terbaca dari sini,
 *    sama seperti cek-kolom-hantu.
 *
 * 2. Fungsi di src/lib yang MENERUSKAN `tandaUji` harus benar-benar
 *    dikirimi `tandaUji` oleh setiap pemanggilnya.
 *
 *    Pemeriksaan kedua ini bukan kemewahan. Semua penerus memberi
 *    `tandaUji` nilai bawaan kosong, karena tanpa itu satu pemanggil yang
 *    belum disesuaikan akan melempar error. Harganya: pemanggil yang lupa
 *    TIDAK terlihat — fungsinya jalan, barisnya tersimpan, penandanya
 *    hilang diam-diam. Persis jebakan yang sama dengan nomor 1, hanya
 *    berpindah satu lapis ke atas. Tanpa nomor 2, memindahkan pencatatan
 *    ke dalam src/lib justru MELEMAHKAN penjagaannya.
 *
 * Jalankan:  node scripts/cek-modeuji.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

/*
 * Berkas yang memang tidak boleh atau tidak perlu menandai. Tiap entri
 * WAJIB punya alasan — kalau alasannya tidak bisa ditulis, berkasnya
 * kemungkinan besar memang perlu menandai.
 */
const DIKECUALIKAN = new Map([
  ["src/lib/pemakaianObat.js", "menerima tandaUji dari pemanggilnya dan meneruskannya"],
  ["src/lib/transaksiPenjualan.js", "menyalin penanda dari penjualan asalnya, bukan dari mode saat ini"],
  // 9 Okt 2026: fungsi ini TERNYATA membuat DailyChecklist baru bila hari itu
  // belum punya — jadi alasan lamanya ("bukan mencatat kejadian baru") hanya
  // benar separuh. Ia tetap dikecualikan dari bagian 1 karena penandanya tidak
  // datang dari Mode Uji melainkan dari aturan akun di lib/laporan.js
  // (tandaChecklistBaru), yang berlaku juga ketika Mode Uji mati. Bahwa ia
  // benar-benar memasangnya dijaga cek-tataletak, yang menyisir setiap
  // DailyChecklist.create.
  ["src/lib/claimIncidentalTask.js", "penandanya dari aturan akun (lib/laporan.js), bukan dari Mode Uji; dijaga cek-tataletak"],
]);

function entityBerpenanda() {
  const dir = path.join(AKAR, "base44/entities");
  const punya = new Set();
  for (const fn of fs.readdirSync(dir)) {
    if (!fn.endsWith(".jsonc")) continue;
    const mentah = fs.readFileSync(path.join(dir, fn), "utf8").replace(/^\s*\/\/.*$/gm, "");
    let d;
    try { d = JSON.parse(mentah); } catch { continue; }
    const p = d.properties || d;
    if (p && p.is_test_data) punya.add(fn.replace(/\.jsonc$/, ""));
  }
  return punya;
}

function berkas(dir, keluar = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

/**
 * Buang komentar. Penjelasan cacat ini memuat contoh kodenya sendiri, dan
 * contoh di dalam komentar tidak boleh ikut terbaca sebagai kode.
 */
function bersih(asli) {
  return kupasKomentar(asli);
}

/** Ambil isi kurung kurawal payload, dari posisi `{` sesudah create(. */
function payloadDari(s, i) {
  let dalam = 0;
  for (let j = i; j < Math.min(i + 6000, s.length); j++) {
    if (s[j] === "{") dalam++;
    else if (s[j] === "}") { dalam--; if (dalam === 0) return s.slice(i, j + 1); }
  }
  return null;
}

/**
 * Isi `const X = ....map(y => ({ ... }))` — bentuk yang hampir selalu dipakai
 * untuk menyiapkan payload bulkCreate. Dikembalikan null bila tidak ketemu,
 * supaya yang tidak terbaca dilaporkan apa adanya alih-alih dianggap aman.
 */
function deklarasiMap(s, nama, sebelum) {
  const re = new RegExp(`(?:const|let)\\s+${nama}\\s*=\\s*[^;=]{0,160}?\\.map\\s*\\(\\s*(?:\\([^)]*\\)|[\\w$]+)\\s*=>\\s*\\(\\s*\\{`, "g");
  let terbaik = -1, m;
  while ((m = re.exec(s))) {
    if (m.index < sebelum && m.index > terbaik) terbaik = m.index;
  }
  if (terbaik === -1) {
    const polos = new RegExp(`(?:const|let)\\s+${nama}\\s*=\\s*\\[`, "g");
    while ((m = polos.exec(s))) {
      if (m.index < sebelum && m.index > terbaik) terbaik = m.index;
    }
    if (terbaik === -1) return null;
  }
  const buka = s.indexOf("{", terbaik) >= 0 ? s.indexOf("{", terbaik) : -1;
  return buka === -1 ? null : payloadDari(s, buka);
}

/**
 * Kata-kata yang dihitung sebagai penanda Mode Uji di dalam sebuah payload.
 *
 * `tandaChecklistBaru` menyusul pada 9 Oktober 2026: aturan "checklist milik
 * pemilik selalu data uji" pindah ke lib/laporan.js dan berlaku JUGA ketika
 * Mode Uji mati, jadi ia penanda yang sah meski bukan `testModeTag`.
 */
const PENANDA = /testModeTag|tandaUji|is_test_data|tandaChecklistBaru|tandaLaporan/;

/**
 * Apakah payload ini membawa penanda — langsung atau lewat variabel?
 *
 * Penandanya sering dihitung di baris sendiri lalu disebar: `...penanda`.
 * Itu bukan gaya, melainkan keharusan — penjaga cek-kolom-hantu membaca kunci
 * objek yang BERSARANG di dalam `create({…})` sebagai nama kolom, jadi
 * `tandaChecklistBaru({ email })` di dalam payload memunculkan kolom hantu
 * `email`. Maka setiap spread dilacak ke deklarasinya.
 *
 * Versi pertama pemeriksaan ini hanya membaca payloadnya sendiri, dan
 * melaporkan payload yang penandanya benar sebagai "tanpa penanda".
 */
function berpenanda(s, payload, sebelum) {
  if (PENANDA.test(payload)) return true;
  for (const m of payload.matchAll(/\.\.\.([\w$]+)/g)) {
    const re = new RegExp(`(?:const|let)\\s+${m[1]}\\s*=\\s*([^;\n]*)`, "g");
    let awal;
    while ((awal = re.exec(s))) {
      if (awal.index < sebelum && PENANDA.test(awal[1])) return true;
    }
  }
  return false;
}

const BERPENANDA = entityBerpenanda();
const temuan = [];
let diperiksa = 0;

for (const p of berkas(path.join(AKAR, "src"))) {
  const rel = path.relative(AKAR, p);
  if (DIKECUALIKAN.has(rel)) continue;
  const s = bersih(fs.readFileSync(p, "utf8"));

  for (const m of s.matchAll(/entities\.(\w+)\.create\s*\(\s*\{/g)) {
    const ent = m[1];
    if (!BERPENANDA.has(ent)) continue;
    diperiksa++;
    const payload = payloadDari(s, m.index + m[0].length - 1);
    if (payload === null) continue;
    if (berpenanda(s, payload, m.index)) continue;
    const baris = s.slice(0, m.index).split("\n").length;
    temuan.push(`${rel}:${baris}  ${ent}.create() tanpa penanda Mode Uji`);
  }

  /*
   * `bulkCreate` sama sekali tidak dicari sebelumnya — polanya hanya
   * `\.create\s*\(`, dan `bulkCreate(` tidak cocok dengannya.
   *
   * Hari ini satu-satunya pemakainya menulis Tortoise, tabel yang memang
   * TIDAK punya `is_test_data`, jadi tidak ada yang bocor. Tapi lubangnya
   * nyata: satu `bulkCreate` ke tabel bertanda akan lewat tanpa suara, dan
   * justru bulkCreate-lah yang menulis BANYAK baris sekaligus.
   *
   * Isinya hampir selalu dibangun lewat `.map(x => ({...}))`, jadi yang
   * diperiksa seluruh pernyataannya — bukan satu objek literal.
   */
  for (const m of s.matchAll(/entities\.(\w+)\.bulkCreate\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
    const ent = m[1];
    if (!BERPENANDA.has(ent)) continue;
    diperiksa++;
    const baris = s.slice(0, m.index).split("\n").length;
    /*
     * Payloadnya ditelusuri ke deklarasinya, bukan dicari di seluruh
     * berkas. Mencari kata "tandaUji" di mana saja dalam berkas akan
     * hijau hanya karena ada pemanggilan LAIN yang memakainya — penjaga
     * yang hijau karena kebetulan tidak menjaga apa pun.
     */
    const blok = deklarasiMap(s, m[2], m.index);
    if (blok === null) {
      temuan.push(`${rel}:${baris}  ${ent}.bulkCreate(${m[2]}) — isi payloadnya tidak terbaca, penanda Mode Uji tidak bisa dipastikan`);
      continue;
    }
    if (berpenanda(s, blok, 0)) continue;
    temuan.push(`${rel}:${baris}  ${ent}.bulkCreate() tanpa penanda Mode Uji`);
  }
}

/* ──────────────────────────────────────────────────────────────────
 * Bagian 2 — penerus tandaUji dan pemanggilnya.
 * ────────────────────────────────────────────────────────────────── */

/** Potongan sumber satu fungsi: dari deklarasinya sampai `export` berikutnya. */
function tubuhFungsi(s, i) {
  const berikut = s.indexOf("\nexport ", i + 1);
  return s.slice(i, berikut === -1 ? s.length : berikut);
}

/** Nama fungsi di src/lib yang meneruskan tandaUji ke pencatatannya. */
function penerusTandaUji() {
  const nama = new Set();
  for (const p of berkas(path.join(AKAR, "src/lib"))) {
    const s = bersih(fs.readFileSync(p, "utf8"));
    for (const m of s.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(/g)) {
      if (/\btandaUji\b/.test(tubuhFungsi(s, m.index))) nama.add(m[1]);
    }
  }
  return nama;
}

/** Isi kurung sebuah pemanggilan, dari posisi `(`. */
function argumenDari(s, i) {
  let dalam = 0;
  for (let j = i; j < Math.min(i + 6000, s.length); j++) {
    if (s[j] === "(") dalam++;
    else if (s[j] === ")") { dalam--; if (dalam === 0) return s.slice(i, j + 1); }
  }
  return null;
}

const PENERUS = penerusTandaUji();
let panggilanDiperiksa = 0;

for (const p of berkas(path.join(AKAR, "src"))) {
  const rel = path.relative(AKAR, p);
  if (DIKECUALIKAN.has(rel)) continue;
  const s = bersih(fs.readFileSync(p, "utf8"));

  for (const m of s.matchAll(/(\bfunction\s+)?\b(\w+)\s*\(/g)) {
    if (m[1]) continue;                       // deklarasinya sendiri
    if (!PENERUS.has(m[2])) continue;
    const buka = m.index + m[0].length - 1;
    // `await nama(` dan `nama(` dihitung; `.nama(` (metode) tidak.
    if (s[m.index - 1] === ".") continue;
    panggilanDiperiksa++;
    const arg = argumenDari(s, buka);
    if (arg === null) continue;
    if (/\btandaUji\b/.test(arg)) continue;
    const baris = s.slice(0, m.index).split("\n").length;
    temuan.push(`${rel}:${baris}  ${m[2]}() dipanggil tanpa meneruskan tandaUji`);
  }
}

if (temuan.length) {
  console.error(
    `${temuan.length} pembuatan baris tanpa penanda Mode Uji.\n` +
    `Tabelnya punya kolom is_test_data dengan default false, jadi baris yang\n` +
    `dibuat saat Mode Uji menyala tersimpan bertanda "BUKAN data uji" — tidak\n` +
    `bisa dibedakan dari data sungguhan oleh laporan mana pun.\n\n` +
    `Sertakan \`...testModeTag\` dari useTestMode() pada payloadnya, atau\n` +
    `\`tandaUji: testModeTag\` pada pemanggilannya — atau daftarkan berkasnya di\n` +
    `DIKECUALIKAN pada scripts/cek-modeuji.mjs DENGAN ALASAN tertulis.\n` +
    temuan.map((t) => "  " + t).join("\n")
  );
  process.exit(1);
}
console.log(
  `Semua pencatatan menghormati Mode Uji ` +
  `(${diperiksa} pembuatan baris pada ${BERPENANDA.size} tabel bertanda, ` +
  `${panggilanDiperiksa} pemanggilan ${PENERUS.size} penerus tandaUji).`
);
process.exit(0);
