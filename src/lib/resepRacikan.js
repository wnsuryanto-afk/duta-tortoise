/**
 * resepRacikan.js — memeriksa sebuah resep racikan terhadap dirinya sendiri.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────
 *
 * Duta Repro v5 memakai Vitamin D3 sebanyak 2,5 gram dalam batch 21.000
 * gram — 0,0119% dari adonan. Angka itu menentukan 179 IU per ekor per
 * hari, dan resepnya sendiri menuliskan batasnya: "jangan menaikkan D3
 * bila kura dijemur penuh".
 *
 * Satu salah ketik — 25 gram alih-alih 2,5 — melipatgandakan dosisnya
 * SEPULUH KALI, dan tidak ada satu pun yang terlihat. Daftar bahannya
 * tetap berisi lima baris. Jumlah adonannya bergeser 22,5 gram dari
 * 21 kg, yaitu 0,1% — di bawah ambang kewajaran mana pun, jadi
 * pemeriksaan "jumlahnya cocok atau tidak" TIDAK akan menangkapnya.
 * Justru karena bahannya mikro, selisihnya kecil.
 *
 * Maka dipakai dua pemeriksaan, dan yang kedua yang menangkap kasus itu:
 *
 *   1. JUMLAH vs HASIL. Menangkap salah ketik pada bahan BESAR —
 *      pembawa, kalsium, moringa. Di situ selisihnya memang besar.
 *
 *   2. JUMLAH PER DOSIS. Tiap bahan dihitung menjadi berapa yang
 *      benar-benar masuk ke satu ekor sehari. Angka itulah yang bisa
 *      dibandingkan dengan rentang rujukan oleh orang yang membacanya —
 *      1,79 mg D3 masuk akal, 17,9 mg tidak. Salah ketik yang tak
 *      terlihat pada daftar bahan menjadi terlihat pada angka dosis.
 *
 * Yang ditandai "mikro" (di bawah 0,1% adonan) adalah yang wajib
 * pengenceran bertingkat. Menuang 2,5 gram langsung ke 21 kg tidak akan
 * pernah tercampur rata: sebagian kura dapat dosis berlipat, sebagian
 * tidak dapat sama sekali.
 */

/** Di bawah persentase ini sebuah bahan wajib diencerkan bertingkat. */
export const AMBANG_MIKRO_PERSEN = 0.1;

/** Selisih jumlah bahan terhadap hasil yang masih dianggap pembulatan. */
export const TOLERANSI_JUMLAH_PERSEN = 1;

/**
 * Periksa satu resep terhadap dirinya sendiri.
 *
 * `quantity_kg` SELALU dalam kilogram, apa pun isi kolom `unit` —
 * kolom itu hanya label tampilan. Resep Female Plus menulis unit
 * "gram" dengan quantity_kg 0,2 dan catatannya menyebut 200 gram.
 *
 * @param {object} resep PelletRecipe
 * @param {number} dosisGram takaran satu ekor sehari, gram
 * @returns {{jumlahKg, hasilKg, selisihPersen, seimbang, bahan: Array}|null}
 */
export function periksaResep(resep, dosisGram = 0) {
  if (!resep) return null;
  const bahan = Array.isArray(resep.ingredients) ? resep.ingredients : [];
  if (bahan.length === 0) return null;

  const hasilKg = Number(resep.yield_kg) || 0;
  const jumlahKg = bahan.reduce((t, b) => t + (Number(b?.quantity_kg) || 0), 0);
  if (jumlahKg <= 0) return null;

  const selisihPersen = hasilKg > 0
    ? Math.abs(jumlahKg - hasilKg) / hasilKg * 100
    : 0;

  const rinci = bahan.map((b) => {
    const kg = Number(b?.quantity_kg) || 0;
    const persen = (kg / jumlahKg) * 100;
    // Berapa gram bahan ini yang benar-benar masuk ke satu ekor sehari.
    const perDosisGram = dosisGram > 0 ? (kg / jumlahKg) * dosisGram : null;
    return {
      nama: b?.item_name || "(tanpa nama)",
      kg,
      persen,
      perDosisGram,
      mikro: persen > 0 && persen < AMBANG_MIKRO_PERSEN,
    };
  });

  return {
    jumlahKg,
    hasilKg,
    selisihPersen,
    seimbang: hasilKg <= 0 || selisihPersen <= TOLERANSI_JUMLAH_PERSEN,
    bahan: rinci,
  };
}
