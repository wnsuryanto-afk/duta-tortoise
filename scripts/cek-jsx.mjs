/**
 * cek-jsx.mjs — komponen JSX yang dipakai tanpa pernah didefinisikan.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 13 Nov 2026 Ali, kiper kebun, mengirim tangkapan layar dari HP-nya:
 *
 *     ⚠ Widget Tugas Hari Ini bermasalah
 *     AlertTriangle is not defined
 *
 * Satu ikon dipakai di JSX tanpa ikut diimpor. Widgetnya runtuh, batas
 * errornya menggantikan isinya, dan layar yang dia pakai setiap hari
 * berhenti bisa dikerjakan — di tengah jam kerja, di depan kandang.
 *
 * ── Kenapa tidak ada yang menangkapnya ───────────────────────────────
 *
 * eslint.config.js menyetel `"no-undef": "error"`, dan cek-semua.mjs
 * menuliskannya sebagai jaring pengaman: "variabel yang dipakai tapi tidak
 * ada (no-undef)". Jaring itu punya lubang yang tidak disebut siapa pun.
 *
 * Dibuktikan dengan satu berkas percobaan:
 *
 *     const a = IniTidakAdaBiasa;            → 'IniTidakAdaBiasa' is not defined
 *     <IniTidakAdaJsx />                     → TIDAK dilaporkan sama sekali
 *
 * `no-undef` bekerja atas acuan yang tidak terpecahkan di lingkup. Nama di
 * dalam tag JSX tidak pernah menjadi acuan semacam itu, jadi aturan itu
 * tidak pernah melihatnya. Build pun hijau: Vite tidak peduli sebuah nama
 * ada atau tidak sampai kodenya BENAR-BENAR dijalankan.
 *
 * Di aplikasi ini hampir seluruh nama yang dipakai adalah nama JSX —
 * komponen dan ikon. Jadi lubangnya persis sebesar bagian yang paling
 * sering ditulis orang.
 *
 * ── Cara memeriksanya ────────────────────────────────────────────────
 *
 * Untuk tiap nama berawalan huruf besar yang muncul sebagai tag, nama itu
 * harus muncul SETIDAKNYA SEKALI di berkas yang sama di luar posisi tag —
 * sebagai impor, const, function, parameter, atau apa pun. Itu longgar
 * dengan sengaja: penjaga yang menuduh kode yang benar akan dimatikan
 * orang, bukan dipatuhi. Yang dikejar hanya bentuk yang memang mustahil
 * benar, yaitu nama yang di seluruh berkas HANYA pernah ada di dalam tag.
 *
 * Komentar dibuang lebih dulu lewat lib/kupasKomentar.mjs: berkas ini dan
 * cek-semua.mjs sama-sama MENYEBUT nama-nama contoh di dalam penjelasannya.
 *
 * Jalankan:  node scripts/cek-jsx.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

function berkas(dir, keluar = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.jsx$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

const temuan = [];
let berkasDiperiksa = 0;
let tagDiperiksa = 0;

for (const p of berkas(join(AKAR, "src"))) {
  const rel = relative(AKAR, p).split("\\").join("/");
  const kode = kupasKomentar(readFileSync(p, "utf8"));
  berkasDiperiksa++;

  const dipakai = new Map();           // nama -> baris pertama
  const baris = kode.split("\n");
  baris.forEach((b, i) => {
    for (const m of b.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)) {
      if (!dipakai.has(m[1])) dipakai.set(m[1], i + 1);
    }
  });

  for (const [nama, noBaris] of dipakai) {
    tagDiperiksa++;
    const semua = (kode.match(new RegExp(`\\b${nama}\\b`, "g")) || []).length;
    const sebagaiTag = (kode.match(new RegExp(`</?${nama}\\b`, "g")) || []).length;
    if (semua - sebagaiTag > 0) continue;        // ada di tempat lain → dianggap terdefinisi
    temuan.push(
      `${rel}:${noBaris}  <${nama}> dipakai tetapi tidak pernah didefinisikan.\n` +
      `      Nama ini tidak muncul di mana pun selain di dalam tag — tidak\n` +
      `      diimpor, tidak dideklarasikan. Halamannya akan runtuh dengan\n` +
      `      "${nama} is not defined" begitu baris itu benar-benar digambar.`,
    );
  }
}

if (temuan.length) {
  console.error(
    `${temuan.length} komponen JSX dipakai tanpa definisi.\n\n` +
    `eslint TIDAK bisa menangkap ini: "no-undef" hanya melihat acuan yang\n` +
    `tidak terpecahkan di lingkup, dan nama di dalam tag JSX tidak pernah\n` +
    `menjadi acuan semacam itu. Build juga tetap hijau — kesalahannya baru\n` +
    `muncul saat barisnya digambar, di layar orang yang sedang bekerja.\n\n` +
    temuan.map((t) => "  " + t).join("\n"),
  );
  process.exit(1);
}
console.log(
  `Semua komponen JSX punya definisi ` +
  `(${tagDiperiksa} nama tag di ${berkasDiperiksa} berkas .jsx diperiksa).`,
);
process.exit(0);
