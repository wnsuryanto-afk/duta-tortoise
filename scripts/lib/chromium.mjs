import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * chromium.mjs — menemukan Chromium tanpa menuliskan nomor versinya.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * Empat penjaga menuliskan jalur ini apa adanya:
 *
 *     /opt/pw-browsers/chromium-1194/chrome-linux/chrome
 *
 * 29-10-2026 wadah kerjanya diperbarui dan jalurnya berubah DUA kali
 * sekaligus: nomornya menjadi 1243, dan foldernya menjadi `chrome-linux64`.
 * Akibatnya cek-lebar dan cek-lipat mati total dengan ERR_MODULE_NOT_FOUND,
 * sementara cek-label dan cek-foto melaporkan "Chromium tidak ada" dan
 * melewati justru pemeriksaan yang hanya bisa dijawab dengan menggambar.
 *
 * Nomor versi di dalam kode adalah tanggal kedaluwarsa yang tidak tertulis.
 * Berkas ini mencarinya, jadi pembaruan wadah berikutnya tidak mematikan
 * penjaga mana pun.
 *
 * Urutannya: CHROME_UJI bila disetel (supaya bisa dipaksa), lalu hasil
 * pencarian di /opt/pw-browsers, lalu jalur umum lain. Yang dikembalikan
 * SELALU jalur yang file-nya benar-benar ada — atau null, supaya pemanggilnya
 * bisa mengatakan "tidak dijalankan" alih-alih mengaku lulus.
 */

const AKAR_PW = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";

/* Playwright pernah memakai chrome-linux dan chrome-linux64; keduanya dicoba,
   begitu juga headless shell yang isinya cukup untuk mengukur tata letak. */
const BENTUK = [
  ["chrome-linux", "chrome"],
  ["chrome-linux64", "chrome"],
  ["chrome-headless-shell-linux64", "chrome-headless-shell"],
];

const CADANGAN = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
];

/** Jalur Chromium yang benar-benar ada, atau null. */
export function cariChromium() {
  const dipaksa = process.env.CHROME_UJI;
  if (dipaksa) return existsSync(dipaksa) ? dipaksa : null;

  if (existsSync(AKAR_PW)) {
    /* Versi tertinggi dulu: wadah bisa menyimpan dua versi berdampingan, dan
       yang lama belum tentu masih utuh setelah pembaruan. */
    const folder = readdirSync(AKAR_PW)
      .filter((n) => n.startsWith("chromium"))
      .sort((a, b) => {
        const na = parseInt(a.replace(/\D+/g, ""), 10) || 0;
        const nb = parseInt(b.replace(/\D+/g, ""), 10) || 0;
        return nb - na;
      });
    for (const f of folder) {
      for (const [dir, bin] of BENTUK) {
        const p = join(AKAR_PW, f, dir, bin);
        if (existsSync(p)) return p;
      }
    }
  }

  for (const p of CADANGAN) if (existsSync(p)) return p;
  return null;
}

/** Kalimat yang sama di semua penjaga saat Chromium tidak ketemu. */
export function pesanChromiumHilang() {
  return (
    `Chromium tidak ditemukan di ${AKAR_PW} maupun jalur umum lainnya. ` +
    `Setel CHROME_UJI ke jalur binernya bila tempatnya tidak biasa.`
  );
}
