/**
 * parentHealthUtils — ringkasan kesehatan induk dari HealthRecord (MURNI MEMBACA).
 *
 * Dipakai di modul Breeding: kartu, rincian, laporan, dan pemilih kura.
 * Tidak menulis/mengubah data; hanya membaca HealthRecord yang sudah ada.
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
    .map((h) => ({ date: parseISO(h.date), diagnosis: diagnosisText(h) }))
    .sort((a, b) => b.date - a.date);
  const semibuhs = recs
    .filter((h) => h.type === "sembuh")
    .map((h) => parseISO(h.date))
    .sort((a, b) => b - a);

  const lastSakit = sakits[0];
  const lastSembuh = semibuhs[0];

  // Sedang sakit pada tanggal referensi: ada catatan sakit, dan belum ada sembuh setelahnya.
  const isSickAtRef = lastSakit && (!lastSembuh || lastSakit.date > lastSembuh);
  if (isSickAtRef) {
    return { kind: "sick", diagnosis: lastSakit.diagnosis };
  }

  if (lastSakit) {
    const days = differenceInCalendarDays(ref, lastSakit.date);
    if (days >= 0 && days <= 90) {
      return { kind: "recent_sick", days, diagnosis: lastSakit.diagnosis };
    }
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