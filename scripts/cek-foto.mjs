/**
 * cek-foto.mjs — setiap gambar di aplikasi bisa diketuk untuk dilihat besar.
 *
 * ── Kenapa penjaga ini ada ─────────────────────────────────────────────────
 *
 * Ada 95 tempat yang menampilkan gambar: foto telur, foto clutch, bukti
 * transfer, foto temuan, foto penyakit, selfie absen, QR, pratinjau label.
 * Pemilik mengetuk foto clutch di halaman Breeding dan tidak terjadi apa-apa —
 * dan itu bukan satu tempat yang kelewatan, melainkan semuanya.
 *
 * Perbaikannya satu penangkap klik di akar aplikasi, bukan 95 perubahan. Maka
 * yang harus dijaga juga berpindah: bukan "apakah tiap gambar diberi onClick",
 * melainkan "apakah penangkapnya terpasang, dan apakah aturannya benar".
 *
 * Aturannya dijalankan di DOM sungguhan, bukan dibaca dari untaian kode:
 * `closest()` terhadap tombol dan viewer tidak bisa dinilai tanpa pohon DOM.
 */
import { execFileSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let gagal = 0;
const salah = (p) => { console.log(`  ✗ ${p}`); gagal++; };

// ── 1. Penangkapnya terpasang di akar ─────────────────────────────────────
console.log("Pemasangan:");
const app = kupasKomentar(readFileSync(join(akar, "src/App.jsx"), "utf8"));
if (!/import PembesarFoto from/.test(app)) salah("App.jsx tidak mengimpor PembesarFoto");
if (!/<PembesarFoto>/.test(app)) salah("App.jsx tidak memasang <PembesarFoto>");
// Harus membungkus Router — kalau tidak, halaman di dalamnya tidak tercakup.
const iP = app.indexOf("<PembesarFoto>");
const iR = app.indexOf("<Router>");
const iTutup = app.indexOf("</PembesarFoto>");
if (iP < 0 || iR < 0 || iTutup < 0 || !(iP < iR && iR < iTutup)) {
  salah("<PembesarFoto> tidak membungkus <Router> — halaman di dalamnya tidak tercakup");
}
if (gagal === 0) console.log("  PembesarFoto terpasang di App.jsx dan membungkus Router.");

// ── 2. Tidak ada viewer foto kedua yang lebih lemah ───────────────────────
//
// Dialog foto SOP yang lama memakai `max-w-md` dengan gambar `w-full`: foto
// tegak — dan foto bukti dari ponsel hampir selalu tegak — terpotong tanpa cara
// memperbesar. Viewer yang bercabang berarti satu cabang akan tertinggal.
console.log("Satu viewer:");
const modalSop = kupasKomentar(readFileSync(join(akar, "src/components/sop/PhotoPreviewModal.jsx"), "utf8"));
// Mencari namanya saja tidak cukup: mencabut impornya meninggalkan tag JSX-nya
// utuh, dan penjaganya tetap hijau walau komponennya sudah rusak. Yang dicari
// impornya DAN pemakaiannya.
if (!/import\s+TortoisePhotoLightbox\s+from/.test(modalSop)) {
  salah("PhotoPreviewModal tidak mengimpor viewer bersama — foto tegak akan terpotong lagi");
}
if (!/<TortoisePhotoLightbox/.test(modalSop)) {
  salah("PhotoPreviewModal tidak merender viewer bersama");
}
if (/max-w-md/.test(modalSop)) salah("PhotoPreviewModal masih membatasi lebar dialognya sendiri");

const lightbox = kupasKomentar(readFileSync(join(akar, "src/components/tortoise/TortoisePhotoLightbox.jsx"), "utf8"));
// `object-contain` + batas tinggi adalah yang membuat foto MUAT, bukan terpotong.
if (!/object-contain/.test(lightbox)) salah("viewer tidak memakai object-contain — gambar akan terpotong");
if (!/max-h-full/.test(lightbox)) salah("viewer tidak membatasi tinggi gambar — gambar tegak akan melebihi layar");
console.log("  PhotoPreviewModal meneruskan ke viewer bersama; viewernya memuat gambar utuh (object-contain + max-h-full).");

// ── 3. Aturannya diuji di DOM sungguhan ───────────────────────────────────
const CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
console.log("Aturan boleh-diperbesar:");
if (!existsSync(CHROMIUM)) {
  salah("Chromium tidak ada — aturan boleh-diperbesar TIDAK diuji.");
} else {
  const tmp = mkdtempSync(join(tmpdir(), "cek-foto-"));
  const keluar = join(tmp, "aturan.cjs");
  execFileSync("npx", ["esbuild", "src/lib/fotoBisaDiperbesar.js", "--bundle", "--format=iife",
    "--global-name=ATURAN", `--alias:@=${akar}/src`, `--outfile=${keluar}`], { cwd: akar, stdio: "pipe" });
  const bundel = readFileSync(keluar, "utf8");

  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ content: bundel });

  // Tiap kasus: potongan HTML, pemilih gambarnya, dan jawaban yang benar.
  const KASUS = [
    ["foto biasa", `<img id="t" src="https://x/a.jpg">`, true],
    ["jalur relatif", `<img id="t" src="/gambar/a.png">`, true],
    ["data URL gambar", `<img id="t" src="data:image/png;base64,iVBOR">`, true],
    ["sumber kosong", `<img id="t" src="">`, false],
    ["jangkar", `<img id="t" src="#">`, false],
    ["data URL bukan gambar", `<img id="t" src="data:text/plain,halo">`, false],
    ["ditandai off", `<img id="t" src="https://x/a.jpg" data-zoom="off">`, false],
    ["di dalam tombol", `<button><img id="t" src="https://x/a.jpg"></button>`, false],
    ["di dalam tautan", `<a href="/x"><img id="t" src="https://x/a.jpg"></a>`, false],
    ["di dalam label", `<label><img id="t" src="https://x/a.jpg"></label>`, false],
    ["di dalam tombol tapi ditandai on", `<button><img id="t" src="https://x/a.jpg" data-zoom="on"></button>`, true],
    ["di dalam viewer", `<div data-pembesar-foto><img id="t" src="https://x/a.jpg"></div>`, false],
    ["tombol bersarang jauh", `<button><span><em><img id="t" src="https://x/a.jpg"></em></span></button>`, false],
  ];

  for (const [nama, html, harapan] of KASUS) {
    const nyata = await page.evaluate(({ html }) => {
      document.body.innerHTML = html;
      return window.ATURAN.bolehDiperbesar(document.getElementById("t"));
    }, { html });
    if (nyata !== harapan) salah(`${nama}: dijawab ${nyata}, seharusnya ${harapan}`);
  }
  // Bukan <img> sama sekali.
  const bukanImg = await page.evaluate(() => {
    document.body.innerHTML = `<div id="t"></div>`;
    return window.ATURAN.bolehDiperbesar(document.getElementById("t"));
  });
  if (bukanImg !== false) salah(`elemen bukan <img>: dijawab ${bukanImg}, seharusnya false`);
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
  console.log(`  ${KASUS.length + 1} kasus diuji di DOM sungguhan.`);
}

// ── 4. Berapa gambar yang tercakup ────────────────────────────────────────
//
// Angka ini bukan nilai lulus; ia hanya menyatakan seberapa luas jangkauannya,
// supaya kalau suatu saat ada yang menandai banyak gambar `data-zoom="off"`
// tanpa alasan, hasilnya kelihatan.
const berkas = execFileSync("grep", ["-rl", "<img", "src/", "--include=*.jsx"], { cwd: akar, encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
let total = 0, dimatikan = 0;
for (const f of berkas) {
  const isi = kupasKomentar(readFileSync(join(akar, f), "utf8"));
  for (const tag of isi.match(/<img[\s\S]{0,400}?\/?>/g) || []) {
    total++;
    if (/data-zoom="off"/.test(tag)) dimatikan++;
  }
}
console.log(`Jangkauan:\n  ${total} gambar di ${berkas.length} berkas; ${dimatikan} ditandai tidak bisa diperbesar.`);

if (gagal) { console.log(`\n${gagal} masalah pada pembesar foto.`); process.exit(1); }
console.log("\nPembesar foto aman.");
