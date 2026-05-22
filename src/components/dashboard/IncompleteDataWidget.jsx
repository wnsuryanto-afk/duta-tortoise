import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { getMissingFields } from "@/lib/incompleteChecks";
import { Link } from "react-router-dom";

export default function IncompleteDataWidget() {
  const { data: tortoises = [] } = useQuery({ queryKey: ["tortoises"], queryFn: () => base44.entities.Tortoise.list("-created_date", 300) });
  const { data: breedings = [] } = useQuery({ queryKey: ["breedings-planner"], queryFn: () => base44.entities.Breeding.list("-created_date", 200) });
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: () => base44.entities.Sale.list("-sale_date", 200) });
  const { data: profiles = [] } = useQuery({ queryKey: ["user-profiles-all"], queryFn: () => base44.entities.UserProfile.list() });
  const { data: warehouseItems = [] } = useQuery({ queryKey: ["warehouse-items"], queryFn: () => base44.entities.WarehouseItem.list() });
  const { data: feedStocks = [] } = useQuery({ queryKey: ["feed-stocks"], queryFn: () => base44.entities.FeedStock.list() });

  const breakdown = useMemo(() => {
    const cnt = (items, type) => items.filter(i => getMissingFields(type, i).length > 0).length;
    return [
      { label: "Kura-kura", count: cnt(tortoises.filter(t => t.status === "aktif" || t.status === "baby"), "tortoise"), emoji: "🐢" },
      { label: "Breeding", count: cnt(breedings, "breeding"), emoji: "🥚" },
      { label: "Penjualan", count: cnt(sales, "sale"), emoji: "💰" },
      { label: "Karyawan", count: cnt(profiles, "userProfile"), emoji: "👥" },
      { label: "Gudang", count: cnt(warehouseItems, "warehouseItem") + cnt(feedStocks, "feedStock"), emoji: "🏭" },
    ].filter(b => b.count > 0);
  }, [tortoises, breedings, sales, profiles, warehouseItems, feedStocks]);

  const total = breakdown.reduce((s, b) => s + b.count, 0);

  if (total === 0) return null;

  return (
    <Card className="p-4 border-amber-200 bg-amber-50">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-amber-800">⚠️ {total} data belum lengkap</p>
            <Link to="/incomplete-data" className="text-xs text-amber-700 underline hover:text-amber-900 font-medium whitespace-nowrap">
              Lihat Semua →
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {breakdown.map(b => (
              <Link key={b.label} to="/incomplete-data">
                <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors">
                  {b.emoji} {b.label}: {b.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}