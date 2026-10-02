/**
 * cek-gaji.mjs — satu periode gaji, dan tidak ada yang terkunci dari
 * slipnya sendiri.
 *
 * ── Dua hal yang dijaga, dan kenapa ─────────────────────────────────
 *
 * 1. SATU JENIS PERIODE.
 *
 *    hitungGaji.js pernah memuat peringatan ini, ditulis sendiri oleh
 *    yang membangunnya:
 *
 *      "Slip MINGGUAN adalah sistem lama dan masih hidup berdampingan
 *       (period_type "weekly", otomatisasi A5 siapkanSlipMingguan).
 *       Selama keduanya aktif, satu periode bisa dibayar dua kali."
 *
 *    Peringatan itu benar dan berumur panjang: layar penerbit berhenti
 *    menawarkan mingguan sejak D30, tetapi fungsi otomatisnya tetap ada
 *    berbulan-bulan sesudahnya, tinggal menunggu satu saklar. Saklarnya
 *    tidak pernah menyala — `siapkan_slip_terakhir` null — jadi tidak
 *    ada uang yang pernah dibayar dua kali. Itu keberuntungan, bukan
 *    penjagaan.
 *
 *    Sejak 30-09-2026 gaji dibayar BULANAN, tanggal 1. Penjaga ini
 *    menolak kode mana pun yang membuat slip mingguan baru.
 *
 * 2. PINTU YANG TIDAK BOLEH HILANG.
 *
 *    Empat pintu gaji dilebur jadi dua pada tanggal yang sama. Dua di
 *    antara yang lama — "Slip Gaji" dan "Kasbon" — dibuka juga oleh
 *    keeper dan kepala_feeder; dua lainnya hanya oleh pengelola.
 *    Melebur keempatnya jadi SATU pintu, yang terdengar paling
 *    sederhana, akan mengunci keeper dari slip dan kasbonnya sendiri
 *    tanpa satu pun error.
 *
 *    Ini bukan kekhawatiran teoretis: penggabungan yang terlihat seperti
 *    penyederhanaan tetapi mencabut satu-satunya pintu sebuah peran
 *    sudah pernah terjadi di aplikasi ini. Penjaga ini memastikan setiap
 *    peran yang DIGAJI tetap punya jalan ke layar gajinya.
 *
 * Jalankan:  node scripts/cek-gaji.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const AKAR = process.cwd();
const temuan = [];

/* ── 1. Tidak ada yang membuat slip mingguan baru ──────────────────── */

function berkas(dir, keluar = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx|ts)$/.test(n)) keluar.push(p);
  }
  return keluar;
}

const sumber = [
  ...berkas(join(AKAR, "src")),
  ...(existsSync(join(AKAR, "base44/functions")) ? berkas(join(AKAR, "base44/functions")) : []),
];

let payloadDiperiksa = 0;
for (const p of sumber) {
  const rel = relative(AKAR, p);
  const asli = readFileSync(p, "utf8");
  // Komentar dibuang: penjelasan di berkas ini dan di hitungGaji.js
  // menyebut "weekly" justru untuk menerangkan kenapa ia dilarang.
  const s = asli
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((b) => !b.trim().startsWith("//") && !b.trim().startsWith("*")).join("\n");

  for (const m of s.matchAll(/period_type\s*:\s*["'](\w+)["']/g)) {
    payloadDiperiksa++;
    if (m[1] === "weekly") {
      const baris = s.slice(0, m.index).split("\n").length;
      temuan.push(`${rel}:${baris}  menulis period_type "weekly" — gaji dibayar bulanan sejak 30-09-2026`);
    }
  }
}

if (existsSync(join(AKAR, "base44/functions/siapkanSlipMingguan"))) {
  temuan.push('base44/functions/siapkanSlipMingguan/  penerbit slip mingguan hidup lagi');
}

/* ── 2. Potongan kasbon ditulis di SATU tempat ─────────────────────── */

/*
 * Nilai ini adalah SATUAN yang pernah berubah arti.
 *
 * "Rp 100.000 per periode" berarti per MINGGU selama gaji mingguan, dan
 * per BULAN sejak 30-09-2026 — pelunasan melambat empat kali lipat tanpa
 * satu pun error. Saat itu angkanya ditulis ulang di SEMBILAN tempat
 * dengan literal telanjang `100000`; mengubah artinya berarti menemukan
 * kesembilannya, dan yang terlewat akan diam saja.
 *
 * Sekarang satu-satunya tempatnya POTONGAN_KASBON_BAWAAN di hitungGaji.js.
 */
const SUMBER_POTONGAN = "src/lib/hitungGaji.js";
let literalDiperiksa = 0;

for (const p of sumber) {
  const rel = relative(AKAR, p);
  if (rel === SUMBER_POTONGAN) continue;
  const s = readFileSync(p, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((b) => !b.trim().startsWith("//") && !b.trim().startsWith("*")).join("\n");

  for (const m of s.matchAll(/weekly_deduction[^;\n]*?\|\|\s*(\d{5,})/g)) {
    literalDiperiksa++;
    const baris = s.slice(0, m.index).split("\n").length;
    temuan.push(`${rel}:${baris}  potongan kasbon bawaan ditulis sebagai angka (${m[1]}) — pakai POTONGAN_KASBON_BAWAAN dari ${SUMBER_POTONGAN}`);
  }
}

/*
 * Kedua sisi kembarannya harus bernilai SAMA PERSIS.
 *
 * Frontend dan backend berjalan di runtime berbeda dan tidak bisa saling
 * mengimpor, jadi angkanya memang ada dua kali. Yang tidak boleh adalah
 * keduanya berselisih: layar menjanjikan Rp 400.000 sementara otomatisasi
 * onSalarySlipPaid memotong Rp 100.000 — dan tidak ada satu pun error,
 * karena keduanya angka yang sah.
 */
const KEMBAR = "base44/shared/gaji.ts";
const angkaDari = (isi) => {
  const m = isi.match(/export const POTONGAN_KASBON_BAWAAN\s*=\s*(\d+)/);
  return m ? Number(m[1]) : null;
};
const depan = angkaDari(readFileSync(join(AKAR, SUMBER_POTONGAN), "utf8"));
const belakang = existsSync(join(AKAR, KEMBAR))
  ? angkaDari(readFileSync(join(AKAR, KEMBAR), "utf8"))
  : null;

if (belakang === null) {
  temuan.push(`${KEMBAR}  kembaran backend hilang — otomatisasi onSalarySlipPaid tidak punya sumber angkanya`);
} else if (depan !== belakang) {
  temuan.push(
    `POTONGAN_KASBON_BAWAAN berselisih: ${SUMBER_POTONGAN} = ${depan}, ${KEMBAR} = ${belakang}. ` +
    `Layar dan otomatisasi yang memotong akan memakai angka berbeda, tanpa error.`,
  );
}

/* ── 4. Setiap peran bergaji punya pintu ke layar gajinya ──────────── */

const dir = mkdtempSync(join(tmpdir(), "cek-gaji-"));
const bundel = (masuk, keluar) =>
  execFileSync("npx", ["esbuild", masuk, "--bundle", "--format=cjs", "--platform=node",
    "--outfile=" + join(dir, keluar), "--log-level=error",
    "--alias:@=" + join(AKAR, "src")], { cwd: AKAR });

bundel("src/lib/permissions.js", "perm.cjs");
bundel("src/lib/hitungGaji.js", "gaji.cjs");
bundel("src/lib/potonganKasbon.js", "kasbon.cjs");
const perm = await import("file://" + join(dir, "perm.cjs")).then((m) => m.default || m);
const gaji = await import("file://" + join(dir, "gaji.cjs")).then((m) => m.default || m);
const kas = await import("file://" + join(dir, "kasbon.cjs")).then((m) => m.default || m);

/*
 * Section yang menampilkan slip & kasbon MILIK SENDIRI. Bila kelak
 * pintunya berganti nama, yang benar adalah memperbarui daftar ini
 * dengan sadar — bukan membiarkan penjaganya diam karena namanya tidak
 * ketemu lagi.
 */
const PINTU_SENDIRI = ["salary-slip"];

const navSrc = readFileSync(join(AKAR, "src/lib/navigation.js"), "utf8");
for (const sec of PINTU_SENDIRI) {
  if (!navSrc.includes(`section: "${sec}"`)) {
    temuan.push(`navigation.js  tidak ada pintu dengan section "${sec}" — layar gaji milik sendiri hilang dari menu`);
  }
}

for (const peran of gaji.PERAN_BERGAJI) {
  const bisa = PINTU_SENDIRI.some((sec) => perm.canAccess(peran, sec));
  if (!bisa) {
    temuan.push(`permissions.js  peran "${peran}" digaji aplikasi ini tetapi tidak bisa membuka satu pun layar gajinya sendiri`);
  }
}

rmSync(dir, { recursive: true, force: true });

/* ── 5. Tiga janji potongan kasbon, diuji betulan ──────────────────── */

/*
 * Bagian 1–4 memeriksa BENTUK kodenya. Bagian ini menjalankan
 * hitungKasbon() dan memeriksa JAWABANNYA — karena tiga janji berikut
 * adalah yang menentukan apakah seseorang dipotong dua kali, atau
 * dipotong melebihi utangnya.
 *
 * Bentuk datanya disalin dari kasbon Ali yang sungguhan (11 Agu 2026,
 * Rp 1.000.000, tiga entri riwayat) supaya yang diuji bukan kasus
 * karangan yang kebetulan lolos.
 */
const kasbonUji = {
  id: "uji",
  employee_email: "uji@duta-tortoise.test",
  status: "approved",
  amount: 1000000,
  total_paid: 400000,
  weekly_deduction: 400000,
  deduction_log: [
    { date: "2026-08-15", amount: 100000, salary_period: null, salary_slip_id: null },
    { date: "2026-08-27", amount: 100000, salary_period: "2026-08", salary_slip_id: "a" },
    { date: "2026-09-30", amount: 100000, salary_period: "2026-09", salary_slip_id: "b" },
  ],
};
const hit = (periode, k = kasbonUji) =>
  gaji.hitungKasbon({ kasbons: [k], email: kasbonUji.employee_email, periode });

/*
 * Janji pertama dan kedua adalah PASANGAN, dan memisahkannya persis yang
 * membuat Rp 100.000 hilang pada 30-09-2026.
 *
 * Menghitung ulang slip yang sudah terbit harus mengembalikan potongan
 * yang SUDAH TERCATAT — bukan nol — supaya slipnya tetap menahan uang
 * yang menurut riwayat kasbon sudah ditahan. Sekaligus `idDipotong`
 * harus KOSONG, supaya tidak ada catatan kedua yang dibuat.
 *
 * Menjawab salah satu saja menghasilkan satu dari dua cacat: memotong
 * dua kali, atau memotong nol sambil mencatat lunas.
 */
const janji = [
  ["slip yang dihitung ulang tetap memotong yang sudah tercatat", hit("2026-09").potongan, 100000],
  ["...dan tidak mencatat potongan kedua", hit("2026-09").idDipotong.length, 0],
  ["sisanya tetap terbawa utuh", hit("2026-09").sisa, 600000],
  ["periode baru dipotong sebesar tarifnya", hit("2026-10").potongan, 400000],
  ["...dan ditandai untuk dicatat", hit("2026-10").idDipotong.length, 1],
  ["sisa berkurang tepat sebesar potongannya", hit("2026-10").sisa, 200000],
];

// Sisa lebih kecil daripada tarif: tidak boleh memotong melebihi utang.
const hampirLunas = {
  ...kasbonUji,
  total_paid: 800000,
  deduction_log: [...kasbonUji.deduction_log,
    { date: "2026-10-31", amount: 400000, salary_period: "2026-10", salary_slip_id: "c" }],
};
janji.push(
  ["potongan tidak melebihi sisa utang", hit("2026-11", hampirLunas).potongan, 200000],
  ["sisa nol saat lunas", hit("2026-11", hampirLunas).sisa, 0],
);

for (const [nama, dapat, harap] of janji) {
  if (dapat !== harap) {
    temuan.push(`hitungKasbon()  ${nama}: dapat ${dapat}, seharusnya ${harap}`);
  }
}

/* ── 6. Aturan lembur: dua salinan, satu jawaban ───────────────────── */

/*
 * `jamLemburBerbukti` ada DUA KALI — src/lib/weeklySalaryUtils.js dan
 * base44/shared/otomatis.ts — karena frontend dan backend berjalan di
 * runtime berbeda dan tidak bisa saling mengimpor. Keduanya menulis
 * OvertimeLog, dan OvertimeLog-lah yang dibayar.
 *
 * Bentuk kodenya SENGAJA berbeda (TypeScript, dan backend memakai
 * jamDari() untuk mengurai waktunya), jadi cek-kembar yang membandingkan
 * badan fungsi tidak bisa dipakai di sini. Yang harus sama bukan
 * bentuknya melainkan JAWABANNYA — jadi keduanya dijalankan betulan atas
 * kasus yang sama.
 */
const bandingLembur = [
  ["pulang sebelum shift selesai",        { check_out: "15:30", shift_end: "16:00" }, ["15:00"], false],
  ["lembur 1 jam, ada bukti kerja",       { check_out: "17:00", shift_end: "16:00" }, ["16:30"], false],
  ["lembur 1 jam, TANPA bukti kerja",     { check_out: "17:00", shift_end: "16:00" }, ["15:00"], false],
  ["dibulatkan ke 0,5 jam",               { check_out: "17:20", shift_end: "16:00" }, ["17:10"], false],
  ["hanya centang absensi setelah shift", { check_out: "17:00", shift_end: "16:00" }, ["16:30"], true],
  ["23-09-2026 Angsolo, tugas sampai 15:28",
   { check_out: "18:52", shift_end: "16:00" },
   ["09:12", "11:42", "13:38", "14:50", "15:28"], false],
];

bundel("base44/shared/otomatis.ts", "otomatis.cjs");
bundel("src/lib/weeklySalaryUtils.js", "upah.cjs");
const be = await import("file://" + join(dir, "otomatis.cjs")).then((m) => m.default || m);
const fe = await import("file://" + join(dir, "upah.cjs")).then((m) => m.default || m);

for (const [nama, att, jam, absensiSaja] of bandingLembur) {
  const cl = { completed_tasks: jam.map((j) => ({
    task_title: absensiSaja ? "Absensi jam pulang" : "Kebersihan E1",
    recorded_at: j,
  })) };
  const a = fe.jamLemburBerbukti(att, cl);
  const b = be.jamLemburBerbukti(att, cl);
  if (a !== b) {
    temuan.push(`jamLemburBerbukti berselisih pada "${nama}": depan ${a} jam, belakang ${b} jam`);
  }
}

/*
 * Dan satu janji yang bukan soal kembaran: catatCheckOut WAJIB membaca
 * ulang checklist-nya saat pemanggil tidak membawanya — apa pun bentuk
 * "tidak membawa" itu. Syarat `=== undefined` pernah melewatkan `null`,
 * dan `null` persis yang dikirim KeeperDashboard (`all[0] || null`).
 * Akibatnya lembur dibayar tanpa bukti; lihat 23-09-2026 di atas.
 */
// Komentar dibuang lebih dulu: penjelasan cacat ini di absensi.js memuat
// contoh kodenya sendiri, dan tanpa ini penjaga menangkap penjelasannya.
const absensiSrc = readFileSync(join(AKAR, "src/lib/absensi.js"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").filter((b) => !b.trim().startsWith("//")).join("\n");
if (/harian\s*===\s*undefined/.test(absensiSrc)) {
  temuan.push(
    'src/lib/absensi.js  catatCheckOut membaca ulang checklist hanya saat `harian === undefined`. ' +
    'Pemanggil yang mengirim `null` melewati pembacaan itu, dan lembur dibayar tanpa bukti kerja. ' +
    'Pakai `!harian`.',
  );
}

/* ── hasil ─────────────────────────────────────────────────────────── */

/* ── Kasbon outstanding: satu aturan, bukan tiga ───────────────────── */

/*
 * Beranda Owner menyaring kasbon begini sampai 02-10-2026:
 *
 *     kasbons.filter(k => k.status === "active" || k.remaining_amount > 0)
 *
 * KEDUA syaratnya mati. "active" tidak ada di enum Kasbon sama sekali — yang
 * ada diajukan/pending/approved/rejected/lunas — dan `remaining_amount` bukan
 * kolom Kasbon. Komentar di baris TEPAT DI BAWAHNYA sudah menuliskan hal itu,
 * lalu barisnya dibiarkan: yang satu salah tanpa suara, yang lain sudah
 * diketahui salah dan tetap dipakai.
 *
 * Akibatnya "Kasbon outstanding" di beranda pemilik SELALU Rp 0. Angka yang
 * benar pada data hari itu Rp 600.000.
 */
const KASBON_NYATA = [
  { employee_name: "Ahmad Ali", status: "approved", amount: 1000000, total_paid: 400000 },
  { employee_name: "Ahmad Ali", status: "lunas", amount: 300000, total_paid: 300000 },
];
if (kas.totalBelumLunas(KASBON_NYATA) !== 600000) {
  temuan.push(`Kasbon outstanding: dapat ${kas.totalBelumLunas(KASBON_NYATA)}, seharusnya 600000 (Ahmad Ali, approved, 1jt - 400rb)`);
}
const kasbonLunasUji = [
  [{ status: "approved", amount: 1000000, total_paid: 400000 }, true, "approved dan masih bersisa"],
  [{ status: "approved", amount: 300000, total_paid: 300000 }, false, "approved tetapi sudah habis terbayar"],
  [{ status: "lunas", amount: 300000, total_paid: 300000 }, false, "sudah lunas"],
  [{ status: "pending", amount: 500000, total_paid: 0 }, false, "belum disetujui — uangnya belum keluar"],
  [{ status: "diajukan", amount: 500000, total_paid: 0 }, false, "baru diajukan"],
  [{ status: "rejected", amount: 500000, total_paid: 0 }, false, "ditolak"],
  [{ status: "active", amount: 500000, total_paid: 0 }, false, "status yang TIDAK ADA di enum — tidak boleh dikenali"],
  [null, false, "tanpa kasbon"],
];
for (const [k, harap, kenapa] of kasbonLunasUji) {
  if (kas.belumLunas(k) !== harap) {
    temuan.push(`belumLunas (${kenapa}): menjawab ${!harap}, seharusnya ${harap}`);
  }
}
// Layarnya harus memakai aturan itu, bukan menulis syaratnya sendiri.
const ownerSrc = readFileSync(join(AKAR, "src/components/dashboard/role/OwnerDashboard.jsx"), "utf8");
const ownerKode = ownerSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
if (/status\s*===\s*"active"/.test(ownerKode) || /\.remaining_amount/.test(ownerKode)) {
  temuan.push("OwnerDashboard masih menyaring kasbon dengan status \"active\" atau kolom remaining_amount — keduanya tidak ada");
}
if (!ownerKode.includes("totalBelumLunas")) {
  temuan.push("OwnerDashboard tidak memakai totalBelumLunas() — angka kasbon bisa melenceng lagi dari gaji dan Panel Kasbon");
}

/* ── 6. Satu sumber untuk "harian atau bulanan" ────────────────────── */

/*
 * SalaryConfig punya kolom `salary_type` berisi "harian"/"bulanan" di
 * keempat barisnya. Penggajian TIDAK PERNAH membacanya: hitungGaji()
 * menentukannya dari PERAN lewat adalahPeranHarian().
 *
 * Selama layar konfigurasi memakai `salary_type` untuk labelnya, ia
 * menawarkan pilihan yang tidak menyalakan apa pun — keeper disetel
 * "Bulanan" akan tampil "Rp 70.000/bln" dengan kolom Potongan Absen
 * terbuka, sementara slipnya tetap terbit hari-masuk x Rp 70.000. Tidak
 * ada error, karena kedua nilainya sah.
 *
 * Penjaga ini memastikan layar itu bertanya ke sumber yang sama dengan
 * yang membayar. Bila kelak admin atau manajer memang digaji harian,
 * yang diubah adalah PERAN_HARIAN — dan layarnya ikut sendiri.
 */
const LAYAR_KONFIG = "src/components/salary/KonfigurasiGajiTab.jsx";
const konfigSrc = readFileSync(join(AKAR, LAYAR_KONFIG), "utf8");
const konfigKode = konfigSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

if (/salary_type\s*[=!]==/.test(konfigKode)) {
  temuan.push(
    `${LAYAR_KONFIG}  menentukan harian/bulanan dari kolom salary_type — ` +
    `penggajian memakai adalahPeranHarian(peran), jadi labelnya bisa berselisih dengan slipnya`,
  );
}
if (!konfigKode.includes("adalahPeranHarian")) {
  temuan.push(
    `${LAYAR_KONFIG}  tidak memakai adalahPeranHarian() — jenis gaji di layar ini harus turun dari peran, ` +
    `sumber yang sama dengan hitungGaji()`,
  );
}
/*
 * Dan tarif trip harus dibaca lewat tarifTrip(), bukan satu kolom
 * mentah: ada DUA kolom untuk angka yang sama, dan yang berisi di data
 * sekarang (`vegetable_rate_per_trip`) bukan yang dibaca lebih dulu.
 */
/*
 * Dicari `tarifTrip(` — PEMANGGILANNYA, bukan namanya. Nama state di
 * layar itu `tarifTripTeks`, jadi mencari "tarifTrip" saja akan lolos
 * meski fungsinya sudah dibuang. Penjaga yang hijau karena kebetulan
 * cocok dengan nama lain tidak menjaga apa pun.
 */
if (!/tarifTrip\s*\(/.test(konfigKode)) {
  temuan.push(
    `${LAYAR_KONFIG}  tidak memakai tarifTrip() — kotak tarif rempesan bisa kosong ` +
    `padahal penggajian sedang memakai angka dari kolom yang satunya`,
  );
}

if (temuan.length) {
  console.error(
    `${temuan.length} masalah pada modul gaji.\n\n` +
    temuan.map((t) => "  " + t).join("\n") + "\n",
  );
  process.exit(1);
}
console.log(
  `Gaji: satu periode (${payloadDiperiksa} payload period_type, semuanya bulanan), ` +
  `potongan kasbon bawaan Rp ${depan.toLocaleString("id-ID")} sama di frontend & backend, ` +
  `${janji.length} janji potongan kasbon + ${bandingLembur.length} kasus lembur diuji, ` +
  `${gaji.PERAN_BERGAJI.length} peran bergaji punya pintu ke slipnya sendiri, ` +
  `jenis gaji di layar konfigurasi turun dari peran.`,
);
process.exit(0);
