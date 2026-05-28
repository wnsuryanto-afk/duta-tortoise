import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, PackageOpen, Link } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function FeedStockAlert() {
  const { data: stocks = [] } = useQuery({
    queryKey: ["feedstocks"],
    queryFn: () => base44.entities.FeedStock.list(),
  });

  const lowStocks = stocks.filter(
    (s) => s.is_mandatory && s.current_stock <= s.minimum_stock
  );

  if (lowStocks.length === 0) return null;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-100 shrink-0">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-orange-800">
              ⚠️ Stok Pakan Hampir Habis ({lowStocks.length} item)
            </p>
            <RouterLink
              to="/feed-stock"
              className="text-xs text-orange-700 underline shrink-0 hover:text-orange-900"
            >
              Kelola Stok →
            </RouterLink>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStocks.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-1.5 text-xs bg-white border border-orange-200 rounded-full px-2.5 py-1"
              >
                <PackageOpen className="w-3 h-3 text-orange-500" />
                <span className="font-medium text-orange-900">{s.name}</span>
                <span className="text-orange-500">
                  {s.current_stock} {s.unit}
                </span>
                {s.current_stock === 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                    Habis
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}