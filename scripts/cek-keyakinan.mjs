/**
 * cek-keyakinan.mjs — uji bahwa `ai_confidence` dibaca pada skala yang benar,
 * DAN bahwa tidak ada sisi baca yang kembali membandingkannya mentah-mentah.
 *
 * Kenapa penjaga ini ada. Prompt yang meminta angka keyakinan ke AI tidak
 * pernah menyebut skalanya, jadi modelnya menjawab dengan skala yang ia
 * pilih sendiri. Data nyata pada 30-09-2026 berisi keduanya: 164 nilai
 * berupa pecahan (0.3 … 0.95) dan 6 nilai berupa persen (10, 95, 100).
 * Seluruh sisi baca menganggapnya persen.
 *
 * Tidak ada yang error. Angkanya hanya jadi masuk akal terbalik:
 *
 *   · ambang "tampilkan apresiasi bila >= 60" tidak pernah benar untuk
 *     0.95 → 330 pesan tertulis untuk dua kiper tidak pernah tampil;
 *   · penanda "perlu diperiksa bila < 70" SELALU benar untuk 0.95 →
 *     setiap tugas tampak meragukan bagi penyetuju;
 *   · label "keyakinan {nilai}%" menampilkan "0.95%" untuk keyakinan 95%.
 *
 * Penjaga lain di repo ini memeriksa BENTUK kode. Yang ini memeriksa
 * JAWABANNYA, dengan angka yang benar-benar tersimpan di peternakan —
 * lalu memeriksa bentuknya juga, supaya perbandingan mentah tidak
 * menyelinap kembali lewat berkas baru.
 *
 * Jalankan:  node scripts/cek-keyakinan.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const dir = mkdtempSync(join(tmpdir(), "cek-keyakinan-"));
let gagal = 0;

function cek(nama, dapat, harus) {
  if (JSON.stringify(dapat) !== JSON.stringify(harus)) {
    gagal++;
    console.error(`GAGAL  ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harus: ${JSON.stringify(harus)}`);
  }
}

// ── Bagian 1: jawabannya ────────────────────────────────────────────
try {
  execFileSync("npx", ["esbuild", "src/lib/keyakinanAI.js",
    "--bundle", "--format=cjs", "--platform=node", `--outfile=${join(dir, "k.cjs")}`,
  ], { cwd: AKAR, stdio: "pipe" });
} catch (e) {
  console.log("Gagal membundel keyakinanAI:\n" + (e.stderr?.toString() || e.message));
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}
const { persenKeyakinan, layakTampil } = await import("file://" + join(dir, "k.cjs"))
  .then((m) => m.default || m);
rmSync(dir, { recursive: true, force: true });

// Nilai-nilai ini bukan karangan: inilah himpunan nilai unik ai_confidence
// yang benar-benar tersimpan di DailyChecklist pada 30-09-2026.
const TERSIMPAN = [0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 10, 95, 100];
const PECAHAN = TERSIMPAN.filter((n) => n <= 1);

cek("pecahan 0.95 jadi 95", persenKeyakinan(0.95), 95);
cek("pecahan 0.3 jadi 30", persenKeyakinan(0.3), 30);
// Nilai tepat 1 ambigu (1% atau 100%). Dibaca 100% karena muncul
// berdampingan dengan 0.95 dan 0.9 di data yang sama.
cek("pecahan 1 jadi 100", persenKeyakinan(1), 100);
cek("persen 95 tetap 95", persenKeyakinan(95), 95);
cek("persen 10 tetap 10", persenKeyakinan(10), 10);
cek("null jadi null", persenKeyakinan(null), null);
cek("undefined jadi null", persenKeyakinan(undefined), null);
// Keyakinan 0 adalah angka yang sah — `!nilai` akan salah di sini.
cek("nol tetap nol, bukan null", persenKeyakinan(0), 0);
cek("bukan angka jadi null", persenKeyakinan("tidak ada"), null);
cek("negatif dijepit ke 0", persenKeyakinan(-0.5), 0);
cek("di atas 100 dijepit ke 100", persenKeyakinan(150), 100);

// Inti perbaikannya, dinyatakan sebagai selisih SEBELUM vs SESUDAH.
const ambangLama = (n) => n == null || n >= 60;
cek("dengan kode lama, TIDAK SATU PUN nilai pecahan lolos ambang tampil",
  PECAHAN.filter(ambangLama), []);
cek("dengan kode baru, delapan dari sebelas lolos",
  PECAHAN.filter((n) => layakTampil(n)), [0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1]);

const perluLama = (n) => n != null && n < 70;
const perluBaru = (n) => { const p = persenKeyakinan(n); return p != null && p < 70; };
cek("dengan kode lama, SEMUA pecahan ditandai perlu diperiksa",
  PECAHAN.filter(perluLama).length, PECAHAN.length);
cek("dengan kode baru, hanya yang memang rendah",
  PECAHAN.filter(perluBaru), [0.3, 0.4, 0.5, 0.6]);

cek("label yang dilihat penyetuju untuk 0.95", `${Math.round(persenKeyakinan(0.95) ?? 0)}%`, "95%");

// ── Bagian 2: bentuknya ─────────────────────────────────────────────
//
// Jawaban yang benar hari ini tidak menjaga apa pun kalau berkas baru
// boleh membandingkan `ai_confidence` mentah-mentah lagi. Pemindai ini
// mencari pola itu di seluruh src/.
const DIKECUALIKAN = new Set([
  // Satu-satunya tempat yang BOLEH menyentuh nilai mentahnya.
  "src/lib/keyakinanAI.js",
  // Sisi tulis: menormalkan sebelum menyimpan, jadi memang menyebut
  // nama kolomnya di sebelah persenKeyakinan().
  "src/lib/photoVerification.js",
]);

function berkasJs(d, keluar = []) {
  for (const nama of readdirSync(d)) {
    const p = join(d, nama);
    if (statSync(p).isDirectory()) { berkasJs(p, keluar); continue; }
    if (/\.(js|jsx)$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

// Perbandingan langsung: ai_confidence lalu < > <= >= terhadap sebuah angka.
const POLA = /ai_confidence\s*(?:\|\|\s*\d+\s*)?(?:<|>|<=|>=)\s*\d/;
const temuan = [];
for (const p of berkasJs(join(AKAR, "src"))) {
  const rel = relative(AKAR, p);
  if (DIKECUALIKAN.has(rel)) continue;
  // Komentar dibuang lebih dulu: penjelasan soal cacat ini memuat contoh
  // kodenya, dan penjaga yang tersandung komentarnya sendiri tidak berguna.
  const isi = kupasKomentar(readFileSync(p, "utf8"));
  isi.split("\n").forEach((baris, i) => {
    if (POLA.test(baris)) temuan.push(`${rel}:${i + 1}  ${baris.trim().slice(0, 90)}`);
  });
}
if (temuan.length) {
  gagal++;
  console.error(
    `GAGAL  ${temuan.length} perbandingan langsung ai_confidence terhadap angka.\n` +
    `   Skalanya tidak bisa dipastikan dari nilainya — pakai persenKeyakinan()\n` +
    `   dari src/lib/keyakinanAI.js, atau daftarkan berkasnya di DIKECUALIKAN\n` +
    `   beserta alasannya.\n` +
    temuan.map((t) => "   " + t).join("\n")
  );
}

// ── Bagian 3: usulan poin AI tidak dipakai mentah, dan tidak menyimpan sendiri ──
//
// Cacat yang sama dengan Bagian 1, hanya akibatnya lebih mahal: poin Inisiatif
// berakhir menjadi uang (bonus poin dibayarkan tiap bulan). Model bahasa akan
// dengan senang hati menjawab 12 ketika pilihannya 0/5/10/15, menjawab
// "sepuluh", atau menjawab null — dan `Number(null)` adalah 0, yang BIASANYA
// ada di daftar pilihan. Karena itu dua hal harus tetap benar:
//
//   1. jawaban model selalu lewat `bacaUsul()`, yang menggeser angkanya ke
//      salah satu pilihan yang sah dan menandai bila digeser;
//   2. berkas usulan TIDAK pernah menyimpan penilaian — ia hanya mengisi
//      angka di layar. Yang menyimpan tetap `handleApproveExtra`, lewat
//      tombol yang ditekan manusia.
//
// Pemeriksaan impor DAN pemakaian dua-duanya, bukan salah satu: penjaga foto
// pernah tetap hijau ketika importnya dihapus, karena tag JSX-nya masih ada.
const USUL = "src/components/sop/UsulPoinAI.jsx";
const PEMAKAI = "src/components/sop/TugasHariIni.jsx";

let isiUsul = "";
try {
  isiUsul = kupasKomentar(readFileSync(join(AKAR, USUL), "utf8"));
} catch {
  gagal++;
  console.error(`GAGAL  ${USUL} tidak ada — usulan poin AI hilang dari aplikasi.`);
}

if (isiUsul) {
  if (!/from\s+"@\/lib\/usulPoinInisiatif"/.test(isiUsul) || !/bacaUsul\s*\(/.test(isiUsul)) {
    gagal++;
    console.error(
      `GAGAL  ${USUL} tidak memanggil bacaUsul() dari src/lib/usulPoinInisiatif.js.\n` +
      `   Tanpa itu angka dari model dipakai apa adanya, termasuk angka di luar\n` +
      `   daftar pilihan dan null yang terbaca sebagai 0.`
    );
  }
  // Angka mentah dari model tidak boleh dibaca langsung di luar bacaUsul().
  const mentah = isiUsul.match(/\bhasil\s*\??\.\s*poin\b/g) || [];
  if (mentah.length) {
    gagal++;
    console.error(
      `GAGAL  ${USUL} membaca angka poin langsung dari jawaban model ` +
      `(${mentah.length} tempat).\n   Pakai hasil bacaUsul() saja.`
    );
  }
  // Usulan tidak menyimpan apa pun. Kalau baris ini merah, AI sudah berhenti
  // mengusulkan dan mulai memutuskan upah orang.
  const menyimpan = [
    [/MaintenanceLog/, "menyentuh MaintenanceLog"],
    [/approval_status/, "menulis approval_status"],
    [/poin_earned/, "menulis poin_earned"],
  ].filter(([pola]) => pola.test(isiUsul)).map(([, k]) => k);
  if (menyimpan.length) {
    gagal++;
    console.error(
      `GAGAL  ${USUL} ${menyimpan.join(" dan ")}.\n` +
      `   Usulan hanya mengisi angka di layar; yang menyimpan penilaian tetap\n` +
      `   handleApproveExtra lewat tombol yang ditekan manusia.`
    );
  }
}

/*
 * Pekerjaan yang sudah ada di checklist ikut diberitahukan — ke kiper, ke
 * penilai, DAN ke modelnya.
 *
 * "Siram tanaman" adalah tugas SOP harian seharga 5 poin, dan tercatat 8 kali
 * sebagai Inisiatif yang bernilai nol. Pencocoknya ada di lib/miripTugas.js;
 * yang diperiksa di sini pemasangannya, karena daftar tugas yang LUPA DIKIRIM
 * membuat `tugasChecklist` jatuh ke `[]` dan peringatannya hilang tanpa suara —
 * tidak ada galat, tidak ada peringatan eslint, hanya tidak pernah muncul.
 */
const PENCATAT = "src/components/sop/ExtraTaskForm.jsx";
try {
  const isiPencatat = kupasKomentar(readFileSync(join(AKAR, PENCATAT), "utf8"));
  if (!/from\s+"@\/lib\/miripTugas"/.test(isiPencatat) || !/tugasMirip\s*\(/.test(isiPencatat)) {
    gagal++;
    console.error(
      `GAGAL  ${PENCATAT} tidak memakai tugasMirip() dari src/lib/miripTugas.js.\n` +
      `   Kiper kembali bisa mencatat tugas checklist sebagai Inisiatif tanpa\n` +
      `   diberi tahu, dan Inisiatif masuk dengan nol poin.`
    );
  }
} catch {
  gagal++;
  console.error(`GAGAL  ${PENCATAT} tidak bisa dibaca.`);
}

try {
  const isiPemakai = kupasKomentar(readFileSync(join(AKAR, PEMAKAI), "utf8"));
  const kirimDaftar = /tugasChecklist=\{/.test(isiPemakai);
  /*
    Dihitung per TAG, bukan dengan menghitung kemunculan "mirip={" di berkas.
    Versi pertama memeriksa "sekurangnya dua kemunculan" dan tetap hijau ketika
    satu baris Inisiatif kehilangan propnya — karena kemunculan ketiganya ada
    pada <UsulPoinAI>, dan dua yang tersisa sudah memenuhi syaratnya. Penjaga
    yang dipenuhi oleh tag yang salah tidak menjaga apa pun.
  */
  const tagTanpaMirip = (nama) => {
    const kurang = [];
    const pola = new RegExp(`<${nama}\\b`, "g");
    let m;
    while ((m = pola.exec(isiPemakai)) !== null) {
      const tutup = isiPemakai.indexOf("/>", m.index);
      const isiTag = tutup === -1 ? isiPemakai.slice(m.index) : isiPemakai.slice(m.index, tutup);
      if (!/\bmirip=\{/.test(isiTag)) {
        kurang.push(isiPemakai.slice(0, m.index).split("\n").length);
      }
    }
    return kurang;
  };
  const kurangMirip = [
    ...tagTanpaMirip("ExtraTaskRow").map((b) => `ExtraTaskRow baris ${b}`),
    ...tagTanpaMirip("UsulPoinAI").map((b) => `UsulPoinAI baris ${b}`),
  ];
  if (!kirimDaftar) {
    gagal++;
    console.error(
      `GAGAL  ${PEMAKAI} tidak mengirim tugasChecklist ke ExtraTaskForm.\n` +
      `   Tanpa daftar tugas, pencocoknya tidak punya apa pun untuk dicocokkan\n` +
      `   dan peringatannya tidak pernah muncul.`
    );
  }
  // Setiap tag harus menerimanya: baris Inisiatif hari ini, baris tunggakan,
  // dan usulan AI. Yang satu terlewat berarti sebagian baris kehilangan
  // peringatannya, atau modelnya mengusulkan poin penuh untuk pekerjaan yang
  // poinnya sudah ada di checklist.
  if (kurangMirip.length) {
    gagal++;
    console.error(
      `GAGAL  ${PEMAKAI}: ${kurangMirip.length} tag tanpa prop mirip={...}.\n` +
      kurangMirip.map((t) => `      ${t}`).join("\n")
    );
  }
  /*
    Poin yang dinilai harus DITULISKAN ke checklist tanggal itu.
    Tanpa pemanggilan ini, penilaian hanya mengubah MaintenanceLog.poin_earned —
    dibaca satu layar, tidak dibaca slip gaji — dan sejak 28 Juli 2026 itu
    berarti pekerjaan Inisiatif dibayar nol. Yang hilang bukan galat: angkanya
    tampil di layar kiper, dan tidak muncul di klaim poin hari itu.
  */
  if (!/tulisPoinInisiatif\s*\(/.test(isiPemakai) || !/poinJudulHari\s*\(/.test(isiPemakai)) {
    gagal++;
    console.error(
      `GAGAL  ${PEMAKAI} tidak menuliskan poin Inisiatif ke checklist.\n` +
      `   Harus memanggil tulisPoinInisiatif() dengan poinJudulHari() — yang\n` +
      `   kedua menjumlahkan judul yang sama di hari yang sama, supaya\n` +
      `   penilaian kedua tidak menimpa yang pertama.`
    );
  }
  const diimpor = /import\s+UsulPoinAI\s+from/.test(isiPemakai);
  const dipakai = /<UsulPoinAI/.test(isiPemakai);
  if (!diimpor || !dipakai) {
    gagal++;
    console.error(
      `GAGAL  ${PEMAKAI} ${!diimpor ? "tidak mengimpor" : "mengimpor tetapi tidak memakai"} UsulPoinAI.\n` +
      `   Baris penilaian Inisiatif kembali kosong, dan ratusan catatan lama\n` +
      `   tidak pernah dinilai justru karena angkanya harus ditentukan dari nol.`
    );
  }
} catch {
  gagal++;
  console.error(`GAGAL  ${PEMAKAI} tidak bisa dibaca.`);
}

if (gagal === 0) {
  console.log(`Keyakinan AI terbaca pada skala yang benar (${TERSIMPAN.length} nilai nyata diperiksa, tidak ada perbandingan mentah), usulan poin AI tetap usulan, dan tugas checklist yang mirip tetap diberitahukan.`);
}
process.exit(gagal === 0 ? 0 : 1);
