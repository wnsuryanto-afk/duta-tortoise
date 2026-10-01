/**
 * cek-ronda.mjs — ronda kandang lengkap, dan aplikasi yang usang
 * memperbaiki dirinya sendiri.
 *
 * ── Dua hal yang dijaga ─────────────────────────────────────────────
 *
 * 1. SETIAP KANDANG BERISI KURA PUNYA UBINNYA.
 *
 *    Ubin "Kunjungan Kandang" adalah satu-satunya jalur pencatatan pakan
 *    dan kebersihan. Kandang yang tidak punya ubin bukan sekadar hilang
 *    dari layar — kura di dalamnya tidak punya jalur kerja sama sekali.
 *
 *    Itu sudah terjadi dua kali. Pertama saat N1-N3 digabung jadi N: 28
 *    kura hilang dari ronda karena daftarnya ditulis mati di kode. Lalu
 *    empat kandang Bonsai berisi 36 kura, yang memang tidak pernah ada
 *    di daftar itu.
 *
 *    Jawabannya `ronda_harian` di data. Penjaga ini memastikan jalur
 *    data itu benar-benar yang dipakai, bukan diam-diam jatuh ke daftar
 *    mati — karena kalau jatuh, Bonsai hilang lagi tanpa satu pun error.
 *
 * 2. APLIKASI USANG MEMPERBAIKI DIRINYA, TAPI TIDAK DI TENGAH KERJA.
 *
 *    01-10-2026 sebuah HP masih menampilkan daftar kandang dari sebelum
 *    27-09-2026 — LIMA HARI. Selama itu keempat Bonsai tidak punya ubin.
 *    Kodenya benar, datanya benar; bundel di HP-nya yang tertinggal.
 *
 *    Bilah "ada versi baru" sudah ada sejak 30-09, dan ia benar. Tapi
 *    bilah hanya bisa jalan di bundel yang SUDAH memuatnya — HP itu
 *    lebih tua daripada bilahnya sendiri. Dan bilah yang sopan dan
 *    menunggu ternyata tidak cukup untuk hal yang merusak daftar kerja
 *    sehari penuh.
 *
 *    Jadi sekarang aplikasi memuat ulang sendiri — HANYA pada detik
 *    pertama sesudah dibuka, hanya bila belum ada yang disentuh, dan
 *    hanya sekali per sesi. Ketiga syarat itu diuji di sini.
 *
 * Jalankan:  node scripts/cek-ronda.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const AKAR = process.cwd();
const dir = mkdtempSync(join(tmpdir(), "cek-ronda-"));
const bundel = (masuk, keluar) =>
  execFileSync("npx", ["esbuild", masuk, "--bundle", "--format=cjs", "--platform=node",
    "--outfile=" + join(dir, keluar), "--log-level=error",
    "--alias:@=" + join(AKAR, "src")], { cwd: AKAR });

bundel("src/lib/kandang.js", "kandang.cjs");
bundel("src/lib/versiAplikasi.js", "versi.cjs");
const K = await import("file://" + join(dir, "kandang.cjs")).then((m) => m.default || m);
const V = await import("file://" + join(dir, "versi.cjs")).then((m) => m.default || m);

const temuan = [];

/* ── 1. Ronda kandang ──────────────────────────────────────────────── */

/*
 * Bentuk data disalin dari Enclosure yang sungguhan (1 Okt 2026) supaya
 * yang diuji bukan kasus karangan yang kebetulan lolos.
 */
const e = (name, current_count, ronda_harian) =>
  ({ name, current_count, ronda_harian, is_active: true, is_archived: false });

const NYATA = [
  e("W1", 4, true), e("W2", 4, true), e("W3", 4, true), e("W4", 4, true), e("W5", 5, true),
  e("E1", 15, true), e("E2", 4, true), e("E3", 4, true), e("E4", 4, true), e("E5", 4, true),
  e("N", 28, true), e("L1", 0, true), e("L2", 4, true),
  e("Bonsai 1", 10, true), e("Bonsai 2", 10, true), e("Bonsai 3", 8, true), e("Bonsai 4", 8, true),
  e("Baby 1", 16, false), e("Baby 2", 0, false), e("Baby 3", 0, false),
];

const ronda = K.kandangWajib(NYATA);

// Setiap kandang bertanda ronda DAN berisi kura wajib punya ubin.
for (const k of NYATA) {
  const harusIkut = k.ronda_harian === true && Number(k.current_count) > 0;
  const ikut = ronda.includes(k.name);
  if (harusIkut && !ikut) {
    temuan.push(`"${k.name}" berisi ${k.current_count} kura dan bertanda ronda, tetapi tidak punya ubin — kura di dalamnya tidak punya jalur kerja`);
  }
  if (!harusIkut && ikut && Number(k.current_count) === 0) {
    temuan.push(`"${k.name}" kosong tetapi tetap dituntut — kepatuhan tidak akan pernah bisa 100%`);
  }
}

// Jalur data HARUS yang dipakai. Kalau diam-diam jatuh ke daftar mati,
// Bonsai hilang lagi — dan itu persis cacat yang penjaga ini jaga.
for (const b of ["Bonsai 1", "Bonsai 2", "Bonsai 3", "Bonsai 4"]) {
  if (!ronda.includes(b)) {
    temuan.push(`${b} tidak ada di ronda — jalur \`ronda_harian\` tidak dipakai, dan daftar mati KANDANG_LIST tidak memuat Bonsai`);
  }
}
if (K.KANDANG_LIST.some((k) => /^N[123]$/.test(k))) {
  temuan.push("KANDANG_LIST masih memuat N1/N2/N3 — ketiganya sudah digabung jadi N pada 27-09-2026");
}

/* ── 2. Muat ulang otomatis: tiga syarat ───────────────────────────── */

const syarat = [
  ["baru dibuka, belum disentuh → muat ulang", { tersentuh: false, umurMs: 1000, sudahPernah: false }, true],
  ["sudah disentuh → jangan", { tersentuh: true, umurMs: 1000, sudahPernah: false }, false],
  ["lewat jeda aman → jangan", { tersentuh: false, umurMs: V.JEDA_AMAN_MS + 1, sudahPernah: false }, false],
  ["tepat di batas → jangan", { tersentuh: false, umurMs: V.JEDA_AMAN_MS, sudahPernah: false }, false],
  ["sudah pernah di sesi ini → jangan", { tersentuh: false, umurMs: 1000, sudahPernah: true }, false],
];
for (const [nama, masuk, harap] of syarat) {
  if (V.bolehMuatUlangOtomatis(masuk) !== harap) {
    temuan.push(`bolehMuatUlangOtomatis: "${nama}" menjawab ${!harap}`);
  }
}

rmSync(dir, { recursive: true, force: true });

if (temuan.length) {
  console.error(`${temuan.length} masalah pada ronda kandang.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Ronda lengkap (${ronda.length} kandang dari ${NYATA.length} tercatat, keempat Bonsai ikut), ` +
  `${syarat.length} syarat muat ulang otomatis diuji.`,
);
process.exit(0);
