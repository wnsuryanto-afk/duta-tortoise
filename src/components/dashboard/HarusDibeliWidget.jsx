import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

/**
 * Kartu "🛒 Harus Dibeli" untuk RingkasanPagi owner/manajer/admin.
 * Menggabungkan 3 sumber: SOP terganggu, stok menipis, tugas menunggu.
 * Hanya tampil jika total > 0.
 */
export default function HarusDibeliWidget() {
  const { data: warehouse = [] } = useQuery({
    queryKey: ["owner-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 200),
    staleTime: 2 * 60 * 1000,
  });
  const { data: sopTasks = [] } = useQuery({
    queryKey: ["sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 2 * 60 * 1000,
  });
  const { data: shoppingList = [] } = useQuery({
    queryKey: ["shopping-list-belum"],
    queryFn: () => base44.entities.ShoppingList.filter({ status: "belum_dibeli" }, "-priority", 200),
    staleTime: 60 * 1000,
  });
  const { data: toolRequests = [] } = useQuery({
    queryKey: ["tool-requests-approved"],
    queryFn: () => base44.entities.ToolRequest.filter({ status: "disetujui" }, "-request_date", 200),
    staleTime: 60 * 1000,
  });

  const { sopCount, obatCount, stokCount, tugasCount, pengajuanCount, total } = useMemo(() => {
    const skuMap = {};
    warehouse.forEach((w) => { if (w.sku) skuMap[w.sku] = w; });

    // SOP terganggu
    const neededSkus = new Set();
    sopTasks.forEach((t) => (t.required_skus || []).forEach((sku) => neededSkus.add(sku)));
    const sopIds = new Set();
    let sc = 0;
    neededSkus.forEach((sku) => {
      const w = skuMap[sku];
      if (!w || (w.current_stock || 0) <= 0) {
        sc++;
        if (w?.id) sopIds.add(w.id);
      }
    });

    // Obat menipis: obat/vitamin/suplemen, current <= minimum
    const obatIds = new Set();
    const om = warehouse.filter((w) =>
      ["obat", "vitamin", "suplemen"].includes(w.category) &&
      (w.current_stock || 0) <= (w.minimum_stock || 0) &&
      !sopIds.has(w.id)
    );
    om.forEach((w) => obatIds.add(w.id));

    // Stok menipis: non-medical, current < minimum
    const sm = warehouse.filter((w) =>
      (w.current_stock || 0) < (w.minimum_stock || 0) && !sopIds.has(w.id) && !obatIds.has(w.id)
    ).length;

    const tm = shoppingList.length;
    const pk = toolRequests.length;
    return { sopCount: sc, obatCount: om.length, stokCount: sm, tugasCount: tm, pengajuanCount: pk, total: sc + om.length + sm + tm + pk };
  }, [warehouse, sopTasks, shoppingList, toolRequests]);

  if (total === 0) return null;

  return (
    <Link
      to="/harus-dibeli"
      className={`block rounded-xl p-3 transition-colors ${
        sopCount > 0
          ? "bg-red-50 border border-red-300 hover:bg-red-100"
          : "bg-amber-50 border border-amber-300 hover:bg-amber-100"
      }`}
    >
      <p className="text-sm font-bold flex items-center gap-1.5">
        <ShoppingCart className="w-4 h-4" />
        🛒 Harus dibeli: {total} barang
        {sopCount > 0 && (
          <span className="text-xs text-red-600 font-semibold">({sopCount} mengganggu SOP)</span>
        )}
      </p>
      <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
        {sopCount > 0 && <span className="text-red-700">🔴 SOP: {sopCount}</span>}
        {obatCount > 0 && <span className="text-orange-700">💊 Obat: {obatCount}</span>}
        {stokCount > 0 && <span className="text-amber-700">⚠️ Menipis: {stokCount}</span>}
        {tugasCount > 0 && <span className="text-blue-700">📋 Menunggu: {tugasCount}</span>}
        {pengajuanCount > 0 && <span className="text-indigo-700">🛠️ Pengajuan: {pengajuanCount}</span>}
      </div>
    </Link>
  );
}