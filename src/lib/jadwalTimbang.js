/**
 * jadwalTimbang.js — SATU definisi "kura ini perlu ditimbang".
 *
 * KEMBARAN: base44/functions/getRotasiUkur/entry.ts. Fungsi itulah yang
 * benar-benar memilih 2 kura/hari untuk task "Timbang & ukur kura (ROTASI
 * OTOMATIS)". Berkas ini harus menjawab sama; kalau tidak, daftar tugas dan
 * widget perhatian keeper menunjuk kura berbeda pada hari yang sama.
 *
 * ── Empat perbedaan yang disatukan di sini ──
 *
 * 1. AMBANGNYA PER KELOMPOK, bukan satu angka. Baby 14 hari, dewasa 60 hari —
 *    angka yang sudah dipakai getRotasiUkur, dan yang cocok dengan praktik
 *    peternakan: 2 kura/hari dari 120 kura dewasa = satu putaran penuh 60 hari.
 *    Versi pertama berkas ini memakai 30 hari untuk semua, yang membuat hampir
 *    seluruh kura dewasa terlihat terlambat terus-menerus.
 *
 * 2. SUMBER TANGGALNYA MeasurementHistory, bukan hanya Tortoise.last_weighed_date.
 *    Kolom last_weighed_date kosong pada 93 dari 120 kura dewasa, sementara
 *    MeasurementHistory memuat 336 catatan yang menutupi hampir semuanya.
 *    Membaca kolomnya saja membuat 93 kura terlihat "belum pernah ditimbang"
 *    padahal catatannya ada. last_weighed_date tetap dibaca sebagai cadangan
 *    bila ia lebih baru.
 *
 * 3. KURA SAKIT IKUT DITIMBANG — keputusan pemilik, 31 Agustus 2026. Daftar
 *    putih ["aktif","baby"] (dan `status === 'aktif'` di getRotasiUkur)
 *    membuang kura sakit dan karantina dari daftar timbang, padahal justru
 *    merekalah yang paling perlu ditimbang rutin: berat adalah cara paling
 *    awal mengetahui pengobatan berhasil atau tidak.
 *
 * 4. AMBANGNYA `>=`, bukan `>`. Tepat di hari intervalnya, kura itu memang
 *    sudah waktunya. Dua layar lama berselisih persis di titik ini.
 */

import { diPeternakan } from "@/lib/populasiKura";

/** Ambang per kelompok, dalam hari. Sama dengan getRotasiUkur. */
export const AMBANG_BABY_HARI = 14;
export const AMBANG_DEWASA_HARI = 60;

/** Baby dikenali dari age_category, status, atau kode berawalan BB-. */
export function adalahBaby(kura) {
  if (!kura) return false;
  if (kura.age_category === "baby" || kura.status === "baby") return true;
  return String(kura.code || kura.name || "").startsWith("BB-");
}

/** Ambang yang berlaku untuk seekor kura. */
export function ambangTimbang(kura) {
  const sendiri = Number(kura?.weighing_interval_days);
  if (Number.isFinite(sendiri) && sendiri > 0) return sendiri;
  return adalahBaby(kura) ? AMBANG_BABY_HARI : AMBANG_DEWASA_HARI;
}

/**
 * Tanggal ukur terakhir per kura, dari MeasurementHistory.
 * Catatan bertanggal hari ini tidak dihitung — sama seperti getRotasiUkur,
 * supaya kura yang baru saja diukur tidak langsung muncul lagi.
 */
export function tanggalUkurTerakhir(measurements = [], sampai) {
  const peta = {};
  for (const m of measurements || []) {
    if (!m?.tortoise_id || !m?.date) continue;
    if (sampai && m.date >= sampai) continue;
    if (!peta[m.tortoise_id] || m.date > peta[m.tortoise_id]) {
      peta[m.tortoise_id] = m.date;
    }
  }
  return peta;
}

function iso(d) {
  const t = d instanceof Date ? d : new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

function selisihHari(dari, sampai) {
  if (!dari || !sampai) return null;
  const a = new Date(dari + "T00:00:00");
  const b = new Date(sampai + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.floor((b - a) / 86400000);
}

/**
 * Berapa hari sejak terakhir diukur. `null` bila memang belum ada catatannya
 * sama sekali — bukan sekadar kolom last_weighed_date yang kosong.
 */
export function hariSejakUkur(kura, petaUkur = {}, sekarang = new Date()) {
  const hariIni = iso(sekarang);
  const dariRiwayat = petaUkur[kura?.id] || null;
  const dariKolom =
    kura?.last_weighed_date && kura.last_weighed_date < hariIni ? kura.last_weighed_date : null;
  const terakhir = [dariRiwayat, dariKolom].filter(Boolean).sort().pop() || null;
  if (!terakhir) return null;
  return selisihHari(terakhir, hariIni);
}

/** Perlu ditimbang? */
export function perluDitimbang(kura, petaUkur = {}, sekarang = new Date()) {
  if (!diPeternakan(kura)) return false;
  const hari = hariSejakUkur(kura, petaUkur, sekarang);
  if (hari === null) return true; // belum ada catatan ukur sama sekali
  return hari >= ambangTimbang(kura);
}

/** Seberapa terlambat — untuk mengurutkan yang paling mendesak lebih dulu. */
export function keterlambatan(kura, petaUkur = {}, sekarang = new Date()) {
  const hari = hariSejakUkur(kura, petaUkur, sekarang);
  if (hari === null) return Number.MAX_SAFE_INTEGER;
  return hari - ambangTimbang(kura);
}

/**
 * Daftar kura yang perlu ditimbang, paling terlambat lebih dulu.
 *
 * @param {object} opsi
 * @param {Array}   opsi.measurements  Catatan MeasurementHistory.
 * @param {boolean} opsi.tanpaBaby     Buang baby — dipakai daftar tugas harian,
 *   karena baby sudah punya satu task gabungan sendiri ("Timbang, ukur & foto
 *   SEMUA baby"), jadi memunculkannya satu per satu menghitung tugas yang sama
 *   dua kali.
 */
export function kuraPerluDitimbang(
  tortoises = [],
  { measurements = [], sekarang = new Date(), tanpaBaby = false } = {},
) {
  const peta = tanggalUkurTerakhir(measurements, iso(sekarang));
  return (tortoises || [])
    .filter((t) => {
      if (tanpaBaby && adalahBaby(t)) return false;
      return perluDitimbang(t, peta, sekarang);
    })
    .sort((a, b) => keterlambatan(b, peta, sekarang) - keterlambatan(a, peta, sekarang));
}

/** Kalimat pendek untuk ditampilkan di daftar. */
export function alasanTimbang(kura, petaUkur = {}, sekarang = new Date()) {
  const hari = hariSejakUkur(kura, petaUkur, sekarang);
  if (hari === null) return "belum ada catatan ukur";
  return `terakhir diukur ${hari} hari lalu (ambang ${ambangTimbang(kura)}h)`;
}
