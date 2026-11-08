/**
 * cek-zona.mjs — "hari ini" harus berarti hari ini di tempat orangnya berada.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * `src/lib/safeDate.js` sudah memuat `tanggalHariIni()`, lengkap dengan
 * penjelasannya sendiri: "Bukan new Date().toISOString().slice(0,10), yang
 * memberi tanggal UTC: di Jakarta setiap hari sebelum pukul tujuh pagi, cara
 * itu masih menyebut tanggal kemarin — dan pekerjaan di peternakan ini
 * dimulai pukul tujuh."
 *
 * Saat penjaga ini ditulis, 13 tempat memakai fungsi itu. 70 tempat lain
 * menulis ulang bentuk yang dilarang komentarnya sendiri. Diukur pada jam
 * yang sebenarnya dipakai orang:
 *
 *   06:30 WIB   toISOString().slice(0,10)  → 2026-11-07   (hari ini 8 Nov)
 *   14:00 WIB   toISOString().slice(0,16)  → ...T07:00    (tujuh jam hilang)
 *   1 Des 05:00 toISOString().slice(0,7)   → 2026-11      (bulan lalu)
 *
 * Yang membuatnya tak terlihat: antara pukul tujuh pagi dan tengah malam —
 * yaitu kapan pun ada yang memeriksanya — ketiganya benar. Yang salah justru
 * jam kerja paling awal: absensi masuk, laporan kura tidak makan, pemberian
 * pakan subuh, pengambilan barang dari gudang. Semuanya tercatat bertanggal
 * KEMARIN, lalu tidak muncul di layar "hari ini" yang mencarinya.
 *
 * Yang lebih buruk dari salah tanggal: separuh benar. `AksiHarianKiper`
 * menulis absensi dengan tanggal UTC sementara layar lain membacanya dengan
 * tanggal setempat — jadi sebelum pukul tujuh, kiper yang sudah absen tetap
 * terbaca belum absen, dan menekan tombolnya lagi.
 *
 * ── Yang ditolak ─────────────────────────────────────────────────────
 *
 * Di dalam src/: `toISOString()` yang diikuti pemotongan — `.slice(...)`,
 * `.split("T")[0]`, atau `.substring(...)`. Bentuk utuhnya
 * (`new Date().toISOString()` sebagai cap waktu) justru benar dan TIDAK
 * ditolak: itu memang satu titik waktu, bukan sebuah tanggal.
 *
 * Komentar dibuang lebih dulu lewat lib/kupasKomentar.mjs — berkas ini dan
 * safeDate.js sama-sama MENYEBUT bentuk terlarang itu di dalam
 * penjelasannya, dan penjaga yang menuduh penjelasannya sendiri adalah
 * penjaga yang langsung dimatikan orang.
 *
 * Jalankan:  node scripts/cek-zona.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

/*
 * Tempat yang boleh memotong hasil toISOString. Tiap entri WAJIB punya
 * alasan, dan alasan yang sah hanya satu: SELURUH hitungan di sekitarnya
 * memakai penanggalan UTC, jadi tidak ada dua penanggalan yang dicampur.
 */
const DIKECUALIKAN = new Map([
  [
    "src/lib/safeDate.js",
    "di sinilah tanggalHariIni/tanggalLokal/bulanHariIni/waktuLokalSekarang didefinisikan",
  ],
  [
    "src/lib/siklusBertelur.js",
    "keTanggal() membuat tengah hari UTC dan tambahHari() memajukannya dengan setUTCDate — satu penanggalan dari awal sampai akhir",
  ],
  [
    "src/lib/hitungGaji.js",
    "pekanPenuhHadir dan hariTanpaCatatan sama-sama berjalan di UTC: new Date(\"...T00:00:00Z\") lalu setUTCDate",
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

/** toISOString() yang langsung dipotong. */
const POLA = /toISOString\s*\(\s*\)\s*\.\s*(slice|split|substring)\s*\(/;

const temuan = [];
let diperiksa = 0;

for (const p of berkas(join(AKAR, "src"))) {
  const rel = relative(AKAR, p).split("\\").join("/");
  if (DIKECUALIKAN.has(rel)) continue;
  diperiksa++;
  const baris = kupasKomentar(readFileSync(p, "utf8")).split("\n");
  baris.forEach((b, i) => {
    if (POLA.test(b)) temuan.push(`${rel}:${i + 1}  ${b.trim().slice(0, 76)}`);
  });
}

if (temuan.length) {
  console.error(
    `${temuan.length} tempat memotong tanggal dari toISOString().\n\n` +
    `Hasilnya tanggal UTC, bukan tanggal setempat. Di Jakarta setiap hari\n` +
    `sebelum pukul tujuh pagi cara itu masih menyebut tanggal KEMARIN —\n` +
    `dan pekerjaan di peternakan ini dimulai pukul tujuh, jadi yang salah\n` +
    `justru pencatatan paling awal: absensi, laporan tidak makan, pakan\n` +
    `subuh, pengambilan barang.\n\n` +
    `Pakai yang sudah ada di src/lib/safeDate.js:\n` +
    `  tanggalHariIni()        "2026-11-08"        hari ini, jam setempat\n` +
    `  tanggalLokal(d)         "2026-11-08"        tanggal turunan dari sebuah Date\n` +
    `  bulanHariIni()          "2026-11"           bulan ini, jam setempat\n` +
    `  waktuLokalSekarang()    "2026-11-08T14:00"  untuk <input type="datetime-local">\n\n` +
    `Cap waktu utuh — new Date().toISOString() tanpa dipotong — memang benar\n` +
    `dan tidak dilarang: itu satu titik waktu, bukan sebuah tanggal.\n\n` +
    temuan.map((t) => "  " + t).join("\n")
  );
  process.exit(1);
}
console.log(
  `Tidak ada tanggal UTC yang dipakai sebagai tanggal setempat ` +
  `(${diperiksa} berkas src diperiksa, ${DIKECUALIKAN.size} dikecualikan dengan alasan).`
);
process.exit(0);
