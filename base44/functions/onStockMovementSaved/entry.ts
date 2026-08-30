import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { perluDiperhatikan } from "../../shared/stok.ts";

// Dipanggil via entity automation saat StockMovement dibuat
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: movement, event } = body;

    if (!movement || event?.type !== "create") return Response.json({ skipped: true });

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const isDuplicate = async (email, entityId, category) => {
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: email,
        related_entity_id: entityId,
        category,
      });
      return existing.some(n => n.created_at?.startsWith(today) && !n.is_dismissed);
    };

    const allUsers = await base44.asServiceRole.entities.User.list();

    // ── 3C. STOK KELUAR MENUNGGU APPROVAL ──
    if (movement.status === "menunggu_approval") {
      const admins = allUsers.filter(u => ["admin", "owner"].includes(u.role));
      for (const admin of admins) {
        if (await isDuplicate(admin.email, movement.id, "stok")) continue;
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: admin.email,
          title: "Permintaan Stok Perlu Disetujui",
          message: `${movement.by_name || movement.by_email} minta keluarkan ${movement.quantity} ${movement.unit || ""} ${movement.item_name} senilai Rp ${Number(movement.total_value || 0).toLocaleString("id-ID")}. Nilai > Rp 500.000.`,
          type: "warning",
          priority: "tinggi",
          category: "stok",
          recipient_role: "admin",
          action_label: "Approve / Tolak",
          action_url: "/warehouse",
          related_entity_id: movement.id,
          related_entity_type: "StockMovement",
          is_read: false,
          is_dismissed: false,
          created_at: now,
        });
      }
    }

    // ── 2B. CEK STOK MENIPIS SETELAH KELUAR ──
    if (movement.type === "keluar" && movement.item_id && movement.item_type) {
      let item = null;
      if (movement.item_type === "warehouse") {
        const res = await base44.asServiceRole.entities.WarehouseItem.filter({ id: movement.item_id });
        item = res[0];
      } else if (movement.item_type === "feedstock") {
        const res = await base44.asServiceRole.entities.FeedStock.filter({ id: movement.item_id });
        item = res[0];
      }

      // Aturan yang sama dengan layar (../../shared/stok.ts). Versi lama
      // memakai `<= minimum_stock`, sehingga barang bermininum 0 yang stoknya
      // memang 0 memicu notifikasi tiap kali ada pergerakan.
      if (item && perluDiperhatikan(item)) {
        const admins = allUsers.filter(u => ["admin", "owner"].includes(u.role));
        const isHabis = item.current_stock === 0;
        for (const admin of admins) {
          if (await isDuplicate(admin.email, item.id, "stok")) continue;
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: admin.email,
            title: isHabis
              ? `STOK HABIS! — ${item.name}`
              : `Stok ${item.name} Menipis!`,
            message: `Stok tersisa ${item.current_stock} ${item.unit || ""}. Segera beli.`,
            type: isHabis ? "alert" : "warning",
            priority: "tinggi",
            category: "stok",
            recipient_role: "admin",
            action_label: "Lihat Stok",
            action_url: movement.item_type === "feedstock" ? "/feed-stock" : "/warehouse",
            related_entity_id: item.id,
            related_entity_type: movement.item_type === "feedstock" ? "FeedStock" : "WarehouseItem",
            is_read: false,
            is_dismissed: false,
            created_at: now,
          });
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});