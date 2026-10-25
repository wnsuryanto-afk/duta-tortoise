/**
 * cek-sku.mjs — SKU bukan kunci yang unik, dan kode ini harus terus tahu itu.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 25-10-2026 pemilik mengunggah screenshot pesanan pelet kura-kura KUNKKA
 * 1,20 kg ke "Catat pesanan dari screenshot". Layar menampilkannya sebagai
 * "Masuk ke barang gudang: Gas Elpiji Kecil".
 *
 * AI tidak salah. Ia mencocokkan pelet ke "Pakan Lainnya" — dan memulangkan
 * SKU-nya, LNN-0003. Yang salah adalah anggapan bahwa SKU menunjuk satu
 * barang:
 *
 *     LNN-0001  FeedStock "Pakan Lainnya"  |  WarehouseItem "Isolasi Listrik"
 *     LNN-0002  FeedStock "Melon"          |  WarehouseItem "Mabock"
 *     LNN-0003  FeedStock "Pakan Lainnya"  |  WarehouseItem "Gas Elpiji Kecil"
 *
 * Penyebabnya ada di pembuat SKU-nya: PREFIKS_PAKAN dan PREFIKS_GUDANG
 * berbagi awalan LNN, SPM, dan PKN, sementara nomor berikutnya dihitung dari
 * daftar entitasnya SENDIRI. Dua daftar yang menghitung terpisah pasti
 * bertemu di angka yang sama.
 *
 * Yang membuatnya berbahaya: tidak ada error. `warehouse.find(w => w.sku ===
 * "LNN-0003")` mengembalikan sebuah barang — barang yang salah. Kalau
 * pemiliknya tidak memperhatikan namanya, 1,2 kg pelet masuk ke tabung gas
 * dan harga beli tabung gas tertimpa harga pelet.
 *
 * ── Tiga hal yang dijaga ─────────────────────────────────────────────
 *
 * 1. Setiap tempat yang MEMBUAT SKU harus melihat kedua daftar. Berkas yang
 *    memanggil pembuat SKU tapi hanya menyebut satu entitas sedang menghitung
 *    nomor dari separuh kenyataan.
 *
 * 2. Tidak ada kolom id yang diisi dari hasil pencarian lewat SKU. Kunci asing
 *    harus datang dari id — satu-satunya yang benar-benar unik.
 *
 * 3. Daftar awalan yang BERBAGI antara pakan dan gudang tidak boleh bertambah
 *    tanpa disadari. Awalan yang sudah terbagi tidak bisa diganti (label QR-nya
 *    sudah tercetak dan tertempel di rak), tapi yang baru masih bisa dicegah.
 *
 * Jalankan:  node scripts/cek-sku.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const temuan = [];

/** Semua berkas berakhiran `akhiran` di bawah `dir`, sebagai jalur relatif. */
function daftarBerkas(dir, akhiran, keluar = []) {
  const penuh = join(AKAR, dir);
  for (const nama of readdirSync(penuh)) {
    const p = join(penuh, nama);
    if (statSync(p).isDirectory()) daftarBerkas(relative(AKAR, p), akhiran, keluar);
    else if (akhiran.some((a) => nama.endsWith(a))) keluar.push(relative(AKAR, p));
  }
  return keluar;
}

/* ── 1. Pembuat SKU harus melihat kedua daftar ──────────────────────── */

const PEMBUAT = ["skuPakanBaru", "skuGudangBaru", "skuBerikutnya", "generateSKU"];

/*
 * Berkas yang MENDEFINISIKAN pembuatnya tidak ikut diperiksa: ia memang tidak
 * tahu entitas apa pun, dan justru itu yang benar — pemanggilnyalah yang tahu.
 */
const DEFINISI = new Set([
  "src/lib/skuBarang.js",
  "src/lib/skuUtils.js",
  "base44/shared/sku.ts",
]);

const berkas = [
  ...daftarBerkas("src", [".jsx", ".js"]),
  ...daftarBerkas("base44/functions", [".ts"]),
  ...daftarBerkas("base44/shared", [".ts"]),
];

let situsPembuat = 0;
for (const rel of berkas) {
  if (DEFINISI.has(rel)) continue;
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  const dipanggil = PEMBUAT.filter((n) => new RegExp(`\\b${n}\\s*\\(`).test(kode));
  if (dipanggil.length === 0) continue;
  situsPembuat++;
  const adaPakan = /\bFeedStock\b/.test(kode);
  const adaGudang = /\bWarehouseItem\b/.test(kode);
  if (!adaPakan || !adaGudang) {
    const kurang = !adaPakan ? "FeedStock" : "WarehouseItem";
    temuan.push(
      `${rel}  memanggil ${dipanggil.join(", ")} tapi tidak pernah menyebut ${kurang}. ` +
      `Nomor SKU berikutnya dihitung dari daftar yang dikirim, jadi daftar separuh ` +
      `melahirkan SKU yang sudah dipakai entitas sebelahnya — awalan LNN, SPM, dan PKN ` +
      `dipakai keduanya. Kirim gabungan SKU pakan + SKU gudang.`,
    );
  }
}

/* ── 2. Kolom id tidak boleh diisi dari pencarian lewat SKU ─────────── */

const POLA_ID_DARI_SKU = /(\w*_id)\s*:[^\n]*\.sku\s*===/;

for (const rel of berkas) {
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  kode.split("\n").forEach((baris, i) => {
    const m = baris.match(POLA_ID_DARI_SKU);
    if (!m) return;
    temuan.push(
      `${rel}:${i + 1}  kolom ${m[1]} diisi dari hasil pencarian lewat SKU. ` +
      `SKU tidak unik lintas entitas (LNN-0003 menunjuk "Pakan Lainnya" di pakan dan ` +
      `"Gas Elpiji Kecil" di gudang), jadi pencariannya mengembalikan barang — barang ` +
      `yang salah, tanpa error. Pakai id barangnya.`,
    );
  });
}

/* ── 3. Awalan yang berbagi tidak boleh bertambah ───────────────────── */

/*
 * Keduanya sudah terbagi sejak sebelum penjaga ini ada, dan tidak bisa
 * dibatalkan: label QR dengan kode ini sudah tertempel di rak, dan mengganti
 * kodenya berarti label fisiknya berbohong. Yang dijaga adalah agar yang
 * KETIGA tidak lahir tanpa ada yang menyadarinya.
 *
 *     LNN   PREFIKS_PAKAN.lainnya   dan  PREFIKS_GUDANG.lainnya
 *     SPM   PREFIKS_PAKAN.suplemen  dan  PREFIKS_GUDANG.suplemen
 *
 * PKN tidak ada di tabel ini, tapi ada di DATA: FeedStock "Mentimun" ber-SKU
 * PKN-0001, dibuat tabel lain yang lebih tua — CATEGORY_PREFIX di
 * src/lib/skuUtils.js, yang memetakan kategori pakan MAUPUN gudang dalam satu
 * peta dan menjawab berbeda dari tabel ini untuk kategori yang sama
 * (suplemen → VIT di sana, SPM di sini). Tabrakan dari arah itu ditutup oleh
 * aturan 1: selama daftar yang dikirim ke pembuat SKU berisi kedua entitas,
 * nomor yang sudah terpakai di mana pun tidak akan dipakai lagi.
 */
const BERBAGI_DIKETAHUI = new Set(["LNN", "SPM"]);

function petaAwalan(isi, nama) {
  const m = isi.match(new RegExp(`${nama}[^=]*=\\s*\\{([\\s\\S]*?)\\}`));
  if (!m) return null;
  return new Set([...m[1].matchAll(/"([A-Z]{3})"/g)].map((x) => x[1]));
}

const sumberAwalan = "src/lib/skuBarang.js";
const isiAwalan = readFileSync(join(AKAR, sumberAwalan), "utf8");
const pakan = petaAwalan(isiAwalan, "PREFIKS_PAKAN");
const gudang = petaAwalan(isiAwalan, "PREFIKS_GUDANG");

if (!pakan || !gudang) {
  temuan.push(
    `${sumberAwalan}  PREFIKS_PAKAN atau PREFIKS_GUDANG tidak bisa dibaca penjaga ini. ` +
    `Kalau bentuknya memang berubah, sesuaikan petaAwalan() di scripts/cek-sku.mjs — ` +
    `jangan biarkan penjaga hijau karena tidak menemukan apa pun.`,
  );
} else {
  const berbagi = [...pakan].filter((p) => gudang.has(p)).sort();
  const baru = berbagi.filter((p) => !BERBAGI_DIKETAHUI.has(p));
  const hilang = [...BERBAGI_DIKETAHUI].filter((p) => !berbagi.includes(p)).sort();
  if (baru.length) {
    temuan.push(
      `${sumberAwalan}  awalan ${baru.join(", ")} kini dipakai PREFIKS_PAKAN dan PREFIKS_GUDANG ` +
      `sekaligus. Dua entitas yang menghitung nomornya terpisah akan bertemu di angka yang sama, ` +
      `dan pencarian lewat SKU menemukan barang yang salah tanpa error. Pakai awalan yang belum ` +
      `terpakai — atau, kalau memang disengaja, tambahkan ke BERBAGI_DIKETAHUI di scripts/cek-sku.mjs.`,
    );
  }
  if (hilang.length) {
    temuan.push(
      `Awalan ${hilang.join(", ")} tidak lagi terbagi antara pakan dan gudang — buang dari ` +
      `BERBAGI_DIKETAHUI di scripts/cek-sku.mjs supaya penjaga ini tidak melonggar diam-diam.`,
    );
  }
}

if (temuan.length) {
  console.error(`${temuan.length} masalah SKU.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `SKU aman: ${situsPembuat} tempat pembuat SKU melihat kedua daftar, tidak ada kolom id ` +
  `yang diisi lewat SKU, dan awalan yang terbagi tetap ${[...BERBAGI_DIKETAHUI].join(", ")}.`,
);
process.exit(0);
