/**
 * Helper functions untuk kalkulasi breeding dan inkubator
 * Menggunakan SATU SUMBER KEBENARAN: data Breeding
 */

/**
 * Hitung jumlah telur di inkubator berdasarkan breeding aktif
 * @param {string} incubatorName - Nama inkubator
 * @param {Array} breedings - Array breeding records
 * @returns {number} Total telur
 */
export const calculateIncubatorEggs = (incubatorName, breedings = []) => {
  return breedings
    .filter(b => b.incubator_name === incubatorName && (b.status === "bertelur" || b.status === "inkubasi"))
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
export const getClutchesInIncubator = (incubatorName, breedings = []) => {
  return breedings.filter(b => 
    b.incubator_name === incubatorName && 
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
export const isIncubatorFull = (incubatorName, capacity, breedings = []) => {
  if (!capacity || capacity <= 0) return false;
  const eggs = calculateIncubatorEggs(incubatorName, breedings);
  return eggs >= capacity;
};

/**
 * Cek apakah inkubator hampir penuh (>80%)
 * @param {string} incubatorName - Nama inkubator
 * @param {number} capacity - Kapasitas inkubator
 * @param {Array} breedings - Array breeding records
 * @returns {boolean} True jika hampir penuh
 */
export const isIncubatorNearFull = (incubatorName, capacity, breedings = []) => {
  if (!capacity || capacity <= 0) return false;
  const eggs = calculateIncubatorEggs(incubatorName, breedings);
  const pct = (eggs / capacity) * 100;
  return pct >= 80 && pct < 100;
};