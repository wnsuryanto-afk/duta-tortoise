/**
 * lembarLabel.js — ukuran label kotak telur, dan berapa yang muat di satu A4.
 *
 * ── Kenapa angkanya tinggal di sini, bukan di layarnya ─────────────────────
 *
 * "Berapa label per lembar" dulu ada DUA kali: dihitung di dalam penggambar
 * lembar A4, dan ditulis tetap di keterangan bawah tombolnya — "2 kolom × 5
 * baris = maks. 10 label 100×50 mm". Dua angka untuk satu hal, dan yang
 * tertulis di layar tidak ikut berubah saat ukurannya diganti.
 *
 * Sekarang satu fungsi, dipakai tombol pemilih ukuran, keterangannya, DAN
 * penggambar lembarnya. Karena ia murni (tidak menyentuh DOM maupun React),
 * cek-label.mjs bisa menjalankannya langsung.
 */

/**
 * Ukuran fisik label, dalam milimeter.
 *
 * Mode cetaknya satu: Epson L385 di kertas A4, dipotong tangan. Kertas bisa
 * dipotong seukuran apa pun, jadi di sini tidak ada batasan gulungan.
 *
 * `untuk` bukan hiasan: yang memilih sedang memegang kotak telurnya, dan
 * "40 × 30 mm" tidak memberi tahu apa pun tentang apakah ukuran itu menutupi
 * telurnya atau tidak.
 */
export const UKURAN_LABEL_TELUR = [
  { id: "50x30", label: "50 × 30 mm", w: 50, h: 30, full: false, untuk: "Muat di kotak telur tanpa menutupi telurnya" },
  { id: "40x30", label: "40 × 30 mm", w: 40, h: 30, full: false, untuk: "Paling kecil — untuk kotak mungil" },
  { id: "100x50", label: "100 × 50 mm", w: 100, h: 50, full: true, untuk: "Besar — menutupi hampir seluruh sisi kotak" },
];

export const UKURAN_TELUR_BAWAAN = "50x30";

/**
 * Daerah A4 yang boleh dipakai, dalam milimeter.
 *
 * A4 = 210 × 297 mm. Sisa 10 mm mendatar dan 16 mm tegak adalah tepi yang
 * tidak dicetak printer inkjet rumahan — bukan selera tata letak. Memakai
 * seluruh 210 × 297 membuat baris terluar terpotong printernya sendiri.
 */
export const A4_PAKAI_MM = { w: 200, h: 281 };

export function cariUkuranTelur(id) {
  return (
    UKURAN_LABEL_TELUR.find((u) => u.id === id) ||
    UKURAN_LABEL_TELUR.find((u) => u.id === UKURAN_TELUR_BAWAAN)
  );
}

/** @returns {{kolom:number, baris:number, muat:number}} */
export function rencanaLembarA4(sizeDef) {
  const def = sizeDef || cariUkuranTelur(UKURAN_TELUR_BAWAAN);
  const kolom = Math.max(1, Math.floor(A4_PAKAI_MM.w / def.w));
  const baris = Math.max(1, Math.floor(A4_PAKAI_MM.h / def.h));
  return { kolom, baris, muat: kolom * baris };
}
