import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data, old_data, event } = payload;

    if (!data || !data.id) return Response.json({ ok: true, skip: "no data" });

    const triggerTypes = ["sakit", "obat"];
    const biayaObat = Number(data.biaya_obat || 0);
    const isTriggerType = triggerTypes.includes(data.type);
    const today = data.date || new Date().toISOString().split("T")[0];

    // ─── Auto-deduct stok dari treatment_items ─────────────────────
    const newItems = data.treatment_items || [];
    const oldItems = old_data?.treatment_items || [];

    for (const newIt of newItems) {
      const oldIt = oldItems.find(o => o.item_id === newIt.item_id);
      const oldQty = oldIt ? Number(oldIt.quantity || 0) : 0;
      const newQty = Number(newIt.quantity || 0);
      const diffQty = newQty - oldQty;

      if (diffQty === 0) continue;

      // Adjust stok WarehouseItem
      const whArr = await base44.asServiceRole.entities.WarehouseItem.filter({ id: newIt.item_id });
      const wh = whArr[0];
      if (wh) {
        const newStock = (wh.current_stock || 0) - diffQty;
        await base44.asServiceRole.entities.WarehouseItem.update(newIt.item_id, {
          current_stock: Math.max(0, newStock),
        });
      }

      // Buat StockMovement untuk selisih
      const diagDesc = (data.diagnosis || []).slice(0, 2).map(d => d.replace(/_/g, " ")).join(", ");
      const movNotes = `Treatment: ${data.tortoise_name || ""}${diagDesc ? " - " + diagDesc : ""}`;

      if (diffQty > 0) {
        // Penambahan qty → StockMovement keluar
        await base44.asServiceRole.entities.StockMovement.create({
          item_id: newIt.item_id,
          item_type: "warehouse",
          item_name: newIt.item_name,
          item_sku: newIt.item_sku || "",
          type: "keluar",
          quantity: diffQty,
          unit: newIt.unit,
          unit_price: newIt.unit_price || 0,
          total_value: diffQty * (newIt.unit_price || 0),
          by_email: data.last_edited_by || "sistem",
          by_name: data.last_edited_by || "Sistem",
          notes: movNotes,
          date: today,
          status: "selesai",
          source_ref: data.id,
          source_type: "health_record",
        });
      } else {
        // Pengurangan qty → StockMovement masuk (retur)
        await base44.asServiceRole.entities.StockMovement.create({
          item_id: newIt.item_id,
          item_type: "warehouse",
          item_name: newIt.item_name,
          item_sku: newIt.item_sku || "",
          type: "masuk",
          quantity: Math.abs(diffQty),
          unit: newIt.unit,
          unit_price: newIt.unit_price || 0,
          total_value: Math.abs(diffQty) * (newIt.unit_price || 0),
          by_email: data.last_edited_by || "sistem",
          by_name: data.last_edited_by || "Sistem",
          notes: `Retur (edit): ${movNotes}`,
          date: today,
          status: "selesai",
          source_ref: data.id,
          source_type: "health_record",
        });
      }
    }

    // Handle item yang dihapus dari treatment_items (qty jadi 0 / dihilangkan)
    for (const oldIt of oldItems) {
      const stillExists = newItems.find(n => n.item_id === oldIt.item_id);
      if (!stillExists) {
        // Item dihapus → kembalikan stok
        const oldQty = Number(oldIt.quantity || 0);
        if (oldQty > 0) {
          const whArr = await base44.asServiceRole.entities.WarehouseItem.filter({ id: oldIt.item_id });
          const wh = whArr[0];
          if (wh) {
            await base44.asServiceRole.entities.WarehouseItem.update(oldIt.item_id, {
              current_stock: (wh.current_stock || 0) + oldQty,
            });
          }
          const movNotes = `Retur (hapus item): Treatment ${data.tortoise_name || ""}`;
          await base44.asServiceRole.entities.StockMovement.create({
            item_id: oldIt.item_id,
            item_type: "warehouse",
            item_name: oldIt.item_name,
            item_sku: oldIt.item_sku || "",
            type: "masuk",
            quantity: oldQty,
            unit: oldIt.unit,
            unit_price: oldIt.unit_price || 0,
            total_value: oldQty * (oldIt.unit_price || 0),
            by_email: data.last_edited_by || "sistem",
            by_name: data.last_edited_by || "Sistem",
            notes: movNotes,
            date: today,
            status: "selesai",
            source_ref: data.id,
            source_type: "health_record",
          });
        }
      }
    }

    // ─── Auto Finance Transaction ──────────────────────────────────
    // Case: biaya turun ke 0 atau type berubah → hapus transaksi lama
    if (data.finance_tx_id && (!isTriggerType || biayaObat <= 0)) {
      await base44.asServiceRole.entities.FinanceTransaction.delete(data.finance_tx_id);
      await base44.asServiceRole.entities.HealthRecord.update(data.id, { finance_tx_id: "" });
      return Response.json({ ok: true, action: "deleted_old_tx" });
    }

    if (!isTriggerType || biayaObat <= 0) {
      return Response.json({ ok: true, skip: "not triggered" });
    }

    const diagnosisLabel = (data.diagnosis && data.diagnosis[0]) ? data.diagnosis[0].replace(/_/g, " ") : data.type;
    const description = `Obat: ${data.tortoise_name || "tortoise"} - ${diagnosisLabel}`;

    if (data.finance_tx_id) {
      await base44.asServiceRole.entities.FinanceTransaction.update(data.finance_tx_id, {
        amount: biayaObat,
        date: data.date,
        description,
      });
      return Response.json({ ok: true, action: "updated_tx", tx_id: data.finance_tx_id });
    }

    const tx = await base44.asServiceRole.entities.FinanceTransaction.create({
      type: "pengeluaran",
      category: "obat_perawatan",
      amount: biayaObat,
      date: data.date,
      description,
      reference_id: data.id,
      created_by_name: "Sistem",
    });

    if (tx?.id) {
      await base44.asServiceRole.entities.HealthRecord.update(data.id, { finance_tx_id: tx.id });
    }

    return Response.json({ ok: true, action: "created_tx", tx_id: tx?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});