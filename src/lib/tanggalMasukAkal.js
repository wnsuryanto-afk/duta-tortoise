/**
 * Menilai apakah sebuah tanggal pesanan masuk akal.
 *
 * Tanggal pesanan dulu masuk langsung dari bacaan AI Vision ke database tanpa
 * satu pun kolom yang bisa mengoreksinya. Akibatnya terlihat di data: satu
 * pesanan Shopee Rp 146.999 yang dicatat 6 September 2026 tersimpan
 * bertanggal 18 Mei 2024 — AI salah membaca format tanggal di struk, dan
 * tidak ada yang bisa memperbaikinya karena kolomnya memang tidak ada.
 *
 * Tanggal yang salah tidak pernah melempar error. Ia hanya membuat belanja
 * itu hilang dari laporan biaya bulan berjalan dan membuat umur utang
 * talangan terbaca dua tahun. Kesalahan yang diam seperti ini hanya bisa
 * dicegah kalau ada yang memeriksanya sebelum disimpan.
 *
 * Dipakai di dua tempat — saat memindai struk dan saat memperbaiki pesanan
 * yang sudah tersimpan — jadi definisinya satu, di sini.
 */

/**
 * Ambang mundur. 120 hari cukup longgar untuk struk lama yang baru sempat
 * dicatat, tapi cukup ketat untuk menangkap salah baca tahun.
 */
export const BATAS_MUNDUR_HARI = 120;

const iso = (d) => d.toISOString().split("T")[0];
export const hariIniISO = () => iso(new Date());

/**
 * @param {string} tanggal  "YYYY-MM-DD"
 * @param {string} [acuan]  tanggal pembanding; default hari ini. Untuk data
 *                          lama, isi dengan tanggal record itu DIBUAT — itu
 *                          pembanding yang benar, bukan hari ini.
 * @returns {string|null}   alasan kecurigaan, atau null bila wajar
 */
export function tanggalMencurigakan(tanggal, acuan) {
  if (!tanggal) return null;
  const d = new Date(`${String(tanggal).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Format tanggal tidak terbaca.";

  const pembanding = acuan ? new Date(`${String(acuan).slice(0, 10)}T00:00:00`) : new Date(`${hariIniISO()}T00:00:00`);
  if (Number.isNaN(pembanding.getTime())) return null;

  const selisihHari = Math.round((pembanding - d) / 86400000);
  if (selisihHari < -1) return "Tanggal ini di masa depan — hampir pasti salah baca.";
  if (selisihHari > BATAS_MUNDUR_HARI) {
    const thn = Math.floor(selisihHari / 365);
    return thn >= 1
      ? `Tanggal ini ${thn} tahun lebih awal dari saat pesanan dicatat — biasanya AI salah membaca format tanggal struk.`
      : `Tanggal ini ${selisihHari} hari lebih awal dari saat pesanan dicatat — periksa, mungkin salah baca.`;
  }
  return null;
}
