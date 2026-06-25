import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Leaf, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { SOURCES } from "./PakanHarianForm";

export default function PakanHarianWidget() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: logs = [] } = useQuery({
    queryKey: ["pakan-harian-today", today],
    queryFn: () => base44.entities.PakanHarian.filter({ log_date: today }),
    staleTime: 60 * 1000,
  });

  const total = logs.reduce((s, l) => s + (l.basket_count || 0), 0);
  const sources = [...new Set(logs.map(l => l.feed_source).filter(Boolean))];
  const sourceLabels = sources.map(s => SOURCES.find(x => x.value === s)?.label || s).join(", ");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pakan hari ini</p>
            <p className="text-lg font-bold text-green-700">{total} keranjang</p>
            {sourceLabels && <p className="text-[11px] text-muted-foreground">{sourceLabels}</p>}
          </div>
        </div>
        <Link to="/pakan-harian" className="text-xs text-primary hover:underline flex items-center gap-1">
          Detail <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
}