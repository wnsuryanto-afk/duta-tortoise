/**
 * peringkatIndukan.js — satu perhitungan untuk ketiga tabel peringkat.
 *
 * ── Kenapa dipindahkan ke sini ───────────────────────────────────────────
 *
 * Halaman Peringkat Indukan punya tiga tab — per pasangan, per jantan, per
 * betina — dan masing-masing menghitung sendiri, dengan rumus yang disalin
 * tiga kali. Salinannya tidak sama:
 *
 *   Pasangan  menghitung clutch tahun ini, tanggal terakhir bertelur, dan
 *             berapa clutch yang induknya sedang sakit.
 *   Jantan    menulis `clutchesThisYear: 0` — ANGKA MATI, bukan hitungan.
 *   Betina    sama: `clutchesThisYear: 0`.
 *
 * Kartu di layar menampilkannya tanpa syarat: "📅 0 clutch tahun ini". Jadi
 * tab Induk Betina — justru tab yang dipakai menjawab "betina mana yang
 * berproduksi tahun ini" — menyebut NOL untuk semuanya, termasuk C23 yang
 * bertelur tiga kali sepanjang 2026 dan A31 yang dua kali.
 *
 * Dua angka lain hilang tanpa suara di kedua tab itu: `terakhirBertelur` dan
 * `clutchIndukSakit` tidak pernah dihitung, jadi barisnya tidak dirender —
 * bukan karena datanya tidak ada, melainkan karena rumusnya tidak disalin.
 *
 * Sekarang ketiganya memanggil fungsi yang sama. Tab yang menampilkan angka
 * berbeda untuk pertanyaan yang sama adalah cara tercepat membuat orang
 * berhenti memercayai layarnya.
 */
import { ringkasProduksi } from "@/lib/hasilInkubasi";
import { parentHasSickHistory } from "@/lib/parentHealthUtils";

/**
 * Bobot skor. Ditulis sekali di sini dan ditampilkan apa adanya di layar,
 * supaya keterangan "Hatch Rate × 40%" tidak bisa lagi berbeda dari rumus
 * yang benar-benar dipakai.
 */
export const BOBOT = { hatchRate: 0.4, telur: 0.3, clutch: 0.3 };

/** Telur per musim yang dianggap "penuh" saat menormalkan skor. */
export const TELUR_MAKS = 50;

/** Clutch per tahun yang dianggap "penuh" saat menormalkan skor. */
export const CLUTCH_PER_TAHUN_MAKS = 3;

/** Apakah clutch ini jatuh pada tahun tertentu? */
export function clutchTahun(clutch, tahun) {
  if (!clutch) return false;
  if (Number(clutch.season_year) === Number(tahun)) return true;
  return String(clutch.egg_laying_date || "").startsWith(String(tahun));
}

/**
 * Angka satu kelompok clutch — dipakai untuk pasangan, jantan, maupun betina.
 *
 * @param {Array}  clutches       clutch milik kelompok ini
 * @param {object} opsi
 * @param {number} opsi.tahunIni     tahun yang dihitung sebagai "tahun ini"
 * @param {number} opsi.jumlahMusim  banyaknya musim di data (penyebut clutch/tahun)
 * @param {Array}  opsi.healthRecords catatan kesehatan, untuk kolom induk sakit
 */
export function statistikKelompok(clutches = [], opsi = {}) {
  const daftar = clutches || [];
  const {
    tahunIni = new Date().getFullYear(),
    jumlahMusim = 1,
    healthRecords = [],
  } = opsi;

  const { totalTelur, totalMenetas, hatchRate } = ringkasProduksi(daftar);

  const clutchesThisYear = daftar.filter((c) => clutchTahun(c, tahunIni)).length;

  /*
   * Penyebutnya jumlah MUSIM di data, bukan jumlah tahun kalender. Untuk
   * kebun ini keduanya sama (satu musim: 2026), tetapi begitu ada musim
   * kedua, membagi dengan tahun kalender akan menghukum pasangan yang baru
   * mulai di musim terakhir.
   */
  const clutchPerTahun = daftar.length / Math.max(1, jumlahMusim);

  const normalTelur = Math.min(100, (totalTelur / TELUR_MAKS) * 100);
  const normalClutch = Math.min(100, (clutchPerTahun / CLUTCH_PER_TAHUN_MAKS) * 100);
  const score = hatchRate * BOBOT.hatchRate + normalTelur * BOBOT.telur + normalClutch * BOBOT.clutch;

  const clutchIndukSakit = daftar.filter(
    (c) => parentHasSickHistory(c.male_id, c.female_id, healthRecords, c.egg_laying_date).affected,
  ).length;

  /*
   * Tanggal terakhir diambil dengan mengurutkan TEKS "YYYY-MM-DD", bukan
   * lewat new Date(): urutannya sama persis dan tidak ada zona waktu yang
   * bisa menggeser tanggal 1 ke bulan sebelumnya.
   */
  const terakhirBertelur = daftar
    .map((c) => c?.egg_laying_date)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;

  return {
    totalClutch: daftar.length,
    totalEggs: totalTelur,
    totalHatched: totalMenetas,
    hatchRate,
    clutchesThisYear,
    clutchIndukSakit,
    terakhirBertelur,
    score,
  };
}

/**
 * Kelompokkan clutch lalu hitung statistiknya, terurut dari skor tertinggi.
 *
 * @param {Array}    clutches
 * @param {Function} kunci  clutch -> string kunci kelompok
 * @param {Function} label  clutch -> { maleName, femaleName } untuk ditampilkan
 */
export function peringkat(clutches = [], kunci, label, opsi = {}) {
  const peta = new Map();
  for (const c of clutches || []) {
    const k = kunci(c);
    if (k === null || k === undefined) continue;
    if (!peta.has(k)) peta.set(k, { ...label(c), clutches: [] });
    peta.get(k).clutches.push(c);
  }
  return [...peta.values()]
    .map((g) => ({ maleName: g.maleName, femaleName: g.femaleName, ...statistikKelompok(g.clutches, opsi) }))
    .sort((a, b) => b.score - a.score);
}
