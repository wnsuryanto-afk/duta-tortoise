/**
 * cek-menetas.mjs — hitung mundur menetas hanya boleh tinggal di satu berkas.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * Formulir mengisi jendela menetas selebar 25 hari:
 *
 *     estimated_hatch_start = bertelur + 80 hari
 *     estimated_hatch_end   = bertelur + 105 hari
 *     estimated_hatch_date  = SAMA dengan end
 *
 * src/lib/hitungMundur.js menghitung mundur ke tanggal BUKA jendela, dan
 * komentarnya sudah menyebut jebakannya: `estimated_hatch_date` adalah
 * tanggal TUTUP, bukan buka — "cadangan yang salah arti tidak pernah
 * ketahuan selama kolom aslinya terisi".
 *
 * Meski begitu, 9 Nov 2026 ada TIGA salinan lain yang menghitung sendiri,
 * ketiganya ke ujung jendela yang salah:
 *
 *   BreedingAndEggs   kotak "Menetas ≤7 hari"   → estimated_hatch_end
 *   InvestorDashboard daysLeft                  → estimated_hatch_end
 *   UrgentAlerts      hatchingSoon              → estimated_hatch_date
 *
 * Ditelusuri pada clutch sungguhan A35 × A46, bertelur 4 Sep 2026, jendela
 * 23 Nov – 18 Des:
 *
 *   23 Nov  beranda "sedang menetas"    kotak Breeding: kosong
 *   30 Nov  beranda "sedang menetas"    kotak Breeding: kosong
 *   11 Des  beranda "sedang menetas"    kotak Breeding: 1
 *   19 Des  beranda "lewat perkiraan"   kotak Breeding: kosong
 *
 * Kotaknya diam sepanjang 18 hari PERTAMA telur itu bisa menetas, lalu diam
 * LAGI begitu perkiraannya terlampaui — tepat ketika seseorang paling perlu
 * memeriksanya. Kura menetas berhari-hari; hari pertama yang terlewat
 * berarti bayi menunggu di inkubator tanpa ada yang tahu.
 *
 * ── Yang ditolak ─────────────────────────────────────────────────────
 *
 * Menghitung selisih hari ke `estimated_hatch_end` / `estimated_hatch_date`
 * TANPA ikut membaca `estimated_hatch_start`. Itu persis bentuk yang salah:
 * menghitung mundur ke ujung tutup jendela sambil menyebutnya "akan
 * menetas".
 *
 * Yang memakai KEDUA ujungnya tidak ditolak. BreedingAndEggs menghitung
 * `daysToStart` dan `daysToEnd` berdampingan lalu menyusun `inHatchRange`
 * darinya — itu memakai jendelanya dengan benar, dan melarangnya hanya akan
 * memaksa penulisan ulang tanpa satu pun perubahan yang terlihat pengguna.
 *
 * Menampilkan tanggalnya juga tidak dilarang — yang dilarang menghitung
 * mundur dari ujung yang salah.
 *
 * Komentar dibuang lebih dulu lewat lib/kupasKomentar.mjs: berkas-berkas itu
 * kini MENJELASKAN cacat ini di dalam komentarnya sendiri.
 *
 * Jalankan:  node scripts/cek-menetas.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const SUMBER = "src/lib/hitungMundur.js";

/* Tiap entri WAJIB punya alasan. */
const DIKECUALIKAN = new Map([
  [SUMBER, "di sinilah aturan hitung mundur menetas tinggal"],
]);

/** Tanda bahwa sebuah baris menghitung selisih hari, bukan sekadar menampilkan. */
const POLA_HARI = /86400000|1000\s*\*\s*60\s*\*\s*60\s*\*\s*24|differenceInCalendarDays|differenceInDays/;
const POLA_TUTUP = /estimated_hatch_(end|date)/;
const POLA_BUKA = /estimated_hatch_start/;

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
  const isi = kupasKomentar(readFileSync(p, "utf8"));
  if (!POLA_TUTUP.test(isi)) continue;
  diperiksa++;

  const baris = isi.split("\n");
  baris.forEach((b, i) => {
    if (!POLA_HARI.test(b)) return;
    /*
      Jendela enam baris: nama antaranya hampir selalu dibuat satu-dua baris
      di atas tempat selisihnya dihitung — persis bentuk salinan yang dicabut
      9 Nov 2026 (`const hatchEnd = ...` lalu `Math.ceil(hatchEnd - now)`) —
      dan pasangan daysToStart/daysToEnd yang BENAR juga berdekatan.
    */
    const jendela = baris.slice(Math.max(0, i - 6), i + 2).join("\n");
    if (!POLA_TUTUP.test(jendela)) return;
    if (POLA_BUKA.test(jendela)) return;   // memakai kedua ujung jendela — benar
    temuan.push(`${rel}:${i + 1}  ${b.trim().slice(0, 74)}`);
  });
}

if (temuan.length) {
  console.error(
    `${temuan.length} tempat menghitung sendiri mundur ke tanggal menetas.\n\n` +
    `Jendela menetas selebar 25 hari (bertelur +80 sampai +105), dan\n` +
    `\`estimated_hatch_date\` berisi tanggal TUTUP jendela, bukan buka.\n` +
    `Baris di bawah menghitung mundur ke ujung tutup itu tanpa menyentuh\n` +
    `\`estimated_hatch_start\` sama sekali.\n` +
    `Menghitung mundur ke ujung yang salah membuat peringatannya diam\n` +
    `sepanjang 18 hari pertama telur itu bisa menetas, lalu diam lagi\n` +
    `begitu perkiraannya terlampaui.\n\n` +
    `Pakai ${SUMBER}:\n` +
    `  hitungMundur(breeding)        { jenis, hari, nada } untuk satu clutch\n` +
    `  clutchMendesak(breedings)     { lewat, masa, segera, total }\n\n` +
    `Menampilkan tanggalnya tidak dilarang — yang dilarang menghitung\n` +
    `mundurnya sendiri.\n\n` +
    temuan.map((t) => "  " + t).join("\n"),
  );
  process.exit(1);
}
console.log(
  `Hitung mundur menetas hanya ada di ${SUMBER} ` +
  `(${diperiksa} berkas yang menyentuh kolom estimated_hatch_* diperiksa).`,
);
process.exit(0);
