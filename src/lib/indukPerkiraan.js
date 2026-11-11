/**
 * indukPerkiraan.js — SATU aturan "clutch ini boleh dipakai menilai indukan?".
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 11 Nov 2026 pemiliknya menggali tanah dan menemukan telur. Sebagian sudah
 * pecah, sebagian masih bisa diselamatkan. Tidak ada yang melihat betina mana
 * yang bertelur — yang ada hanya perkiraan dari kandang tempat telur itu
 * ditemukan.
 *
 * Telurnya nyata. Bayi yang menetas darinya nanti juga nyata, dan akan
 * dijual seperti bayi lain. Jadi clutch-nya memang harus dicatat.
 *
 * Yang TIDAK boleh ikut adalah penilaian indukan. Formulir Breeding
 * mewajibkan nama betina ("Tortoise betina wajib dipilih"), dan setiap
 * statistik betina mengatribusikan telur lewat female_id lalu female_name.
 * Jadi satu nama tebakan langsung menjadi kredit produksi betina itu — di
 * angka yang dipakai memutuskan indukan mana yang produktif, indukan mana
 * yang dipensiunkan, dan indukan mana yang dijual.
 *
 * Keputusan yang diambil dari angka karangan lebih buruk daripada keputusan
 * yang diambil tanpa angka: yang kedua tahu dirinya menebak.
 *
 * ── Aturannya ────────────────────────────────────────────────────────
 *
 * Clutch bertanda `induk_perkiraan`:
 *
 *   IKUT   — jumlah telur kebun, isi inkubator, daya tetas KEBUN, bayi yang
 *            menetas, dan seluruh catatan per butir telur. Semua itu
 *            pertanyaan tentang KEBUN, dan jawabannya tidak berubah oleh
 *            siapa induknya.
 *
 *   TIDAK  — Ranking Indukan dan produksiBetina. Semua itu pertanyaan
 *            tentang SEEKOR KURA, dan jawabannya hanya sah bila kuranya
 *            memang yang itu.
 *
 * Nama tebakannya tetap disimpan. Ia keterangan yang berguna ("kemungkinan
 * C23, ditemukan di kandangnya"), bukan angka yang boleh dihitung.
 *
 * ── Kenapa satu berkas untuk satu baris ──────────────────────────────
 *
 * Karena aturan seperti ini di aplikasi ini sudah berkali-kali ditulis ulang
 * di tempat kedua lalu berselisih diam-diam — lihat hitungMundur.js,
 * kedaluwarsa.js, dan golonganStok(). Yang menjaga agar tidak terulang:
 * scripts/cek-induk.mjs menolak berkas lain yang membaca `induk_perkiraan`
 * sendiri.
 */

/**
 * Boleh dipakai menilai seekor indukan?
 *
 * Kebalikan dari `induk_perkiraan`, ditulis maju supaya terbaca di tempat
 * pemakaiannya: `if (!indukDinilai(c)) continue;`.
 */
export function indukDinilai(breeding) {
  return !breeding?.induk_perkiraan;
}

/**
 * Tanggal bertelurnya pasti, bukan taksiran?
 *
 * Telur yang ditemukan terkubur tidak punya tanggal bertelur yang disaksikan
 * siapa pun. Tanggalnya ditaksir — dari kapan terakhir area itu digali, atau
 * dari tingkat perkembangan embrio saat disenter. Jendela menetas yang
 * dihitung darinya (+80/+105 hari) ikut taksiran, dan layar yang
 * menampilkannya harus mengatakan begitu.
 */
export function tanggalPasti(breeding) {
  return !breeding?.tanggal_perkiraan;
}

/** Keterangan singkat untuk ditempel di layar; "" bila semuanya pasti. */
export function labelPerkiraan(breeding) {
  const bagian = [];
  if (!indukDinilai(breeding)) bagian.push("induk perkiraan");
  if (!tanggalPasti(breeding)) bagian.push("tanggal perkiraan");
  return bagian.join(" · ");
}
