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
    //
    // D18 — totalGaji juga tidak ditambahkan lagi. Slip gaji yang ditandai
    // dibayar membuat FinanceTransaction-nya sendiri, jadi gajinya sudah ada di
    // totalFinance; menjumlahkan keduanya membuat gaji terhitung dua kali.
    const totalPengeluaran = totalFinance;

    // Semua kura yang masih ada di peternakan — mereka semua makan dan dirawat.
    // Daftar status yang ditulis tangan melewatkan kura sakit dan karantina,
    // sehingga biaya dibagi ke lebih sedikit ekor daripada yang sebenarnya ada
    // dan biaya per ekor terlihat lebih mahal dari kenyataannya.
    const activeCount = tortoises.filter(diPeternakan).length;

    const biayaPerEkor = activeCount > 0 ? Math.round(totalPengeluaran / activeCount) : fallback;
    const isDataAktual = totalPengeluaran > 0;

    // ── Tarif RATA-RATA beberapa bulan, untuk menghitung HPP ──
    //
    // Biaya satu bulan adalah dasar yang buruk untuk HPP. Bulan yang kebetulan
    // sepi pencatatan membuat perawatan seekor kura seolah nyaris gratis, dan
    // angka itu ikut tersimpan permanen di catatan penjualan.
    //
    // Ini bukan kekhawatiran teoretis: lima baby yang terjual Agustus 2026
    // tercatat berbiaya perawatan Rp 1.121 seumur hidupnya dengan margin 100%,
    // karena pada saat itu satu-satunya pengeluaran Agustus yang tercatat adalah
    // kas kecil. Sebulan kemudian, setelah gaji dicatat, angka bulan yang sama
    // menjadi 23 kali lipat.
    //
    // Merata-ratakan beberapa bulan tidak membuat angkanya benar, tapi membuatnya
    // berhenti melonjak karena satu bulan yang catatannya belum lengkap. Bulan
    // tanpa pengeluaran sama sekali DILEWATI, bukan dihitung nol — bulan yang
    // tidak dicatat berarti tidak diketahui, bukan berarti gratis.
    const BULAN_DIPAKAI = 6;
    const perBulan = new Map();
    for (const t of finances) {
      if (t.type !== "pengeluaran" || !masukLaporan(t)) continue;
      const b = String(t.date || "").slice(0, 7);
      if (!b || b > monthKey) continue;
      perBulan.set(b, (perBulan.get(b) || 0) + (t.amount || 0));
    }
    const bulanBerisi = [...perBulan.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, BULAN_DIPAKAI);
    const rataBulanan = bulanBerisi.length
      ? bulanBerisi.reduce((s, [, v]) => s + v, 0) / bulanBerisi.length
      : 0;
    const biayaPerEkorRata =
      activeCount > 0 && rataBulanan > 0 ? Math.round(rataBulanan / activeCount) : fallback;

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
      // Dipakai untuk HPP. Lihat keterangan di atas: satu bulan terlalu goyah
      // untuk angka yang tersimpan permanen di catatan penjualan.
      biayaPerEkorRata,
      bulanDipakai: bulanBerisi.map(([b]) => b),
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