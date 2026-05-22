import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Recalculate semua enclosure
    const enclosures = await base44.asServiceRole.entities.Enclosure.list();
    const tortoises = await base44.asServiceRole.entities.Tortoise.list();
    const activeStatuses = ['aktif', 'baby', 'sakit', 'breeding', 'karantina'];
    
    for (const enclosure of enclosures) {
      const count = tortoises.filter(t => 
        t.enclosure === enclosure.name && activeStatuses.includes(t.status)
      ).length;
      
      if (count !== enclosure.current_count) {
        await base44.asServiceRole.entities.Enclosure.update(enclosure.id, {
          current_count: count
        });
      }
    }

    return Response.json({ success: true, message: `Updated ${enclosures.length} enclosures` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});