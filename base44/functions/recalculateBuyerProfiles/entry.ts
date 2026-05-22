import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Recalculate semua BuyerProfile dari Sales
    const sales = await base44.asServiceRole.entities.Sale.list();
    const buyerProfiles = await base44.asServiceRole.entities.BuyerProfile.list();
    
    // Group sales by buyer phone
    const salesByBuyer = {};
    sales.forEach(sale => {
      if (sale.payment_status !== 'lunas') return; // hanya yang lunas
      const key = sale.buyer_phone;
      if (!salesByBuyer[key]) {
        salesByBuyer[key] = [];
      }
      salesByBuyer[key].push(sale);
    });
    
    let updatedCount = 0;
    
    // Update atau create buyer profile untuk setiap buyer
    for (const [phone, buyerSales] of Object.entries(salesByBuyer)) {
      const totalSpent = buyerSales.reduce((sum, s) => sum + (s.price || 0), 0);
      const totalPurchases = buyerSales.length;
      const lastPurchase = buyerSales.map(s => s.sale_date).sort().reverse()[0];
      const firstPurchase = buyerSales.map(s => s.sale_date).sort()[0];
      
      // Tentukan tier
      let tier = 'baru';
      if (totalPurchases >= 3 || totalSpent >= 5000000) {
        tier = 'vip';
      } else if (totalPurchases >= 2 || totalSpent >= 1000000) {
        tier = 'reguler';
      }
      
      const existingProfile = buyerProfiles.find(p => p.phone === phone);
      
      if (existingProfile) {
        await base44.asServiceRole.entities.BuyerProfile.update(existingProfile.id, {
          total_purchases: totalPurchases,
          total_spent: totalSpent,
          last_purchase_date: lastPurchase,
          first_purchase_date: firstPurchase || existingProfile.first_purchase_date,
          tier,
        });
        updatedCount++;
      } else {
        const buyerName = buyerSales[0].buyer_name;
        await base44.asServiceRole.entities.BuyerProfile.create({
          name: buyerName,
          phone,
          platform_asal: buyerSales[0].platform || 'Langsung',
          total_purchases: totalPurchases,
          total_spent: totalSpent,
          first_purchase_date: firstPurchase,
          last_purchase_date: lastPurchase,
          tier,
        });
        updatedCount++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Recalculated ${updatedCount} buyer profiles`,
      details: {
        total_sales_processed: sales.length,
        profiles_updated: updatedCount,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});