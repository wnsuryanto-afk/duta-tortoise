/**
 * Shows small red chip badges for each missing field on a stock item.
 * itemType: "feedstock" | "warehouse"
 */
export default function IncompleteBadges({ item, itemType }) {
  const missing = [];
  if (!item.photo_url) missing.push("Tanpa Foto");
  if (!item.sku) missing.push("Tanpa SKU");
  if (itemType === "warehouse" && !(item.purchase_price > 0)) missing.push("Tanpa Harga");
  if (itemType === "feedstock" && !(item.price_per_unit > 0)) missing.push("Tanpa Harga");
  if (!item.minimum_stock && item.minimum_stock !== 0) missing.push("Tanpa Stok Min");
  if (!item.unit) missing.push("Tanpa Satuan");

  if (missing.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {missing.map(m => (
        <span key={m} className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 font-medium">
          {m}
        </span>
      ))}
    </div>
  );
}

export function isItemIncomplete(item, itemType) {
  if (!item.photo_url) return true;
  if (!item.sku) return true;
  if (itemType === "warehouse" && !(item.purchase_price > 0)) return true;
  if (itemType === "feedstock" && !(item.price_per_unit > 0)) return true;
  if (!item.unit) return true;
  return false;
}