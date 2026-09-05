import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { BATAS_AMBIL } from "../../shared/batas.ts";

/**
 * Endpoint untuk menyelesaikan duplikat satuan beda.
 * Payload:
 *   action: "gabung_a" | "gabung_b" | "pisah"
 *   idA: string
 *   idB: string
 *   entityName: "feedstock" | "warehouse"
 *   namaBaruB?: string  (untuk action "pisah", nama baru untuk item B)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["admin", "owner", "manajer"].includes(user.role)) {
      return Response.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { action, idA, idB, entityName, namaBaruB, satuanBaruB } = await req.json();
    const Entity = entityName === "feedstock"
      ? base44.asServiceRole.entities.FeedStock
      : base44.asServiceRole.entities.WarehouseItem;

    const itemA = await Entity.get ? await Entity.get(idA) : (await Entity.filter({ id: idA }))[0];
    const itemB = await Entity.get ? await Entity.get(idB) : (await Entity.filter({ id: idB }))[0];

    if (!itemA || !itemB) {
      return Response.json({ error: 'Item tidak ditemukan.' }, { status: 404 });
    }

    let itemUsagePindah = 0;

    async function pindahUsage(fromId, fromName, toId, toName) {
      const usages = await base44.asServiceRole.entities.ItemUsage.filter({ item_id: fromId }, null, BATAS_AMBIL);
      for (const u of usages) {
        await base44.asServiceRole.entities.ItemUsage.update(u.id, { item_id: toId, item_name: toName });
        itemUsagePindah++;
      }
    }

    if (action === "gabung_a") {
      // B -> A: pakai satuan A, master = A
      const newStock = (itemA.current_stock || 0) + (itemB.current_stock || 0);
      await Entity.update(idA, {
        current_stock: newStock,
        photo_url: itemA.photo_url || itemB.photo_url || undefined,
      });
      await pindahUsage(idB, itemB.name, idA, itemA.name);
      await Entity.delete(idB);
      return Response.json({ success: true, message: `Digabung ke "${itemA.name}" (${itemA.unit}). Stok baru: ${newStock}. ItemUsage dipindah: ${itemUsagePindah}`, itemUsagePindah });

    } else if (action === "gabung_b") {
      // A -> B: pakai satuan B, master = B
      const newStock = (itemB.current_stock || 0) + (itemA.current_stock || 0);
      await Entity.update(idB, {
        current_stock: newStock,
        photo_url: itemB.photo_url || itemA.photo_url || undefined,
      });
      await pindahUsage(idA, itemA.name, idB, itemB.name);
      await Entity.delete(idA);
      return Response.json({ success: true, message: `Digabung ke "${itemB.name}" (${itemB.unit}). Stok baru: ${newStock}. ItemUsage dipindah: ${itemUsagePindah}`, itemUsagePindah });

    } else if (action === "pisah") {
      // Rename (dan opsional ganti satuan) item B agar berbeda
      const newName = namaBaruB || `${itemB.name} (${itemB.unit})`;
      const updatePayload = { name: newName };
      if (satuanBaruB) updatePayload.unit = satuanBaruB;
      await Entity.update(idB, updatePayload);
      return Response.json({ success: true, message: `Item B diubah: nama "${newName}"${satuanBaruB ? `, satuan "${satuanBaruB}"` : ""}. Keduanya tetap terpisah.` });

    } else {
      return Response.json({ error: 'Action tidak valid.' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});