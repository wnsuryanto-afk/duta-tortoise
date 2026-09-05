import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { BATAS_AMBIL } from "../../shared/batas.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["admin", "owner", "manajer"].includes(user.role)) {
      return Response.json({ error: 'Akses ditolak. Hanya admin/owner/manajer.' }, { status: 403 });
    }

    const log = [];
    let hapusDuplikatCount = 0;
    let autoGabungCount = 0;
    let itemUsagePindahCount = 0;
    const duplikatSatuanBeda = [];

    // ─── HELPER: pindahkan ItemUsage dari lama ke master ─────────────────────
    async function pindahItemUsage(oldId, oldName, masterId, masterName, itemType) {
      const usages = await base44.asServiceRole.entities.ItemUsage.filter({ item_id: oldId }, null, BATAS_AMBIL);
      for (const usage of usages) {
        await base44.asServiceRole.entities.ItemUsage.update(usage.id, {
          item_id: masterId,
          item_name: masterName,
        });
        itemUsagePindahCount++;
      }
      if (usages.length > 0) {
        log.push(`  → Pindah ${usages.length} ItemUsage dari "${oldName}" ke "${masterName}"`);
      }
    }

    // ─── STEP 1: HAPUS ITEM BERTAG [DUPLIKAT-HAPUS] ─────────────────────────
    log.push("=== STEP 1: Hapus item bertag [DUPLIKAT-HAPUS] ===");

    // FeedStock
    const allFeed = await base44.asServiceRole.entities.FeedStock.list("-created_date", 500);
    const feedTagged = allFeed.filter(i => i.name && i.name.startsWith("[DUPLIKAT-HAPUS]"));
    const feedNormal = allFeed.filter(i => i.name && !i.name.startsWith("[DUPLIKAT-HAPUS]"));

    for (const tagged of feedTagged) {
      const cleanName = tagged.name.replace("[DUPLIKAT-HAPUS]", "").trim();
      const master = feedNormal.find(i => i.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (master) {
        log.push(`FeedStock: Hapus "${tagged.name}" → master: "${master.name}" (ID: ${master.id})`);
        await pindahItemUsage(tagged.id, tagged.name, master.id, master.name, "feedstock");
        await base44.asServiceRole.entities.FeedStock.delete(tagged.id);
        hapusDuplikatCount++;
      } else {
        log.push(`FeedStock: [SKIP] Tidak ada master untuk "${tagged.name}" - tidak dihapus`);
      }
    }

    // WarehouseItem
    const allWH = await base44.asServiceRole.entities.WarehouseItem.list("-created_date", 500);
    const whTagged = allWH.filter(i => i.name && i.name.startsWith("[DUPLIKAT-HAPUS]"));
    const whNormal = allWH.filter(i => i.name && !i.name.startsWith("[DUPLIKAT-HAPUS]"));

    for (const tagged of whTagged) {
      const cleanName = tagged.name.replace("[DUPLIKAT-HAPUS]", "").trim();
      const master = whNormal.find(i => i.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (master) {
        log.push(`WarehouseItem: Hapus "${tagged.name}" → master: "${master.name}" (ID: ${master.id})`);
        await pindahItemUsage(tagged.id, tagged.name, master.id, master.name, "warehouse");
        await base44.asServiceRole.entities.WarehouseItem.delete(tagged.id);
        hapusDuplikatCount++;
      } else {
        log.push(`WarehouseItem: [SKIP] Tidak ada master untuk "${tagged.name}" - tidak dihapus`);
      }
    }

    // ─── STEP 2: DETEKSI DUPLIKAT NAMA SERUPA ──────────────────────────────
    log.push("\n=== STEP 2: Deteksi & gabung duplikat nama serupa ===");

    // Reload setelah hapus
    const freshFeed = await base44.asServiceRole.entities.FeedStock.list("-created_date", 500);
    const freshWH = await base44.asServiceRole.entities.WarehouseItem.list("-created_date", 500);

    async function prosesDuplikat(items, entityName, Entity) {
      const grouped = {};
      for (const item of items) {
        const key = item.name.trim().toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }

      for (const [key, group] of Object.entries(grouped)) {
        if (group.length < 2) continue;

        // Urutkan: yang lebih lama = master (created_date terkecil)
        group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        const master = group[0];
        const dupes = group.slice(1);

        for (const dupe of dupes) {
          if (master.unit === dupe.unit) {
            // AUTO GABUNG: satuan sama
            log.push(`${entityName}: AUTO-GABUNG "${dupe.name}" (${dupe.unit}) ke master ID ${master.id}`);
            const newStock = (master.current_stock || 0) + (dupe.current_stock || 0);
            const updates = {
              current_stock: newStock,
              photo_url: master.photo_url || dupe.photo_url || undefined,
            };
            // Ambil harga non-null
            if (!master.purchase_price && dupe.purchase_price) updates.purchase_price = dupe.purchase_price;
            if (!master.price_per_unit && dupe.price_per_unit) updates.price_per_unit = dupe.price_per_unit;

            await Entity.update(master.id, updates);
            await pindahItemUsage(dupe.id, dupe.name, master.id, master.name, entityName);
            await Entity.delete(dupe.id);
            autoGabungCount++;
            log.push(`  → Stok gabung: ${master.current_stock} + ${dupe.current_stock} = ${newStock} ${master.unit}`);
          } else {
            // Satuan BEDA -> catat untuk ditampilkan ke user
            duplikatSatuanBeda.push({
              entityName,
              itemA: { id: master.id, name: master.name, unit: master.unit, category: master.category, current_stock: master.current_stock },
              itemB: { id: dupe.id, name: dupe.name, unit: dupe.unit, category: dupe.category, current_stock: dupe.current_stock },
            });
            log.push(`${entityName}: SATUAN BEDA - "${master.name}" (${master.unit}) vs "${dupe.name}" (${dupe.unit}) -> tunggu keputusan user`);
          }
        }
      }
    }

    await prosesDuplikat(freshFeed, "feedstock", base44.asServiceRole.entities.FeedStock);
    await prosesDuplikat(freshWH, "warehouse", base44.asServiceRole.entities.WarehouseItem);

    // Penulisan hasil deteksi ke CompanySettings dihapus. Tiga alasan:
    //   1. Kolom `notes` tidak ada di skema CompanySettings, jadi JSON-nya
    //      dibuang diam-diam — tidak pernah benar-benar tersimpan.
    //   2. Komentarnya menyebut baris "duplikat_pending", tapi kodenya menulis
    //      ke baris "main" — pengaturan perusahaan yang sebenarnya.
    //   3. Tidak ada satu pun layar yang membacanya kembali.
    // Datanya tetap tersedia: `duplikatSatuanBeda` sudah ikut dikembalikan di
    // ringkasan hasil di bawah, yang memang dibaca pemanggilnya.

    const summary = {
      hapusDuplikatCount,
      autoGabungCount,
      itemUsagePindahCount,
      duplikatSatuanBedaCount: duplikatSatuanBeda.length,
      duplikatSatuanBeda,
      log,
      triggeredBy: user.email,
      triggeredAt: new Date().toISOString(),
    };

    return Response.json({ success: true, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});