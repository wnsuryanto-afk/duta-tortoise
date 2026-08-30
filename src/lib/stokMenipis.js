/**
 * stokMenipis.js — SATU definisi "stok ini perlu diperhatikan".
 *
 * Barang di peternakan ini disimpan di dua entitas yang bentuknya nyaris sama:
 * WarehouseItem (gudang) dan FeedStock (pakan). Keduanya sama-sama punya
 * `current_stock`, `minimum_stock`, dan `is_mandatory`.
 *
 * Beranda Owner hanya memeriksa yang gudang. Pakan ikut diambil, tetapi hanya
 * dipakai menghitung nilai persediaan — tidak pernah masuk daftar peringatan.
 * Akibatnya pakan yang habis tidak memunculkan peringatan apa pun di beranda,
 * padahal di peternakan kura itu justru kehabisan yang paling gawat.
 *
 * Ambangnya dikumpulkan di sini supaya setiap layar menjawab dengan cara yang
 * sama, dan supaya menambah sumber stok baru kelak tidak perlu menambal ulang
 * setiap widget.
 */

/** Berapa hari sebelum kedaluwarsa sebuah barang mulai diperingatkan. */
export const HARI_PERINGATAN_KADALUARSA = 30;

/** Angka stok yang aman dibandingkan — kosong dianggap nol, bukan tak terhingga. */
function angka(nilai) {
  const n = Number(nilai);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Stok habis untuk barang yang ditandai wajib ada.
 *
 * Gate `is_mandatory` sengaja dipertahankan: tanpa itu setiap barang yang
 * memang sengaja dibiarkan nol ikut berteriak, dan peringatan yang selalu
 * menyala sama saja dengan tidak ada peringatan.
 */
export function stokHabis(item) {
  return !!item?.is_mandatory && angka(item.current_stock) <= 0;
}

/**
 * Stok menipis: masih ada, tapi sudah di bawah batas minimum.
 *
 * Barang tanpa `minimum_stock` tidak pernah dianggap menipis — batasnya belum
 * ditentukan, dan menebaknya akan memenuhi daftar dengan barang yang baik-baik
 * saja.
 */
export function stokMenipis(item) {
  const sekarang = angka(item?.current_stock);
  const minimum = angka(item?.minimum_stock);
  return sekarang > 0 && minimum > 0 && sekarang < minimum;
}

/**
 * Akan kedaluwarsa dalam `hari` ke depan. Yang sudah lewat tidak dihitung di
 * sini — itu keadaan lain, dan ditangani daftarnya sendiri.
 */
export function akanKadaluarsa(item, hari = HARI_PERINGATAN_KADALUARSA, sekarang = new Date()) {
  if (!item?.expired_date) return false;
  const tanggal = new Date(item.expired_date);
  if (Number.isNaN(tanggal.getTime())) return false;
  const selisih = Math.ceil((tanggal - sekarang) / 86400000);
  return selisih >= 0 && selisih <= hari;
}

/** Sudah lewat tanggal kedaluwarsanya. */
export function sudahKadaluarsa(item, sekarang = new Date()) {
  if (!item?.expired_date) return false;
  const tanggal = new Date(item.expired_date);
  if (Number.isNaN(tanggal.getTime())) return false;
  return tanggal < sekarang;
}

/**
 * Gabungkan barang gudang dan pakan jadi satu daftar yang bisa diperiksa
 * dengan aturan yang sama, sambil menandai asalnya supaya layar masih bisa
 * menyebut "pakan" atau "gudang" saat menampilkan.
 */
export function semuaStok(barangGudang = [], pakan = []) {
  return [
    ...barangGudang.filter(dilacak).map((i) => ({ ...i, _sumber: "gudang" })),
    ...pakan.filter(dilacak).map((i) => ({ ...i, _sumber: "pakan" })),
  ];
}

/**
 * Bahan yang memang dilacak sebagai stok.
 *
 * Sebagian bahan tidak pernah dicatat masuk-keluarnya karena datang dari kebun
 * sendiri - rumput 180 kg dan kaktus 15 kg per hari tidak dibeli, dipanen. Untuk
 * bahan seperti itu angka stok tidak akan pernah benar, dan peringatan yang
 * dihitung darinya tidak akan pernah bisa dipadamkan dengan bekerja.
 *
 * Ditandai lewat `is_active` alih-alih dihapus, supaya daily_ideal dan batas
 * minimumnya tetap tersimpan: angka itu satu-satunya catatan berapa banyak kura
 * di sini benar-benar makan, dan tetap dibutuhkan bila kelak pakannya dibeli.
 *
 * Bawaannya AKTIF: bahan yang belum pernah disentuh kolom ini tetap dilacak
 * seperti biasa, jadi menambah bahan baru tidak diam-diam menghilang.
 */
export function dilacak(item) {
  return item?.is_active !== false;
}

/**
 * Ringkasan satu langkah untuk widget peringatan.
 *
 * @returns {{habis: Array, menipis: Array, kadaluarsa: Array}}
 */
export function periksaStok(barangGudang = [], pakan = [], sekarang = new Date()) {
  const semua = semuaStok(barangGudang, pakan);
  return {
    habis: semua.filter(stokHabis),
    menipis: semua.filter(stokMenipis),
    kadaluarsa: semua.filter((i) => akanKadaluarsa(i, HARI_PERINGATAN_KADALUARSA, sekarang)),
  };
}
