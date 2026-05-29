import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    // Hanya proses jika status berubah ke "paid"
    if (!data || data.status !== "paid") {
      return Response.json({ ok: true, skipped: "status bukan paid" });
    }

    const slip = data;

    // Cek apakah sudah ada FinanceTransaction untuk slip ini (cek finance_tx_id ATAU reference_id)
    if (slip.finance_tx_id) {
      return Response.json({ ok: true, skipped: "sudah ada FinanceTransaction (finance_tx_id)" });
    }

    // Cek juga via reference_id di FinanceTransaction untuk cegah duplikat
    if (slip.id) {
      const existingTx = await base44.asServiceRole.entities.FinanceTransaction.filter({
        reference_id: slip.id,
        category: "gaji_karyawan",
      });
      if (existingTx && existingTx.length > 0) {
        return Response.json({ ok: true, skipped: "sudah ada FinanceTransaction (reference_id)" });
      }
    }

    // Buat FinanceTransaction untuk gaji yang sudah dibayar
    const monthLabel = slip.period
      ? new Date(slip.period + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      : slip.period;

    const tx = await base44.asServiceRole.entities.FinanceTransaction.create({
      type: "pengeluaran",
      category: "gaji_karyawan",
      amount: slip.net_total || 0,
      date: slip.paid_date || new Date().toISOString().split("T")[0],
      description: `Gaji ${slip.employee_name} - ${monthLabel}`,
      reference_id: slip.id || "",
      created_by_name: slip.paid_by || "Sistem",
    });

    // Update SalarySlip dengan finance_tx_id
    if (tx?.id && slip.id) {
      await base44.asServiceRole.entities.SalarySlip.update(slip.id, {
        finance_tx_id: tx.id,
      });
    }

    return Response.json({ ok: true, tx_id: tx?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});