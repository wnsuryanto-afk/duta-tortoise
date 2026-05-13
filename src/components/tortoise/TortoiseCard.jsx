import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Shell } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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

export default function TortoiseCard({ tortoise, onEdit, onDelete }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow duration-200 group">
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
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            {tortoise.weight_grams && <span>{tortoise.weight_grams}g</span>}
            {tortoise.shell_length_cm && <span>{tortoise.shell_length_cm}cm</span>}
            {tortoise.enclosure && <span>📍 {tortoise.enclosure}</span>}
            {tortoise.birth_date && <span>{format(new Date(tortoise.birth_date), "d MMM yyyy", { locale: id })}</span>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(tortoise)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(tortoise)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}