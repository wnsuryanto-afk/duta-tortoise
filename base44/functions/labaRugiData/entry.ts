import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || new Date().toISOString().slice(0, 7);

    // 1. FinanceTransaction bulan ini
    const allTx = await db.entities.FinanceTransaction.list('-date', 2000);
    const monthTx = allTx.filter(t => t.date?.startsWith(period) && !t.excluded_from_reports);
    const pemasukan = monthTx.filter(t => t.type === 'pemasukan');
    const pengeluaran = monthTx.filter(t => t.type === 'pengeluaran');

    const totalPemasukan = pemasukan.reduce((s, t) => s + (t.amount || 0), 0);
    const totalPengeluaran = pengeluaran.reduce((s, t) => s + (t.amount || 0), 0);

    // Pengeluaran by category
    const pengeluaranByCat = {};
    pengeluaran.forEach(t => {
      const cat = t.category || 'lainnya';
      pengeluaranByCat[cat] = (pengeluaranByCat[cat] || 0) + (t.amount || 0);
    });

    // 2. SalarySlip bulan ini
    const allSlips = await db.entities.SalarySlip.filter({}, '-period', 1000);
    const monthSlips = allSlips.filter(s => s.period === period && s.status === 'paid');
    const totalGaji = monthSlips.reduce((s, slip) => s + (slip.net_total || 0), 0);

    // 3. PettyCash bulan ini
    const allPettyCash = await db.entities.PettyCashRequest.filter({}, '-disbursement_date', 500);
    const monthPetty = allPettyCash.filter(p => p.disbursement_date?.startsWith(period) && p.status === 'disbursed');
    const totalKasKecil = monthPetty.reduce((s, p) => s + (p.amount_requested || 0), 0);
    const pettyByCat = {};
    monthPetty.forEach(p => {
      const cat = p.category || 'lainnya';
      pettyByCat[cat] = (pettyByCat[cat] || 0) + (p.amount_requested || 0);
    });

    // 4. Sales
    const allSales = await db.entities.Sale.list('-sale_date', 500);
    const monthSales = allSales.filter(s => s.sale_date?.startsWith(period));

    // 5. Biaya per ekor
    const grandTotalPengeluaran = totalPengeluaran + totalGaji + totalKasKecil;
    const allTortoises = await db.entities.Tortoise.filter({}, '-name', 2000);
    const activeCount = allTortoises.filter(t => t.status === 'aktif' || t.status === 'baby' || t.status === 'breeding').length;

    const settings = await db.entities.CompanySettings.filter({ setting_key: 'main' });
    const fallbackPerEkor = settings[0]?.hpp_fallback_per_ekor || 100000;

    const hasData = grandTotalPengeluaran > 0;
    const biayaPerEkor = hasData && activeCount > 0
      ? Math.round(grandTotalPengeluaran / activeCount)
      : fallbackPerEkor;

    return Response.json({
      period,
      pemasukan: monthSales.map(s => ({
        tortoise_code: s.tortoise_code || s.tortoise_name,
        buyer_name: s.buyer_name,
        price: s.price || 0,
        hpp: s.hpp || 0,
        profit: s.profit || 0,
        margin_percent: s.margin_percent || 0,
        sale_date: s.sale_date,
      })),
      totalPemasukan: pemasukan.reduce((s, t) => s + (t.amount || 0), 0),
      pengeluaranBreakdown: {
        gaji_karyawan: totalGaji,
        pakan: pengeluaranByCat['pakan'] || 0,
        obat_perawatan: pengeluaranByCat['obat_perawatan'] || 0,
        vitamin_suplemen: pengeluaranByCat['vitamin_suplemen'] || 0,
        kas_kecil: totalKasKecil,
        lainnya: (pengeluaranByCat['lainnya'] || 0) + (pengeluaranByCat['operasional'] || 0),
      },
      grandTotalPengeluaran,
      biayaPerEkor,
      isDataAktual: hasData,
      fallbackPerEkor,
      activeTortoiseCount: activeCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});