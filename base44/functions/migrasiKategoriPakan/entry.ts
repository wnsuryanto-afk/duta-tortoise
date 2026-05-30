import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    // mode: "preview" | "migrasi_satu" | "ganti_kategori" | "migrasi_semua"
    const { mode, itemId, feedCategory, gantiKategori } = body;

    const log = [];

    // Helper: cari semua WarehouseItem kategori pakan
    const getItemsPakan = async () => {
      const all = await base44.asServiceRole.entities.WarehouseItem.list();
      return all.filter(i => i.category === 'pakan');
    };

    // Helper: pindah satu item dari WarehouseItem ke FeedStock + remap ItemUsage
    const pindahkanSatuItem = async (item, tujuanKategori) => {
      // Buat FeedStock baru
      const feedPayload = {
        name: item.name,
        category: tujuanKategori || 'lainnya',
        unit: item.unit || 'kg',
        current_stock: item.current_stock || 0,
        minimum_stock: item.minimum_stock || 1,
        price_per_unit: item.purchase_price || 0,
        daily_ideal: 0,
        supplier: item.supplier || '',
        is_mandatory: item.is_mandatory || false,
        storage_location: 'gudang',
        notes: item.notes || '',
        photo_url: item.photo_url || '',
        sku: item.sku || '',
        last_edited_by: user.email,
        last_edited_at: new Date().toISOString(),
      };
      const newFeed = await base44.asServiceRole.entities.FeedStock.create(feedPayload);

      // Remap semua ItemUsage yang merujuk item lama
      let usagePindah = 0;
      const allUsage = await base44.asServiceRole.entities.ItemUsage.filter({ item_id: item.id });
      for (const u of allUsage) {
        await base44.asServiceRole.entities.ItemUsage.update(u.id, {
          item_id: newFeed.id,
          item_type: 'feedstock',
          item_name: newFeed.name,
          item_sku: newFeed.sku || '',
        });
        usagePindah++;
      }

      // Hapus WarehouseItem lama
      await base44.asServiceRole.entities.WarehouseItem.delete(item.id);

      log.push(`✅ Pindah "${item.name}" → FeedStock (${tujuanKategori}), ${usagePindah} ItemUsage diremap`);
      return { newFeedId: newFeed.id, usagePindah };
    };

    if (mode === 'preview') {
      const items = await getItemsPakan();
      return Response.json({
        success: true,
        items: items.map(i => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
          current_stock: i.current_stock,
          category: i.category,
          sku: i.sku,
          purchase_price: i.purchase_price,
        })),
        count: items.length,
      });
    }

    if (mode === 'migrasi_satu') {
      const item = await base44.asServiceRole.entities.WarehouseItem.filter({ id: itemId });
      if (!item || item.length === 0) {
        return Response.json({ error: 'Item tidak ditemukan' }, { status: 404 });
      }
      const result = await pindahkanSatuItem(item[0], feedCategory || 'lainnya');
      return Response.json({ success: true, log, ...result });
    }

    if (mode === 'ganti_kategori') {
      if (!itemId || !gantiKategori) return Response.json({ error: 'itemId dan gantiKategori wajib diisi' }, { status: 400 });
      await base44.asServiceRole.entities.WarehouseItem.update(itemId, {
        category: gantiKategori,
        last_edited_by: user.email,
        last_edited_at: new Date().toISOString(),
      });
      log.push(`🔄 Kategori item ID ${itemId} diubah menjadi "${gantiKategori}"`);
      return Response.json({ success: true, log });
    }

    if (mode === 'migrasi_semua') {
      const items = await getItemsPakan();
      let totalPindah = 0;
      let totalUsage = 0;
      for (const item of items) {
        const res = await pindahkanSatuItem(item, feedCategory || 'lainnya');
        totalPindah++;
        totalUsage += res.usagePindah;
      }
      return Response.json({
        success: true,
        log,
        summary: {
          totalPindah,
          totalUsage,
        },
      });
    }

    return Response.json({ error: 'mode tidak dikenal' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});