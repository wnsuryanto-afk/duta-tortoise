import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/*
 * Awalan dan penomorannya dipindah ke ../../shared/sku.ts pada 30-09-2026.
 *
 * Sebelumnya salinan ini berdiri sendiri, dan sisi pencatatan pakan tidak
 * membuat SKU sama sekali. Begitu sisi itu ikut membuat SKU, dua salinan
 * yang boleh berbeda berarti SKU dari pencatatan bisa berbenturan dengan
 * SKU dari backfill — dua barang ber-SKU sama membuat pemotongan stok
 * mengenai barang yang keliru. scripts/cek-kembar.mjs menjaga keduanya.
 */
import { skuPakanBaru, skuGudangBaru } from "../../shared/sku.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["admin", "owner"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const feedstocks = await base44.asServiceRole.entities.FeedStock.list("-created_date", 1000);
    const warehouses = await base44.asServiceRole.entities.WarehouseItem.list("-created_date", 1000);

    /*
     * SKU baru dibuat dari SATU daftar gabungan, bukan dari daftar entitasnya
     * sendiri.
     *
     * Awalan LNN, SPM, dan PKN dipakai FeedStock maupun WarehouseItem (lihat
     * PREFIKS_PAKAN dan PREFIKS_GUDANG). Selama nomornya diambil dari daftar
     * masing-masing, keduanya akan sampai di angka yang sama. Itu sudah terjadi:
     *
     *     LNN-0001  FeedStock "Pakan Lainnya"   |  WarehouseItem "Isolasi Listrik"
     *     LNN-0002  FeedStock "Melon"           |  WarehouseItem "Mabock"
     *     LNN-0003  FeedStock "Pakan Lainnya"   |  WarehouseItem "Gas Elpiji Kecil"
     *
     * SKU kembar membuat pencarian lewat SKU menemukan barang yang salah, dan
     * itu tidak melempar error apa pun. Daftar gabungan mencegah yang BARU lahir.
     */
    const semuaSku = [
      ...feedstocks.map(i => i.sku).filter(Boolean),
      ...warehouses.map(i => i.sku).filter(Boolean),
    ];

    let feedCount = 0;
    let whCount = 0;

    // Backfill FeedStock
    for (const item of feedstocks) {
      if (item.sku) continue;
      const sku = skuPakanBaru(item.category, semuaSku);
      semuaSku.push(sku);
      await base44.asServiceRole.entities.FeedStock.update(item.id, { sku });
      feedCount++;
    }

    // Backfill WarehouseItem
    for (const item of warehouses) {
      if (item.sku) continue;
      const sku = skuGudangBaru(item.category, semuaSku);
      semuaSku.push(sku);
      await base44.asServiceRole.entities.WarehouseItem.update(item.id, { sku });
      whCount++;
    }

    return Response.json({
      success: true,
      feedCount,
      whCount,
      total: feedCount + whCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});