/**
 * cek-fotobukti.mjs — foto bukti tugas tidak boleh dibaca dari satu tempat.
 *
 * ── Kejadian yang melahirkannya ─────────────────────────────────────────────
 *
 * 20 Nov 2026 dilaporkan: "keeper tidak bisa memfoto di SOP-nya hari ini."
 * Diukur dari data peternakan hari itu dan sepuluh hari sebelumnya:
 *
 *   110 tugas WAJIB FOTO diselesaikan 10–20 Nov 2026
 *    61 di antaranya tersimpan TANPA photo_url di DailyChecklist
 *       — sementara fotonya ADA di MaintenanceLog, lengkap dengan jamnya
 *
 * Kipernya memfoto. Fotonya tersimpan. Yang gagal adalah penyalinannya ke
 * DailyChecklist, dan layar persetujuan hanya membaca salinan itu — jadi
 * penyetuju diberi tahu bahwa kipernya tidak memfoto, lalu poinnya dipotong.
 *
 * Sebabnya dua, keduanya diam: `syncPhotoToChecklist` menulis ULANG seluruh
 * larik `completed_tasks` sambil berlomba dengan automasi server dan dengan
 * `syncAIVerification` (10 dari 61 baris itu punya `ai_status: "selesai"`
 * tanpa foto — AI hanya jalan kalau fotonya ada, jadi fotonya tertimpa), dan
 * pemanggilnya menelan galatnya dengan `catch {}`.
 *
 * ── Yang dijaga ─────────────────────────────────────────────────────────────
 *
 * 1. Layar yang MENAMPILKAN atau MENGHITUNG foto bukti harus melewatkan
 *    datanya lewat lib/fotoBuktiTugas.js, bukan membaca
 *    `completed_tasks[].photo_url` mentah. Tanpa itu, satu penyalinan yang
 *    gagal kembali terbaca sebagai "tidak memfoto".
 *
 * 2. Rentang coba-ulang `syncPhotoToChecklist` tidak boleh menyusut kembali
 *    ke hitungan detik: barisnya dibuat automasi server, dan 2,5 detik
 *    adalah rentang yang kalah.
 *
 * 3. `syncAIVerification` tidak boleh dijalankan mendahului penyalinan foto
 *    di jalur centang-dengan-foto: keduanya menulis larik yang sama.
 *
 * 4. Tidak ada `catch {}` kosong di jalur foto. Kegagalan yang tidak
 *    meninggalkan jejak apa pun adalah sebab 61 foto itu baru ketahuan
 *    setelah sebelas hari.
 *
 * Jalankan:  node scripts/cek-fotobukti.mjs
 */
import { readFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baca = (p) => kupasKomentar(readFileSync(join(AKAR, p), "utf8"));
const temuan = [];

/* ── 1. Aturannya ada, dan isinya masih mengerjakan pekerjaannya ─────────── */

const ATURAN = "src/lib/fotoBuktiTugas.js";
if (!existsSync(join(AKAR, ATURAN))) {
  temuan.push(`${ATURAN} hilang — tanpa aturan ini tiap layar kembali menebak sendiri dari mana foto bukti dibaca.`);
} else {
  const aturan = baca(ATURAN);
  for (const [pola, apa] of [
    [/export function petaFotoLog/, "peta foto dari MaintenanceLog"],
    [/export function lengkapiFotoChecklist/, "pelengkap satu checklist"],
    [/export function lengkapiFotoDaftar/, "pelengkap daftar checklist"],
    [/done_by_email/, "pencocokan lewat email pengerja"],
    [/period_key/, "pencocokan lewat tanggal log"],
    [/kunciTugas/, "kunci tugas bersama (lib/kunciTugas.js)"],
  ]) {
    if (!pola.test(aturan)) temuan.push(`${ATURAN}: ${apa} hilang — tanpa itu fotonya tidak akan ketemu lagi.`);
  }
}

/* ── 2. Layar pembaca foto memakai aturan itu ────────────────────────────── */

const PEMBACA = [
  ["src/components/sop/SOPApproval.jsx", "layar persetujuan poin"],
  ["src/pages/LayarTimPage.jsx", "layar tim"],
];
for (const [berkas, apa] of PEMBACA) {
  if (!existsSync(join(AKAR, berkas))) {
    temuan.push(`${berkas} hilang — penjaga ini kehilangan sasarannya; perbarui daftarnya kalau layarnya memang pindah.`);
    continue;
  }
  const kode = baca(berkas);
  if (!/photo_url/.test(kode)) continue; // tidak lagi menampilkan foto: bukan urusan penjaga ini
  if (!/fotoBuktiTugas/.test(kode)) {
    temuan.push(
      `${berkas} (${apa}) membaca photo_url tetapi tidak memakai lib/fotoBuktiTugas.js. ` +
      `Salinan foto di DailyChecklist pernah hilang pada 61 dari 110 tugas wajib foto ` +
      `(10–20 Nov 2026) sementara fotonya ada di MaintenanceLog; layar yang membaca ` +
      `salinannya saja akan kembali melaporkan kiper tidak memfoto.`,
    );
  }
}

/* ── 3. Rentang coba-ulang tidak menyusut ────────────────────────────────── */

const SINK = "src/lib/syncPhotoToChecklist.js";
const sink = baca(SINK);
const angka = [...sink.matchAll(/JEDA_MS\s*=\s*\[([^\]]*)\]/g)].map((m) => m[1]);
if (angka.length === 0) {
  temuan.push(`${SINK}: daftar jeda coba-ulang (JEDA_MS) tidak ditemukan — rentangnya tidak bisa diperiksa.`);
} else {
  const total = angka[0].split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n)).reduce((a, b) => a + b, 0);
  if (total < 10000) {
    temuan.push(
      `${SINK}: rentang coba-ulang hanya ${total} ms. Baris yang ditambal dibuat automasi ` +
      `server; rentang 2.500 ms adalah rentang yang kalah dan menghasilkan 61 foto tak tersalin ` +
      `dalam sebelas hari. Minimal 10.000 ms.`,
    );
  }
}

/* ── 4. Foto disalin SEBELUM AI dijalankan, dan galatnya tidak dibuang ──── */

const TUGAS = "src/components/sop/TugasHariIni.jsx";
const tugas = baca(TUGAS);
/*
  SETIAP panggilan, bukan salah satunya.

  Percobaan pertama penjaga ini hanya mencari satu `await syncPhotoToChecklist`
  di mana pun dalam berkas. Diuji merah: await-nya dilepas dari jalur
  centang-dengan-foto, dan penjaganya tetap hijau — karena panggilan LAIN yang
  masih ditunggu (di handlePhotoNotes) ikut terhitung. Penjaga yang puas oleh
  panggilan yang salah tidak menjaga apa pun.
*/
const semuaPanggilan = [...tugas.matchAll(/(await\s+)?syncPhotoToChecklist\s*\(/g)];
const tanpaAwait = semuaPanggilan.filter((m) => !m[1]);
if (semuaPanggilan.length === 0) {
  temuan.push(`${TUGAS}: tidak ada panggilan syncPhotoToChecklist sama sekali — foto bukti tidak akan pernah sampai ke checklist.`);
}
for (const m of tanpaAwait) {
  const baris = tugas.slice(0, m.index).split("\n").length;
  temuan.push(
    `${TUGAS} (baris ~${baris} setelah komentar dikupas): syncPhotoToChecklist tidak ditunggu. ` +
    `syncAIVerification menulis larik completed_tasks yang sama; yang membaca lebih ` +
    `dulu lalu menulis belakangan menghapus tulisan yang lain.`,
  );
}
const posAI = tugas.indexOf("runPhotoVerificationInBackground({");
const posSyncTerakhir = semuaPanggilan.length ? semuaPanggilan[semuaPanggilan.length - 1].index : -1;
const posSyncSebelumAI = semuaPanggilan.filter((m) => posAI === -1 || m.index < posAI).length;
if (posAI !== -1 && posSyncSebelumAI === 0 && posSyncTerakhir > posAI) {
  temuan.push(`${TUGAS}: AI Vision dijalankan SEBELUM foto disalin ke checklist — keduanya menulis larik yang sama.`);
}

for (const berkas of [TUGAS, "src/components/guided/GuidedHariIni.jsx"]) {
  const kode = baca(berkas);
  if (/catch\s*\{\s*\}/.test(kode)) {
    temuan.push(
      `${berkas}: masih ada \`catch {}\` kosong. Kegagalan yang tidak meninggalkan jejak ` +
      `apa pun adalah sebab 61 foto hilang tanpa ketahuan selama sebelas hari.`,
    );
  }
}

if (temuan.length) {
  console.error(
    `${temuan.length} masalah pada foto bukti tugas.\n\n` +
    temuan.map((t) => "  " + t).join("\n") + "\n",
  );
  process.exit(1);
}
console.log(
  `Foto bukti dibaca dari dua tempat (${PEMBACA.length} layar pembaca, ` +
  `rentang coba-ulang utuh, urutan penulis terjaga).`,
);
process.exit(0);
