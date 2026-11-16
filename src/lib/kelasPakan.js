/**
 * kelasPakan.js — satu daftar golongan pakan untuk tiga layar.
 *
 * Dipakai formulir Pakan Harian (membuat bahan baru), formulir Stok Pakan
 * (mengisi kelas), dan widget persen hijauan (menghitungnya). Kalau daftarnya
 * ditulis di tiga tempat, widget bisa menghitung golongan yang tidak ada di
 * formulirnya — dan hijauan yang benar tidak pernah terhitung.
 */

export const KELAS_PAKAN = [
  { value: "hijauan_utama", label: "Hijauan utama" },
  { value: "serat_kering", label: "Serat kering" },
  { value: "kaktus", label: "Kaktus" },
  { value: "daun_herba", label: "Daun herba" },
  { value: "buah_manis", label: "Buah manis" },
  { value: "pelet", label: "Pelet" },
  { value: "suplemen", label: "Suplemen" },
];

/** Golongan yang dihitung sebagai hijauan pada porsi harian. */
export const KELAS_HIJAUAN = ["hijauan_utama", "kaktus", "daun_herba"];

export function labelKelas(kelas) {
  return KELAS_PAKAN.find((k) => k.value === kelas)?.label || "";
}