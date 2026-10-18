/**
 * pitaUkuran.js — panjang cangkang jadi pita harga.
 *
 * ── Aturannya dari pemiliknya, 18 Okt 2026 ──────────────────────────────────
 *
 * "Jika baby, rentangnya lebih kecil. Lima, enam, tujuh, delapan, sembilan,
 * sepuluh juga akan berbeda. Tapi kalau untuk indukan, rentangnya semakin
 * lebar. Jadi biasanya perhitungannya per lima senti."
 *
 * Jadi dua aturan, bukan satu:
 *
 *   di bawah 10 cm  →  per 1 cm   ("6 cm")
 *   10 cm ke atas   →  per 5 cm   ("50–55 cm")
 *
 * Bukan kerapian yang dicari. Anakan 6 cm dan 7 cm memang berbeda harga
 * sementara indukan 51 cm dan 53 cm tidak — pitanya mengikuti kenyataan itu,
 * dan pita seragam 5 cm akan menyamakan dua anakan yang harganya berbeda
 * sedangkan pita seragam 1 cm membuat 20 baris indukan yang harganya sama.
 *
 * ── Kenapa batas atas bersifat terbuka ──────────────────────────────────────
 *
 * Pita "50–55 cm" memuat 50 sampai 54,9 dan TIDAK memuat 55. Tanpa aturan
 * tegas ini, kura 55,0 cm bisa jatuh ke dua pita sekaligus tergantung urutan
 * pemeriksaan — dan nilainya ikut berubah-ubah tanpa sebab yang terlihat.
 */

/** Batas tempat aturan per-1-cm berganti jadi per-5-cm. */
export const BATAS_ANAKAN = 10;

/** Lebar pita di atas BATAS_ANAKAN, dalam cm. */
export const LEBAR_PITA = 5;

/**
 * Pita untuk satu panjang cangkang.
 *
 * @returns {{min:number, maks:number, label:string}|null}
 *          `null` bila panjangnya tidak diketahui — dan itu HARUS dibedakan
 *          dari pita mana pun, karena kura tanpa ukuran tidak bisa dinilai
 *          dan jumlahnya perlu disebut, bukan diam-diam dimasukkan ke pita
 *          terkecil.
 */
export function pitaUkuran(cm) {
  const n = Number(cm);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (n < BATAS_ANAKAN) {
    const min = Math.floor(n);
    return { min, maks: min + 1, label: `${min} cm` };
  }

  const min = Math.floor(n / LEBAR_PITA) * LEBAR_PITA;
  return { min, maks: min + LEBAR_PITA, label: `${min}–${min + LEBAR_PITA} cm` };
}

/** Label pita dari batas bawahnya saja — dipakai saat membaca baris harga. */
export function labelPita(min) {
  const n = Number(min);
  if (!Number.isFinite(n)) return "";
  return n < BATAS_ANAKAN ? `${n} cm` : `${n}–${n + LEBAR_PITA} cm`;
}

/**
 * Apakah sebuah panjang jatuh di dalam pita yang batas bawahnya `min`.
 *
 * Dipakai penjaga untuk membuktikan bahwa pitaUkuran dan labelPita bicara
 * tentang rentang yang sama — dua fungsi yang berpisah diam-diam adalah cara
 * paling mudah membuat satu kura dihargai dua kali.
 */
export function didalamPita(cm, min) {
  const p = pitaUkuran(cm);
  return !!p && p.min === Number(min);
}
