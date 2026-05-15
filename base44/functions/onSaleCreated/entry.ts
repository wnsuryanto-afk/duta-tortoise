import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const sale = body.data;
    if (!sale || !sale.id) {
      return Response.json({ ok: true, skip: "no data" });
    }

    // Catat ke laporan keuangan sebagai pemasukan penjualan tortoise
    await base44.asServiceRole.entities.FinanceTransaction.create({
      type: "pemasukan",
      category: "penjualan_tortoise",
      amount: sale.price || 0,
      date: sale.sale_date || new Date().toISOString().split("T")[0],
      description: `Penjualan ${sale.tortoise_name || "tortoise"} kepada ${sale.buyer_name || "-"}`,
      reference_id: sale.id,
      created_by_name: sale.created_by || "",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});