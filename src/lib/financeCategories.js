// Sumber tunggal label kategori Keuangan & Kas Kecil.
// Nilai (value) tetap pakai underscore (disimpan ke DB); hanya label tampilan yang dirapikan.
// Saat menambah kategori baru: tambah di sini DAN di enum schema entity terkait.

// Kategori pemakaian Kas Kecil (PettyCashLedger.category)
export const PETTYCASH_CATS = [
  { value: "obat", label: "Obat" },
  { value: "vitamin", label: "Vitamin" },
  { value: "pakan", label: "Pakan" },
  { value: "peralatan_kandang", label: "Peralatan Kandang" },
  { value: "transportasi", label: "Transportasi" },
  { value: "solar_bbm", label: "Solar / BBM" },
  { value: "rokok", label: "Rokok" },
  { value: "konsumsi", label: "Konsumsi" },
  { value: "lainnya", label: "Lainnya" },
];
export const PETTYCASH_CAT_LABELS = Object.fromEntries(PETTYCASH_CATS.map(c => [c.value, c.label]));

// Kategori FinanceTransaction — tipe pemasukan
export const PEMASUKAN_CATS = [
  { value: "penjualan_tortoise", label: "Penjualan Tortoise" },
  { value: "lainnya", label: "Lainnya" },
];

// Kategori FinanceTransaction — tipe pengeluaran
export const PENGELUARAN_CATS = [
  { value: "gaji_karyawan", label: "Gaji Karyawan" },
  { value: "obat_perawatan", label: "Obat & Perawatan" },
  { value: "vitamin_suplemen", label: "Vitamin & Suplemen" },
  { value: "pakan", label: "Pakan" },
  { value: "operasional", label: "Operasional" },
  { value: "solar_bbm", label: "Solar / BBM" },
  { value: "rokok", label: "Rokok" },
  { value: "kas_kecil", label: "Kas Kecil" },
  { value: "lainnya", label: "Lainnya" },
];

// Label map gabungan (dipakai di laporan, breakdown, filter)
export const FINANCE_CAT_LABELS = {
  ...Object.fromEntries(PEMASUKAN_CATS.map(c => [c.value, c.label])),
  ...Object.fromEntries(PENGELUARAN_CATS.map(c => [c.value, c.label])),
};