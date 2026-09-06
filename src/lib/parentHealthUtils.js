/**
 * parentHealthUtils — ringkasan kesehatan induk dari HealthRecord (MURNI MEMBACA).
 *
 * Dipakai di modul Breeding: kartu, rincian, laporan, dan pemilih kura.
 * Tidak menulis/mengubah data; hanya membaca HealthRecord yang sudah ada.
 *
 * ── KESALAHAN YANG DIPERBAIKI DI SINI ────────────────────────────────
 *
 * Berkas ini dulu menganggap sebuah kasus sakit baru tertutup kalau ada
 * catatan TERPISAH berjenis "sembuh" bertanggal lebih baru.
 *
 * Di kebun ini catatan seperti itu TIDAK PERNAH ADA satu pun. Alur
 * "tandai sembuh" menutup kasus dengan menyetel is_resolved + resolved_date
 * pada catatan sakitnya sendiri — aturan yang sudah ditulis sebagai satu
 * definisi di src/lib/kesehatanKura.js.
 *
 * Akibatnya: SEMUA 11 kura yang pernah sakit tampil "Sedang dalam
 * perawatan" selamanya di kartu pembiakan, termasuk A47 yang kasusnya
 * ditutup 29 Agustus 2026 sementara telurnya dicatat 6 September 2026.
 * Lencana merah pada induk yang sehat bukan sekadar jelek dipandang —
 * itu mencemari laporan daya tetas "induk sehat vs induk baru pulih".
 *
 * Sekarang berkas ini memakai aturan penutupan yang sama dengan
 * kesehatanKura.js, ditambah dimensi waktu yang memang dibutuhkan modul
 * pembiakan: pertanyaannya bukan "apakah sakit sekarang" melainkan
 * "apakah sakit PADA saat telur dicatat".
 */
import { differenceInCalendarDays, parseISO } from "date-fns";

function toDate(refDate) {
  if (!refDate) return new Date();
  if (refDate instanceof Date) return refDate;
  try { return parseISO(refDate); } catch { return new Date(); }
}

function diagnosisText(h) {
  if (h.diagnosis_notes) return h.diagnosis_notes;
  if (Array.isArray(h.diagnosis) && h.diagnosis.length > 0) return h.diagnosis.join(", ");
  return "—";
}

/**
 * Ringkasan kesehatan satu induk relatif terhadap tanggal referensi
 * (biasanya egg_laying_date; kalau kosong → hari ini).
 *
 * Mengembalikan:
 *   { kind: "sick", diagnosis }            — sedang dalam perawatan saat ref
 *   { kind: "recent_sick", days, diagnosis } — pernah sakit dalam 90 hari sebelum ref
 *   null                                     — tidak ada riwayat relevan
 */
export function parentHealthSummary(tortoiseId, healthRecords, refDate) {
  if (!tortoiseId || !Array.isArray(healthRecords) || healthRecords.length === 0) return null;
  const ref = toDate(refDate);
  const recs = healthRecords.filter(
    (h) => h && h.tortoise_id === tortoiseId && h.date && parseISO(h.date) <= ref
  );
  if (recs.length === 0) return null;

  const sakits = recs
    .filter((h) => h.type === "sakit")
    .map((h) => ({ rec: h, date: parseISO(h.date), diagnosis: diagnosisText(h) }))
    .sort((a, b) => b.date - a.date);
  if (sakits.length === 0) return null;

  // Catatan "sembuh" terpisah tetap dihormati kalau ada — tandaiSembuh()
  // membuatnya sebagai riwayat — tapi bukan lagi satu-satunya cara menutup.
  const sembuhTerakhir = recs
    .filter((h) => h.type === "sembuh")
    .map((h) => parseISO(h.date))
    .sort((a, b) => b - a)[0];

  const masihTerbukaPada = (s) => {
    // Ditutup lewat penanda pada catatannya sendiri (jalur yang sebenarnya dipakai).
    if (s.rec.is_resolved === true) {
      // Tanpa resolved_date kita tidak tahu kapan ditutup. Menganggapnya masih
      // sakit persis mengulang bug yang berkas ini perbaiki, jadi dianggap tutup.
      if (!s.rec.resolved_date) return false;
      return parseISO(s.rec.resolved_date) > ref;
    }
    // Belum ditandai selesai: masih bisa ditutup catatan "sembuh" yang lebih baru.
    if (sembuhTerakhir && sembuhTerakhir >= s.date) return false;
    return true;
  };

  const terbuka = sakits.find(masihTerbukaPada);
  if (terbuka) {
    return { kind: "sick", diagnosis: terbuka.diagnosis };
  }

  const lastSakit = sakits[0];
  const days = differenceInCalendarDays(ref, lastSakit.date);
  if (days >= 0 && days <= 90) {
    return { kind: "recent_sick", days, diagnosis: lastSakit.diagnosis };
  }
  return null;
}

/**
 * Berapa hari yang lalu kura terakhir dinyatakan sembuh (untuk pemilih kura di form pembiakan).
 * Mengembalikan jumlah hari bila sembuh dalam 30 hari terakhir, selain itu null.
 */
export function recoveryDaysAgo(tortoiseId, healthRecords, refDate) {
  if (!tortoiseId || !Array.isArray(healthRecords) || healthRecords.length === 0) return null;
  const ref = toDate(refDate);
  const semibuhs = healthRecords
    .filter((h) => h && h.tortoise_id === tortoiseId && h.type === "sembuh" && h.date)
    .map((h) => parseISO(h.date))
    .sort((a, b) => b - a);
  if (semibuhs.length === 0) return null;
  const days = differenceInCalendarDays(ref, semibuhs[0]);
  return days >= 0 && days <= 30 ? days : null;
}

/**
 * Apakah salah satu induk punya riwayat sakit dalam 90 hari sebelum tanggal bertelur?
 * Untuk laporan breeding (membandingkan daya tetas induk sehat vs baru pulih).
 */
export function parentHasSickHistory(maleId, femaleId, healthRecords, refDate) {
  const m = maleId ? parentHealthSummary(maleId, healthRecords, refDate) : null;
  const f = femaleId ? parentHealthSummary(femaleId, healthRecords, refDate) : null;
  if (!m && !f) return { affected: false };
  const which = [];
  if (m) which.push({ parent: "jantan", ...m });
  if (f) which.push({ parent: "betina", ...f });
  return { affected: true, details: which };
}