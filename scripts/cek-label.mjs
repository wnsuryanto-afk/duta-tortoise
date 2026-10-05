/**
 * cek-label.mjs — label kotak telur benar-benar DIGAMBAR, lalu diperiksa.
 *
 * ── Kenapa penjaga ini ada ─────────────────────────────────────────────────
 *
 * Label dicetak ke kertas lalu ditempel ke kotak di dalam inkubator. Begitu
 * keluar dari printer, tidak ada layar yang bisa mengoreksinya: salah ukuran
 * berarti telur tidak kelihatan, dan keterangan yang hilang berarti kiper
 * membuka kotaknya untuk mencari tahu. Dua hal yang dikeluhkan 5 Okt 2026 —
 * labelnya terlalu besar dan perkiraan menetasnya terlalu kecil — keduanya
 * tidak akan pernah ketahuan dari kode yang cuma dibaca.
 *
 * Jadi penjaga ini MENJALANKAN penggambarnya dengan data clutch sungguhan,
 * lalu memeriksa hasilnya: tingginya pas, tulisan terbesar adalah perkiraan
 * menetas, nomor tray tercetak, dan keterangan yang sengaja dibuang tidak
 * kembali diam-diam.
 */
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "cek-label-"));
const keluar = join(tmp, "labelRingkas.cjs");
execFileSync("npx", [
  "esbuild", "src/components/breeding/labelRingkas.js",
  "--bundle", "--format=cjs", "--platform=node", `--alias:@=${akar}/src`,
  `--outfile=${keluar}`,
], { cwd: akar, stdio: "pipe" });

const { labelRingkasHTML, tinggiJalur, PALET_WARNA, PALET_TERMAL } = await import(`file://${keluar}`).then((m) => m.default || m);

let gagal = 0;
const salah = (pesan) => { console.log(`  ✗ ${pesan}`); gagal++; };

// Clutch sungguhan dari data peternakan, 5 Okt 2026.
const CLUTCH = [
  { nama: "A36×A31 (tray kosong)", b: { male_name: "A36", female_name: "A31", egg_count: 22, egg_laying_date: "2026-10-01", estimated_hatch_start: "2026-12-20", estimated_hatch_end: "2027-01-14", tray_number: null, candling_day_30_done: false } },
  { nama: "A40×C23 (tray 3)",      b: { male_name: "A40", female_name: "C23", egg_count: 28, egg_laying_date: "2026-10-02", estimated_hatch_start: "2026-12-21", estimated_hatch_end: "2027-01-15", tray_number: 3, candling_day_30_done: false } },
  { nama: "A40×C23 (candling telat)", b: { male_name: "A40", female_name: "C23", egg_count: 22, egg_laying_date: "2026-08-12", estimated_hatch_start: "2026-10-31", estimated_hatch_end: "2026-11-25", tray_number: 8, candling_day_30_done: false } },
  { nama: "A37×C22 (dua tray)",    b: { male_name: "A37", female_name: "C22", egg_count: 17, egg_laying_date: "2026-09-14", estimated_hatch_start: "2026-12-03", estimated_hatch_end: "2026-12-28", tray_numbers: [8, 9], candling_day_30_done: true } },
  { nama: "tanpa tanggal apa pun", b: { male_name: "A43", female_name: "B108", egg_count: 13 } },
];

// 50×30 mm @ 300 DPI (warna) dan @ 203 DPI (termal), serta 40×30 mm.
const UKURAN = [
  { nama: "50×30 warna",  wPx: 591, hPx: 354, palet: PALET_WARNA },
  { nama: "40×30 warna",  wPx: 472, hPx: 354, palet: PALET_WARNA },
  { nama: "50×30 termal", wPx: 399, hPx: 240, palet: PALET_TERMAL },
];

const QR = "data:image/png;base64,iVBORw0KGgo=";

// ── 1. Tinggi ketiga jalur dijumlahkan PERSIS setinggi label ───────────────
console.log("Tinggi jalur:");
for (const u of UKURAN) {
  const t = tinggiJalur(u.hPx);
  const jumlah = t.kepala + t.badan + t.candling;
  if (jumlah !== u.hPx) salah(`${u.nama}: ${t.kepala}+${t.badan}+${t.candling} = ${jumlah}, bukan ${u.hPx}`);
  if (t.badan <= 0) salah(`${u.nama}: badan label ${t.badan}px — kepala dan candling menelan seluruh label`);
}
console.log(`  ${UKURAN.length} ukuran, tidak ada piksel menganggur.`);

// ── 2. Perkiraan menetas adalah tulisan TERBESAR ───────────────────────────
// Inilah permintaannya: "yang saya butuhkan di sana adalah tanggal estimasi
// menetas yang lebih besar". Kalau nanti ada yang membesarkan nama induk atau
// tanggal candling melewatinya, penjaga ini merah.
console.log("Tulisan terbesar:");
let diperiksa = 0;
for (const u of UKURAN) {
  for (const c of CLUTCH) {
    const html = labelRingkasHTML(c.b, u, QR, u.palet);
    const semua = [...html.matchAll(/font-size:(\d+)px/g)].map((m) => Number(m[1]));
    const maks = Math.max(...semua);
    // Potongan yang memuat tanggal mulai menetas.
    const blokBesar = html.match(/font-size:(\d+)px;font-weight:900;color:[^"]*;line-height:1\.05/);
    if (!blokBesar) { salah(`${u.nama} / ${c.nama}: blok perkiraan menetas tidak ditemukan`); continue; }
    if (Number(blokBesar[1]) !== maks) {
      salah(`${u.nama} / ${c.nama}: perkiraan menetas ${blokBesar[1]}px, padahal ada tulisan ${maks}px`);
    }
    diperiksa++;
  }
}
console.log(`  ${diperiksa} label: perkiraan menetas selalu yang terbesar.`);

// ── 3. Nomor tray tercetak, dan yang KOSONG ditandai ───────────────────────
console.log("Nomor tray:");
const u0 = UKURAN[0];
const htmlKosong = labelRingkasHTML(CLUTCH[0].b, u0, QR, PALET_WARNA);
if (!/>TRAY</.test(htmlKosong)) salah("label tanpa tray: tulisan TRAY tidak ada");
if (!/>\?</.test(htmlKosong)) salah("label tanpa tray: tidak menulis '?' — kekosongannya tidak terlihat");
if (!htmlKosong.includes(PALET_WARNA.trayKosongBg)) salah("label tanpa tray: tidak memakai latar mencolok");

const html3 = labelRingkasHTML(CLUTCH[1].b, u0, QR, PALET_WARNA);
if (!/>3</.test(html3)) salah("tray_number 3 tidak tercetak");

const htmlDua = labelRingkasHTML(CLUTCH[3].b, u0, QR, PALET_WARNA);
if (!htmlDua.includes("8 · 9")) salah("tray_numbers [8,9] tidak tercetak keduanya");
console.log("  tray tercetak; yang kosong ditandai '?' berlatar mencolok; dua tray ditulis dua-duanya.");

// ── 4. Keterangan yang sengaja dibuang tidak boleh kembali ─────────────────
// Daftar ini adalah keputusan 5 Okt 2026, dan alasan tiap barisnya tertulis di
// components/breeding/labelRingkas.js. Menambah kembali salah satunya berarti
// memutuskan ulang — bukan sesuatu yang boleh terjadi tanpa disadari.
const DIBUANG = [
  "Probolinggo", "Centrochelys", "Captive-bred", "dutatortoise",
  "KODE KOPLING", "Kelembapan", "Infertil", "Pindai", "Inkubator",
];
console.log("Keterangan yang dibuang:");
let kembali = 0;
for (const u of UKURAN) {
  for (const c of CLUTCH) {
    const html = labelRingkasHTML(c.b, u, QR, u.palet);
    for (const kata of DIBUANG) {
      if (html.includes(kata)) { salah(`${u.nama} / ${c.nama}: "${kata}" kembali muncul di label`); kembali++; }
    }
  }
}
if (kembali === 0) console.log(`  ${DIBUANG.length} keterangan tetap tidak ada di ${UKURAN.length * CLUTCH.length} label.`);

// ── 5. Yang HARUS ada, ada ────────────────────────────────────────────────
console.log("Isi wajib:");
for (const u of UKURAN) {
  for (const c of CLUTCH) {
    const html = labelRingkasHTML(c.b, u, QR, u.palet);
    for (const [apa, pola] of [
      ["QR", /<img src="data:image/],
      ["PERKIRAAN MENETAS", /PERKIRAAN MENETAS/],
      ["CANDLING H\\+30", /CANDLING H\+30/],
      ["jumlah butir", /butir/],
      ["nama jantan", new RegExp(c.b.male_name)],
      ["nama betina", new RegExp(c.b.female_name)],
      ["kotak centang candling", /border:2px solid [^;]+;background:#fff/],
    ]) {
      if (!pola.test(html)) salah(`${u.nama} / ${c.nama}: ${apa} tidak ada`);
    }
  }
}
console.log(`  7 bagian wajib ada di ${UKURAN.length * CLUTCH.length} label.`);

// ── 6. Clutch tanpa tanggal tidak boleh mencetak "Invalid Date" ───────────
const htmlKosongTgl = labelRingkasHTML(CLUTCH[4].b, u0, QR, PALET_WARNA);
if (/Invalid Date|NaN/.test(htmlKosongTgl)) salah("clutch tanpa tanggal mencetak Invalid Date/NaN");
else console.log("Clutch tanpa tanggal: dicetak '—', bukan Invalid Date.");

rmSync(tmp, { recursive: true, force: true });

if (gagal) { console.log(`\n${gagal} masalah pada label.`); process.exit(1); }
console.log(`\nLabel ringkas aman (${UKURAN.length} ukuran × ${CLUTCH.length} clutch sungguhan).`);
