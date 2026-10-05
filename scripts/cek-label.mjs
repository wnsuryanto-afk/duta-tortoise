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
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
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

// ── 7. Lembar A4: angkanya satu, dan lembarnya tidak melewati kertas ──────
//
// "Berapa label per lembar" dulu ada dua kali — dihitung di penggambar, dan
// DITULIS TETAP "2 kolom × 5 baris = 10" di keterangan bawah tombolnya. Yang
// tertulis tidak ikut berubah saat ukurannya diganti. Sekarang satu fungsi,
// dan penjaga ini memegang angkanya.
const keluarLembar = join(tmp, "lembarLabel.cjs");
execFileSync("npx", [
  "esbuild", "src/lib/lembarLabel.js", "--bundle", "--format=cjs",
  "--platform=node", `--alias:@=${akar}/src`, `--outfile=${keluarLembar}`,
], { cwd: akar, stdio: "pipe" });
const L = await import(`file://${keluarLembar}`).then((m) => m.default || m);

console.log("Lembar A4:");
for (const [id, muat] of [["50x30", 36], ["40x30", 45], ["100x50", 10]]) {
  const def = L.cariUkuranTelur(id);
  const r = L.rencanaLembarA4(def);
  if (r.muat !== muat) salah(`${id}: ${r.kolom}×${r.baris} = ${r.muat} per lembar, bukan ${muat}`);
}
// Daerah cetak harus MENYISAKAN tepi di dalam A4 yang sebenarnya.
//
// Memeriksa `kolom × lebar <= daerah cetak` tidak ada gunanya: kolom memang
// dihitung sebagai floor(daerah / lebar), jadi pertidaksamaannya benar menurut
// definisi dan penjaganya tidak akan pernah bisa merah. Yang BISA salah adalah
// daerah cetaknya sendiri disetel seluas kertas — printer inkjet rumahan tidak
// mencetak sampai tepi, dan baris terluarnya terpotong.
const A4_PENUH = { w: 210, h: 297 };
if (L.A4_PAKAI_MM.w >= A4_PENUH.w || L.A4_PAKAI_MM.h >= A4_PENUH.h) {
  salah(`daerah cetak ${L.A4_PAKAI_MM.w}×${L.A4_PAKAI_MM.h} mm tidak menyisakan tepi di dalam A4 ${A4_PENUH.w}×${A4_PENUH.h} mm — baris terluar akan terpotong printer`);
}

// Ukuran bawaan harus yang muat di kotak telur, bukan yang menutupinya.
if (L.UKURAN_TELUR_BAWAAN !== "50x30") salah(`ukuran bawaan ${L.UKURAN_TELUR_BAWAAN}, bukan 50x30`);
if (L.cariUkuranTelur("tidak-ada").id !== L.UKURAN_TELUR_BAWAAN) salah("id tak dikenal tidak jatuh ke ukuran bawaan");
console.log(`  3 ukuran: 36 / 45 / 10 per lembar, tidak ada yang melewati ${L.A4_PAKAI_MM.w}×${L.A4_PAKAI_MM.h} mm.`);

// ── 8. Kanvas lembar A4 harus muat di batas Safari iPad ───────────────────
//
// html2canvas dulu memakai scale 2 untuk SEMUANYA. Pada lembar A4 300 DPI
// (2480×3508) hasilnya 4960×7016 ≈ 35 megapiksel, dan Safari di iPad memotong
// kanvas di sekitar 16 megapiksel — lembarnya keluar KOSONG di perangkat yang
// dipakai memesannya. Penjaga ini membaca scale yang benar-benar dioper.
const BATAS_MP_IPAD = 16.7;
const sumber = readFileSync(join(akar, "src/components/breeding/EggLabelGenerator.jsx"), "utf8");
const cocokScale = sumber.match(/return htmlToPng\(html, wA4, hA4(?:, (\d+))?\)/);
if (!cocokScale) {
  salah("pemanggilan htmlToPng untuk lembar A4 tidak ditemukan — penjaga ini tidak bisa melihat apa pun");
} else {
  const skala = cocokScale[1] ? Number(cocokScale[1]) : 2;
  const mp = (Math.round((210 * 300) / 25.4) * skala * Math.round((297 * 300) / 25.4) * skala) / 1e6;
  if (mp > BATAS_MP_IPAD) {
    salah(`lembar A4 digambar ${mp.toFixed(1)} megapiksel (scale ${skala}) — di atas batas Safari iPad ${BATAS_MP_IPAD} MP, lembarnya keluar kosong`);
  } else {
    console.log(`Kanvas lembar A4: ${mp.toFixed(1)} MP (scale ${skala}), di bawah batas Safari iPad ${BATAS_MP_IPAD} MP.`);
  }
}

// ── 9. Tidak ada baris yang terpotong di BAWAH ───────────────────────────
//
// Ini cacat yang paling mahal di label, dan paling sulit dilihat dari kode.
//
// Tiap baris memakai `white-space:nowrap; overflow:hidden` supaya nama panjang
// berakhir "…" alih-alih mendorong lencana TRAY keluar label. Tapi
// `overflow:hidden` memotong ke SEGALA arah: kalau kotak barisnya
// (font-size × line-height) lebih pendek daripada huruf yang digambar, bagian
// bawah hurufnya ikut hilang. Pada 5 Okt 2026 itu membuat "23 Des 2026" keluar
// terpotong separuh di iPad — dan tidak terlihat sama sekali di layar
// pengembang, karena tinggi huruf berbeda per perangkat.
//
// Jadi penjaga ini MENGGAMBAR labelnya di Chromium dan mengukur kotak tinta
// tiap baris terhadap kotak pemotongnya — pada beberapa tumpukan huruf, karena
// itulah yang berbeda antar perangkat. Mengukur, bukan membaca angka di kode.
const CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
console.log("Baris terpotong:");
if (!existsSync(CHROMIUM)) {
  // Penjaga yang diam saat tidak bisa melihat adalah penjaga yang hijau palsu.
  console.log("  ✗ Chromium tidak ada — pemeriksaan pemotongan TIDAK dijalankan.");
  gagal++;
} else {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage();
  await page.setContent("<html><body style='margin:0'></body></html>");

  const keluarWarna = join(tmp, "colorEggLabel.cjs");
  execFileSync("npx", [
    "esbuild", "src/components/breeding/colorEggLabel.js", "--bundle", "--format=cjs",
    "--platform=node", `--alias:@=${akar}/src`, `--outfile=${keluarWarna}`,
  ], { cwd: akar, stdio: "pipe" });
  const CE = await import(`file://${keluarWarna}`).then((m) => m.default || m);

  // Tumpukan huruf yang tinggi hurufnya berbeda-beda. Arial dipatok di label,
  // tetapi perangkat yang tidak punya Arial akan memakai gantinya — dan
  // gantinya itulah yang dulu memotong.
  const FONT = ["Arial, Helvetica, sans-serif", "'DejaVu Sans', sans-serif", "'Liberation Serif', serif", "monospace"];
  // Tanggal yang HARUS jadi tulisan terbesar, ditulis sama persis seperti
  // labelnya menulisnya.
  const tglMenetas = "21 Des 2026";   // CLUTCH[1] = A40×C23, 2 Okt 2026
  const HALAMAN = [
    ["50×30 ringkas", labelRingkasHTML(CLUTCH[1].b, UKURAN[0], QR, PALET_WARNA)],
    ["40×30 ringkas", labelRingkasHTML(CLUTCH[1].b, UKURAN[1], QR, PALET_WARNA)],
    ["50×30 termal", labelRingkasHTML(CLUTCH[1].b, UKURAN[2], QR, PALET_TERMAL)],
    ["100×50 penuh", await CE.renderColorLabelHTML(CLUTCH[1].b, { w: 100, h: 50, full: true })],
  ];

  let diukur = 0, terbesarOK = 0;
  for (const [nama, html] of HALAMAN) {
    for (const font of FONT) {
      const buruk = await page.evaluate(({ html, font, tglMenetas }) => {
        const c = document.createElement("div");
        c.style.cssText = `position:fixed;left:0;top:0;font-family:${font}`;
        c.innerHTML = html;
        document.body.appendChild(c);
        const hasil = [];
        for (const el of c.querySelectorAll("*")) {
          if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const gaya = getComputedStyle(el);
          const kotak = el.getBoundingClientRect();
          const r = document.createRange();
          r.selectNodeContents(el);
          const tinta = r.getBoundingClientRect();
          const teks = el.textContent.trim().slice(0, 24);
          const memotong = (g) => g.overflow !== "visible" || g.overflowY !== "visible";
          if (memotong(gaya) && tinta.bottom > kotak.bottom + 0.5) {
            hasil.push({ teks, fs: gaya.fontSize, lewat: +(tinta.bottom - kotak.bottom).toFixed(1), sebab: "kotak barisnya sendiri" });
            continue;
          }
          for (let a = el.parentElement; a && a !== c; a = a.parentElement) {
            const g2 = getComputedStyle(a);
            if (!memotong(g2)) continue;
            const k2 = a.getBoundingClientRect();
            if (tinta.bottom > k2.bottom + 0.5 || tinta.top < k2.top - 0.5) {
              hasil.push({ teks, fs: gaya.fontSize, lewat: +Math.max(tinta.bottom - k2.bottom, k2.top - tinta.top).toFixed(1), sebab: "jalur induknya" });
              break;
            }
          }
        }
        // Perkiraan menetas harus jadi tulisan TERBESAR di label — itu
        // permintaan pemiliknya, dan ia gampang hilang diam-diam saat ada yang
        // membesarkan nama induk atau tanggal candling. Diukur dari huruf yang
        // benar-benar dipakai, bukan dari untaian gaya di kode: pemeriksaan
        // versi lama mengenali bloknya lewat "line-height:1.05" dan berhenti
        // menemukan apa pun begitu gayanya ditata ulang.
        let maks = 0, besarMenetas = 0;
        for (const el of c.querySelectorAll("*")) {
          if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const fsEl = parseFloat(getComputedStyle(el).fontSize);
          if (fsEl > maks) maks = fsEl;
          if (el.textContent.trim() === tglMenetas) besarMenetas = Math.max(besarMenetas, fsEl);
        }
        document.body.removeChild(c);
        return { hasil, maks, besarMenetas };
      }, { html, font, tglMenetas });
      diukur++;
      for (const b of buruk.hasil) {
        salah(`${nama} / ${font.split(",")[0]}: "${b.teks}" ${b.fs} terpotong ${b.lewat}px oleh ${b.sebab}`);
      }
      if (!buruk.besarMenetas) {
        salah(`${nama} / ${font.split(",")[0]}: tanggal menetas "${tglMenetas}" tidak ketemu di label`);
      } else if (buruk.besarMenetas < buruk.maks) {
        salah(`${nama} / ${font.split(",")[0]}: perkiraan menetas ${buruk.besarMenetas}px, padahal ada tulisan ${buruk.maks}px`);
      } else {
        terbesarOK++;
      }
    }
  }
  await browser.close();
  console.log(`  ${diukur} gabungan ukuran × tumpukan huruf diukur, tidak ada yang terpotong.`);
  console.log(`Tulisan terbesar:\n  perkiraan menetas yang terbesar pada ${terbesarOK} dari ${diukur} gabungan.`);
}

rmSync(tmp, { recursive: true, force: true });

if (gagal) { console.log(`\n${gagal} masalah pada label.`); process.exit(1); }
console.log(`\nLabel ringkas aman (${UKURAN.length} ukuran × ${CLUTCH.length} clutch sungguhan).`);
