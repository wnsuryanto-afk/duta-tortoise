import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FEED_PREFIX = {
  sayuran: "SYR", buah: "BUH", rumput: "RPT", pelet: "PLT",
  suplemen: "SPM", hay: "HAY", lainnya: "LNN",
};
const WH_PREFIX = {
  obat: "OBT", vitamin: "VIT", suplemen: "SPM", peralatan: "ALT",
  alat_kerja: "ALT", pakan: "PKN", lainnya: "LNN",
};

function getNextSKU(prefix, existingSkus) {
  const nums = existingSkus
    .filter(s => s && s.startsWith(prefix + "-"))
    .map(s => parseInt(s.replace(prefix + "-", ""), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["admin", "owner"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const feedstocks = await base44.asServiceRole.entities.FeedStock.list("-created_date", 1000);
    const warehouses = await base44.asServiceRole.entities.WarehouseItem.list("-created_date", 1000);

    const feedSkus = feedstocks.map(i => i.sku).filter(Boolean);
    const whSkus = warehouses.map(i => i.sku).filter(Boolean);

    let feedCount = 0;
    let whCount = 0;

    // Backfill FeedStock
    for (const item of feedstocks) {
      if (item.sku) continue;
      const prefix = FEED_PREFIX[item.category] || "LNN";
      const sku = getNextSKU(prefix, feedSkus);
      feedSkus.push(sku);
      await base44.asServiceRole.entities.FeedStock.update(item.id, { sku });
      feedCount++;
    }

    // Backfill WarehouseItem
    for (const item of warehouses) {
      if (item.sku) continue;
      const prefix = WH_PREFIX[item.category] || "LNN";
      const sku = getNextSKU(prefix, whSkus);
      whSkus.push(sku);
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