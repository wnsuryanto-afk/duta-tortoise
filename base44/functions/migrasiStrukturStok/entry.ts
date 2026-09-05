/**
 * Migrasi Struktur Stok — admin only
 * 
 * action: "preview_code_sku"   → hitung berapa item yang punya code
 * action: "migrasi_code_ke_sku" → copy code→sku, simpan code lama ke notes, lalu item code dibiarkan (schema sudah tidak punya field code)
 * action: "preview_pakan"      → list WarehouseItem dengan category=pakan
 * action: "migrasi_itemusage"  → pindahkan semua ItemUsage ke StockMovement / ItemBorrow
 * action: "status_migrasi"     → ringkasan status semua migrasi
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { BATAS_AMBIL } from "../../shared/batas.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["admin", "owner"].includes(user.role)) {
      return Response.json({ error: "Forbidden: hanya admin/owner" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // ── A. Preview item dengan field code ──────────────────────────────────
    if (action === "preview_code_sku") {
      const allItems = await base44.asServiceRole.entities.WarehouseItem.list(null, BATAS_AMBIL);
      const withCode = allItems.filter(i => i.code && i.code.trim() !== "");
      const needMigrate = withCode.filter(i => !i.sku || i.sku.trim() === "");
      const bothExist = withCode.filter(i => i.sku && i.sku.trim() !== "");
      return Response.json({
        total_items: allItems.length,
        items_with_code: withCode.length,
        will_copy_code_to_sku: needMigrate.length,
        will_keep_sku_save_code_to_notes: bothExist.length,
        samples: withCode.slice(0, 5).map(i => ({ id: i.id, name: i.name, code: i.code, sku: i.sku })),
      });
    }

    // ── A. Jalankan migrasi code→sku ───────────────────────────────────────
    if (action === "migrasi_code_ke_sku") {
      const allItems = await base44.asServiceRole.entities.WarehouseItem.list(null, BATAS_AMBIL);
      const withCode = allItems.filter(i => i.code && i.code.trim() !== "");
      let copied = 0, savedToNotes = 0, skipped = 0;

      for (const item of withCode) {
        const hasSku = item.sku && item.sku.trim() !== "";
        if (!hasSku) {
          // Tidak punya SKU → copy code ke sku
          await base44.asServiceRole.entities.WarehouseItem.update(item.id, {
            sku: item.code.trim(),
            last_edited_by: user.email,
            last_edited_at: new Date().toISOString(),
          });
          copied++;
        } else {
          // Sudah punya SKU → simpan code lama ke notes
          const existingNotes = item.notes || "";
          const codeNote = `Kode lama: ${item.code}`;
          if (!existingNotes.includes(codeNote)) {
            const newNotes = existingNotes
              ? `${existingNotes}\n${codeNote}`
              : codeNote;
            await base44.asServiceRole.entities.WarehouseItem.update(item.id, {
              notes: newNotes,
              last_edited_by: user.email,
              last_edited_at: new Date().toISOString(),
            });
            savedToNotes++;
          } else {
            skipped++;
          }
        }
      }

      return Response.json({
        success: true,
        message: "Migrasi code→sku selesai",
        copied_code_to_sku: copied,
        code_saved_to_notes: savedToNotes,
        already_done: skipped,
      });
    }

    // ── B. Preview WarehouseItem dengan category=pakan ─────────────────────
    if (action === "preview_pakan") {
      const pakanItems = await base44.asServiceRole.entities.WarehouseItem.filter({ category: "pakan" }, null, BATAS_AMBIL);
      return Response.json({
        count: pakanItems.length,
        items: pakanItems.map(i => ({ id: i.id, name: i.name, sku: i.sku, current_stock: i.current_stock, unit: i.unit })),
      });
    }

    // ── C. Migrasi ItemUsage → StockMovement / ItemBorrow ─────────────────
    if (action === "migrasi_itemusage") {
      const allUsage = await base44.asServiceRole.entities.ItemUsage.list(null, BATAS_AMBIL);
      let movedToMovement = 0;
      let movedToBorrow = 0;
      let alreadyMigrated = 0;
      const errors = [];

      for (const u of allUsage) {
        try {
          // Cek apakah sudah ada di StockMovement/ItemBorrow (cegah duplikat)
          // Gunakan notes sebagai penanda jika item ini adalah borrowing record
          const isBorrow = !!(u.borrower_email || u.borrow_date);

          if (isBorrow) {
            // Pindah ke ItemBorrow
            await base44.asServiceRole.entities.ItemBorrow.create({
              item_id: u.item_id,
              item_type: u.item_type || "warehouse",
              item_name: u.item_name,
              item_sku: u.item_sku || "",
              borrower_email: u.borrower_email || u.by_email || "",
              borrower_name: u.borrower_name || u.by_name || "",
              borrow_date: u.borrow_date
                ? u.borrow_date.substring(0, 10)
                : (u.date || new Date().toISOString().substring(0, 10)),
              return_date: u.return_date ? u.return_date.substring(0, 10) : undefined,
              purpose: u.purpose || u.notes || "",
              return_condition: u.return_condition || undefined,
              approval_status: u.approval_status === "approved" ? "approved"
                : u.approval_status === "rejected" ? "rejected" : "approved",
              approved_by: u.approved_by || u.approved_by_legacy || "",
              notes: u.notes || "",
              photo_urls: u.photo_urls || [],
              migrated_from_item_usage: true,
            });
            movedToBorrow++;
          } else {
            // Pindah ke StockMovement
            await base44.asServiceRole.entities.StockMovement.create({
              item_id: u.item_id,
              item_type: u.item_type || "warehouse",
              item_name: u.item_name,
              item_sku: u.item_sku || "",
              type: u.type || "keluar",
              quantity: u.quantity,
              unit: u.unit || "",
              unit_price: u.unit_price || 0,
              total_value: u.total_value || 0,
              by_email: u.by_email || "",
              by_name: u.by_name || "",
              notes: u.notes || "",
              date: u.date || new Date().toISOString().substring(0, 10),
              status: u.status || "selesai",
              approved_by: u.approved_by || "",
              approved_at: u.approved_at || undefined,
              rejected_reason: u.rejected_reason || "",
              photo_urls: u.photo_urls || [],
              migrated_from_item_usage: true,
            });
            movedToMovement++;
          }
        } catch (err) {
          errors.push({ id: u.id, name: u.item_name, error: err.message });
        }
      }

      return Response.json({
        success: true,
        total_processed: allUsage.length,
        moved_to_stock_movement: movedToMovement,
        moved_to_item_borrow: movedToBorrow,
        errors: errors.length,
        error_details: errors,
      });
    }

    // ── Status ringkasan semua migrasi ─────────────────────────────────────
    if (action === "status_migrasi") {
      const [allItems, pakanItems, allUsage, allMovement, allBorrow] = await Promise.all([
        base44.asServiceRole.entities.WarehouseItem.list(null, BATAS_AMBIL),
        base44.asServiceRole.entities.WarehouseItem.filter({ category: "pakan" }, null, BATAS_AMBIL),
        base44.asServiceRole.entities.ItemUsage.list(null, BATAS_AMBIL),
        base44.asServiceRole.entities.StockMovement.list(null, BATAS_AMBIL),
        base44.asServiceRole.entities.ItemBorrow.list(null, BATAS_AMBIL),
      ]);

      const withCode = allItems.filter(i => i.code && i.code.trim() !== "");

      return Response.json({
        A_code_migration: {
          items_still_with_code: withCode.length,
          status: withCode.length === 0 ? "✅ Selesai" : `⚠️ ${withCode.length} item masih punya field code`,
        },
        B_pakan_migration: {
          pakan_items_in_warehouse: pakanItems.length,
          status: pakanItems.length === 0 ? "✅ Selesai" : `⚠️ ${pakanItems.length} item masih kategori pakan`,
        },
        C_itemusage_migration: {
          item_usage_count: allUsage.length,
          stock_movement_count: allMovement.length,
          item_borrow_count: allBorrow.length,
          status: allMovement.length + allBorrow.length > 0
            ? `✅ Termigrasi: ${allMovement.length} movement + ${allBorrow.length} borrow`
            : "⏳ Belum dimigrasikan",
        },
      });
    }

    return Response.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});