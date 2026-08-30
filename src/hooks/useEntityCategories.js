import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FINANCE_CAT_LABELS, PETTYCASH_CAT_LABELS } from "@/lib/financeCategories";

const prettify = (v) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Membaca daftar kategori langsung dari enum schema FinanceTransaction.
// Kategori baru di schema otomatis muncul tanpa ubah kode.
export function useFinanceCategories() {
  const { data: schema, isLoading } = useQuery({
    queryKey: ["schema-FinanceTransaction-categories"],
    queryFn: () => base44.entities.FinanceTransaction.schema(),
    staleTime: 30 * 60 * 1000,
  });
  const enumValues = schema?.properties?.category?.enum || [];
  const labelOf = (v) => FINANCE_CAT_LABELS[v] || prettify(v);
  // penjualan_tortoise = pemasukan; sisanya pengeluaran
  const pengeluaran = enumValues
    .filter((v) => v !== "penjualan_tortoise")
    .map((v) => ({ value: v, label: labelOf(v) }));
  const pemasukan = enumValues
    .filter((v) => v === "penjualan_tortoise" || v === "lainnya")
    .map((v) => ({ value: v, label: labelOf(v) }));

  // D18 — Kategori yang boleh dipilih saat MENGETIK transaksi baru.
  //
  // Gaji sengaja dikeluarkan dari sini. Sejak slip gaji yang ditandai dibayar
  // membuat catatan biayanya sendiri, mengetik gaji manual berarti biaya yang
  // sama masuk dua kali — dan yang berbahaya, keduanya terlihat benar. Angka
  // gaji lama tetap tampil normal di laporan dan filter, karena `pengeluaran`
  // di atas tidak diubah; yang ditutup hanya jalan MASUKNYA yang baru.
  const GAJI = ["gaji", "gaji_karyawan"];
  const pengeluaranManual = pengeluaran.filter((c) => !GAJI.includes(c.value));

  return { enumValues, pengeluaran, pengeluaranManual, pemasukan, labelOf, isLoading };
}

// Membaca daftar kategori dari enum schema PettyCashLedger (format pemakaian kas kecil).
export function usePettyCashCategories() {
  const { data: schema, isLoading } = useQuery({
    queryKey: ["schema-PettyCashLedger-categories"],
    queryFn: () => base44.entities.PettyCashLedger.schema(),
    staleTime: 30 * 60 * 1000,
  });
  const enumValues = schema?.properties?.category?.enum || [];
  const labelOf = (v) => PETTYCASH_CAT_LABELS[v] || prettify(v);
  const cats = enumValues.map((v) => ({ value: v, label: labelOf(v) }));
  return { enumValues, cats, labelOf, isLoading };
}