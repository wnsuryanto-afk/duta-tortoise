/**
 * Sinkronisasi employee_name ke semua entitas yang menyimpan denormalisasi nama karyawan.
 * Dipanggil saat UserProfile.full_name diubah.
 * Payload: { employee_email, new_name }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { employee_email, new_name } = await req.json();
    if (!employee_email || !new_name) {
      return Response.json({ error: 'employee_email dan new_name wajib diisi' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const updates = [];

    const entities = [
      { name: 'DailyChecklist', field: 'employee_name', emailField: 'employee_email' },
      { name: 'Attendance',     field: 'employee_name', emailField: 'employee_email' },
      { name: 'Kasbon',         field: 'employee_name', emailField: 'employee_email' },
      { name: 'OvertimeLog',    field: 'employee_name', emailField: 'employee_email' },
      { name: 'VegetablePickup',field: 'employee_name', emailField: 'employee_email' },
      { name: 'SalarySlip',     field: 'employee_name', emailField: 'employee_email' },
      { name: 'BonusReward',    field: 'employee_name', emailField: 'employee_email' },
    ];

    for (const entity of entities) {
      const records = await db.entities[entity.name].filter({ [entity.emailField]: employee_email });
      for (const r of records) {
        if (r[entity.field] !== new_name) {
          updates.push(db.entities[entity.name].update(r.id, { [entity.field]: new_name }));
        }
      }
    }

    await Promise.all(updates);

    return Response.json({ ok: true, updated: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});