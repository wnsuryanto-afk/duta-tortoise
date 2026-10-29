/**
 * cek-setuju.mjs — persetujuan poin adalah penulisan UANG, dan ditulis begitu.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * `approved_points` menjadi rupiah: total poin di slip gaji dikalikan nilai
 * poin. Jadi setiap tempat yang menulis `status: "approved"` pada
 * DailyChecklist sedang memutuskan upah seseorang.
 *
 * Per 29-10-2026 ada EMPAT tempat yang melakukannya, dan ketiganya berbeda
 * dalam hal yang penting:
 *
 *   SOPApproval            lengkap — tapi komentarnya sendiri mencatat bahwa
 *                          dulu ia satu-satunya dari lima penulis yang tidak
 *                          mencatat waktu: 28 checklist disetujui tanpa satu
 *                          pun stempel waktu.
 *   KepalaFeederDashboard  "Setujui semua" berupa `for` TANPA try/catch —
 *                          satu kegagalan di tengah melempar keluar,
 *                          tombolnya berputar selamanya, dan sebagian sudah
 *                          disetujui tanpa ada yang tahu yang mana.
 *   KeputusanHariIni       per-baris try/catch, tapi tanpa approved_at,
 *                          tanpa approved_by_email, dan tanpa memeriksa hak.
 *   autoApprovePoin        otomatis, tanpa approved_by_email.
 *
 * Ketiganya disatukan ke src/lib/setujuiMassal.js pada 29-10-2026. Penjaga
 * ini menjaga agar yang kelima tidak lahir sendiri lagi.
 *
 * ── Dua hal yang dijaga ──────────────────────────────────────────────
 *
 * 1. STEMPEL AUDIT. Tiap penulisan `status: "approved"` pada DailyChecklist
 *    wajib menyertakan `approved_at` DAN `approved_by_email`. Untuk jalur
 *    otomatis, `approved_by_email: ""` ditulis sengaja — kosong yang
 *    dinyatakan berbeda dari kolom yang terlupa.
 *
 * Aturan kedua sempat ditulis dan DIBATALKAN: "tidak boleh menyetujui di
 * dalam perulangan, kecuali di lib/setujuiMassal.js". Niatnya benar —
 * menyetujui banyak checklist punya tiga jebakan (hak per baris, kegagalan di
 * tengah, stempel audit) yang sudah diselesaikan sekali di sana. Tetapi
 * mendeteksi "di dalam perulangan" menuntut penelusuran kurung kurawal yang
 * tahu bedanya blok dan objek literal, dan percobaan pertamanya langsung
 * menuduh SOPApproval.handleApprove — fungsi yang menyetujui SATU checklist
 * dan tidak berada dalam perulangan mana pun. Penjaga yang menuduh baris
 * jujur adalah penjaga yang dimatikan orang, dan sesudah itu ia tidak
 * menjaga apa pun. Jadi aturan itu ditinggalkan sampai ada cara memeriksanya
 * yang benar-benar tepat.
 *
 * Jalankan:  node scripts/cek-setuju.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const temuan = [];

function daftarBerkas(dir, akhiran, keluar = []) {
  const penuh = join(AKAR, dir);
  for (const nama of readdirSync(penuh)) {
    const p = join(penuh, nama);
    if (statSync(p).isDirectory()) daftarBerkas(relative(AKAR, p), akhiran, keluar);
    else if (akhiran.some((a) => nama.endsWith(a))) keluar.push(relative(AKAR, p));
  }
  return keluar;
}

/**
 * Teks dengan isi string dikosongkan, panjang dipertahankan persis supaya
 * nomor baris dan indeks tetap cocok.
 */
function tanpaIsiString(teks) {
  let keluar = "";
  let kutip = null;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) {
      if (c === "\\") { keluar += "  "; i++; continue; }
      if (c === kutip) { kutip = null; keluar += c; continue; }
      keluar += c === "\n" ? "\n" : " ";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { kutip = c; keluar += c; continue; }
    keluar += c;
  }
  return keluar;
}

const berkas = [
  ...daftarBerkas("src", [".js", ".jsx"]),
  ...daftarBerkas("base44/functions", [".ts"]),
];

let situs = 0;

for (const rel of berkas) {
  const asli = readFileSync(join(AKAR, rel), "utf8");
  const kode = kupasKomentar(asli);
  // Hanya penulisan pada DailyChecklist yang diperiksa; entitas lain punya
  // arti "approved" sendiri (Kasbon, SalarySlip) dan tidak menjadi upah poin.
  if (!kode.includes("DailyChecklist")) continue;

  const kosong = tanpaIsiString(kode);
  const pola = /status:\s*"approved"/g;
  for (const m of kode.matchAll(pola)) {
    // Panggilan update() yang memuatnya: dicari mundur dalam jendela terbatas.
    const mulaiCari = Math.max(0, m.index - 600);
    const jendela = kode.slice(mulaiCari, m.index);
    const posUpdate = jendela.lastIndexOf("DailyChecklist.update(");
    if (posUpdate === -1) continue;
    const awalPanggilan = mulaiCari + posUpdate;

    // Batas objek yang ditulis: dari update( sampai kurung tutup pasangannya.
    let depth = 0, akhir = awalPanggilan;
    for (let i = awalPanggilan; i < kosong.length; i++) {
      const c = kosong[i];
      if (c === "(") depth++;
      else if (c === ")") { depth--; if (depth === 0) { akhir = i; break; } }
    }
    const isi = kode.slice(awalPanggilan, akhir + 1);
    situs++;
    const baris = kode.slice(0, m.index).split("\n").length;

    /* ── 1. Stempel audit ──────────────────────────────────────────── */
    const kurang = ["approved_at", "approved_by_email"].filter((k) => !isi.includes(k));
    if (kurang.length > 0) {
      temuan.push(
        `${rel}:${baris}  menyetujui DailyChecklist tanpa ${kurang.join(" dan ")}. ` +
        `approved_points menjadi rupiah di slip gaji; tanpa stempel ini tidak ada yang bisa ` +
        `menjawab siapa yang memutuskannya dan kapan. Untuk jalur otomatis tulis ` +
        `approved_by_email: "" secara sengaja.`,
      );
    }

  }
}

if (temuan.length) {
  console.error(`${temuan.length} masalah pada persetujuan poin.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Persetujuan poin aman: ${situs} penulisan "approved" pada DailyChecklist, ` +
  `semuanya berstempel approved_at + approved_by_email.`,
);
process.exit(0);
