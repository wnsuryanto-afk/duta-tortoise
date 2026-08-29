import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { getMissingFields } from "@/lib/incompleteChecks";
import { Link } from "react-router-dom";
import { diPeternakan } from "@/lib/populasiKura";

export default function IncompleteDataWidget() {
  const [expanded, setExpanded] = useState(false);
  
  const { data: tortoises = [] } = useQuery({ queryKey: ["tortoises"], queryFn: () => base44.entities.Tortoise.list("-created_date", 300) });
  const { data: breedings = [] } = useQuery({ queryKey: ["breedings-planner"], queryFn: () => base44.entities.Breeding.list("-created_date", 200) });
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: () => base44.entities.Sale.list("-sale_date", 200) });
  const { data: profiles = [] } = useQuery({ queryKey: ["user-profiles-all"], queryFn: () => base44.entities.UserProfile.list() });
  const { data: warehouseItems = [] } = useQuery({ queryKey: ["warehouse-items", "-name", 500], queryFn: () => base44.entities.WarehouseItem.list("-name", 500) });
  const { data: feedStocks = [] } = useQuery({ queryKey: ["feedstocks", "-name", 300], queryFn: () => base44.entities.FeedStock.list("-name", 300) });

  const incompleteItems = useMemo(() => {
    const getIncomplete = (items, type, nameField) => 
      items
        .filter(i => getMissingFields(type, i).length > 0)
        .map(i => ({ ...i, type, name: i[nameField] || i.title || i.buyer_name || i.female_name || "-", fields: getMissingFields(type, i) }))
        .slice(0, 3); // ambil 3 teratas
    
    return [
      ...getIncomplete(tortoises.filter(diPeternakan), "tortoise", "name"),
      ...getIncomplete(breedings, "breeding", "female_name"),
      ...getIncomplete(sales, "sale", "tortoise_name"),
      ...getIncomplete(profiles, "userProfile", "full_name"),
      ...getIncomplete(warehouseItems, "warehouseItem", "name"),
      ...getIncomplete(feedStocks, "feedStock", "name"),
    ];
  }, [tortoises, breedings, sales, profiles, warehouseItems, feedStocks]);

  const breakdown = useMemo(() => {
    const cnt = (items, type) => items.filter(i => getMissingFields(type, i).length > 0).length;
    return [
      { label: "Kura-kura", count: cnt(tortoises.filter(diPeternakan), "tortoise"), emoji: "🐢" },
      { label: "Breeding", count: cnt(breedings, "breeding"), emoji: "🥚" },
      { label: "Penjualan", count: cnt(sales, "sale"), emoji: "💰" },
      { label: "Karyawan", count: cnt(profiles, "userProfile"), emoji: "👥" },
      { label: "Gudang", count: cnt(warehouseItems, "warehouseItem") + cnt(feedStocks, "feedStock"), emoji: "🏭" },
    ].filter(b => b.count > 0);
  }, [tortoises, breedings, sales, profiles, warehouseItems, feedStocks]);

  const total = breakdown.reduce((s, b) => s + b.count, 0);

  if (total === 0) return null;

  const getEditLink = (item) => {
    const paths = {
      tortoise: "/tortoise",
      breeding: "/breeding",
      sale: "/sales",
      userProfile: "/hr",
      warehouseItem: "/warehouse",
      feedStock: "/feed-stock",
    };
    return `${paths[item.type] || "/incomplete-data"}?edit=${item.id}`;
  };

  return (
    <Card className="p-4 border-amber-200 bg-amber-50">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-amber-800">⚠️ {total} data belum lengkap</p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-6 text-xs text-amber-700 hover:bg-amber-100"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Link to="/incomplete-data" className="text-xs text-amber-700 underline hover:text-amber-900 font-medium whitespace-nowrap">
                Lihat Semua →
              </Link>
            </div>
          </div>
          
          {expanded && incompleteItems.length > 0 && (
            <div className="mt-3 space-y-2 pt-3 border-t border-amber-200">
              <p className="text-xs font-semibold text-amber-700 mb-2">3 Data Perlu Perhatian:</p>
              {incompleteItems.map((item, idx) => (
                <Link key={item.id} to={getEditLink(item)}>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-card border border-amber-200 hover:border-amber-300 transition-colors cursor-pointer">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-amber-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        {item.fields.slice(0, 2).join(", ")}
                        {item.fields.length > 2 && ` +${item.fields.length - 2} lainnya`}
                      </p>
                    </div>
                    <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap">Lengkapi →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
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