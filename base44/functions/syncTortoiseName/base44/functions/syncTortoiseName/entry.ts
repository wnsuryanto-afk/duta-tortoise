/**
 * Sinkronisasi tortoise_name ke semua entitas yang menyimpan denormalisasi nama.
 * Dipanggil saat Tortoise.name diubah.
 * Payload: { tortoise_id, old_name, new_name }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { BATAS_AMBIL } from "../../shared/batas.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tortoise_id, new_name } = await req.json();
    if (!tortoise_id || !new_name) {
      return Response.json({ error: 'tortoise_id dan new_name wajib diisi' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const updates = [];

    // HealthRecord
    const healthRecords = await db.entities.HealthRecord.filter({ tortoise_id }, null, BATAS_AMBIL);
    for (const r of healthRecords) {
      if (r.tortoise_name !== new_name) {
        updates.push(db.entities.HealthRecord.update(r.id, { tortoise_name: new_name }));
      }
    }

    // Sale
    const sales = await db.entities.Sale.filter({ tortoise_id }, null, BATAS_AMBIL);
    for (const s of sales) {
      if (s.tortoise_name !== new_name) {
        updates.push(db.entities.Sale.update(s.id, { tortoise_name: new_name }));
      }
    }

    // MeasurementHistory
    const measurements = await db.entities.MeasurementHistory.filter({ tortoise_id }, null, BATAS_AMBIL);
    for (const m of measurements) {
      if (m.tortoise_name !== new_name) {
        updates.push(db.entities.MeasurementHistory.update(m.id, { tortoise_name: new_name }));
      }
    }

    // EnclosureHistory
    const enclosureHistory = await db.entities.EnclosureHistory.filter({ tortoise_id }, null, BATAS_AMBIL);
    for (const e of enclosureHistory) {
      if (e.tortoise_name !== new_name) {
        updates.push(db.entities.EnclosureHistory.update(e.id, { tortoise_name: new_name }));
      }
    }

    // DeathRecord
    const deathRecords = await db.entities.DeathRecord.filter({ tortoise_id }, null, BATAS_AMBIL);
    for (const d of deathRecords) {
      if (d.tortoise_name !== new_name) {
        updates.push(db.entities.DeathRecord.update(d.id, { tortoise_name: new_name }));
      }
    }

    // TreatmentLog
    const treatmentLogs = await db.entities.TreatmentLog.filter({ tortoise_id }, null, BATAS_AMBIL);
    for (const t of treatmentLogs) {
      if (t.tortoise_name !== new_name) {
        updates.push(db.entities.TreatmentLog.update(t.id, { tortoise_name: new_name }));
      }
    }

    await Promise.all(updates);

    return Response.json({ ok: true, updated: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});