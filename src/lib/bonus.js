/**
 * bonus.js - SATU DEFINISI tingkatan bonus bulanan.
 *
 * Sebelumnya susunan tingkat ditulis ulang di tiga tempat (BonusBulanIni,
 * PoinBonusTim, autoNotifications) dengan kode yang sama persis. Tiga salinan
 * berarti mengubah aturan bonus di satu tempat diam-diam membuat kiper melihat
 * angka yang berbeda dari yang dilihat pemilik, dan berbeda lagi dari yang
 * dikirim lewat notifikasi. Yang paling berbahaya bukan salahnya, tapi bahwa
 * ketiganya terlihat benar sendiri-sendiri.
 *
 * ── D16: kenapa Dasar memakai poin TIM ──
 *
 * Poin yang tersedia dalam sebulan terbatas dan dibagi antar kiper. Target yang
 * seluruhnya perorangan berarti kiper yang mengambil lebih banyak tugas
 * menaikkan bonusnya dengan MENURUNKAN bonus rekannya - dan data 13 hari
 * menunjukkan pembagiannya memang sudah timpang (59% : 41%). Insentif seperti
 * itu memberi hadiah untuk berebut tugas, bukan untuk merawat kura.
 *
 * Maka tingkat Dasar dibuat bersama: dibayar bila TIM mencapai targetnya.
 * Saling bantu menaikkan angka yang sama untuk semua orang.
 *
 * Tetapi Dasar juga tetap menuntut ambang pribadi yang rendah
 * (`min_poin_bulanan`), supaya seseorang tidak bisa menumpang penuh pada kerja
 * rekannya. Ambang itu sengaja dipasang jauh di bawah bagian yang adil - ia
 * lantai, bukan target.
 *
 * Tingkat di atasnya (Bagus, Luar biasa) tetap perorangan: setelah lantai tim
 * terpenuhi, usaha lebih memang pantas dinilai per orang.
 */

/** Susun tingkatan dari CompanySettings. Tingkat tanpa target diabaikan. */
export function tingkatanBonus(settings) {
  if (!settings) return [];
  return [
    {
      nama: "Dasar",
      target: Number(settings.min_poin_bulanan || 0),
      targetTim: Number(settings.target_poin_tim || 0),
      bonus: Number(settings.bonus_dasar || 0),
    },
    {
      nama: "Bagus",
      target: Number(settings.target_poin_bagus || 0),
      targetTim: 0,
      bonus: Number(settings.bonus_bagus || 0),
    },
    {
      nama: "Luar biasa",
      target: Number(settings.target_poin_luar_biasa || 0),
      targetTim: 0,
      bonus: Number(settings.bonus_luar_biasa || 0),
    },
  ]
    .filter((t) => t.target > 0)
    .sort((a, b) => a.target - b.target);
}

/** Apakah satu tingkat sudah tercapai? Poin tim hanya diperiksa bila tingkat itu memintanya. */
export function tingkatTercapai(tingkat, poinPribadi, poinTim) {
  if (!tingkat) return false;
  if (poinPribadi < tingkat.target) return false;
  if (tingkat.targetTim > 0 && Number(poinTim || 0) < tingkat.targetTim) return false;
  return true;
}

/**
 * Tingkat tertinggi yang sudah dicapai, tingkat berikutnya, dan apa yang masih
 * kurang untuk mencapainya.
 *
 * `kurangTim` dipisahkan dari `kurangPribadi` dengan sengaja: kalau yang kurang
 * adalah poin tim, kiper perlu tahu bahwa bekerja lebih keras SENDIRIAN tidak
 * akan menutupnya - yang dibutuhkan rekannya ikut bekerja. Menggabungkan
 * keduanya menjadi satu angka "kurang sekian poin" menyembunyikan justru
 * informasi yang membuat orang mengambil tindakan yang benar.
 */
export function statusBonus({ settings, poinPribadi = 0, poinTim = 0 }) {
  const tingkatan = tingkatanBonus(settings);
  const tercapai =
    [...tingkatan].reverse().find((t) => tingkatTercapai(t, poinPribadi, poinTim)) || null;
  const berikut = tingkatan.find((t) => !tingkatTercapai(t, poinPribadi, poinTim)) || null;

  return {
    tingkatan,
    tercapai,
    berikut,
    bonus: tercapai?.bonus || 0,
    kurangPribadi: berikut ? Math.max(0, berikut.target - poinPribadi) : 0,
    kurangTim:
      berikut && berikut.targetTim > 0 ? Math.max(0, berikut.targetTim - Number(poinTim || 0)) : 0,
  };
}
