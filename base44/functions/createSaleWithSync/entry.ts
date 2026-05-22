import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_data } = await req.json();

    // 1. Buat Sale record
    const sale = await base44.asServiceRole.entities.Sale.create(sale_data);

    // 2. Update tortoise status dan enclosure
    if (sale.tortoise_id) {
      const tortoise = await base44.asServiceRole.entities.Tortoise.get(sale.tortoise_id);
      
      if (tortoise) {
        // Update status tortoise
        await base44.asServiceRole.entities.Tortoise.update(sale.tortoise_id, {
          status: 'terjual',
          sale_channel: sale.platform || 'langsung'
        });

        // Kurangi enclosure count
        if (tortoise.enclosure) {
          const enclosure = await base44.asServiceRole.entities.Enclosure.get(tortoise.enclosure);
          if (enclosure) {
            await base44.asServiceRole.entities.Enclosure.update(tortoise.enclosure, {
              current_count: Math.max(0, (enclosure.current_count || 0) - 1)
            });
          }
        }
      }
    }

    // 3. Sync dengan BuyerProfile
    await syncBuyerProfile(base44, sale);

    return Response.json({ success: true, sale });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function syncBuyerProfile(base44, sale) {
  if (!sale.buyer_phone) return;

  // Cari buyer existing
  const existingBuyers = await base44.asServiceRole.entities.BuyerProfile.filter({
    phone: sale.buyer_phone
  });

  let buyer;
  if (existingBuyers.length > 0) {
    buyer = existingBuyers[0];
    
    // Update existing buyer
    const totalSpent = (buyer.total_spent || 0) + (sale.price || 0);
    const totalPurchases = (buyer.total_purchases || 0) + 1;
    
    let tier = 'baru';
    if (totalSpent > 10000000) tier = 'vip';
    else if (totalSpent > 2000000) tier = 'reguler';

    await base44.asServiceRole.entities.BuyerProfile.update(buyer.id, {
      total_spent: totalSpent,
      total_purchases: totalPurchases,
      last_purchase_date: sale.sale_date,
      tier: tier,
      is_repeat_buyer: totalPurchases > 1
    });
  } else {
    // Buat buyer baru
    await base44.asServiceRole.entities.BuyerProfile.create({
      name: sale.buyer_name,
      phone: sale.buyer_phone,
      whatsapp: sale.buyer_phone,
      city: sale.buyer_address?.split(',').pop()?.trim() || '',
      platform_asal: sale.platform || 'Langsung',
      first_purchase_date: sale.sale_date,
      last_purchase_date: sale.sale_date,
      total_purchases: 1,
      total_spent: sale.price || 0,
      tier: (sale.price || 0) > 10000000 ? 'vip' : (sale.price || 0) > 2000000 ? 'reguler' : 'baru',
      is_repeat_buyer: false
    });
  }
}