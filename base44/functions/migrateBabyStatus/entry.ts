/**
 * Migrasi sekali: ubah Tortoise dengan status="baby" menjadi status="aktif"
 * Pertahankan age_category="baby" agar kategori umur tidak hilang.
 * Hanya mengubah kura yang masih aktif (bukan mati/terjual/breeding/diarsipkan).
 * Hanya boleh dipanggil oleh admin.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const db = base44.asServiceRole;
    const allTortoises = await db.entities.Tortoise.list('-created_date', 1000);

    // Hanya kura dengan status="baby" (bukan mati/terjual/breeding)
    const babyStatusTortoises = allTortoises.filter(t => t.status === 'baby');

    const updates = [];
    for (const t of babyStatusTortoises) {
      updates.push(
        db.entities.Tortoise.update(t.id, {
          status: 'aktif',
          age_category: 'baby', // Pertahankan kategori umur
        })
      );
    }

    await Promise.all(updates);

    return Response.json({
      ok: true,
      migrated: babyStatusTortoises.length,
      names: babyStatusTortoises.map(t => t.name),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});