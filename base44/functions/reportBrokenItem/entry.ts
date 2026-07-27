import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Dipanggil oleh keeper/kepala_feeder saat menekan "Lapor Rusak" pada item gudang.
// 1. Update WarehouseItem: condition, condition_note, condition_photo_url, pelapor, tanggal, needs_replacement
// 2. Auto-create ToolRequest (status menunggu, reason rusak) → ikut alur approval yang sudah ada
// 3. Notifikasi ke semua owner & manajer
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['keeper', 'kepala_feeder'].includes(user.role)) {
      return Response.json({ error: 'Hanya keeper/kepala_feeder yang bisa lapor rusak' }, { status: 403 });
    }

    const body = await req.json();
    const { warehouse_item_id, condition, condition_note, condition_photo_url } = body;

    if (!warehouse_item_id || !condition) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const item = await base44.asServiceRole.entities.WarehouseItem.get(warehouse_item_id);
    if (!item) return Response.json({ error: 'Item tidak ditemukan' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 1. Update condition pada WarehouseItem
    await base44.asServiceRole.entities.WarehouseItem.update(warehouse_item_id, {
      condition,
      condition_note: condition_note || '',
      condition_photo_url: condition_photo_url || '',
      condition_reported_by: user.full_name || user.email,
      condition_reported_at: today,
      needs_replacement: condition === 'rusak_berat' || condition === 'hilang',
    });

    // 2. Auto-create ToolRequest (ikuti alur approval yang sudah ada)
    const toolRequest = await base44.asServiceRole.entities.ToolRequest.create({
      tool_name: item.name,
      requester_name: user.full_name || user.email,
      requester_email: user.email,
      reason: 'rusak',
      quantity: 1,
      photo_url: condition_photo_url || '',
      notes: `Lapor rusak dari gudang: ${condition_note || ''}`.trim(),
      request_date: today,
      status: 'menunggu',
    });

    // 3. Notifikasi ke semua owner & manajer
    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users.filter((u) => ['owner', 'manajer'].includes(u.role));

    const condLabel = condition === 'rusak_berat' ? 'Rusak berat' : condition === 'hilang' ? 'Hilang' : 'Rusak ringan';
    const reporterName = user.full_name || user.email;

    for (const recipient of recipients) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: recipient.email,
        title: `🔴 ${reporterName} melaporkan ${item.name} rusak`,
        message: `${reporterName} melaporkan ${item.name} (${condLabel}) — pengajuan barang baru menunggu persetujuan.`,
        type: 'alert',
        priority: 'sedang',
        category: 'stok',
        action_label: 'Lihat Pengajuan',
        action_url: '/alat-kerja',
        related_entity_id: toolRequest.id,
        related_entity_type: 'ToolRequest',
        is_read: false,
        is_dismissed: false,
        created_at: now,
      });
    }

    return Response.json({ success: true, tool_request_id: toolRequest.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});