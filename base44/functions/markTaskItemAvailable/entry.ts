import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { BATAS_AMBIL } from "../../shared/batas.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['owner', 'admin', 'manajer'].includes(user.role)) {
      return Response.json({ error: 'Forbidden — hanya owner/admin/manajer' }, { status: 403 });
    }

    const { task_id, item_index } = await req.json();

    const task = await base44.asServiceRole.entities.IncidentalTask.get(task_id);
    if (!task) return Response.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    const items = task.required_items || [];
    if (typeof item_index !== 'number' || item_index < 0 || item_index >= items.length) {
      return Response.json({ error: 'Index barang tidak valid' }, { status: 400 });
    }

    // Tandai barang ini sebagai tersedia
    items[item_index].is_available = true;
    items[item_index].marked_available_by = user.full_name || user.email;
    items[item_index].marked_available_at = new Date().toISOString();

    const allAvailable = items.length > 0 && items.every((i) => i.is_available);
    const wasWaiting = task.material_status === 'waiting_materials';

    const updates = { required_items: items };
    if (allAvailable && wasWaiting) {
      updates.material_status = 'ready';
    }

    await base44.asServiceRole.entities.IncidentalTask.update(task_id, updates);

    // Jika semua barang baru saja terpenuhi → notifikasi karyawan yang ditugaskan
    let notified = false;
    if (allAvailable && wasWaiting) {
      let targets = [];
      if (task.assigned_to_email) {
        targets = [task.assigned_to_email];
      } else {
        // "Siapa saja" → notifikasi semua keeper/kepala_feeder
        const users = await base44.asServiceRole.entities.User.list(null, BATAS_AMBIL);
        targets = users
          .filter((u) => ['keeper', 'kepala_feeder'].includes(u.role))
          .map((u) => u.email);
      }

      const nowIso = new Date().toISOString();
      for (const email of targets) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: email,
          title: '✅ Barang Siap — Tugas Bisa Dikerjakan',
          message: `Barang untuk tugas "${task.title}" sudah tersedia. Tugas bisa dikerjakan sekarang.`,
          type: 'success',
          priority: 'sedang',
          category: 'sistem',
          action_label: 'Lihat Tugas',
          action_url: '/',
          related_entity_id: task_id,
          related_entity_type: 'IncidentalTask',
          is_read: false,
          is_dismissed: false,
          created_at: nowIso,
        });
      }
      notified = targets.length > 0;
    }

    return Response.json({
      success: true,
      material_status: allAvailable ? 'ready' : 'waiting_materials',
      notified,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});