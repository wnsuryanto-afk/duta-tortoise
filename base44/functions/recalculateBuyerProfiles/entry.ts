import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Hitung ulang total_purchases dan total_spent semua BuyerProfile dari data Sale.
// Aman dijalankan berkali-kali (idempoten). Bisa untuk satu buyer (buyer_profile_id atau hp)
// atau semua buyer sekaligus.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { buyer_profile_id, hp_whatsapp: targetHp } = body;

    const db = base44.asServiceRole;

    // Ambil semua Sales sekaligus
    const allSales = await db.entities.Sale.list('-sale_date', 2000);

    // Group by hp_whatsapp
    const salesByHp = {};
    for (const s of allSales) {
      const hp = s.hp_whatsapp;
      if (!hp) continue;
      if (!salesByHp[hp]) salesByHp[hp] = [];
      salesByHp[hp].push(s);
    }

    // Ambil buyer profile(s) yang perlu diupdate
    let profiles;
    if (buyer_profile_id) {
      const p = await db.entities.BuyerProfile.get(buyer_profile_id);
      profiles = p ? [p] : [];
    } else if (targetHp) {
      profiles = await db.entities.BuyerProfile.filter({ hp_whatsapp: targetHp });
    } else {
      profiles = await db.entities.BuyerProfile.list('-created_date', 2000);
    }

    let updatedCount = 0;

    for (const profile of profiles) {
      const hp = profile.hp_whatsapp;
      const buyerSales = salesByHp[hp] || [];

      const totalPurchases = buyerSales.length;
      const totalSpent = buyerSales.reduce((sum, s) => sum + (s.price || 0), 0);
      const sortedDates = buyerSales.map(s => s.sale_date).filter(Boolean).sort();
      const firstPurchaseDate = sortedDates[0] || profile.first_purchase_date;
      const lastPurchaseDate = sortedDates[sortedDates.length - 1] || profile.last_purchase_date;

      const lastSale = buyerSales
        .filter(s => s.sale_date)
        .sort((a, b) => (a.sale_date > b.sale_date ? -1 : 1))[0];
      const lastTortoiseCode = lastSale?.tortoise_code || profile.last_purchased_tortoise || "";

      let tier = "baru";
      if (totalSpent > 10000000) tier = "vip";
      else if (totalSpent > 2000000) tier = "reguler";

      await db.entities.BuyerProfile.update(profile.id, {
        total_purchases: totalPurchases,
        total_spent: totalSpent,
        first_purchase_date: firstPurchaseDate,
        last_purchase_date: lastPurchaseDate,
        last_purchased_tortoise: lastTortoiseCode,
        is_repeat_buyer: totalPurchases > 1,
        tier,
      });
      updatedCount++;
    }

    return Response.json({
      success: true,
      message: `Recalculated ${updatedCount} buyer profile(s)`,
      updated: updatedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});