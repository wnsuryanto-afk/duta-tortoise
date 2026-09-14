/**
 * beratMasukAkal.js — menangkap berat yang satuannya tertukar, saat diketik.
 *
 * Satu kolom, tiga satuan. `weight_grams` diisi gram untuk bayi, tapi untuk
 * kura dewasa sering diisi KILOGRAM ("24" untuk 24 kg) dan kadang ONS ("186"
 * untuk 18,6 kg). Tidak ada yang salah di layar mana pun — angkanya masuk,
 * tersimpan, dan terbaca sebagai gram.
 *
 * Akibatnya ada di data: 53 catatan pengukuran antara Mei dan September 2026
 * memuat berat yang mustahil untuk panjang tempurungnya. B31 tercatat 24 gram
 * dengan tempurung 54 cm; kura sebesar itu beratnya sekitar 24 kilogram, seribu
 * kali lipatnya.
 *
 * Panjang tempurung adalah pembanding yang jujur: ia diisi di kolom yang sama,
 * oleh orang yang sama, pada saat yang sama. Sulcata 50 cm tidak mungkin 24
 * gram, dan sulcata 6 cm tidak mungkin 24 kilogram.
 *
 * Fungsi ini TIDAK memperbaiki angkanya sendiri. Menebak satuan berarti
 * menebak bobot aset, dan tebakan yang salah lebih buruk daripada kolom yang
 * dipertanyakan. Ia hanya bertanya sebelum disimpan.
 */

/**
 * Perkiraan kasar berat sulcata dari panjang tempurung (gram).
 * Bukan rumus ilmiah — hanya cukup untuk membedakan gram, ons, dan kilogram,
 * yang jaraknya 100x dan 1000x. Toleransinya sangat longgar di bawah.
 */
function perkiraanGram(panjangCm) {
  const L = Number(panjangCm) || 0;
  if (L <= 0) return 0;
  // Sulcata mendekati kubik terhadap panjang. Dikalibrasi kasar dari data
  // peternakan ini: 6 cm ≈ 60 g, 51 cm ≈ 21 kg, 64 cm ≈ 38 kg.
  return 0.14 * Math.pow(L, 3);
}

/**
 * @returns {{pesan: string, saran: number|null}|null}
 *   null bila wajar. `saran` = angka yang mungkin dimaksud, untuk ditawarkan —
 *   bukan untuk dipakai diam-diam.
 */
export function beratMencurigakan(beratGram, panjangCm) {
  const berat = Number(beratGram) || 0;
  const perkiraan = perkiraanGram(panjangCm);
  if (berat <= 0 || perkiraan <= 0) return null;

  const rasio = perkiraan / berat;

  // Longgar: hanya ditandai bila selisihnya sekelas satuan, bukan sekadar
  // kura yang kurus atau gemuk. Rentang 8x-25x dan 250x-4000x dipilih supaya
  // variasi bentuk badan (yang paling jauh pun di bawah 4x) tidak pernah kena.
  if (rasio >= 250 && rasio <= 4000) {
    return {
      pesan: `Berat ${berat} g terlalu ringan untuk tempurung ${panjangCm} cm. Apakah yang dimaksud ${berat} kilogram?`,
      saran: Math.round(berat * 1000),
    };
  }
  if (rasio >= 8 && rasio <= 25) {
    return {
      pesan: `Berat ${berat} g terlalu ringan untuk tempurung ${panjangCm} cm. Apakah ini ons (1 ons = 100 g)?`,
      saran: Math.round(berat * 100),
    };
  }
  if (rasio <= 1 / 250) {
    return {
      pesan: `Berat ${berat} g terlalu berat untuk tempurung ${panjangCm} cm. Periksa lagi angkanya.`,
      saran: null,
    };
  }
  return null;
}

/** Panjang tempurung yang mustahil untuk sulcata (maks ±85 cm). */
export function panjangMencurigakan(panjangCm) {
  const L = Number(panjangCm) || 0;
  if (L <= 0) return null;
  if (L > 85) return `Panjang ${L} cm melebihi ukuran sulcata terbesar. Salah ketik koma?`;
  return null;
}
