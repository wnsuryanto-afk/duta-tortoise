/**
 * harness.mjs — memerintah harness tata letak TANPA mati dengan stack trace.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * `window.__pindah` dipasang saat App harness digambar. Ada beberapa saat
 * ketika ia TIDAK ada, dan memanggilnya di saat itu melempar
 *
 *     TypeError: window.__pindah is not a function
 *
 * keluar dari seluruh penjaga. Yang terbaca orang adalah stack trace Node,
 * bukan sebab yang bisa ditindaklanjuti — dan penjaga yang mati seperti itu
 * tidak memberi tahu apa pun tentang tata letaknya.
 *
 * Dua sebab nyata, keduanya terjadi 8 Nov 2026:
 *
 *   1. Berkas sumber disimpan selagi penjaga berjalan. Vite HMR memuat ulang
 *      halamannya, dan ada jendela beberapa ratus milidetik ketika JS-nya
 *      belum jalan. (cek-lipat, saat saya menyunting dua berkas penetasan.)
 *
 *   2. Vite menemukan dependensi baru lalu MEMUAT ULANG halaman sendiri
 *      ("new dependencies optimized"). Ini terjadi tanpa ada yang menyunting
 *      apa pun: 24 halaman baru masuk daftar kasus, dependensinya ikut baru,
 *      dan pengoptimalnya memuat ulang halaman tepat setelah `window.__kasus`
 *      terbaca. (cek-lebar, pada putaran pertama setelah daftarnya dilengkapi.)
 *
 * Sebab kedua itu yang membuat berkas ini ada alih-alih satu salinan di
 * masing-masing penjaga: ia bukan kesalahan pemakaian yang bisa dihindari
 * dengan "jangan sunting selagi penjaga jalan".
 *
 * Satu salinan, dipakai cek-lebar dan cek-lipat — repo ini punya penjaga
 * sendiri (cek-kembar) yang melarang sepasang kembar pelan-pelan berselisih.
 */

/** Berapa lama menunggu harness siap kembali: 40 × 100ms = ±4 detik. */
const PERCOBAAN = 40;
const JEDA_MS = 100;

/**
 * Menunggu sampai `window[nama]` berupa fungsi.
 * @returns true bila siap sebelum waktunya habis.
 */
export async function tungguSiap(hal, nama) {
  for (let percobaan = 0; percobaan < PERCOBAAN; percobaan++) {
    if (await hal.evaluate((n) => typeof window[n] === "function", nama)) return true;
    await hal.waitForTimeout(JEDA_MS);
  }
  return false;
}

/**
 * Pindah ke kasus ke-`i`, menunggu harness siap lebih dulu.
 * @returns true bila berhasil pindah.
 */
export async function pindahKe(hal, i) {
  if (!(await tungguSiap(hal, "__pindah"))) return false;
  await hal.evaluate((n) => window.__pindah(n), i);
  return true;
}

/**
 * Kalimat yang dibaca orang ketika harness tidak bisa diperintah lagi.
 *
 * Disatukan di sini supaya kedua penjaga mengatakan hal yang sama, dan supaya
 * yang dibaca adalah sebabnya — bukan nama fungsi di dalam harness.
 */
export function pesanTakBisaPindah(nama, i, keterangan) {
  return (
    `Harness tidak bisa diperintah pindah ke kasus ${i + 1} (${nama})${keterangan ? ` ${keterangan}` : ""}.\n` +
    `window.__pindah tidak ada — halamannya dimuat ulang di tengah pengukuran\n` +
    `dan tidak kembali dalam ${(PERCOBAAN * JEDA_MS) / 1000} detik. Dua sebab yang sudah terjadi:\n` +
    `berkas sumber disimpan selagi penjaga ini berjalan (Vite HMR), atau Vite\n` +
    `menemukan dependensi baru lalu memuat ulang halaman sendiri. Untuk yang\n` +
    `kedua, jalankan sekali lagi: optimasinya sudah tersimpan.`
  );
}
