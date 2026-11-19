/**
 * cek-suspense.mjs — tiap <Outlet /> harus berada di dalam <Suspense>.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────────
 *
 * 19 Nov 2026 pemiliknya melapor: "aplikasinya di kiper dan kepala kiper
 * tidak bisa dibuka."
 *
 * Diukur di peramban terhadap aplikasi yang TERBIT, masuk sebagai owner lalu
 * memakai "Lihat Sebagai" peran keeper:
 *
 *   /            terbuka normal
 *   /sop         Terjadi Kesalahan — React #426
 *   /breeding    Terjadi Kesalahan — React #426
 *   /area/kura   Terjadi Kesalahan — React #426
 *
 * Sebagai owner, keempatnya terbuka normal. Pada sandbox (kode belum
 * diperkecil) galatnya terbaca utuh:
 *
 *   "A component suspended while responding to synchronous input."
 *   at Lazy → RenderedRoute → Outlet → GuidedLayout → AppLayout
 *
 * ── Sebabnya ─────────────────────────────────────────────────────────────
 *
 * Sejak halaman dipecah per rute (App.jsx, 8 Nov 2026) SETIAP halaman adalah
 * React.lazy. Komponen lazy wajib punya batas <Suspense> di atasnya.
 * AppLayout memasangnya — tetapi hanya di jalur NORMAL.
 *
 * Kiper dan kepala kiper tidak lewat jalur itu. Mereka masuk ke GuidedLayout,
 * dan di sana <Outlet /> berdiri telanjang. Jadi sejak 8 Nov, setiap layar
 * kiper selain Beranda mati. Beranda selamat hanya karena isinya
 * GuidedHariIni — satu-satunya yang diimpor statis, bukan lazy.
 *
 * Dua jalur tata letak, satu diberi batas Suspense dan satu tidak: tidak ada
 * yang bisa melihat itu dari membaca salah satu berkasnya saja. Penjaga ini
 * melihat keduanya sekaligus.
 *
 * ── Kenapa penjaga lama tidak menangkapnya ───────────────────────────────
 *
 * cek-muat.mjs memastikan tiap halaman dimuat lewat muatHalaman — dan itu
 * memang benar. cek-lebar.mjs menggambar 182 layar, tetapi menggambar
 * KOMPONENNYA langsung, bukan lewat rute, jadi tidak ada <Outlet /> sama
 * sekali di dalamnya. Keduanya hijau sepanjang kiper tidak bisa membuka
 * aplikasinya.
 *
 * ── Yang diperiksa ───────────────────────────────────────────────────────
 *
 * Tiap <Outlet di src: hitung <Suspense yang dibuka dan </Suspense> yang
 * ditutup SEBELUM posisinya. Lebih banyak yang dibuka berarti ia di dalam
 * sebuah batas. Komentar dibuang lebih dulu lewat lib/kupasKomentar.mjs —
 * berkas-berkas ini MENJELASKAN batas Suspense-nya di dalam komentarnya
 * sendiri, dan penjaga yang menghitung penjelasan sebagai kode adalah
 * penjaga yang menipu dirinya sendiri.
 *
 * Diperiksa juga: Suspense benar-benar diimpor dari react di berkas itu, dan
 * batasnya punya fallback — <Suspense> tanpa fallback menggambar kosong.
 *
 * Jalankan:  node scripts/cek-suspense.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SUMBER = join(AKAR, "src");

function berkasJsx(dir) {
  const keluar = [];
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) keluar.push(...berkasJsx(p));
    else if (/\.jsx?$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

const temuan = [];
let diperiksa = 0;
let berkasBerOutlet = 0;

for (const berkas of berkasJsx(SUMBER)) {
  const kode = kupasKomentar(readFileSync(berkas, "utf8"));
  if (!kode.includes("<Outlet")) continue;
  berkasBerOutlet++;
  const nama = relative(AKAR, berkas);

  // Posisi tiap pembuka/penutup, dibaca satu kali lalu dibandingkan.
  const posisi = (pola) => {
    const keluar = [];
    const r = new RegExp(pola, "g");
    let m;
    while ((m = r.exec(kode)) !== null) keluar.push(m.index);
    return keluar;
  };
  const buka = posisi("<Suspense[\\s>]");
  const tutup = posisi("</Suspense>");
  const outlet = posisi("<Outlet[\\s/>]");

  for (const i of outlet) {
    diperiksa++;
    const dibuka = buka.filter((x) => x < i).length;
    const ditutup = tutup.filter((x) => x < i).length;
    if (dibuka <= ditutup) {
      temuan.push(
        `${nama}: <Outlet /> tidak berada di dalam <Suspense>. Semua halaman ` +
        `dimuat lewat React.lazy (App.jsx), jadi rute yang digambar di sini ` +
        `akan mati dengan "A component suspended while responding to ` +
        `synchronous input" — layar "Terjadi Kesalahan", bukan halaman.`,
      );
    }
  }

  if (buka.length > 0) {
    if (!/import\s*\{[^}]*\bSuspense\b[^}]*\}\s*from\s*["']react["']/.test(kode)) {
      temuan.push(`${nama}: memakai <Suspense> tetapi tidak mengimpornya dari react.`);
    }
    if (!/<Suspense[^>]*\bfallback\b/.test(kode) && !/<Suspense\s[\s\S]{0,400}?fallback=/.test(kode)) {
      temuan.push(`${nama}: <Suspense> tanpa fallback — saat berkas halamannya diunduh, kolomnya kosong tanpa tanda apa pun.`);
    }
  }
}

if (berkasBerOutlet === 0) {
  temuan.push(
    "Tidak ada satu pun <Outlet /> ditemukan di src — penjaga ini kehilangan " +
    "sasarannya. Kalau tata letaknya memang berubah, ganti penjaganya; " +
    "kalau tidak, ada yang salah dengan pembacaan berkasnya.",
  );
}

if (temuan.length) {
  console.error(
    `${temuan.length} masalah pada batas Suspense.\n\n` +
    temuan.map((t) => "  " + t).join("\n") + "\n",
  );
  process.exit(1);
}
console.log(
  `Tiap <Outlet /> berada di dalam <Suspense> ` +
  `(${diperiksa} outlet di ${berkasBerOutlet} berkas tata letak).`,
);
process.exit(0);
