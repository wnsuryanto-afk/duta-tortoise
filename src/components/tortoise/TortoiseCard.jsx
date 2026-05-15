import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Shell, ArrowRightLeft, HeartPulse } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const healthConfig = {
  critical: { border: "border-l-4 border-l-red-500", dot: "bg-red-500", label: "Butuh Perawatan", badge: "bg-red-100 text-red-700" },
  warning:  { border: "border-l-4 border-l-yellow-400", dot: "bg-yellow-400", label: "Perlu Perhatian", badge: "bg-yellow-100 text-yellow-700" },
  ok:       { border: "border-l-4 border-l-green-400", dot: "bg-green-400", label: "Sehat", badge: "bg-green-100 text-green-700" },
  none:     { border: "", dot: "bg-muted-foreground/30", label: "Belum Ada Rekam Medis", badge: "bg-muted text-muted-foreground" },
};

const statusColors = {
  aktif: "bg-primary/10 text-primary border-primary/20",
  breeding: "bg-accent/10 text-accent border-accent/20",
  terjual: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  mati: "bg-muted text-muted-foreground border-border",
};

const genderLabels = {
  jantan: "♂ Jantan",
  betina: "♀ Betina",
  belum_diketahui: "? Belum Diketahui",
};

const parentIndicatorConfig = {
  sick:    { label: "Sakit", className: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  rare:    { label: "Rare",  className: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  hasEggs: { label: "Pernah Bertelur", className: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
};

export default function TortoiseCard({ tortoise, onEdit, onDelete, onMove, healthStatus = "none", latestHealth, parentIndicator }) {
  const showActions = onEdit || onDelete || onMove;
  const health = healthConfig[healthStatus] || healthConfig.none;
  const pind = parentIndicator ? parentIndicatorConfig[parentIndicator] : null;
  return (
    <Card className={`p-4 hover:shadow-md transition-shadow duration-200 group ${health.border}`}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
          {tortoise.photo_url ? (
            <img src={tortoise.photo_url} alt={tortoise.name} className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <Shell className="w-6 h-6 text-primary/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{tortoise.name}</h3>
            {tortoise.code && <span className="text-xs text-muted-foreground">({tortoise.code})</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge variant="outline" className={`text-[11px] ${statusColors[tortoise.status] || ""}`}>
              {tortoise.status}
            </Badge>
            <span className="text-xs text-muted-foreground">{genderLabels[tortoise.gender]}</span>
            <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium ${health.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
              {health.label}
            </span>
            {pind && (
              <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium border ${pind.className}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pind.dot}`} />
                {pind.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            {tortoise.weight_grams && <span>{tortoise.weight_grams}g</span>}
            {tortoise.shell_length_cm && <span>{tortoise.shell_length_cm}cm</span>}
            {tortoise.enclosure && <span>📍 {tortoise.enclosure}</span>}
            {tortoise.birth_date && <span>{format(new Date(tortoise.birth_date), "d MMM yyyy", { locale: id })}</span>}
          </div>
        </div>
        {showActions && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(tortoise)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {onMove && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-chart-4" title="Pindah Kandang" onClick={() => onMove(tortoise)}>
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(tortoise)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}