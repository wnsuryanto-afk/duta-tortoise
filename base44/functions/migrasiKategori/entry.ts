import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["admin", "owner"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, itemId, feedCategory, newCategory, targetSku } = body;

    const whItem = await base44.asServiceRole.entities.WarehouseItem.filter({ id: itemId });
    const item = whItem[0];
    if (!item) return Response.json({ error: "Item tidak ditemukan" }, { status: 404 });

    if (action === "ubah_kategori") {
      await base44.asServiceRole.entities.WarehouseItem.update(itemId, { category: newCategory });
      return Response.json({ success: true, message: `Kategori diubah ke ${newCategory}` });
    }

    if (action === "pindah_ke_feedstock") {
      // Create FeedStock from WarehouseItem data
      const feedData = {
        name: item.name,
        category: feedCategory || "lainnya",
        unit: item.unit,
        current_stock: item.current_stock || 0,
        minimum_stock: item.minimum_stock || 1,
        price_per_unit: item.purchase_price || 0,
        daily_ideal: 0,
        supplier: item.supplier || "",
        notes: item.notes || "",
        photo_url: item.photo_url || "",
        sku: targetSku || "",
        is_mandatory: item.is_mandatory || false,
        storage_location: "gudang",
        last_edited_by: user.email,
        last_edited_at: new Date().toISOString(),
      };
      const newFeed = await base44.asServiceRole.entities.FeedStock.create(feedData);

      // Remap ItemUsage yang merujuk ke WarehouseItem ini
      const usages = await base44.asServiceRole.entities.ItemUsage.filter({ item_id: itemId });
      let usageMoved = 0;
      for (const u of usages) {
        await base44.asServiceRole.entities.ItemUsage.update(u.id, {
          item_id: newFeed.id,
          item_type: "feedstock",
        });
        usageMoved++;
      }

      // Hapus WarehouseItem lama
      await base44.asServiceRole.entities.WarehouseItem.delete(itemId);

      return Response.json({
        success: true,
        message: `${item.name} berhasil dipindah ke Stok Pakan`,
        usageMoved,
        newFeedId: newFeed.id,
      });
    }

    return Response.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});