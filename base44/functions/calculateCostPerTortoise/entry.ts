import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const [financeTx, salarySlips, pettyCash, tortoises, settings] = await Promise.all([
      base44.asServiceRole.entities.FinanceTransaction.list('-date', 5000),
      base44.asServiceRole.entities.SalarySlip.list('-period', 100),
      base44.asServiceRole.entities.PettyCashRequest.list('-request_date', 100),
      base44.asServiceRole.entities.Tortoise.list('name', 2000),
      base44.asServiceRole.entities.CompanySettings.list('setting_key', 5),
    ]);

    const totalFinance = financeTx.filter(t => t.type === 'pengeluaran' && (t.date||'').startsWith(month) && !t.is_test_data && !t.excluded_from_reports).reduce((s,t)=>s+(t.amount||0),0);
    const totalSalary = salarySlips.filter(s => s.status==='paid' && (s.paid_date||'').startsWith(month) && !s.is_test_data && !s.excluded_from_reports).reduce((s,t)=>s+(t.net_total||t.gross_total||0),0);
    const totalPettyCash = pettyCash.filter(p => p.status==='disbursed' && (p.disbursement_date||'').startsWith(month) && !p.is_test_data).reduce((s,t)=>s+(t.amount_requested||0),0);
    const totalPengeluaran = totalFinance + totalSalary + totalPettyCash;
    const activeCount = tortoises.filter(t => ['aktif','breeding','baby'].includes(t.status)).length;

    let costPerTortoise = 0, isActual = false;
    if (activeCount > 0 && totalPengeluaran > 0) { costPerTortoise = Math.round(totalPengeluaran/activeCount); isActual = true; }

    let fallback = 100000;
    if (settings.length > 0 && settings[0].hpp_fallback_per_ekor != null) fallback = settings[0].hpp_fallback_per_ekor;
    if (!isActual) costPerTortoise = fallback;

    return Response.json({ month, total_pengeluaran: totalPengeluaran, total_finance: totalFinance, total_salary: totalSalary, total_petty_cash: totalPettyCash, active_tortoise_count: activeCount, cost_per_tortoise: costPerTortoise, fallback, is_actual: isActual, label: isActual ? 'Data aktual' : 'Estimasi default' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});