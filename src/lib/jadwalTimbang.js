/**
 * jadwalTimbang.js — SATU definisi "kura ini perlu ditimbang".
 *
 * Sebelum berkas ini ada, dua layar memutuskannya sendiri-sendiri dan tidak
 * pernah sepakat:
 *
 *   TugasHariIni         ["aktif","baby"] · selisih >= interval · baby dibuang
 *   KeeperAttentionWidget ["aktif","baby"] · selisih >  interval · baby ikut
 *
 * Tiga perbedaan sekaligus. Yang paling halus adalah `>` versus `>=`: tepat di
 * hari intervalnya, daftar tugas menyuruh menimbang sementara widget perhatian
 * keeper menyatakan aman.
 *
 * ── Tiga keputusan yang tertanam di sini ──
 *
 * 1. KURA SAKIT IKUT DITIMBANG. Keputusan pemilik, 31 Agustus 2026. Daftar
 *    putih ["aktif","baby"] membuang kura sakit dan karantina dari daftar
 *    timbang — padahal justru merekalah yang paling perlu ditimbang rutin,
 *    karena berat adalah cara paling awal mengetahui pengobatan berhasil atau
 *    tidak. Sekarang memakai diPeternakan().
 *
 * 2. INTERVAL PUNYA NILAI BAWAAN. Kedua layar lama mensyaratkan
 *    `weighing_interval_days` terisi sebelum kura ikut dipertimbangkan. Per 31
 *    Agustus 2026, kolom itu hanya terisi pada 17 baby — SELURUH 120 kura
 *    dewasa kosong. Artinya pengingat timbang untuk kura dewasa tidak pernah
 *    bisa muncul sekali pun, dan tidak ada pesan apa pun yang memberitahu.
 *    Sekarang kura tanpa interval memakai INTERVAL_BAWAAN_HARI.
 *
 * 3. BELUM PERNAH DITIMBANG BERARTI JATUH TEMPO. Kedua layar lama juga
 *    mensyaratkan `last_weighed_date` terisi, sehingga kura yang belum pernah
 *    ditimbang sama sekali justru yang paling aman dari daftar. Itu terbalik.
 */

import { diPeternakan } from "@/lib/populasiKura";

/** Interval timbang bila kura belum punya angkanya sendiri. */
export const INTERVAL_BAWAAN_HARI = 30;

/** Interval yang dipakai untuk seekor kura. */
export function intervalTimbang(kura) {
  const n = Number(kura?.weighing_interval_days);
  return Number.isFinite(n) && n > 0 ? n : INTERVAL_BAWAAN_HARI;
}

function keTanggal(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Sudah berapa hari sejak terakhir ditimbang.
 * @returns {number|null} null bila belum pernah ditimbang sama sekali.
 */
export function hariSejakTimbang(kura, sekarang = new Date()) {
  const t = keTanggal(kura?.last_weighed_date);
  if (!t) return null;
  return Math.floor((keTanggal(sekarang) - t) / 86400000);
}

/**
 * Perlu ditimbang? Memakai `>=`, bukan `>` — pada hari ke-interval, kura itu
 * memang sudah waktunya.
 */
export function perluDitimbang(kura, sekarang = new Date()) {
  if (!diPeternakan(kura)) return false;
  const hari = hariSejakTimbang(kura, sekarang);
  if (hari === null) return true; // belum pernah ditimbang
  return hari >= intervalTimbang(kura);
}

/** Seberapa terlambat, untuk mengurutkan yang paling mendesak lebih dulu. */
export function keterlambatanTimbang(kura, sekarang = new Date()) {
  const hari = hariSejakTimbang(kura, sekarang);
  if (hari === null) return Number.MAX_SAFE_INTEGER; // belum pernah = paling atas
  return hari - intervalTimbang(kura);
}

/**
 * Daftar kura yang perlu ditimbang, paling terlambat lebih dulu.
 *
 * @param {object} opsi
 * @param {boolean} opsi.tanpaBaby  Buang baby dari hasil. Daftar tugas harian
 *   memakainya karena baby sudah punya satu tugas gabungan sendiri
 *   ("Timbang, ukur & foto SEMUA baby"), jadi memunculkannya satu per satu
 *   membuat tugas yang sama dihitung dua kali.
 */
export function kuraPerluDitimbang(tortoises = [], { sekarang = new Date(), tanpaBaby = false } = {}) {
  return (tortoises || [])
    .filter((t) => {
      if (tanpaBaby && (t?.age_category === "baby" || t?.status === "baby")) return false;
      return perluDitimbang(t, sekarang);
    })
    .sort((a, b) => keterlambatanTimbang(b, sekarang) - keterlambatanTimbang(a, sekarang));
}

/** Kalimat pendek untuk ditampilkan di daftar. */
export function alasanTimbang(kura, sekarang = new Date()) {
  const hari = hariSejakTimbang(kura, sekarang);
  if (hari === null) return "belum pernah ditimbang";
  return `belum timbang ${hari} hari (interval ${intervalTimbang(kura)}h)`;
}
