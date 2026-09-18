/**
 * cek-kepatuhan.mjs — uji JAWABAN aturan kepatuhan SOP, bukan bentuk kodenya.
 *
 * ── KENAPA PENJAGA INI ADA ─────────────────────────────────────────
 *
 * Pada 18-09-2026 angka kepatuhan di beranda menunjukkan 63%. Yang benar 80%.
 * Selisih 17 poin itu bukan kerja yang kurang, melainkan tiga kebocoran di
 * alat ukurnya sendiri — dan ketiganya bocor TANPA satu pun error:
 *
 *   1. Tugas "Timbang kura yang ada alasannya (ROTASI OTOMATIS)" tercatat
 *      gagal 14 dari 14 hari. Di layar kiper ia mekar jadi baris
 *      `ukur_rotasi_<id_kura>`; kepatuhan hanya mengenal `sop_<id>`. Pada hari
 *      yang jawaban benarnya "tidak ada kura yang perlu ditimbang", tim tetap
 *      dihukum.
 *
 *   2. Hari yang belum selesai ikut dirata-rata. Pukul 08.00 ia 0%, dan
 *      rata-ratanya turun 5 poin penuh sepanjang pagi.
 *
 *   3. Satu pekerjaan dihitung dua kali: "Kumpulkan kotoran kura ke blong"
 *      sudah tercakup di pembersihan kandang.
 *
 * Angka kepatuhan menentukan bonus dan menentukan apakah kiper percaya pada
 * aplikasi ini. Angka yang salah ke bawah membuat tim berhenti berusaha;
 * salah ke atas membuat pekerjaan yang tertinggal tidak pernah ketahuan.
 * Keduanya mahal, dan keduanya diam.
 *
 * Penjaga lain memeriksa bentuk kode. Yang ini memeriksa jawabannya.
 *
 * Jalankan:  node scripts/cek-kepatuhan.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "cek-kepatuhan-"));
function bundel(masuk, keluar) {
  execFileSync("npx", ["esbuild", masuk,
    "--bundle", "--format=cjs", "--platform=node", `--outfile=${join(dir, keluar)}`,
  ], { cwd: process.cwd(), stdio: "pipe" });
}

try {
  bundel("src/lib/kepatuhanSOP.js", "fe.cjs");
} catch (e) {
  console.log("Gagal membundel kepatuhanSOP:\n" + (e.stderr?.toString() || e.message));
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

const K = await import("file://" + join(dir, "fe.cjs")).then((m) => m.default || m);
const { kepatuhanHari, tugasWajib, tugasBelum, hariSelesai, rataRataPersen, AMBANG_BAIK } = K;

const HI = "2026-09-17"; // Kamis
let gagal = 0;
let jumlah = 0;
function cek(nama, dapat, harus) {
  jumlah++;
  if (JSON.stringify(dapat) !== JSON.stringify(harus)) {
    gagal++;
    console.error(`GAGAL  ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harus: ${JSON.stringify(harus)}`);
  }
}

const harian = (id, tambahan = {}) => ({ id, title: id, is_active: true, frequency: "harian", ...tambahan });
const log = (itemId, tambahan = {}) => ({ item_id: itemId, period_key: HI, ...tambahan });

// ── 1. Tiga pengecualian penyebut ──────────────────────────────────

cek("tugas ubin kandang tidak ikut persentase",
  tugasWajib([harian("a"), harian("ubin", { di_ubin_kandang: true })], HI).map((t) => t.id),
  ["a"]);

/*
 * KASUS PALING PENTING DI BERKAS INI.
 *
 * Inilah kebocoran nomor 1. Kalau baris ini hilang, tugas rotasi timbang
 * kembali dihitung sebagai kewajiban harian yang tidak pernah bisa dicentang,
 * dan kepatuhan turun ~5 poin setiap hari tanpa ada yang tahu sebabnya.
 */
cek("tugas wadah (di_luar_persen) tidak ikut persentase",
  tugasWajib([harian("a"), harian("rotasi", { di_luar_persen: true })], HI).map((t) => t.id),
  ["a"]);

cek("tugas yang bahannya habis tidak ikut persentase",
  tugasWajib([harian("a"), harian("azolla", { terkunci_bahan: true })], HI).map((t) => t.id),
  ["a"]);

cek("tugas nonaktif tidak ikut persentase",
  tugasWajib([harian("a"), harian("mati", { is_active: false })], HI).map((t) => t.id),
  ["a"]);

/*
 * Hari tanpa kura yang perlu ditimbang harus 100%, bukan hukuman.
 *
 * Ini jawaban yang dulu salah. Dua tugas biasa dikerjakan, tugas rotasi tidak
 * punya isi sama sekali, dan hasilnya HARUS 100%.
 */
cek("hari tanpa kura yang perlu ditimbang tetap 100%",
  kepatuhanHari(HI,
    [harian("a"), harian("b"), harian("rotasi", { di_luar_persen: true })],
    [log("sop_a"), log("sop_b")],
  ).persen,
  100);

// ── 2. Pembacaan log ───────────────────────────────────────────────

cek("log ukur_rotasi_* tidak menyelesaikan tugas biasa mana pun",
  kepatuhanHari(HI, [harian("a")], [log("ukur_rotasi_kura1")]).selesai, 0);

cek("log yang dikeluarkan dari laporan tidak dihitung",
  kepatuhanHari(HI, [harian("a")], [log("sop_a", { excluded_from_reports: true })]).selesai, 0);

cek("log uji coba tidak dihitung",
  kepatuhanHari(HI, [harian("a")], [log("sop_a", { is_test_data: true })]).selesai, 0);

cek("log dari tanggal lain tidak dihitung",
  kepatuhanHari(HI, [harian("a")], [{ item_id: "sop_a", period_key: "2026-09-16" }]).selesai, 0);

cek("satu kandang dicatat dua kali tetap dihitung satu",
  kepatuhanHari(HI,
    [harian("ubin", { di_ubin_kandang: true })],
    [log("kebersihan_kandang_W1"), log("kebersihan_kandang_W1"), log("kebersihan_kandang_W2")],
    15,
  ).kandangSelesai,
  2);

cek("kandang tidak dituntut bila tidak ada tugas ubin terjadwal",
  kepatuhanHari(HI, [harian("a")], [], 15).kandangTotal, 0);

// ── 3. Hari tanpa kewajiban ────────────────────────────────────────

/*
 * Hari tanpa kewajiban harus null, BUKAN 0.
 *
 * Kalau ia mengembalikan 0, hari libur tugas masuk ke rata-rata sebagai nol
 * dan menjatuhkan angka bulanan tanpa ada pekerjaan yang benar-benar
 * tertinggal.
 */
cek("hari tanpa kewajiban bernilai null, bukan nol",
  kepatuhanHari(HI, [], []).persen, null);

cek("rata-rata mengabaikan hari tanpa kewajiban",
  rataRataPersen([{ persen: 80 }, { persen: null }, { persen: 100 }]), 90);

// ── 4. Hari berjalan ───────────────────────────────────────────────

/*
 * Kebocoran nomor 2. Hari terakhir adalah hari yang sedang berjalan; ia tidak
 * boleh ikut dirata-rata.
 */
cek("hari berjalan dibuang dari rata-rata",
  rataRataPersen(hariSelesai([{ persen: 90 }, { persen: 90 }, { persen: 0 }])), 90);

cek("hariSelesai pada daftar kosong tidak meledak",
  hariSelesai([]).length, 0);

// ── 5. Daftar tugas yang belum dikerjakan ──────────────────────────

cek("tugasBelum hanya memuat yang benar-benar tertinggal",
  tugasBelum(
    [harian("a"), harian("b"), harian("ubin", { di_ubin_kandang: true }), harian("rotasi", { di_luar_persen: true })],
    [log("sop_a")],
    HI,
  ).map((t) => t.id),
  ["b"]);

// ── 6. Lantai target: satu angka, dua berkas ───────────────────────

/*
 * Kartu dan grafik membaca AMBANG_BAIK dari src/lib; backend punya salinannya
 * sendiri karena Deno tidak bisa mengimpor src/. Dua angka yang berbeda
 * membuat WhatsApp dan beranda bercerita beda tentang tim yang sama.
 */
const be = readFileSync("base44/shared/kepatuhan.ts", "utf8");
const cocok = be.match(/export const AMBANG_BAIK = (\d+)/);
cek("lantai target frontend dan backend sama",
  cocok ? Number(cocok[1]) : "tidak ditemukan di base44/shared/kepatuhan.ts",
  AMBANG_BAIK);

rmSync(dir, { recursive: true, force: true });
if (gagal === 0) {
  console.log(`Aturan kepatuhan SOP menjawab benar (${jumlah} kasus diperiksa).`);
  process.exit(0);
}
console.error(`\n${gagal} kasus kepatuhan menjawab salah.`);
process.exit(1);
