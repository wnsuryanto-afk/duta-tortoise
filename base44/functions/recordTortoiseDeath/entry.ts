import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { segarkanIsiKandang } from "../../shared/isiKandang.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tortoise_id, death_data } = await req.json();

    // 1. Ambil data tortoise sebelum update
    const tortoiseBefore = await base44.asServiceRole.entities.Tortoise.get(tortoise_id);
    
    // 2. Buat DeathRecord
    const deathRecord = await base44.asServiceRole.entities.DeathRecord.create({
      ...death_data,
      tortoise_id: tortoise_id,
      recorded_by: user.full_name || user.email
    });

    // 3. Update status tortoise ke "mati"
    await base44.asServiceRole.entities.Tortoise.update(tortoise_id, {
      status: 'mati',
      is_currently_sick: false,
      previous_status: tortoiseBefore?.status || 'aktif',
      last_status_change: death_data.death_date || new Date().toISOString().split("T")[0],
    });

    // 4. Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action: 'update',
      entity_type: 'Tortoise',
      entity_id: tortoise_id,
      entity_name: death_data.tortoise_name,
      changes: {
        before: { status: tortoiseBefore?.status },
        after: { status: 'mati' }
      },
      notes: `Status diubah ke "mati" - DeathRecord created: ${deathRecord.id}`,
      timestamp: new Date().toISOString()
    });

    // 4. Update enclosure count
    //
    // Sebelumnya baris ini memanggil Enclosure.get(tortoise.enclosure).
    // `enclosure` berisi NAMA kandang sementara .get() menerima NOMOR, jadi
    // pencariannya tidak pernah ketemu dan isi kandang tidak pernah berkurang
    // saat ada kura mati. Angkanya karena itu hanya bisa naik, dan kandang bisa
    // dinyatakan penuh padahal penghuninya sudah tidak ada.
    const tortoise = await base44.asServiceRole.entities.Tortoise.get(tortoise_id);
    await segarkanIsiKandang(base44.asServiceRole,
      tortoise?.enclosure ? [tortoise.enclosure] : null);

    // 5. Kirim notifikasi ke owner
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