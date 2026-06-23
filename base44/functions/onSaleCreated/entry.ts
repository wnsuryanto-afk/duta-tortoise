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

    // ── C. Upsert BuyerProfile — hitung ulang dari Sale (anti-dobel) ─────
    // Dengan menghitung dari sumber data asli, update ini idempoten:
    // berapapun kali trigger dijalankan, hasilnya selalu angka yang benar.
    const hp = sale.hp_whatsapp || sale.buyer_phone;
    if (hp) {
      const saleDate = sale.sale_date || new Date().toISOString().split("T")[0];

      // Ambil semua sale milik pembeli ini (by hp_whatsapp)
      const allBuyerSales = await db.entities.Sale.filter({ hp_whatsapp: hp });
      const totalPurchases = allBuyerSales.length;
      const totalSpent = allBuyerSales.reduce((sum, s) => sum + (s.price || 0), 0);
      const sortedDates = allBuyerSales.map(s => s.sale_date).filter(Boolean).sort();
      const lastPurchaseDate = sortedDates[sortedDates.length - 1] || saleDate;
      const firstPurchaseDate = sortedDates[0] || saleDate;

      // Kode kura dari penjualan terakhir
      const lastSale = allBuyerSales
        .filter(s => s.sale_date)
        .sort((a, b) => (a.sale_date > b.sale_date ? -1 : 1))[0];
      const lastTortoiseCode = lastSale?.tortoise_code || sale.tortoise_code || "";

      let tier = "baru";
      if (totalSpent > 10000000) tier = "vip";
      else if (totalSpent > 2000000) tier = "reguler";

      const existingBuyers = await db.entities.BuyerProfile.filter({ hp_whatsapp: hp });

      if (existingBuyers && existingBuyers.length > 0) {
        await db.entities.BuyerProfile.update(existingBuyers[0].id, {
          total_purchases: totalPurchases,
          total_spent: totalSpent,
          first_purchase_date: firstPurchaseDate,
          last_purchase_date: lastPurchaseDate,
          last_purchased_tortoise: lastTortoiseCode,
          is_repeat_buyer: totalPurchases > 1,
          tier,
          name: existingBuyers[0].name || sale.buyer_name,
          buyer_address: existingBuyers[0].buyer_address || sale.buyer_address || "",
        });
      } else if (!sale.buyer_profile_id) {
        // Hanya buat baru jika belum ada profil sama sekali
        await db.entities.BuyerProfile.create({
          name: sale.buyer_name || "",
          hp_whatsapp: hp,
          buyer_address: sale.buyer_address || "",
          city: sale.buyer_city || "",
          platform_asal: sale.platform || "Langsung",
          total_purchases: totalPurchases,
          total_spent: totalSpent,
          first_purchase_date: firstPurchaseDate,
          last_purchase_date: lastPurchaseDate,
          last_purchased_tortoise: lastTortoiseCode,
          is_repeat_buyer: totalPurchases > 1,
          tier,
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});