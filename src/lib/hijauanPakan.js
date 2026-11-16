import { subDays, format } from "date-fns";
import { KELAS_HIJAUAN } from "@/lib/kelasPakan";

/**
 * hijauanPakan.js — berapa persen pakan 30 hari terakhir berupa hijauan.
 *
 * Hijauan = golongan hijauan_utama + kaktus + daun_herba (lib/kelasPakan.js).
 *
 * ── Dua hal yang sengaja TIDAK dilakukan di sini ────────────────────────────
 *
 * 1. Keranjang tidak dihitung sebagai kilogram. Porsi dinilai dari BERAT, dan
 *    satu keranjang bukan satu kilogram — mencampurnya menghasilkan persen
 *    yang tidak berarti apa pun.
 *
 * 2. Catatan lama yang belum punya jenis pakan dicocokkan lewat `feed_source`,
 *    bukan dibuang. Sebelum 16 Nov 2026 kolom jenis pakan kosong di 41 dari 46
 *    catatan; tanpa jalan ini, sebulan terakhir akan tampak 0% hijauan padahal
 *    yang tercatat memang rumput.
 */

export const JENDELA_HARI = 30;

export function hitungHijauan(logs = [], feedstocks = [], hariIni = new Date()) {
  const mulai = format(subDays(hariIni, JENDELA_HARI - 1), "yyyy-MM-dd");
  const batas = format(hariIni, "yyyy-MM-dd");

  const kelasPerNama = new Map();
  for (const f of feedstocks || []) {
    const nama = String(f?.name || "").trim().toLowerCase();
    if (nama) kelasPerNama.set(nama, f.kelas_pakan || "");
  }

  let totalKg = 0;
  let hijauanKg = 0;
  const hari = new Set();

  for (const l of logs || []) {
    const tgl = l?.log_date || "";
    if (!tgl || tgl < mulai || tgl > batas) continue;
    if (l.is_test_data === true || l.excluded_from_reports === true) continue;
    const berat = Number(l.weight_kg) || 0;
    if (!(berat > 0)) continue;

    hari.add(tgl);
    totalKg += berat;

    const nama = String(l.feed_type_detail || "").trim().toLowerCase();
    const kelas = nama ? kelasPerNama.get(nama) : "";
    const hijau = kelas ? KELAS_HIJAUAN.includes(kelas) : l.feed_source === "rumput";
    if (hijau) hijauanKg += berat;
  }

  return {
    mulai,
    batas,
    totalKg,
    hijauanKg,
    persen: totalKg > 0 ? (hijauanKg / totalKg) * 100 : null,
    hariTercatat: hari.size,
    hariTanpa: JENDELA_HARI - hari.size,
    jendela: JENDELA_HARI,
  };
}