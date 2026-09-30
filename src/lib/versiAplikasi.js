/**
 * versiAplikasi.js — mengetahui bahwa aplikasi yang sedang dibuka sudah
 * ketinggalan dari yang sudah terbit.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────
 *
 * 30-09-2026, pemilik mengirim tangkapan layar: ubin "Kunjungan Kandang"
 * menampilkan N1, N2 dan N3 sebagai tiga kandang terpisah, tanpa satu pun
 * kandang Bonsai. Padahal:
 *
 *   · N1, N2 dan N3 sudah TIDAK ADA sebagai baris Enclosure — ketiganya
 *     digabung jadi satu kandang N pada 27-09-2026;
 *   · Bonsai 1-4 bertanda `ronda_harian: true` dan berisi 36 kura;
 *   · `kandangWajib()` dijalankan atas data yang sesungguhnya memang
 *     mengembalikan 16 ubin, lengkap dengan keempat Bonsai.
 *
 * Kodenya benar, datanya benar. Yang ketinggalan adalah berkas aplikasi
 * yang tersimpan di HP itu — tiga hari lebih tua, dan aplikasi ini
 * dipasang sebagai PWA (ada manifest.json), jadi halaman awalnya bisa
 * bertahan lama di cache peramban.
 *
 * Tidak ada apa pun di layar yang memberi tahu. Orang yang memakainya
 * hanya melihat kandang yang hilang, lalu menyimpulkan datanya yang
 * salah — dan melaporkan cacat yang sudah diperbaiki tiga hari lalu.
 * Pada layar kiper akibatnya lebih dari kebingungan: ronda yang dikerjakan
 * mengikuti daftar kandang yang sudah usang.
 *
 * ── Caranya ─────────────────────────────────────────────────────────
 *
 * Tidak memakai nomor versi yang harus diingat orang menaikkannya. Yang
 * dibandingkan adalah nama berkas bundel utama, yang memang sudah berubah
 * tiap kali aplikasi dibangun ulang (`index-<hash>.js`):
 *
 *   · yang SEDANG JALAN — dibaca dari <script type="module"> di DOM,
 *     jadi ia benar-benar mencerminkan berkas yang dimuat peramban;
 *   · yang SUDAH TERBIT — halaman awal diambil ulang dengan `no-store`,
 *     lalu atribut yang sama dibaca dari teksnya.
 *
 * Beda nama = ada versi baru. Tidak ada yang perlu dipelihara.
 */

/** Jalur bundel utama yang SEDANG dijalankan peramban ini. */
export function bundelSaatIni() {
  if (typeof document === "undefined") return "";
  const s = document.querySelector('script[type="module"][src]');
  const src = s?.getAttribute("src");
  if (!src) return "";
  try {
    return new URL(src, window.location.href).pathname;
  } catch {
    return src;
  }
}

/*
 * Urutan atribut TIDAK dijamin. Halaman terbit menuliskannya sebagai
 *
 *     <script crossorigin="" src="/static/index-DOLfh2dn.js" type="module">
 *
 * yaitu `src` SEBELUM `type`. Satu pola saja akan meleset pada separuh
 * kemungkinan, dan melesetnya senyap: hasilnya string kosong, yang
 * diperlakukan sebagai "tidak tahu" dan tidak pernah memunculkan apa pun.
 */
const POLA_MODUL = [
  /<script[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["']/i,
  /<script[^>]*\bsrc=["']([^"']+)["'][^>]*\btype=["']module["']/i,
];

/**
 * Jalur bundel utama yang SEDANG TERBIT di server.
 * Mengembalikan "" bila tidak bisa dipastikan — termasuk saat jaringan
 * gagal, yang di kandang adalah keadaan biasa, bukan kejadian luar biasa.
 */
export async function bundelTerbit(signal) {
  if (typeof fetch === "undefined" || typeof window === "undefined") return "";
  const res = await fetch(`/?_periksa=${Date.now()}`, {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  if (!res.ok) return "";
  const html = await res.text();
  for (const pola of POLA_MODUL) {
    const m = html.match(pola);
    if (m?.[1]) {
      try {
        return new URL(m[1], window.location.href).pathname;
      } catch {
        return m[1];
      }
    }
  }
  return "";
}

/**
 * Apakah ada versi baru? `false` bila salah satu sisi tidak diketahui —
 * menebak "ada versi baru" lalu menyuruh orang memuat ulang tanpa sebab
 * lebih buruk daripada diam.
 */
export function adaVersiBaru(sekarang, terbit) {
  if (!sekarang || !terbit) return false;
  return sekarang !== terbit;
}
