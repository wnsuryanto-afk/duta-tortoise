/**
 * SKU utilities: generate & validate SKU codes
 * Prefix mapping:
 *   FeedStock:     sayuran/buah/rumput/hay/lainnya = PKN, suplemen/pelet = PKN
 *   WarehouseItem: obat = OBT, vitamin/suplemen = VIT, alat_kerja/peralatan = ALT, pakan = PKN, lainnya = LNN
 */

export const CATEGORY_PREFIX = {
  // FeedStock
  sayuran: "PKN",
  buah: "PKN",
  rumput: "PKN",
  pelet: "PKN",
  hay: "PKN",
  // WarehouseItem
  obat: "OBT",
  vitamin: "VIT",
  suplemen: "VIT",
  alat_kerja: "ALT",
  peralatan: "ALT",
  pakan: "PKN",
  lainnya: "LNN",
};

export function getPrefix(category) {
  return CATEGORY_PREFIX[category] || "LNN";
}

/**
 * Generate next SKU given prefix and existing SKUs
 * e.g. existing ["PKN-0001", "PKN-0003"] → "PKN-0004"
 */
export function generateSKU(prefix, existingSkus = []) {
  const relevant = existingSkus
    .filter((s) => s && s.startsWith(prefix + "-"))
    .map((s) => {
      const num = parseInt(s.split("-")[1], 10);
      return isNaN(num) ? 0 : num;
    });
  const maxNum = relevant.length > 0 ? Math.max(...relevant) : 0;
  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

export function formatRp(val) {
  if (!val && val !== 0) return "—";
  return "Rp " + Number(val).toLocaleString("id-ID");
}