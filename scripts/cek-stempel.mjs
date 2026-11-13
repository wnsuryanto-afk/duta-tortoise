/**
 * cek-stempel.mjs — stempel waktu server dibaca lewat waktuServer(), titik.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * Base44 mengirim `created_date` dan `updated_date` tanpa penanda zona:
 *
 *     "2026-11-13T06:34:29.264000"
 *
 * JavaScript membaca teks semacam itu sebagai waktu SETEMPAT. Nilainya
 * sendiri UTC. Di Jakarta selisihnya tujuh jam, selalu, ke arah yang sama:
 * setiap stempel server terbaca tujuh jam LEBIH AWAL dari kejadiannya.
 *
 * Buktinya ada di data kebun. Jeda wajib antar kandang membandingkan stempel
 * itu dengan `Date.now()`, dan pada 13 Nov 2026 Angsolo mencatat E5, E4, E3,
 * E2, E1 pada 13:34–13:36 — lima kandang dalam dua menit, yang seharusnya
 * mustahil. Jedanya memang tidak pernah berlaku sejak hari pertama.
 *
 * `waktuServer()` di src/lib/safeDate.js sudah memperbaikinya di dua tempat
 * yang menghitung jeda. Penjaga ini ada supaya enam belas tempat lain tidak
 * tertinggal diam-diam.
 *
 * ── Kenapa "cuma mengurutkan" bukan alasan ───────────────────────────
 *
 * Benar bahwa pergeseran seragam tidak mengubah urutan. Yang tidak seragam
 * adalah MENCAMPUR dua penanggalan dalam satu perbandingan, dan itulah yang
 * ditemukan:
 *
 *   NotificationBell:111   new Date(b.created_at || b.created_date)
 *   NotificationsPage:83   idem
 *
 * `created_at` ditulis aplikasi sendiri dengan `toISOString()` — ia MEMBAWA
 * "Z" dan terbaca benar. `created_date` ditulis server dan tidak. Jadi satu
 * notifikasi dengan created_at dan satu dengan created_date dibandingkan
 * dalam dua penanggalan sekaligus: yang lebih baru bisa jatuh di bawah.
 *
 *   PhotoProgressPanel:63  new Date(b.date || b.created_date)
 *
 * Sama: `date` adalah tanggal polos yang diisi orang, `created_date` stempel
 * server.
 *
 * Urutan yang SELURUH nilainya stempel server memang tidak rusak. Ia tetap
 * ditolak di sini, karena aturan yang berlaku "kecuali kalau kebetulan tidak
 * apa-apa" adalah aturan yang tidak bisa dijaga siapa pun — dan karena
 * `msServer()` sama pendeknya untuk ditulis.
 *
 * ── Kenapa .slice() dan tanggalLokal() ikut ditolak ──────────────────
 *
 * `String(t.updated_date).slice(0, 10)` memotong tanggal UTC, lalu
 * SopTerkunciCard membandingkannya dengan `tanggalHariIni()` yang setempat —
 * dua penanggalan lagi, dalam satu pengurangan.
 *
 * `tanggalLokal()` tidak menolong: ia mengembalikan teks apa adanya bila
 * sudah berbentuk tanggal, jadi ia memberi tanggal UTC yang sama. Yang benar
 * adalah `tanggalLokal(waktuServer(x))` — Date dulu, baru tanggal setempat.
 *
 * ── Kenapa hanya src/ ────────────────────────────────────────────────
 *
 * base44/ berjalan di server Base44, yang jam setempatnya memang UTC. Di
 * sana `new Date(created_date)` kebetulan benar. Menuduhnya di sini hanya
 * akan mengajari orang mematikan penjaganya.
 *
 * ── Yang TIDAK tertangkap, dan itu disengaja ─────────────────────────
 *
 * Penjaga ini membaca satu baris sekaligus. Nilai yang sudah berpindah ke
 * dalam parameter lolos:
 *
 *   LedgerHistory.jsx:41   const d = new Date(createdDate);
 *
 * Namanya tidak lagi menyebut created_date, jadi tidak ada pola yang bisa
 * menangkapnya tanpa menuduh setiap `new Date()` di aplikasi. Tempat itu
 * diperbaiki dengan tangan. Penjaga yang jujur tentang batasnya lebih
 * berguna daripada penjaga yang dipercaya melebihi kemampuannya.
 *
 * Jalankan:  node scripts/cek-stempel.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

/** Medan stempel yang ditulis server Base44, tanpa penanda zona. */
const MEDAN = /\b(created_date|updated_date)\b/;

/** Cara-cara membacanya yang memakai penanggalan setempat peramban. */
const SALAH = [
  { pola: /new\s+Date\s*\(/, sebut: "new Date(...)" },
  { pola: /\.\s*slice\s*\(/, sebut: ".slice(...)" },
  { pola: /\btanggalLokal\s*\(/, sebut: "tanggalLokal(...)" },
];

/** Cara yang benar; satu saja di baris itu sudah cukup untuk dilewatkan. */
const BENAR = /\b(waktuServer|msServer)\s*\(/;

const DIKECUALIKAN = new Map([
  [
    "src/lib/safeDate.js",
    "di sinilah waktuServer/msServer didefinisikan",
  ],
]);

function berkas(dir, keluar = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

const temuan = [];
let diperiksa = 0;

for (const p of berkas(join(AKAR, "src"))) {
  const rel = relative(AKAR, p).split("\\").join("/");
  if (DIKECUALIKAN.has(rel)) continue;
  diperiksa++;
  const baris = kupasKomentar(readFileSync(p, "utf8")).split("\n");
  baris.forEach((b, i) => {
    if (!MEDAN.test(b)) return;
    if (BENAR.test(b)) return;
    const cara = SALAH.find((s) => s.pola.test(b));
    if (cara) temuan.push(`${rel}:${i + 1}  ${cara.sebut}\n      ${b.trim().slice(0, 96)}`);
  });
}

if (temuan.length) {
  console.error(
    `${temuan.length} tempat membaca stempel waktu server dengan penanggalan peramban.\n\n` +
    `Base44 mengirim created_date/updated_date TANPA penanda zona —\n` +
    `  "2026-11-13T06:34:29.264000"\n` +
    `— dan JavaScript membacanya sebagai waktu setempat. Nilainya UTC. Di\n` +
    `Jakarta hasilnya selalu TUJUH JAM LEBIH AWAL dari kejadiannya: jam yang\n` +
    `ditampilkan salah, dan tanggalnya ikut salah untuk apa pun yang dibuat\n` +
    `sebelum pukul tujuh pagi — yaitu justru pekerjaan paling awal.\n\n` +
    `Pakai yang sudah ada di src/lib/safeDate.js:\n` +
    `  waktuServer(x)               Date yang benar, atau null\n` +
    `  msServer(x)                  milidetik, 0 bila tak terbaca\n` +
    `  tanggalLokal(waktuServer(x)) "2026-11-13" menurut jam setempat\n\n` +
    `tanggalLokal(x) sendirian TIDAK cukup: untuk teks yang sudah berbentuk\n` +
    `tanggal ia mengembalikannya apa adanya, yaitu tanggal UTC yang sama.\n\n` +
    `Mengurutkan pun ditolak. Pergeserannya memang seragam, tetapi\n` +
    `created_at ditulis aplikasi dengan "Z" dan created_date tidak, jadi\n` +
    `b.created_at || b.created_date membandingkan dua penanggalan sekaligus.\n\n` +
    temuan.map((t) => "  " + t).join("\n")
  );
  process.exit(1);
}
console.log(
  `Semua stempel waktu server dibaca lewat waktuServer/msServer ` +
  `(${diperiksa} berkas src diperiksa, ${DIKECUALIKAN.size} dikecualikan dengan alasan).`
);
process.exit(0);
