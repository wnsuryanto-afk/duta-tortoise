/**
 * onBreedingCreated — Auto-proven saat record Breeding baru dibuat
 * Dipanggil via entity automation pada event create/update Breeding
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: breeding } = body;

    if (!breeding) {
      return Response.json({ ok: true, skipped: "no breeding data" });
    }

    const today = new Date().toISOString().split("T")[0];
    const year = breeding.season_year || new Date().getFullYear();

    async function updateProven(tortoiseId, tortoiseName) {
      if (!tortoiseId && !tortoiseName) return;

      let tortoise = null;

      if (tortoiseId) {
        try {
          const list = await base44.asServiceRole.entities.Tortoise.filter({ id: tortoiseId });
          tortoise = list?.[0] || null;
        } catch (e) {
          console.warn("Lookup by id gagal:", e.message);
        }
      }

      // Fallback by name jika tidak ada by ID
      if (!tortoise && tortoiseName) {
        try {
          const byName = await base44.asServiceRole.entities.Tortoise.filter({ name: tortoiseName });
          if (byName && byName.length === 1) {
            tortoise = byName[0];
          } else if (byName && byName.length > 1) {
            console.warn(`Auto-proven skip: ditemukan ${byName.length} tortoise dengan nama "${tortoiseName}"`);
            return;
          }
        } catch (e) {
          console.warn("Lookup by name gagal:", e.message);
        }
      }

      if (!tortoise) {
        console.warn(`Tortoise tidak ditemukan untuk ${tortoiseId || tortoiseName}`);
        return;
      }

      const updateData = { last_breeding_id: breeding.id };
      if (!tortoise.is_proven) {
        updateData.is_proven = true;
        updateData.proven_year = year;
        console.log(`Auto-proven: ${tortoise.name} (${year})`);
      }

      await base44.asServiceRole.entities.Tortoise.update(tortoise.id, updateData);
    }

    await Promise.all([
      updateProven(breeding.male_id, breeding.male_name),
      updateProven(breeding.female_id, breeding.female_name),
    ]);

    return Response.json({ ok: true, breeding_id: breeding.id });
  } catch (error) {
    console.error("onBreedingCreated error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});