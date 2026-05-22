import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tortoise_id, new_enclosure, old_enclosure, status, action_type } = await req.json();

    // Hitung enclosure yang seharusnya dihitung
    const activeStatuses = ['aktif', 'baby', 'sakit', 'breeding', 'karantina'];
    const shouldCount = activeStatuses.includes(status);

    if (action_type === 'create') {
      // Tortoise baru ditambahkan
      if (shouldCount && new_enclosure) {
        const enclosure = await base44.asServiceRole.entities.Enclosure.get(new_enclosure);
        if (enclosure) {
          await base44.asServiceRole.entities.Enclosure.update(new_enclosure, {
            current_count: (enclosure.current_count || 0) + 1
          });
        }
      }
    } else if (action_type === 'update') {
      // Cek perubahan enclosure
      if (old_enclosure !== new_enclosure) {
        // Kurangi dari enclosure lama
        if (old_enclosure) {
          const oldEnc = await base44.asServiceRole.entities.Enclosure.get(old_enclosure);
          if (oldEnc) {
            await base44.asServiceRole.entities.Enclosure.update(old_enclosure, {
              current_count: Math.max(0, (oldEnc.current_count || 0) - 1)
            });
          }
        }
        // Tambah ke enclosure baru
        if (new_enclosure && shouldCount) {
          const newEnc = await base44.asServiceRole.entities.Enclosure.get(new_enclosure);
          if (newEnc) {
            await base44.asServiceRole.entities.Enclosure.update(new_enclosure, {
              current_count: (newEnc.current_count || 0) + 1
            });
          }
        }
      }
      // Cek perubahan status (misal: jadi mati/terjual)
      else if (old_enclosure === new_enclosure && new_enclosure) {
        const wasActive = activeStatuses.includes(status); // status lama tidak diketahui, asumsi dari data baru
        // Kita perlu cek status lama - tapi untuk simplifikasi, recalc saja
        await recalculateEnclosureCount(base44, new_enclosure);
      }
    } else if (action_type === 'delete') {
      // Tortoise dihapus
      if (old_enclosure) {
        const enclosure = await base44.asServiceRole.entities.Enclosure.get(old_enclosure);
        if (enclosure) {
          await base44.asServiceRole.entities.Enclosure.update(old_enclosure, {
            current_count: Math.max(0, (enclosure.current_count || 0) - 1)
          });
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function recalculateEnclosureCount(base44, enclosure_id) {
  const tortoises = await base44.asServiceRole.entities.Tortoise.filter({
    enclosure: enclosure_id
  });
  
  const activeStatuses = ['aktif', 'baby', 'sakit', 'breeding', 'karantina'];
  const count = tortoises.filter(t => activeStatuses.includes(t.status)).length;
  
  await base44.asServiceRole.entities.Enclosure.update(enclosure_id, {
    current_count: count
  });
}