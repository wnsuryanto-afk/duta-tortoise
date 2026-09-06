import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Dipanggil via entity automation saat ToolRequest diupdate.
// - Disetujui → buat ShoppingList + notif pengaju
// - Ditolak → notif pengaju dengan alasan
// - Dibeli → notif pengaju
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: reqItem, old_data, event } = body;

    if (!reqItem || event?.type !== 'update') {
      return Response.json({ skipped: true });
    }

    const oldStatus = old_data?.status;
    const newStatus = reqItem.status;

    if (oldStatus === newStatus) {
      return Response.json({ skipped: 'no_status_change' });
    }

    const now = new Date().toISOString();

    // ── Disetujui → buat ShoppingList + notif ──
    if (newStatus === 'disetujui') {
      if (!reqItem.shopping_list_id) {
        const sl = await base44.asServiceRole.entities.ShoppingList.create({
          nama_barang: reqItem.tool_name,
          jumlah: reqItem.quantity || 1,
          satuan: 'pcs',
          priority: 'segera',
          status: 'belum_dibeli',
          notes: `Pengajuan karyawan: ${reqItem.requester_name}. Alasan: ${reqItem.reason}. ${reqItem.notes || ''}`,
        });
        await base44.asServiceRole.entities.ToolRequest.update(reqItem.id, {
          shopping_list_id: sl.id,
        });
      }

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: reqItem.requester_email,
        title: `Pengajuan Alat Disetujui: ${reqItem.tool_name}`,
        message: `Pengajuan alat "${reqItem.tool_name}" disetujui oleh ${reqItem.approved_by || 'admin'} dan masuk daftar belanja.`,
        type: 'success',
        priority: 'sedang',
        category: 'sistem',
        action_label: 'Lihat',
        action_url: '/alat-kerja',
        related_entity_id: reqItem.id,
        related_entity_type: 'ToolRequest',
        is_read: false,
        is_dismissed: false,
        created_at: now,
      });
    }

    // ── Ditolak → notif pengaju ──
    if (newStatus === 'ditolak') {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: reqItem.requester_email,
        title: `Pengajuan Alat Ditolak: ${reqItem.tool_name}`,
        message: `Pengajuan alat "${reqItem.tool_name}" ditolak. Alasan: ${reqItem.rejection_reason || 'tidak disebutkan'}.`,
        type: 'warning',
        priority: 'sedang',
        category: 'sistem',
        action_url: '/alat-kerja',
        related_entity_id: reqItem.id,
        related_entity_type: 'ToolRequest',
        is_read: false,
        is_dismissed: false,
        created_at: now,
      });
    }

    // ── Dibeli → notif pengaju ──
    if (newStatus === 'dibeli') {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: reqItem.requester_email,
        title: `Alat Dibeli: ${reqItem.tool_name}`,
        message: `Alat "${reqItem.tool_name}" sudah dibeli dan siap digunakan.`,
        type: 'success',
        priority: 'sedang',
        category: 'sistem',
        action_url: '/alat-kerja',
        related_entity_id: reqItem.id,
        related_entity_type: 'ToolRequest',
        is_read: false,
        is_dismissed: false,
        created_at: now,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});