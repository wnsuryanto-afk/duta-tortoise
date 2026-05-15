import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowRight, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function EnclosureHistoryPanel({ tortoiseId }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["enclosure-history", tortoiseId],
    queryFn: () => base44.entities.EnclosureHistory.filter({ tortoise_id: tortoiseId }, "-moved_date", 50),
    enabled: !!tortoiseId,
  });

  if (isLoading) return <div className="text-xs text-muted-foreground py-2">Memuat riwayat...</div>;
  if (history.length === 0) return <div className="text-xs text-muted-foreground py-2">Belum ada riwayat perpindahan kandang.</div>;

  return (
    <div className="space-y-2">
      {history.map((h) => (
        <div key={h.id} className="flex items-start gap-3 text-xs">
          <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3 h-3 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-muted-foreground">{h.from_enclosure || "-"}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-primary">{h.to_enclosure}</span>
            </div>
            <div className="text-muted-foreground mt-0.5">
              {format(new Date(h.moved_date), "d MMM yyyy", { locale: id })}
              {h.reason && <span> · {h.reason}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}