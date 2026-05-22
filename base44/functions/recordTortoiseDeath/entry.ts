import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tortoise_id, death_data } = await req.json();

    // 1. Buat DeathRecord
    const deathRecord = await base44.asServiceRole.entities.DeathRecord.create({
      ...death_data,
      tortoise_id: tortoise_id,
      recorded_by: user.full_name || user.email
    });

    // 2. Update status tortoise ke "mati"
    await base44.asServiceRole.entities.Tortoise.update(tortoise_id, {
      status: 'mati'
    });

    // 3. Update enclosure count
    const tortoise = await base44.asServiceRole.entities.Tortoise.get(tortoise_id);
    if (tortoise && tortoise.enclosure) {
      const enclosure = await base44.asServiceRole.entities.Enclosure.get(tortoise.enclosure);
      if (enclosure) {
        await base44.asServiceRole.entities.Enclosure.update(tortoise.enclosure, {
          current_count: Math.max(0, (enclosure.current_count || 0) - 1)
        });
      }
    }

    // 4. Kirim notifikasi ke owner
    const owners = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const owner of owners) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: owner.email,
        recipient_role: 'admin',
        title: '🕯️ Kura-kura Mati',
        message: `${death_data.tortoise_name} telah mati pada ${death_data.death_date}. Penyebab: ${death_data.cause_of_death}`,
        type: 'alert',
        category: 'kesehatan',
        action_url: '/tortoise'
      });
    }

    return Response.json({ success: true, deathRecord });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});