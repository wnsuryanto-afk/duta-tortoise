/**
 * cek-pencairan.mjs — uang yang cair harus sampai ke buku kas.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 29 Okt 2026 pemilik mencairkan request dana Rp 200.000. Bukti transfernya
 * diunggah pukul 08:57 dan diberi nama penggunggahnya. Pemohonnya menerima
 * notifikasi "Dana Rp 200.000 Sudah Dicairkan".
 *
 * Buku kas tidak pernah tahu. Tombol "Cairkan" hanya menulis satu hal:
 *
 *     PettyCashRequest.update(id, { status: "dicairkan", ... })
 *
 * Saldo kas kecil terus berjalan seolah uang itu tidak pernah datang, dan
 * pada 4 Nov tercatat Rp −55.500 — padahal uang yang ada Rp 144.500. Tidak
 * ada error, tidak ada peringatan. Satu-satunya kabar yang muncul di
 * aplikasi justru kabar bahwa uangnya sudah cair.
 *
 * Penyebabnya: DUA entitas untuk satu hal, dan hanya satu yang tersambung.
 *
 *     PettyCashTopUpRequest → processTopUpRequest → MEMBUAT baris top_up
 *     PettyCashRequest      → tombol Cairkan      → hanya ubah status
 *
 * Yang ditemukan pemiliknya sendiri, sepekan kemudian, dengan bertanya
 * "kok tidak terjumlahkan".
 *
 * ── Empat hal yang dijaga ────────────────────────────────────────────
 *
 * 1. Setiap tempat yang menulis status "dicairkan" harus juga lewat
 *    pastikanMasukBukuKas. Satu jalur baru yang lupa — layar lain, fungsi
 *    backend, tombol massal — mengulang kejadian yang sama persis.
 *
 * 2. pencairanBelumMasuk harus tetap mencocokkan lewat tanggal+nominal,
 *    bukan hanya linked_request_id. Dua pencairan lama memang masuk buku
 *    kas tanpa tautan; penjaga yang hanya melihat tautan akan menyuruh
 *    orang memasukkan Rp 500.000 yang sudah ada. Peringatan yang
 *    melipatgandakan uang lebih buruk daripada tidak ada peringatan.
 *
 * 3. Status request tidak dibandingkan ke nilai yang tidak pernah ada.
 *    Skemanya menyebut enum Inggris (pending/approved/rejected/disbursed),
 *    datanya Indonesia. Dua pembaca yang menulis `status === "disbursed"`
 *    dengan membaca skema hijau selamanya tanpa pernah cocok: baris
 *    "Kas kecil dicairkan" di laba rugi tidak pernah muncul, dan rincian
 *    petty_cash pada biaya per ekor selalu Rp 0.
 *
 * 4. Satu baris top_up tidak boleh melunasi dua request. Tanpa itu, dua
 *    permintaan kembar pada hari yang sama saling menutupi dan yang kedua
 *    hilang tanpa jejak.
 *
 * Jalankan:  node scripts/cek-pencairan.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";
import { pencairanBelumMasuk, totalBelumMasuk, STATUS_REQUEST_SAH } from "../src/lib/kasKecil.js";

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

/* ── 1. Yang menulis "dicairkan" harus lewat pastikanMasukBukuKas ───── */

/*
 * Berkas yang hanya MEMBACA statusnya — memfilter daftar, mewarnai lencana,
 * menghitung jumlah — tidak menulis apa pun. Yang dicari adalah penulisan:
 * `status: "dicairkan"` di dalam sebuah objek yang dikirim ke .update(.
 */
const BACA_SAJA = new Set([
  "src/lib/kasKecil.js",            // pencocokan, murni
  "scripts/cek-pencairan.mjs",      // penjaga ini sendiri
]);

const berkas = [
  ...daftarBerkas("src", [".jsx", ".js"]),
  ...daftarBerkas("base44/functions", [".ts"]),
  ...daftarBerkas("base44/shared", [".ts"]),
];

let situsPenulis = 0;
for (const rel of berkas) {
  if (BACA_SAJA.has(rel)) continue;
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  // Penulisan: kunci `status` diberi nilai "dicairkan" di dalam literal objek.
  if (!/\bstatus\s*:\s*["']dicairkan["']/.test(kode)) continue;
  situsPenulis++;
  if (!/pastikanMasukBukuKas/.test(kode)) {
    temuan.push(
      `${rel}  menulis status "dicairkan" tanpa memanggil pastikanMasukBukuKas. ` +
      `Uang yang cair tidak akan sampai ke PettyCashLedger dan saldo kas kecil ` +
      `akan salah tanpa satu pun error — persis kejadian 29 Okt 2026 (Rp 200.000). ` +
      `Pakai pastikanMasukBukuKas dari src/lib/cairkanKasKecil.js, dan tulis buku ` +
      `kasnya DULU sebelum mengubah statusnya.`,
    );
  }
}

if (situsPenulis === 0) {
  temuan.push(
    `Tidak ada satu pun berkas yang menulis status "dicairkan". Entah jalur ` +
    `pencairannya dihapus, entah pola penulisannya berubah dan penjaga ini ` +
    `sudah berhenti memeriksa apa pun. Perbaiki pencariannya di ` +
    `scripts/cek-pencairan.mjs.`,
  );
}

/* ── 1b. Status request hanya dibandingkan ke nilai yang benar-benar ada ── */

/*
 * Skema PettyCashRequest dulu menyebut enum berbahasa Inggris — pending,
 * approved, rejected, disbursed — sementara setiap penulis status menulis
 * bahasa Indonesia. Base44 tidak menolak nilai di luar enum, jadi dua pembaca
 * yang ditulis dengan membaca SKEMA, bukan datanya, hijau selamanya tanpa
 * pernah cocok:
 *
 *   LabaRugiEnhanced    baris "Kas kecil dicairkan: Rp …" di bawah ringkasan
 *                       laba rugi tidak pernah muncul, bulan mana pun.
 *   useCostPerTortoise  rincian `petty_cash` pada biaya per ekor selalu Rp 0.
 *
 * Perbandingan ke nilai di luar daftar yang sah tidak akan pernah melempar.
 * Hanya penjaga yang bisa menemukannya.
 *
 * Tetapi pemeriksaannya harus SEMPIT, bukan luas.
 *
 * Percobaan pertama penjaga ini menolak setiap perbandingan status ke nilai
 * Inggris di berkas mana pun yang menyebut kas kecil. Ia menemukan dua bug
 * sungguhan — dan menuduh dua baris jujur:
 *
 *   PettyCashPage        topupRequests.filter(r => r.status === "pending")
 *                        BENAR: PettyCashTopUpRequest memang berenum Inggris.
 *   KepalaFeederDashboard  cl.status === "approved" pada DailyChecklist.
 *                        BENAR: itu entitas lain sama sekali.
 *
 * Penjaga yang menuduh baris jujur adalah penjaga yang dimatikan orang. Jadi
 * yang diperiksa hanya dua hal yang tidak bisa salah tuduh:
 *
 *   (a) nilai "disbursed" — tidak sah untuk entitas mana pun di aplikasi ini.
 *       PettyCashRequest memakai "dicairkan"; PettyCashTopUpRequest tidak
 *       punya status pencairan sama sekali.
 *   (b) nilai Inggris yang ditulis PERSIS di sebelah PettyCashRequest, yaitu
 *       di dalam .filter(…) atau .update(…) pada entitas itu. Di situ tidak
 *       ada keraguan entitas mana yang dimaksud.
 */
const TAK_SAH = "disbursed";
const INGGRIS = ["pending", "approved", "rejected", "disbursed"];

for (const rel of berkas) {
  if (BACA_SAJA.has(rel)) continue;
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));

  // (a) "disbursed" di mana pun, pada berkas yang menyentuh PettyCashRequest.
  if (/PettyCashRequest/.test(kode) &&
      new RegExp(`status\\s*(===?|!==?|:)\\s*["']${TAK_SAH}["']`).test(kode)) {
    temuan.push(
      `${rel}  memakai status "${TAK_SAH}" — nilai yang tidak sah untuk entitas ` +
      `mana pun di aplikasi ini. PettyCashRequest menyimpan ` +
      `${STATUS_REQUEST_SAH.join(", ")}. Perbandingan ini tidak akan pernah cocok ` +
      `dan tidak akan pernah melempar: baris "Kas kecil dicairkan" di laba rugi ` +
      `tidak pernah muncul, dan rincian petty_cash pada biaya per ekor selalu 0. ` +
      `Pakai STATUS_REQUEST dari src/lib/kasKecil.js.`,
    );
  }

  // (b) nilai Inggris di dalam PettyCashRequest.filter(…) / .update(…).
  for (const m of kode.matchAll(/PettyCashRequest\s*\.\s*(?:filter|update)\s*\(/g)) {
    const cuplik = kode.slice(m.index, m.index + 200);
    for (const salah of INGGRIS) {
      if (new RegExp(`status\\s*(===?|!==?|:)\\s*["']${salah}["']`).test(cuplik)) {
        temuan.push(
          `${rel}  memanggil PettyCashRequest dengan status "${salah}". Yang ` +
          `tersimpan berbahasa Indonesia (${STATUS_REQUEST_SAH.join(", ")}), jadi ` +
          `penyaringan ini mengembalikan daftar kosong selamanya tanpa error. ` +
          `Pakai STATUS_REQUEST dari src/lib/kasKecil.js.`,
        );
      }
    }
  }
}

/* ── 2 & 4. Pencocokan pencairan ↔ buku kas ─────────────────────────── */

const uji = [];
const cek = (nama, dapat, harus) => {
  uji.push(nama);
  if (JSON.stringify(dapat) !== JSON.stringify(harus)) {
    temuan.push(`pencairanBelumMasuk — ${nama}: dapat ${JSON.stringify(dapat)}, harus ${JSON.stringify(harus)}`);
  }
};

const R = (id, tanggal, jumlah, status = "dicairkan") =>
  ({ id, status, disbursement_date: tanggal, amount_requested: jumlah, requester_name: "x" });
const T = (id, tanggal, jumlah, taut) =>
  ({ id, entry_type: "top_up", entry_date: tanggal, amount: jumlah, linked_request_id: taut });

cek("tertaut → sudah masuk",
  pencairanBelumMasuk([R("a", "2026-01-01", 100)], [T("L", "2026-01-01", 100, "a")]).length, 0);

cek("tanggal+nominal sama → sudah masuk walau tanpa tautan",
  pencairanBelumMasuk([R("a", "2026-01-01", 100)], [T("L", "2026-01-01", 100)]).length, 0);

cek("tidak ada apa pun di buku kas → terlapor",
  pencairanBelumMasuk([R("a", "2026-01-01", 100)], []).map((r) => r.id), ["a"]);

cek("nominal beda → terlapor",
  pencairanBelumMasuk([R("a", "2026-01-01", 100)], [T("L", "2026-01-01", 99)]).map((r) => r.id), ["a"]);

cek("tanggal beda → terlapor",
  pencairanBelumMasuk([R("a", "2026-01-01", 100)], [T("L", "2026-01-02", 100)]).map((r) => r.id), ["a"]);

cek("satu top_up tidak melunasi dua request kembar",
  pencairanBelumMasuk([R("a", "2026-01-01", 100), R("b", "2026-01-01", 100)],
    [T("L", "2026-01-01", 100)]).length, 1);

cek("tautan eksplisit tidak boleh dicuri request lain",
  pencairanBelumMasuk([R("a", "2026-01-01", 100), R("b", "2026-01-01", 100)],
    [T("L", "2026-01-01", 100, "b")]).map((r) => r.id), ["a"]);

/*
 * Tautan ke entitas LAIN tidak mengunci barisnya. Baris 24 Sep 2026 tertaut
 * ke sebuah PettyCashTopUpRequest — id yang tidak ada di daftar
 * PettyCashRequest — padahal uangnya sama. Mengunci baris itu membuat
 * pencairan 24 Sep terlapor "belum masuk", dan Rp 200.000 yang sudah ada
 * akan dimasukkan kedua kali.
 */
cek("tautan ke entitas lain tidak mengunci baris",
  pencairanBelumMasuk([R("a", "2026-09-24", 200000)],
    [T("L", "2026-09-24", 200000, "id-topup-request-yang-bukan-request-ini")]).length, 0);

cek("pemakaian bukan top_up — tidak melunasi apa pun",
  pencairanBelumMasuk([R("a", "2026-01-01", 100)],
    [{ id: "L", entry_type: "pemakaian", entry_date: "2026-01-01", amount: 100 }]).map((r) => r.id), ["a"]);

cek("status selain dicairkan diabaikan",
  pencairanBelumMasuk([R("a", "2026-01-01", 100, "disetujui"), R("b", "2026-01-01", 100, "ditolak")], []).length, 0);

cek("nominal pecahan dibulatkan ke rupiah",
  pencairanBelumMasuk([R("a", "2026-01-01", 99999.999956)], [T("L", "2026-01-01", 100000)]).length, 0);

cek("total menjumlahkan yang belum masuk",
  totalBelumMasuk([R("a", "2026-01-01", 100), R("b", "2026-02-02", 250)], []), 350);

cek("tanpa argumen tidak melempar", [pencairanBelumMasuk().length, totalBelumMasuk()], [0, 0]);

cek("urut dari yang paling lama",
  pencairanBelumMasuk([R("b", "2026-03-03", 1), R("a", "2026-01-01", 1)], []).map((r) => r.id), ["a", "b"]);

if (temuan.length) {
  console.error(`${temuan.length} masalah pencairan kas kecil.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Pencairan aman: ${situsPenulis} tempat yang menulis status "dicairkan" lewat ` +
  `pastikanMasukBukuKas, tidak ada perbandingan status ke nilai enum Inggris, ` +
  `dan ${uji.length} aturan pencocokan pencairan ↔ buku kas terpenuhi.`,
);
process.exit(0);
