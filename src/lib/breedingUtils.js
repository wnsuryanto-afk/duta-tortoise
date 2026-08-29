/**
 * Helper functions untuk kalkulasi breeding dan inkubator
 * Menggunakan SATU SUMBER KEBENARAN: data Breeding
 */

/**
 * Apakah clutch ini ada di inkubator tersebut?
 *
 * Dicocokkan lewat `incubator_id` bila clutch-nya punya — tautan yang tidak
 * ikut berubah saat inkubatornya diganti nama. Nama dipakai sebagai cadangan,
 * dan HANYA untuk clutch yang memang belum punya id, supaya clutch milik
 * inkubator lain tidak ikut terhitung.
 *
 * Sebelum ada `incubator_id`, satu-satunya penghubungnya adalah nama. Mengganti
 * nama sebuah inkubator karena itu melepaskan seluruh clutch di dalamnya tanpa
 * suara: isinya terlihat kosong, dan peringatan kapasitasnya berhenti bekerja.
 */
export const milikInkubator = (breeding, incubatorName, incubatorId) => {
  if (!breeding) return false;
  if (incubatorId && breeding.incubator_id) return breeding.incubator_id === incubatorId;
  if (breeding.incubator_id) return false;
  return !!incubatorName && breeding.incubator_name === incubatorName;
};

/**
 * Hitung jumlah telur di inkubator berdasarkan breeding aktif
 * @param {string} incubatorName - Nama inkubator
 * @param {Array} breedings - Array breeding records
 * @param {string} [incubatorId] - Id inkubator (lebih diutamakan dari nama)
 * @returns {number} Total telur
 */
export const calculateIncubatorEggs = (incubatorName, breedings = [], incubatorId) => {
  return breedings
    .filter(b => milikInkubator(b, incubatorName, incubatorId) && (b.status === "bertelur" || b.status === "inkubasi"))
    .reduce((sum, b) => sum + (b.egg_count || 0), 0);
};

/**
 * Hitung total telur inkubasi aktif di semua inkubator
 * @param {Array} breedings - Array breeding records
 * @returns {number} Total telur
 */
export const calculateTotalIncubatorEggs = (breedings = []) => {
  return breedings
    .filter(b => b.status === "bertelur" || b.status === "inkubasi")
    .reduce((sum, b) => sum + (b.egg_count || 0), 0);
};

/**
 * Dapatkan clutch (breeding) yang aktif di inkubator tertentu
 * @param {string} incubatorName - Nama inkubator
 * @param {Array} breedings - Array breeding records
 * @returns {Array} Clutch aktif
 */
export const getClutchesInIncubator = (incubatorName, breedings = [], incubatorId) => {
  return breedings.filter(b =>
    milikInkubator(b, incubatorName, incubatorId) &&
    (b.status === "bertelur" || b.status === "inkubasi")
  );
};

/**
 * Cek apakah inkubator penuh
 * @param {string} incubatorName - Nama inkubator
 * @param {number} capacity - Kapasitas inkubator
 * @param {Array} breedings - Array breeding records
 * @returns {boolean} True jika penuh
 */
export const isIncubatorFull = (incubatorName, capacity, breedings = [], incubatorId) => {
  if (!capacity || capacity <= 0) return false;
  const eggs = calculateIncubatorEggs(incubatorName, breedings, incubatorId);
  return eggs >= capacity;
};

/**
 * Cek apakah inkubator hampir penuh (>80%)
 * @param {string} incubatorName - Nama inkubator
 * @param {number} capacity - Kapasitas inkubator
 * @param {Array} breedings - Array breeding records
 * @returns {boolean} True jika hampir penuh
 */
export const isIncubatorNearFull = (incubatorName, capacity, breedings = [], incubatorId) => {
  if (!capacity || capacity <= 0) return false;
  const eggs = calculateIncubatorEggs(incubatorName, breedings, incubatorId);
  const pct = (eggs / capacity) * 100;
  return pct >= 80 && pct < 100;
};