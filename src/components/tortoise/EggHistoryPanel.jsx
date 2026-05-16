import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Egg } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  kawin:    "bg-blue-100 text-blue-700",
  bertelur: "bg-yellow-100 text-yellow-700",
  inkubasi: "bg-orange-100 text-orange-700",
  menetas:  "bg-green-100 text-green-700",
  gagal:    "bg-muted text-muted-foreground",
};

export default function EggHistoryPanel({ tortoiseId, tortoiseName }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["breeding-history", tortoiseId],
    queryFn: () => base44.entities.Breeding.list("-mating_date", 50),
    enabled: !!tortoiseId,
    select: (data) => data.filter((b) =>
      b.female_id === tortoiseId || b.male_id === tortoiseId ||
      b.female_name === tortoiseName || b.male_name === tortoiseName
    ),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground py-2">Memuat...</p>;
  if (records.length === 0) return <p className="text-xs text-muted-foreground py-2 text-center">Belum ada history bertelur</p>;

  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {records.map((b) => (
        <div key={b.id} className="p-3 rounded-xl bg-muted/40 border text-xs">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Egg className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="font-medium">♂ {b.male_name} × ♀ {b.female_name}</span>
            <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[b.status] || "bg-muted text-muted-foreground"}`}>
              {b.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
            {b.mating_date && <span>Kawin: {format(new Date(b.mating_date), "d MMM yyyy", { locale: id })}</span>}
            {b.egg_laying_date && <span>Bertelur: {format(new Date(b.egg_laying_date), "d MMM yyyy", { locale: id })}</span>}
            {b.egg_count != null && <span>Telur: <strong className="text-foreground">{b.egg_count}</strong></span>}
            {b.fertile_count != null && <span>Fertil: <strong className="text-foreground">{b.fertile_count}</strong></span>}
            {b.hatched_count != null && <span>Menetas: <strong className="text-green-600">{b.hatched_count}</strong></span>}
            {b.hatch_date && <span>Menetas: {format(new Date(b.hatch_date), "d MMM yyyy", { locale: id })}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}