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
 *    halamannya tidak sebentuk dengan yang lain.
 *
 * ── Dua hal yang dijaga ──────────────────────────────────────────────
 *
 * 1. Tiap chip di `chips={[…]}` punya tujuan (`ke` atau `onClick`).
 *    Angka yang menimbulkan pertanyaan tetapi tidak bisa ditelusuri adalah
 *    pekerjaan yang dipindahkan, bukan informasi.
 *
 * 2. Jumlah halaman yang masih memakai `<h1>` sendiri TIDAK BOLEH NAIK.
 *    Membereskan ketiga puluh dua sekaligus berarti menyentuh tiga puluh
 *    dua berkas dalam satu kali — yang ditolak bukan karena salah, tetapi
 *    karena tidak bisa diperiksa. Jadi utangnya dibekukan di sini dan
 *    diturunkan sedikit demi sedikit; angkanya di bawah ikut turun tiap
 *    kali satu halaman dipindahkan.
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
  const entri = [];
  let dalam = 0, mulai = 0;
  for (let i = 0; i < isi.length; i++) {
    const c = isi[i];
    if ("{[(".includes(c)) dalam++;
    else if ("}])".includes(c)) dalam--;
    else if (c === "," && dalam === 0) { entri.push(isi.slice(mulai, i)); mulai = i + 1; }
  }
  entri.push(isi.slice(mulai));
  return entri.map((e) => e.trim()).filter(Boolean);
}

const halaman = readdirSync(join(AKAR, "src/pages")).filter((n) => n.endsWith(".jsx"));
let chipDiperiksa = 0;

for (const nama of halaman) {
  const rel = `src/pages/${nama}`;
  const s = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  const m = s.match(/chips=\{\[([\s\S]*?)\n\s*\]\}/);
  if (!m) continue;

  for (const e of entriChip(m[1])) {
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

/*
 * Angka ini TIDAK BOLEH NAIK. Ia boleh — dan memang seharusnya — turun,
 * dan saat turun angkanya di bawah ikut diturunkan supaya penjaganya tetap
 * menggigit.
 */
const BATAS_H1_SENDIRI = 31;

const pakaiH1Sendiri = [];
for (const nama of halaman) {
  const rel = `src/pages/${nama}`;
  const s = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  if (/<PageHeader/.test(s)) continue;
  if (/<h1[\s>]/.test(s)) pakaiH1Sendiri.push(rel);
}

if (pakaiH1Sendiri.length > BATAS_H1_SENDIRI) {
  temuan.push(
    `${pakaiH1Sendiri.length} halaman memakai <h1> sendiri, naik dari ${BATAS_H1_SENDIRI}. ` +
    `Pakai PageHeader supaya judul dan angka ringkasannya sebentuk dengan halaman lain:\n` +
    pakaiH1Sendiri.slice(-5).map((x) => `      ${x}`).join("\n"),
  );
}

if (temuan.length) {
  console.error(`${temuan.length} masalah tata letak kepala halaman.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Kepala halaman: ${chipDiperiksa} chip punya tujuan, ` +
  `${pakaiH1Sendiri.length} dari ${halaman.length} halaman masih memakai <h1> sendiri ` +
  `(batas ${BATAS_H1_SENDIRI} — tidak boleh naik).`,
);
process.exit(0);
