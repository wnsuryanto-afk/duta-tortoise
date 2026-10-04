/**
 * cek-tataletak.mjs — kepala halaman: angkanya bisa ditelusuri, dan
 * bentuknya satu macam.
 *
 * ── Yang disurvei 4 Okt 2026 ─────────────────────────────────────────
 *
 * Lima puluh empat halaman diperiksa satu per satu. Dua pola muncul di
 * mana-mana:
 *
 * 1. SEPULUH halaman memajang angka ringkasan di kepala, dan TIDAK SATU
 *    PUN bisa diklik. "Sakit 3" di kepala Daftar Kura memunculkan
 *    pertanyaan lalu membiarkan orang mencari sendiri halamannya —
 *    pekerjaannya dipindahkan ke yang membaca.
 *
 * 2. TIGA PULUH DUA halaman memakai `<h1>` sendiri alih-alih PageHeader,
 *    jadi tidak punya tempat untuk angka ringkasan sama sekali, dan judul
 *    halamannya tidak sebentuk dengan yang lain. Ketiga puluh duanya sudah
 *    dipindahkan; yang tersisa dua, dengan alasan tertulis di DIKECUALIKAN.
 *
 * ── Dua hal yang dijaga ──────────────────────────────────────────────
 *
 * 1. Tiap chip di `chips={[…]}` punya tujuan (`ke` atau `onClick`).
 *    Angka yang menimbulkan pertanyaan tetapi tidak bisa ditelusuri adalah
 *    pekerjaan yang dipindahkan, bukan informasi.
 *
 * 2. Halaman BARU tidak boleh membuat judulnya sendiri. Batasnya NOL.
 *    Utangnya dulu dibekukan lalu diturunkan bertahap — 32, 28, 24, 19,
 *    15, 10, 6, 0 — tiap turunan satu kelompok kecil yang bisa diperiksa,
 *    bukan satu lompatan yang tidak bisa.
 *
 * Jalankan:  node scripts/cek-tataletak.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const temuan = [];

/* ── 1. Tiap chip punya tujuan ─────────────────────────────────────── */

/**
 * Pisahkan isi `chips={[ … ]}` jadi entri-entri pada kedalaman teratas.
 * Entri bisa berupa objek `{…}` maupun sebaran `...(syarat ? [{…}] : [])`.
 */
function entriChip(isi) {
  /*
   * Chip selalu ditulis sebagai objek di dalam LARIK — baik larik tertulis
   * (`chips={[{…}, {…}]}`) maupun larik di dalam syarat
   * (`chips={n > 0 ? [{…}] : []}`). Jadi yang dicari larik-lariknya dulu,
   * lalu isinya dipotong pada koma di kedalaman teratas larik itu.
   *
   * Versi sebelumnya memotong langsung pada isi `chips={…}`. Untuk larik
   * tertulis, seluruh isinya berada di dalam `[` sehingga tidak pernah ada
   * koma di kedalaman nol: kesepuluh halaman menyusut jadi satu entri raksasa
   * dan jumlah chip yang diperiksa anjlok dari 30 ke 12 tanpa satu pun
   * penjaga merah. Penjaga yang diam karena berhenti melihat lebih buruk
   * daripada penjaga yang menuduh.
   */
  const entri = [];
  for (let i = 0; i < isi.length; i++) {
    if (isi[i] !== "[") continue;
    let dalam = 0, tutup = -1;
    for (let j = i; j < isi.length; j++) {
      if (isi[j] === "[") dalam++;
      else if (isi[j] === "]") { dalam--; if (dalam === 0) { tutup = j; break; } }
    }
    if (tutup === -1) break;
    const dalamLarik = isi.slice(i + 1, tutup);
    let d = 0, mulai = 0;
    for (let k = 0; k < dalamLarik.length; k++) {
      const c = dalamLarik[k];
      if ("{[(".includes(c)) d++;
      else if ("}])".includes(c)) d--;
      else if (c === "," && d === 0) { entri.push(dalamLarik.slice(mulai, k)); mulai = k + 1; }
    }
    entri.push(dalamLarik.slice(mulai));
    i = tutup;
  }
  return entri.map((e) => e.trim()).filter(Boolean);
}

const halaman = readdirSync(join(AKAR, "src/pages")).filter((n) => n.endsWith(".jsx"));
let chipDiperiksa = 0;

for (const nama of halaman) {
  const rel = `src/pages/${nama}`;
  const s = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  /*
   * Dicari `chips={` apa pun bentuknya, bukan hanya `chips={[`.
   *
   * Versi pertama penjaga ini hanya mengenali larik tertulis. TreatmentPage
   * menulisnya bersyarat — `chips={jumlah > 0 ? [{…}] : []}` — jadi chipnya
   * lolos tanpa diperiksa, dan ia memang tidak punya tujuan. Penjaga yang
   * hanya mengenali satu bentuk penulisan menjaga gaya penulisan, bukan
   * aturannya.
   */
  const awal = s.indexOf("chips={");
  if (awal === -1) continue;
  let dalam = 0, akhir = -1;
  for (let i = awal + "chips=".length; i < s.length; i++) {
    if (s[i] === "{") dalam++;
    else if (s[i] === "}") { dalam--; if (dalam === 0) { akhir = i; break; } }
  }
  if (akhir === -1) continue;
  const isiChips = s.slice(awal + "chips={".length, akhir);

  for (const e of entriChip(isiChips)) {
    // Hanya entri yang benar-benar mendefinisikan sebuah chip.
    if (!/\blabel\s*:/.test(e)) continue;
    chipDiperiksa++;
    if (/\bke\s*:/.test(e) || /\bonClick\s*:/.test(e)) continue;
    /*
     * Sebagian chip memang tidak punya tujuan: ia menyatakan ATURAN
     * ("+10 poin untuk masukan yang ditindaklanjuti") atau rinciannya
     * memang daftar di halaman itu sendiri. Keduanya sah — yang tidak sah
     * adalah membiarkannya tanpa keterangan, jadi alasannya ditulis di
     * tempat chipnya dibuat dan ikut terbaca orang berikutnya.
     */
    const alasan = e.match(/tanpaTujuan\s*:\s*["'`]([^"'`]+)/);
    if (alasan) continue;
    const label = (e.match(/label\s*:\s*["'`]([^"'`]*)/) || [])[1] || e.slice(0, 40);
    temuan.push(
      `${rel}  chip "${label}" tidak punya tujuan — tambahkan \`ke: "/halaman"\`, ` +
      `atau \`tanpaTujuan: "alasannya"\` bila ia memang bukan angka yang bisa ` +
      `ditelusuri. Angka yang menimbulkan pertanyaan tanpa jalan ke jawabannya ` +
      `memindahkan pekerjaan ke orang yang membacanya.`,
    );
  }
}

/* ── 2. Utang `<h1>` sendiri tidak boleh bertambah ─────────────────── */

const BATAS_H1_SENDIRI = 0;

/*
 * Dua halaman yang memang BUKAN halaman biasa. Alasannya ditulis di sini,
 * bukan disimpan di kepala orang — pengecualian tanpa alasan adalah celah
 * yang kelak dipakai halaman yang tidak punya alasan.
 */
const DIKECUALIKAN = new Map([
  ["src/pages/ProfileSetupPage.jsx",
   "layar penyiapan profil sebelum kerangka aplikasi ada — satu kartu di tengah " +
   "layar penuh (min-h-screen), tanpa menu dan tanpa kepala halaman"],
  ["src/pages/TortoisePassport.jsx",
   "lembar paspor yang DICETAK dan dibawa pembeli — judulnya nama kuranya, " +
   "di atas kertas, bukan judul halaman aplikasi"],
]);

const pakaiH1Sendiri = [];
for (const nama of halaman) {
  const rel = `src/pages/${nama}`;
  const s = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  if (/<PageHeader/.test(s)) continue;
  if (DIKECUALIKAN.has(rel)) continue;
  if (/<h1[\s>]/.test(s)) pakaiH1Sendiri.push(rel);
}

if (pakaiH1Sendiri.length > BATAS_H1_SENDIRI) {
  temuan.push(
    `${pakaiH1Sendiri.length} halaman memakai <h1> sendiri, naik dari ${BATAS_H1_SENDIRI}. ` +
    `Pakai PageHeader supaya judul dan angka ringkasannya sebentuk dengan halaman lain:\n` +
    pakaiH1Sendiri.slice(-5).map((x) => `      ${x}`).join("\n"),
  );
}

/* ── 3. Penyedia yang membungkus seluruh aplikasi ──────────────────── */

/*
 * ThemeProvider dan ViewAsProvider membungkus SELURUH aplikasi, dan
 * keduanya membaca penyimpanan peramban di dalam `useState` — yaitu saat
 * render pertama. Kalau pembacaan itu melempar, tidak ada satu layar pun
 * yang terbentuk: layar putih, tanpa pesan apa pun.
 *
 * `localStorage` memang melempar saat data situs diblokir — menyentuh
 * propertinya saja sudah cukup. Jadi kedua penyedia itu WAJIB lewat
 * lib/simpananAman.js, yang mengembalikan null alih-alih melempar.
 *
 * Ditempatkan di penjaga tata letak karena inilah lapisan terluar tata
 * letak aplikasi: kalau ia gagal, tidak ada tata letak sama sekali.
 */
const PENYEDIA_AKAR = ["src/lib/ThemeContext.jsx", "src/lib/ViewAsContext.jsx"];
for (const rel of PENYEDIA_AKAR) {
  const isi = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  if (/\b(localStorage|sessionStorage)\s*\./.test(isi)) {
    temuan.push(
      `${rel}  menyentuh localStorage/sessionStorage langsung. Penyedia ini membungkus ` +
      `seluruh aplikasi dan membacanya saat render pertama — satu lemparan berarti layar ` +
      `putih tanpa pesan. Pakai simpananLokal / simpananSesi dari lib/simpananAman.js.`,
    );
  }
}

if (temuan.length) {
  console.error(`${temuan.length} masalah tata letak kepala halaman.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Kepala halaman: ${chipDiperiksa} chip punya tujuan, ` +
  `${pakaiH1Sendiri.length} dari ${halaman.length} halaman memakai <h1> sendiri ` +
  `(batas ${BATAS_H1_SENDIRI}), ${DIKECUALIKAN.size} dikecualikan dengan alasan tertulis.`,
);
process.exit(0);
