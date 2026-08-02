/**
 * taskLock — kunci kanonik untuk tugas per-kandang (kebersihan, pakan).
 *
 * Dua modul perekam (layar ubin GuidedHariIni & daftar SOP TugasHariIni) harus
 * menghasilkan item_id & check_key yang PERSIS SAMA untuk kandang + tanggal
 * yang sama, agar penguncian lintas modul bekerja dan poin tidak dibayar ganda.
 *
 * Format kanonik (baru):
 *   item_id:   "{category}_kandang_{KODE_KANDANG}"   contoh "kebersihan_kandang_E4"
 *   check_key: "{email}__harian__{item_id}__{YYYY-MM-DD}"
 *
 * Data lama (dua format berbeda) tetap bisa dibaca lewat matchKandangLog.
 */

export const KANDANG_CATEGORIES = ["kebersihan", "pakan"];

export function canonicalKandangItemId(category, enclosureCode) {
  return `${category}_kandang_${enclosureCode}`;
}

export function canonicalKandangCheckKey(email, category, enclosureCode, date) {
  return `${email}__harian__${canonicalKandangItemId(category, enclosureCode)}__${date}`;
}

/**
 * Cocokkan sebuah MaintenanceLog dengan tugas per-kandang tertentu, mendukung
 * DUA format lama sekaligus:
 *   - lama GuidedHariIni: item_id="kebersihan", enclosure_id="E4"
 *   - baru / lama TugasHariIni: item_id="kebersihan_kandang_E4"
 */
export function matchKandangLog(log, category, enclosureCode) {
  if (!log || !log.is_done) return false;
  const enc = String(enclosureCode || "");
  if (!enc) return false;
  if (log.item_id === canonicalKandangItemId(category, enc)) return true;
  if (log.item_id === category && String(log.enclosure_id || "") === enc) return true;
  return false;
}