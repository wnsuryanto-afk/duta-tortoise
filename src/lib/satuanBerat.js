/**
 * satuanBerat.js — satu definisi untuk "berapa berat kura ini".
 *
 * Basis data menyimpan berat dalam GRAM di kolom `weight_grams`. Itu benar dan
 * tidak diubah. Yang salah selama ini adalah cara bertanya: tujuh form berbeda
 * masing-masing menampilkan satu kotak angka berlabel "Berat (gram)", lalu
 * menyerahkan perkalian ke kepala orang yang sedang berdiri di kandang dengan
 * timbangan yang menunjukkan "22,8".
 *
 * Timbangan gantung menampilkan kilogram. Timbangan dapur menampilkan gram.
 * Yang mencatat adalah orang yang sama, di hari yang sama. Maka satuannya harus
 * ikut ditanyakan, bukan diasumsikan — dan hasil simpannya harus terlihat
 * sebelum tombol ditekan.
 *
 * 48 catatan antara Juli dan September 2026 hilang tiga angka nol karena hal ini.
 */

export const SATUAN_BERAT = [
  { kode: "g", label: "gram", faktor: 1 },
  { kode: "kg", label: "kg", faktor: 1000 },
];

/** Ubah angka + kode satuan menjadi gram. Mengembalikan null bila kosong/tak masuk akal. */
export function keGram(nilai, kode) {
  const n = Number(String(nilai ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const s = SATUAN_BERAT.find((x) => x.kode === kode) || SATUAN_BERAT[0];
  // Dibulatkan supaya 22,8 kg tidak tersimpan sebagai 22799,999999999996.
  return Math.round(n * s.faktor);
}

/** Kebalikannya: gram → angka untuk ditampilkan di kotak isian pada satuan tertentu. */
export function dariGram(gram, kode) {
  const g = Number(gram);
  if (!Number.isFinite(g) || g <= 0) return "";
  const s = SATUAN_BERAT.find((x) => x.kode === kode) || SATUAN_BERAT[0];
  const n = g / s.faktor;
  return String(Number(n.toFixed(3)));
}

/**
 * Satuan yang paling mungkin dimaksud untuk berat yang SUDAH tersimpan.
 * Dipakai saat membuka form edit, bukan saat mengisi baru.
 */
export function satuanUntuk(gram) {
  return Number(gram) >= 1000 ? "kg" : "g";
}

/** "22.800 g (22,8 kg)" — bacaan balik yang ditaruh tepat di bawah kotak isian. */
export function bacaanGram(gram) {
  const g = Number(gram);
  if (!Number.isFinite(g) || g <= 0) return "";
  const utama = `${g.toLocaleString("id-ID")} g`;
  if (g < 1000) return utama;
  const kg = g / 1000;
  return `${utama} (${kg.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg)`;
}
