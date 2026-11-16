/**
 * warnaInduk.js — warna kepala label, satu per induk betina.
 *
 * ── Permintaannya ────────────────────────────────────────────────────
 *
 * 16 Nov 2026, bersama permintaan kode clutch: "warna label berbeda per
 * induk betina", supaya kotak dari induk yang sama terlihat sekelompok dari
 * jarak rak tanpa membaca satu pun huruf.
 *
 * ── Kenapa warna TIDAK boleh jadi satu-satunya pembeda ───────────────
 *
 * Warna di sini adalah lapis KEDUA, bukan pengganti kode. Tiga sebabnya:
 *
 *   1. Warnanya berulang. Kebun ini punya belasan betina aktif dan palet
 *      yang benar-benar bisa dibedakan mata hanya berisi sepuluh. Betina
 *      kesebelas memakai warna betina pertama.
 *
 *   2. Yang dibedakan warna ini adalah INDUKNYA, bukan kotaknya. A47 punya
 *      tiga kotak, dan ketiganya berwarna sama — justru tiga kotak itulah
 *      yang paling mungkin tertukar. Yang membedakannya kode "A47-1",
 *      "A47-2", "A47-3".
 *
 *   3. Label termal tidak berwarna sama sekali.
 *
 * Jadi warnanya mempercepat MENEMUKAN kelompoknya, dan kodenya yang
 * memastikan kotak mana di dalam kelompok itu.
 *
 * ── Kenapa dihitung dari namanya, bukan disimpan ─────────────────────
 *
 * Warna yang disimpan per kura berarti satu kolom lagi yang bisa kosong,
 * bisa kembar, dan harus diisi orang. Diturunkan dari namanya, warna satu
 * betina selalu sama di layar mana pun dan di label kapan pun dicetak,
 * tanpa ada yang perlu dijaga.
 *
 * Harganya: dua betina bisa kebetulan sewarna. Itu memang terjadi dan
 * memang bisa diterima — lihat sebab nomor 1 di atas; warnanya bukan
 * pembeda terakhir.
 *
 * ── Berapa sering sewarna, diukur ────────────────────────────────────
 *
 * 17 betina di catatan kebun ini, dibagi ke 14 warna, menghasilkan 11 warna
 * berbeda. Itu bukan kelemahan pengaduknya: untuk 17 nama di 14 laci,
 * hitungan "paradoks ulang tahun" memperkirakan sekitar 10 laci terpakai.
 * Diuji juga dengan FNV-1a beravalanche dan djb2 — FNV memberi angka yang
 * sama persis (11), djb2 lebih buruk (9).
 *
 * Jadi satu-satunya cara menghilangkan warna kembar adalah memberi nomor
 * warna berurutan menurut daftar betina — dan itu membuat warna seekor
 * betina BERUBAH setiap kali ada betina baru dicatat, sementara label yang
 * sudah tercetak dan menempel di kotak tidak ikut berubah. Warna yang
 * berubah lebih buruk daripada warna yang kadang kembar.
 */

/**
 * Empat belas warna gelap yang masih memberi teks putih kontras cukup.
 *
 * Dipilih berjauhan di lingkar warna supaya terbedakan di bawah lampu
 * gudang, dan semuanya gelap karena tulisan di kepala label berwarna putih.
 * Hijau tua pertama adalah warna lama kepala label, jadi kebun yang baru
 * satu betina tidak melihat perubahan apa pun.
 */
export const WARNA_INDUK = [
  { bg: "#1B4332", redup: "#95D5B2" }, // hijau tua — warna asal
  { bg: "#7F1D1D", redup: "#FCA5A5" }, // merah bata
  { bg: "#1E3A8A", redup: "#93C5FD" }, // biru tua
  { bg: "#78350F", redup: "#FCD34D" }, // cokelat
  { bg: "#4C1D95", redup: "#C4B5FD" }, // ungu
  { bg: "#134E4A", redup: "#5EEAD4" }, // teal
  { bg: "#831843", redup: "#F9A8D4" }, // magenta
  { bg: "#365314", redup: "#BEF264" }, // hijau lumut
  { bg: "#0C4A6E", redup: "#7DD3FC" }, // biru langit tua
  { bg: "#44403C", redup: "#D6D3D1" }, // abu batu
  { bg: "#9A3412", redup: "#FDBA74" }, // oranye bakar
  { bg: "#3730A3", redup: "#A5B4FC" }, // indigo
  { bg: "#064E3B", redup: "#6EE7B7" }, // zamrud tua
  { bg: "#701A75", redup: "#F0ABFC" }, // plum
];

/**
 * Angka tetap dari sebuah nama.
 *
 * Nama dirapikan dan disamakan huruf besar-kecilnya lebih dulu: di data
 * kebun ini ada kura yang namanya tersimpan dengan spasi di belakang
 * ("B116 "), dan "B116" dengan "B116 " tidak boleh berakhir di dua warna.
 */
function angkaDariNama(nama) {
  const teks = String(nama || "").trim().toUpperCase();
  let h = 0;
  for (let i = 0; i < teks.length; i += 1) {
    h = (h * 31 + teks.charCodeAt(i)) % 1000003;
  }
  return h;
}

/**
 * Warna kepala label untuk satu betina.
 *
 * @returns {{ bg: string, redup: string }} selalu sebuah warna, tidak pernah
 *   null — label tanpa nama betina memakai warna pertama, yaitu warna asal.
 */
export function warnaInduk(namaBetina) {
  const teks = String(namaBetina || "").trim();
  if (!teks) return WARNA_INDUK[0];
  return WARNA_INDUK[angkaDariNama(teks) % WARNA_INDUK.length];
}
