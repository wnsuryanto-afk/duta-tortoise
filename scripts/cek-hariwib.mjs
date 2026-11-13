/**
 * cek-hariwib.mjs — "hari ini" di sisi server diukur dari hari WIB, bukan UTC.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * Fungsi di base44/ berjalan di server Base44, yang jam setempatnya UTC.
 * Karena itu `new Date(created_date)` di sana kebetulan benar, dan penjaga
 * scripts/cek-stempel.mjs sengaja TIDAK memeriksa base44/.
 *
 * Yang tidak ikut benar adalah BATAS HARINYA. Satu hari UTC berjalan dari
 * pukul 07:00 WIB sampai 07:00 WIB berikutnya — tepat memotong awal jam kerja
 * kebun ini. Jadi setiap janji "satu notifikasi per hari" yang diukur dengan
 * hari UTC pecah justru di jam orang mulai bekerja.
 *
 * Bentuk yang salah selalu sama: memotong prefiks sebuah cap waktu lalu
 * membandingkannya dengan tanggal WIB.
 *
 *     (n.created_at || "").startsWith(today)      // today = wibTanggal()
 *
 * Di sebelah kiri tanggal UTC, di sebelah kanan tanggal WIB. Notifikasi yang
 * dibuat antara tengah malam dan pukul tujuh pagi WIB membawa tanggal UTC
 * HARI SEBELUMNYA, tidak pernah cocok, dan kiriman keduanya lolos.
 *
 * ── Kenapa penjaga, bukan sekadar perbaikan ──────────────────────────
 *
 * Bentuk yang BENAR sudah ada, lengkap dengan komentarnya, di notifSekali()
 * pada base44/shared/otomatis.ts — dan dipakai 12 fungsi:
 *
 *     const caWib = wibTanggal(new Date(new Date(ca).getTime() + WIB_OFFSET_MS));
 *
 * Meski begitu, saat penjaga ini ditulis lima tempat menyaring per hari atau
 * per bulan atas cap waktu server, dan TIGA di antaranya menulis penyaringnya
 * sendiri tanpa konversi itu:
 *
 *   autoNotifications     notifikasi harian kiper, per hari
 *   onStockMovementSaved  permintaan stok, per hari, DIPICU KEJADIAN —
 *                         jadi ia memang berjalan pada jam-jam itu
 *   onMaintenanceDone     ucapan selamat milestone poin, per bulan; salah
 *                         hanya setiap tanggal 1 sebelum pukul tujuh pagi
 *
 * Dua yang benar — notifSekali dan checkChecklistReminder — membuktikan
 * aturannya memang diketahui. Tiga dari lima membuktikan mengetahuinya saja
 * tidak cukup.
 *
 * ── Yang ditolak ─────────────────────────────────────────────────────
 *
 * Di dalam base44/: satu baris yang menyebut created_at atau created_date
 * BERSAMA pemotongan prefiks — `.startsWith(`, `.slice(`, atau
 * `.split("T")`.
 *
 * Bentuk yang benar lolos dengan sendirinya, karena ia memisahkan
 * pengambilannya dari konversinya:
 *
 *     const ca = n.created_at || n.created_date || "";   <- tidak ada potong
 *     const caWib = wibTanggal(new Date(... + WIB_OFFSET_MS));
 *
 * src/ TIDAK diperiksa di sini; itu urusan cek-stempel.mjs, yang aturannya
 * berbeda karena peramban tidak berjalan di UTC.
 *
 * ── Yang TIDAK tertangkap ────────────────────────────────────────────
 *
 * Sama seperti cek-stempel: nilai yang sudah berpindah ke dalam parameter
 * lolos, karena namanya tidak lagi menyebut created_at. Tidak ada pola yang
 * bisa menangkapnya tanpa menuduh setiap pemotongan teks di base44/.
 *
 * Jalankan:  node scripts/cek-hariwib.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

/** Cap waktu yang ditulis server, dalam UTC. */
const MEDAN = /\b(created_at|created_date)\b/;

/** Pemotongan prefiks — cara salah membandingkannya dengan hari WIB. */
const POTONG = [
  { pola: /\.\s*startsWith\s*\(/, sebut: ".startsWith(...)" },
  { pola: /\.\s*slice\s*\(/, sebut: ".slice(...)" },
  { pola: /\.\s*split\s*\(\s*["']T["']\s*\)/, sebut: '.split("T")' },
];

const DIKECUALIKAN = new Map([
  [
    "base44/shared/otomatis.ts",
    "di sinilah notifSekali/wibTanggal/wibBulan/WIB_OFFSET_MS didefinisikan",
  ],
]);

function berkas(dir, keluar = []) {
  let isi;
  try {
    isi = readdirSync(dir, { withFileTypes: true });
  } catch {
    return keluar;
  }
  for (const e of isi) {
    const p = join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

const temuan = [];
let diperiksa = 0;

for (const p of berkas(join(AKAR, "base44"))) {
  const rel = relative(AKAR, p).split("\\").join("/");
  if (DIKECUALIKAN.has(rel)) continue;
  diperiksa++;
  const baris = kupasKomentar(readFileSync(p, "utf8")).split("\n");
  baris.forEach((b, i) => {
    if (!MEDAN.test(b)) return;
    const cara = POTONG.find((s) => s.pola.test(b));
    if (cara) temuan.push(`${rel}:${i + 1}  ${cara.sebut}\n      ${b.trim().slice(0, 96)}`);
  });
}

if (temuan.length) {
  console.error(
    `${temuan.length} tempat mengukur "hari ini" dari hari UTC, bukan hari WIB.\n\n` +
    `created_at dan created_date disimpan dalam UTC. Memotong prefiksnya lalu\n` +
    `membandingkannya dengan tanggal WIB berarti dua penanggalan dalam satu\n` +
    `kesamaan — dan satu hari UTC berjalan dari pukul 07:00 WIB sampai 07:00\n` +
    `WIB berikutnya, yaitu tepat memotong awal jam kerja kebun ini.\n\n` +
    `Akibatnya janji "satu notifikasi per hari" pecah justru pada jam orang\n` +
    `mulai bekerja: yang dibuat sebelum pukul tujuh pagi membawa tanggal UTC\n` +
    `hari sebelumnya, tidak pernah cocok, dan kiriman keduanya lolos.\n\n` +
    `Pakai bentuk yang sudah ada di base44/shared/otomatis.ts:\n` +
    `  notifSekali(base44, data)   seluruh "beritahu sekali sehari" sekaligus\n\n` +
    `atau, bila penyaringnya memang perlu sendiri:\n` +
    `  const ca = n.created_at || n.created_date || "";\n` +
    `  const caWib = wibTanggal(new Date(new Date(ca).getTime() + WIB_OFFSET_MS));\n` +
    `  return caWib === today;          // wibBulan() untuk jendela bulanan\n\n` +
    `src/ tidak diperiksa di sini — itu urusan cek-stempel.mjs, yang aturannya\n` +
    `berbeda karena peramban tidak berjalan di UTC.\n\n` +
    temuan.map((t) => "  " + t).join("\n")
  );
  process.exit(1);
}
console.log(
  `Jendela harian di sisi server diukur dari hari WIB ` +
  `(${diperiksa} berkas base44 diperiksa, ${DIKECUALIKAN.size} dikecualikan dengan alasan).`
);
process.exit(0);
