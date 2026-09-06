import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * migrateShoppingListFields — satukan dua generasi nama field di ShoppingList.
 *
 * Entitas ini berisi record dari dua masa:
 *   lama (Juni 2026): item_name, qty_needed, unit, est_price, platform,
 *                     bought_price, bought_qty, bought_date
 *   baru (Juli 2026): nama_barang, jumlah, satuan, harga_est_per_unit,
 *                     platform_beli, harga_aktual, qty_aktual, tanggal_dibeli
 *
 * Akibatnya 36 record lama tampil sebagai "(tanpa nama)" di dashboard, dan
 * setiap fitur baru harus menulis fallback ganda. Fungsi ini menyalin nilai
 * lama ke nama field baru sekali jalan.
 *
 * AMAN DIJALANKAN BERULANG: record yang nama_barang-nya sudah terisi dilewati,
 * dan field lama TIDAK dihapus supaya perubahan bisa ditinjau ulang.
 *
 * Panggil dari halaman Pemeliharaan Sistem (owner saja).
 */

// platform lama memakai garis bawah: "Toko_Hewan" -> "Toko Hewan"
const PLATFORM_MAP = {
  Tokopedia: "Tokopedia",
  Shopee: "Shopee",
  Apotek: "Apotek",
  Toko_Hewan: "Toko Hewan",
  "Toko Hewan": "Toko Hewan",
  Distributor: "Distributor",
  Langsung: "Langsung",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== "owner") {
      return Response.json({ error: "Hanya owner yang boleh menjalankan migrasi." }, { status: 403 });
    }

    const dryRun = new URL(req.url).searchParams.get("dry") === "1";
    const all = await base44.asServiceRole.entities.ShoppingList.list("-created_date", 500);

    const target = all.filter((r) => !r.nama_barang && (r.item_name || r.qty_needed != null));

    const preview = [];
    let migrated = 0;

    for (const r of target) {
      const patch = {
        nama_barang: r.item_name || "",
        jumlah: r.jumlah ?? r.qty_needed ?? 0,
        satuan: r.satuan || r.unit || "pcs",
        harga_est_per_unit: r.harga_est_per_unit ?? r.est_price ?? 0,
        platform_beli: PLATFORM_MAP[r.platform] || "Lainnya",
      };
      if (r.harga_aktual == null && r.bought_price != null) patch.harga_aktual = r.bought_price;
      if (r.qty_aktual == null && r.bought_qty != null) patch.qty_aktual = r.bought_qty;
      if (!r.tanggal_dibeli && r.bought_date) patch.tanggal_dibeli = r.bought_date;
      if (!r.total_est) patch.total_est = (patch.jumlah || 0) * (patch.harga_est_per_unit || 0);

      preview.push({ id: r.id, dari: r.item_name, jadi: patch.nama_barang, satuan: patch.satuan });

      if (!dryRun) {
        await base44.asServiceRole.entities.ShoppingList.update(r.id, patch);
        migrated++;
      }
    }

    return Response.json({
      success: true,
      dryRun,
      total_record: all.length,
      perlu_migrasi: target.length,
      dimigrasi: migrated,
      contoh: preview.slice(0, 10),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
