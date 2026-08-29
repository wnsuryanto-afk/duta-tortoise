import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInMonths } from "date-fns";
import { masukLaporan } from "@/lib/laporan";
import { diPeternakan } from "@/lib/populasiKura";

/**
 * Hook: hitung biaya per ekor per bulan dari data aktual
 * @param {string} period - YYYY-MM (default: bulan ini)
 */
export function useCostPerTortoise(period) {
  const monthKey = period || new Date().toISOString().slice(0, 7);

  const { data: finances = [] } = useQuery({
    queryKey: ["hpp-finances", monthKey],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: salarySlips = [] } = useQuery({
    queryKey: ["hpp-salaries", monthKey],
    queryFn: () => base44.entities.SalarySlip.list("-period", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: pettyCash = [] } = useQuery({
    queryKey: ["hpp-pettycash", monthKey],
    queryFn: () => base44.entities.PettyCashRequest.list("-disbursement_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["hpp-tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-name", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const fallback = settings[0]?.hpp_fallback_per_ekor || 100000;

    // Finance pengeluaran bulan ini
    const monthTx = finances.filter(t => t.date?.startsWith(monthKey) && t.type === "pengeluaran" && masukLaporan(t));
    const totalFinance = monthTx.reduce((s, t) => s + (t.amount || 0), 0);

    // Salary slips paid bulan ini
    const totalGaji = salarySlips
      .filter(s => s.period === monthKey && s.status === "paid")
      .reduce((s, sl) => s + (sl.net_total || 0), 0);

    // PettyCash disbursed bulan ini
    const totalPC = pettyCash
      .filter(p => p.disbursement_date?.startsWith(monthKey) && p.status === "disbursed")
      .reduce((s, p) => s + (p.amount_requested || 0), 0);

    // Pencairan kas kecil sengaja TIDAK ditambahkan: itu perpindahan uang ke
    // kotak kas, bukan biaya. Biayanya sudah tercatat sebagai FinanceTransaction
    // berkategori "kas_kecil" saat dibelanjakan, dan sudah masuk totalFinance.
    const totalPengeluaran = totalFinance + totalGaji;

    // Semua kura yang masih ada di peternakan — mereka semua makan dan dirawat.
    // Daftar status yang ditulis tangan melewatkan kura sakit dan karantina,
    // sehingga biaya dibagi ke lebih sedikit ekor daripada yang sebenarnya ada
    // dan biaya per ekor terlihat lebih mahal dari kenyataannya.
    const activeCount = tortoises.filter(diPeternakan).length;

    const biayaPerEkor = activeCount > 0 ? Math.round(totalPengeluaran / activeCount) : fallback;
    const isDataAktual = totalPengeluaran > 0;

    // Finance by category
    const byCat = {};
    monthTx.forEach(t => {
      const c = t.category || "lainnya";
      byCat[c] = (byCat[c] || 0) + (t.amount || 0);
    });

    return {
      period: monthKey,
      activeCount,
      totalPengeluaran,
      biayaPerEkor: isDataAktual ? biayaPerEkor : fallback,
      isDataAktual,
      fallback,
      breakdown: {
        gaji_karyawan: totalGaji,
        pakan: byCat["pakan"] || 0,
        obat_perawatan: byCat["obat_perawatan"] || 0,
        vitamin_suplemen: byCat["vitamin_suplemen"] || 0,
        operasional: (byCat["operasional"] || 0) + (byCat["lainnya"] || 0),
        petty_cash: totalPC,
      },
    };
  }, [finances, salarySlips, pettyCash, tortoises, settings, monthKey]);
}

/**
 * Hitung care_cost untuk satu tortoise
 */
export function calcCareCost(tortoise, biayaPerEkor) {
  if (!tortoise) return 0;
  const today = new Date();
  const entryDate = tortoise.source === "hasil_sendiri"
    ? tortoise.birth_date
    : (tortoise.purchase_date || tortoise.created_date);
  if (!entryDate) return 0;
  const months = Math.max(0, differenceInMonths(today, new Date(entryDate)));
  return months * (biayaPerEkor || 100000);
}