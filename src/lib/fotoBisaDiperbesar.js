/**
 * fotoBisaDiperbesar.js — satu aturan "gambar ini boleh diperbesar atau tidak".
 *
 * ── Kenapa aturannya dipisah dari komponennya ─────────────────────────────
 *
 * Ada 95 tempat di aplikasi ini yang menampilkan gambar: foto telur, foto
 * clutch, bukti transfer, foto temuan, foto penyakit, selfie absen, QR, dan
 * pratinjau label. Menambahkan "bisa diklik" satu per satu di 95 tempat berarti
 * 95 kesempatan untuk kelewatan — dan yang kelewatan tidak akan ketahuan sampai
 * ada yang mencoba mengetuknya.
 *
 * Jadi yang dipasang satu: penangkap klik di tingkat dokumen. Yang perlu
 * diputuskan tinggal satu hal, dan itu ada di sini supaya bisa DIUJI tanpa
 * menjalankan seluruh aplikasi.
 *
 * ── Kenapa gambar di dalam tombol TIDAK diperbesar ────────────────────────
 *
 * Banyak foto duduk di dalam kartu atau tombol yang mengetuknya sudah berarti
 * sesuatu — membuka halaman kura, memilih baris, membuka galeri yang sudah
 * punya viewer sendiri. Kalau gambarnya ikut memperbesar, satu ketukan
 * melakukan dua hal, dan yang kalah adalah yang sebenarnya dimaui orang.
 *
 * Maka: di dalam elemen yang bisa ditekan, aksi elemen itu yang menang. Kalau
 * suatu saat ada gambar di dalam tombol yang MEMANG harus bisa diperbesar,
 * tandai `data-zoom="on"` pada gambarnya — pengecualian yang tertulis, bukan
 * perilaku yang kebetulan.
 */

/** Elemen yang mengetuknya sudah berarti sesuatu. */
const BISA_DITEKAN = 'button, a[href], [role="button"], label, summary, [onclick]';

/**
 * Sumber gambar yang benar-benar bisa ditampilkan besar.
 *
 * Longgar dengan sengaja: berkas di dalam aplikasi dirujuk dengan jalur relatif
 * ("/gambar/x.png"), dan menolaknya berarti gambar yang sah tidak bisa
 * diperbesar. Yang ditolak hanya yang memang tidak menunjuk gambar apa pun —
 * sumber kosong, jangkar "#", dan data URL yang isinya bukan gambar.
 */
export function sumberBisaDitampilkan(src) {
  const s = String(src ?? "").trim();
  if (!s || s === "#") return false;
  if (/^data:/i.test(s)) return /^data:image\//i.test(s);
  return true;
}

/**
 * @param {Element|null} img      elemen <img> yang diklik
 * @param {Element|null} pembatas elemen viewer itu sendiri — gambar di DALAMnya
 *                                tidak boleh memicu viewer lagi
 * @returns {boolean}
 */
export function bolehDiperbesar(img, pembatas = null) {
  if (!img || img.tagName !== "IMG") return false;
  if (img.dataset?.zoom === "off") return false;
  if (!sumberBisaDitampilkan(img.getAttribute("src"))) return false;
  if (pembatas && pembatas.contains(img)) return false;
  // Gambar di dalam viewer mana pun (termasuk viewer lama milik modul lain).
  if (img.closest("[data-pembesar-foto]")) return false;

  if (img.closest(BISA_DITEKAN)) return img.dataset?.zoom === "on";
  return true;
}
