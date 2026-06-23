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
        await base44.asServiceRole.entities.Tortoise.update(sale.tortoise_id, {
          status: 'terjual',
          sale_channel: sale.platform || 'langsung'
        });

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

    // BuyerProfile update TIDAK dilakukan di sini —
    // onSaleCreated automation sudah menanganinya (satu tempat saja, anti-dobel).

    return Response.json({ success: true, sale });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});