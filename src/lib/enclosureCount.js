import { base44 } from "@/api/base44Client";

/**
 * Hitung ulang `current_count` kandang dari data kura yang sebenarnya.
 *
 * Latar belakang: `current_count` adalah salinan dari sesuatu yang sebetulnya
 * bisa dihitung. Sebelumnya HANYA dialog "Pindah Kandang" yang menghitung ulang,
 * sedangkan pencatatan kematian dan penjualan tidak — sehingga kura yang mati
 * tetap ikut terhitung sebagai penghuni kandang sampai ada yang kebetulan pindah.
 *
 * @param {string[]|null} names Nama kandang yang ingin dihitung ulang.
 *                              Kosongkan untuk menghitung ulang semua kandang.
 * @returns {Promise<{updated: number, checked: number}>}
 */
export async function recalcEnclosureCounts(names = null) {
  const target = Array.isArray(names) ? names.filter(Boolean) : null;

  const [enclosures, tortoises] = await Promise.all([
    base44.entities.Enclosure.list(),
    base44.entities.Tortoise.list("-created_date", 1000),
  ]);

  // Kura yang mati / terjual tidak lagi menghuni kandang mana pun.
  const active = tortoises.filter((t) => t.status !== "mati" && t.status !== "terjual");

  const tally = {};
  active.forEach((t) => {
    if (!t.enclosure) return;
    tally[t.enclosure] = (tally[t.enclosure] || 0) + 1;
  });

  let updated = 0;
  let checked = 0;
  for (const enc of enclosures) {
    if (target && !target.includes(enc.name)) continue;
    checked += 1;
    const real = tally[enc.name] || 0;
    if ((enc.current_count || 0) !== real) {
      await base44.entities.Enclosure.update(enc.id, { current_count: real });
      updated += 1;
    }
  }
  return { updated, checked };
}
