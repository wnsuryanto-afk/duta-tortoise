/**
 * jedaTugas.js — SATU angka untuk jeda minimum antar pencentangan.
 *
 * ── Kenapa berkas ini ada ────────────────────────────────────────────
 *
 * Jedanya dulu ditulis DUA KALI untuk satu aturan: sekali sebagai angka di
 * logika (`elapsedMs < 60000`) dan sekali sebagai tulisan di lencana
 * ("Jeda 60 dtk"), di berkas yang sama tetapi ratusan baris terpisah.
 *
 * Bentuk seperti itu tidak gagal dengan error. Ia gagal dengan lencana yang
 * menjanjikan satu angka sementara aplikasinya menahan angka lain — dan yang
 * membacanya adalah kiper yang sedang berdiri di depan kandang, menunggu
 * tombolnya mau ditekan.
 *
 * ── Kenapa dua angka, bukan satu ─────────────────────────────────────
 *
 * Keduanya menjawab pertanyaan yang berbeda:
 *
 *   KANDANG  16 kandang dalam satu putaran. Jeda 60 detik berarti kiper
 *            menunggu 15 menit hanya untuk menekan tombol, di luar waktu
 *            membersihkannya. Diturunkan ke 30 detik atas keputusan
 *            pemiliknya, 13 Nov 2026.
 *
 *   TUGAS    Tugas SOP harian. Ikut diturunkan ke 30 detik atas permintaan
 *            pemiliknya di hari yang sama, sesudah jeda kandang.
 *
 * Keduanya kini bernilai SAMA — dan tetap dua tetapan, bukan satu.
 *
 * Itu disengaja. Keduanya menjawab pertanyaan yang berbeda: berapa lama
 * membersihkan satu kandang, dan berapa lama mengerjakan satu tugas SOP.
 * Hari ini jawabannya kebetulan sama. Menggabungkannya jadi satu tetapan
 * berarti suatu hari seseorang menurunkan jeda kandang dan diam-diam ikut
 * menurunkan jeda tugas SOP yang tidak ditanyakan siapa pun.
 *
 * Satu nama untuk dua aturan sama berbahayanya dengan dua salinan untuk
 * satu aturan — hanya arah salahnya yang berlawanan.
 *
 * ── Kenapa jedanya baru terasa sekarang ──────────────────────────────
 *
 * Sampai 13 Nov 2026 jeda ini tidak pernah benar-benar berlaku: ia diukur
 * dari `created_date` milik server, yang dikirim tanpa penanda zona dan
 * karenanya dibaca JavaScript sebagai waktu setempat — tujuh jam lebih
 * awal. Selisihnya selalu terbaca jauh di atas satu menit. Lihat
 * waktuServer() di lib/safeDate.js.
 */

/** Jeda minimum antar kandang, dalam detik. */
export const JEDA_KANDANG_DETIK = 30;

/** Jeda minimum antar pencentangan tugas SOP, dalam detik. */
export const JEDA_TUGAS_DETIK = 30;

/**
 * Sisa jeda dalam DETIK; 0 bila sudah boleh lanjut.
 *
 * @param {number} terakhirMs  kapan pencentangan terakhir (ms epoch); 0 = belum ada
 * @param {number} sekarangMs  jam sekarang (ms epoch)
 * @param {number} jedaDetik   panjang jedanya
 */
export function sisaJedaDetik(terakhirMs, sekarangMs, jedaDetik) {
  if (!terakhirMs || terakhirMs <= 0) return 0;
  const lewatMs = sekarangMs - terakhirMs;
  // Cap waktu dari masa depan (jam HP meleset) tidak boleh menahan siapa pun
  // selamanya — itu akan mengunci kiper tanpa ada yang bisa dia perbaiki.
  if (lewatMs < 0) return 0;
  const jedaMs = jedaDetik * 1000;
  if (lewatMs >= jedaMs) return 0;
  return Math.ceil((jedaMs - lewatMs) / 1000);
}
