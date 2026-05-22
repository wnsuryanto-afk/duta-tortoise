import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Recalculate current_eggs di semua inkubator
    const incubators = await base44.asServiceRole.entities.Incubator.list();
    const breedingRecords = await base44.asServiceRole.entities.Breeding.list();
    
    // Filter breeding yang sedang inkubasi
    const activeIncubations = breedingRecords.filter(b => 
      b.status === 'inkubasi' || b.status === 'bertelur'
    );
    
    // Group by incubator_name
    const eggsByIncubator = {};
    activeIncubations.forEach(b => {
      const incubatorName = b.incubator_name;
      if (!incubatorName) return;
      if (!eggsByIncubator[incubatorName]) {
        eggsByIncubator[incubatorName] = 0;
      }
      eggsByIncubator[incubatorName] += (b.egg_count || 0);
    });
    
    let updatedCount = 0;
    for (const incubator of incubators) {
      const currentEggs = eggsByIncubator[incubator.name] || 0;
      if (currentEggs !== incubator.current_eggs) {
        await base44.asServiceRole.entities.Incubator.update(incubator.id, {
          current_eggs: currentEggs
        });
        updatedCount++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Recalculated ${updatedCount} incubators`,
      details: {
        total_breeding_records: breedingRecords.length,
        active_incubations: activeIncubations.length,
        incubators_updated: updatedCount,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});