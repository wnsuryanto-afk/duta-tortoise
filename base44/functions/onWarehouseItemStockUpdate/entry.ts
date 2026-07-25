import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Dipanggil via entity automation saat WarehouseItem diupdate.
// Deteksi saat item obat/vitamin/suplemen MELINTASI batas minimum (dari atas ke bawah)
// atau saat stok menjadi 0. Kirim notifikasi sekali per crossing ke owner/manajer/admin.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: item, old_data, event } = body;

    if (!item || event?.type !== 'update') {
      return Response.json({ skipped: true });
    }

    // Hanya obat/vitamin/suplemen
    if (!['obat', 'vitamin', 'suplemen'].includes(item.category)) {
      return Response.json({ skipped: 'not_medical' });
    }

    const oldStock = Number(old_data?.current_stock ?? 0);
    const newStock = Number(item.current_stock ?? 0);
    const minStock = Number(item.minimum_stock ?? 0);

    // Deteksi crossing: dari atas min ke at/bawah min, atau dari atas 0 ke 0
    const crossedMin = oldStock > minStock && newStock <= minStock;
    const hitZero = oldStock > 0 && newStock <= 0;

    if (!crossedMin && !hitZero) {
      return Response.json({ skipped: 'no_threshold_crossing' });
    }

    // Anti-duplikat: cek apakah sudah ada notifikasi aktif (belum dismissed) untuk item ini
    const existing = await base44.asServiceRole.entities.Notification.filter({
      related_entity_id: item.id,
      related_entity_type: 'WarehouseItem',
      category: 'stok',
      is_dismissed: false,
    });
    // Skip jika masih ada notifikasi belum dismissed (artinya stok belum recover)
    if (existing.length > 0) {
      return Response.json({ skipped: 'active_notification_exists' });
    }

    // Ambil semua user owner/manajer/admin
    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users.filter(u => ['owner', 'manajer', 'admin'].includes(u.role));

    const isHabis = newStock <= 0;
    const statusLabel = isHabis ? 'HABIS' : 'menipis';
    const now = new Date().toISOString();
    const unit = item.unit || '';

    // Buat notifikasi untuk setiap recipient
    for (const recipient of recipients) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: recipient.email,
        title: `${isHabis ? '🔴' : '⚠️'} Stok ${item.name} ${statusLabel}`,
        message: `Stok ${item.name}${item.sku ? ` (${item.sku})` : ''} ${statusLabel}: ${newStock} ${unit} (min: ${minStock} ${unit}). Segera beli/restock.`,
        type: isHabis ? 'alert' : 'warning',
        priority: isHabis ? 'tinggi' : 'sedang',
        category: 'stok',
        action_label: 'Lihat Stok',
        action_url: '/harus-dibeli',
        related_entity_id: item.id,
        related_entity_type: 'WarehouseItem',
        is_read: false,
        is_dismissed: false,
        created_at: now,
      });
    }

    return Response.json({ success: true, recipients: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});