import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const sale = body.data;
    if (!sale || !sale.id) {
      return Response.json({ ok: true, skip: "no data" });
    }
    const db = base44.asServiceRole;

    // ── A. Catat FinanceTransaction (cegah duplikat) ────────────────────
    const existingTx = await db.entities.FinanceTransaction.filter({ reference_id: sale.id });
    if (!existingTx || existingTx.length === 0) {
      await db.entities.FinanceTransaction.create({
        type: "pemasukan",
        category: "penjualan_tortoise",
        amount: sale.price || 0,
        date: sale.sale_date || new Date().toISOString().split("T")[0],
        description: `Penjualan ${sale.tortoise_name || "tortoise"} kepada ${sale.buyer_name || "-"}`,
        reference_id: sale.id,
        created_by_name: sale.created_by || "",
      });
    }

    // ── B. Update status Tortoise → "terjual" ────────────────────────────
    if (sale.tortoise_id) {
      const tortoise = await db.entities.Tortoise.get(sale.tortoise_id);
      if (tortoise && tortoise.status !== "terjual") {
        await db.entities.Tortoise.update(sale.tortoise_id, {
          status: "terjual",
          previous_status: tortoise.status || "aktif",
          last_status_change: sale.sale_date || new Date().toISOString().split("T")[0],
        });
        // Kurangi current_count kandang asal
        if (tortoise.enclosure) {
          const enclosures = await db.entities.Enclosure.filter({ id: tortoise.enclosure });
          const enclosure = enclosures && enclosures[0];
          if (enclosure) {
            await db.entities.Enclosure.update(enclosure.id, {
              current_count: Math.max(0, (enclosure.current_count || 0) - 1),
            });
          }
        }
      }
    }

    // ── C. Upsert BuyerProfile (only if buyer_profile_id not already set by client) ──
    const hp = sale.hp_whatsapp || sale.buyer_phone;
    if (hp && !sale.buyer_profile_id) {
      const existingBuyers = await db.entities.BuyerProfile.filter({ hp_whatsapp: hp });
      const saleDate = sale.sale_date || new Date().toISOString().split("T")[0];

      if (existingBuyers && existingBuyers.length > 0) {
        const buyer = existingBuyers[0];
        await db.entities.BuyerProfile.update(buyer.id, {
          total_purchases: (buyer.total_purchases || 0) + 1,
          total_spent: (buyer.total_spent || 0) + (sale.price || 0),
          last_purchase_date: saleDate,
          last_purchased_tortoise: sale.tortoise_code || "",
          is_repeat_buyer: (buyer.total_purchases || 0) + 1 > 1,
          name: buyer.name || sale.buyer_name,
          buyer_address: buyer.buyer_address || sale.buyer_address || "",
          city: buyer.city || sale.buyer_city || "",
        });
      } else {
        await db.entities.BuyerProfile.create({
          name: sale.buyer_name || "",
          hp_whatsapp: hp,
          buyer_address: sale.buyer_address || "",
          city: sale.buyer_city || "",
          platform_asal: sale.platform || "Langsung",
          total_purchases: 1,
          total_spent: sale.price || 0,
          first_purchase_date: saleDate,
          last_purchase_date: saleDate,
          last_purchased_tortoise: sale.tortoise_code || "",
          is_repeat_buyer: false,
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});