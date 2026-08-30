/**
 * SATU DEFINISI: daftar kandang yang menjadi kewajiban harian.
 *
 * Layar kiper (GuidedHariIni) memakai daftar tetap ini sebagai ubin kandang.
 * Entity `Enclosure` berisi lebih banyak baris (Bonsai 1-4, Baby 1-3) yang
 * bukan kandang kebersihan harian - memakai jumlah baris Enclosure sebagai
 * penyebut membuat angka kepatuhan terlihat rendah padahal kiper sudah
 * menyelesaikan semua kandang yang memang ditugaskan.
 */
export const KANDANG_LIST = [
  "W1", "W2", "W3", "W4", "W5",
  "E1", "E2", "E3", "E4", "E5",
  "N1", "N2", "N3", "L1", "L2",
];

/**
 * Kandang yang wajib dibersihkan: kandang pada KANDANG_LIST yang masih aktif
 * DAN berisi kura. Kandang kosong tidak dituntut - menghitungnya sebagai
 * kewajiban membuat kepatuhan tidak pernah bisa mencapai 100%.
 *
 * @param {Array} enclosures daftar Enclosure (boleh kosong)
 * @returns {string[]} kode kandang
 */
export function kandangWajib(enclosures = []) {
  if (!Array.isArray(enclosures) || enclosures.length === 0) return [...KANDANG_LIST];
  const peta = new Map();
  for (const e of enclosures) {
    const kode = String(e?.code || e?.name || "").trim();
    if (kode) peta.set(kode, e);
  }
  const hasil = KANDANG_LIST.filter((kode) => {
    const e = peta.get(kode);
    if (!e) return true; // tidak dikenal di Enclosure -> tetap wajib
    if (e.is_active === false) return false;
    return Number(e.current_count || 0) > 0;
  });
  return hasil.length > 0 ? hasil : [...KANDANG_LIST];
}
