import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Shell, ArrowRightLeft, MapPin, Image } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import EnclosureHistoryPanel from "./EnclosureHistoryPanel";

const healthConfig = {
  critical: { border: "border-l-4 border-l-red-500",    dot: "bg-red-500",    label: "Butuh Perawatan",      badge: "bg-red-100 text-red-700" },
  warning:  { border: "border-l-4 border-l-yellow-400", dot: "bg-yellow-400", label: "Perlu Perhatian",       badge: "bg-yellow-100 text-yellow-700" },
  ok:       { border: "border-l-4 border-l-green-400",  dot: "bg-green-400",  label: "Sehat",                 badge: "bg-green-100 text-green-700" },
  none:     { border: "",                                dot: "bg-muted-foreground/30", label: "Belum Ada Rekam", badge: "bg-muted text-muted-foreground" },
};

const statusColors = {
  aktif:    "bg-primary/10 text-primary border-primary/20",
  breeding: "bg-accent/10 text-accent border-accent/20",
  terjual:  "bg-chart-4/10 text-chart-4 border-chart-4/20",
  mati:     "bg-muted text-muted-foreground border-border",
};

const morphLabels = {
  normal:     "Normal",
  over_scute: "Over Scute",
  less_scute: "Less Scute",
  het_albino: "Het Albino",
  ivory:      "Ivory",
  albino:     "Albino",
};

const morphColors = {
  normal:     "bg-muted text-muted-foreground",
  over_scute: "bg-blue-100 text-blue-700",
  less_scute: "bg-purple-100 text-purple-700",
  het_albino: "bg-orange-100 text-orange-700",
  ivory:      "bg-yellow-100 text-yellow-700",
  albino:     "bg-pink-100 text-pink-700",
};

const genderLabels = {
  jantan:         "♂ Jantan",
  betina:         "♀ Betina",
  belum_diketahui: "? Belum Diketahui",
};

export default function TortoiseCard({ tortoise, onEdit, onDelete, onMove, healthStatus = "none", latestHealth, parentIndicator }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const showActions = onEdit || onDelete || onMove;
  const health = healthConfig[healthStatus] || healthConfig.none;
  const morph = tortoise.morph || "normal";

  return (
    <>
    <Card className={`p-4 hover:shadow-md transition-shadow duration-200 group ${health.border}`}>
      <div className="flex items-start gap-3">
        {/* Foto */}
        <button
          className="w-14 h-14 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden border hover:opacity-80 transition-opacity"
          onClick={() => tortoise.photo_url && setShowPhoto(true)}
          type="button"
        >
          {tortoise.photo_url ? (
            <img src={tortoise.photo_url} alt={tortoise.name} className="w-14 h-14 object-cover" />
          ) : (
            <Shell className="w-6 h-6 text-primary/40" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{tortoise.name}</h3>
            {tortoise.code && <span className="text-xs text-muted-foreground">({tortoise.code})</span>}
            {/* Proven badge — hijau */}
            {tortoise.is_proven && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-green-500 text-white">
                ✓ Proven
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[tortoise.status] || ""}`}>
              {tortoise.status}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{genderLabels[tortoise.gender]}</span>
            {morph !== "normal" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${morphColors[morph]}`}>
                {morphLabels[morph]}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${health.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
              {health.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
            {tortoise.weight_grams && <span>{tortoise.weight_grams}g</span>}
            {tortoise.shell_length_cm && <span>{tortoise.shell_length_cm}cm</span>}
            {tortoise.enclosure && <span>📍 {tortoise.enclosure}</span>}
            {tortoise.birth_date && <span>{format(new Date(tortoise.birth_date), "d MMM yyyy", { locale: id })}</span>}
          </div>
        </div>

        {showActions && (
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Riwayat Kandang" onClick={() => setShowHistory(true)}>
              <MapPin className="w-3 h-3" />
            </Button>
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tortoise)}>
                <Pencil className="w-3 h-3" />
              </Button>
            )}
            {onMove && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-chart-4" title="Pindah Kandang" onClick={() => onMove(tortoise)}>
                <ArrowRightLeft className="w-3 h-3" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(tortoise)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>

    {/* Foto fullscreen */}
    {showPhoto && tortoise.photo_url && (
      <Dialog open={showPhoto} onOpenChange={setShowPhoto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tortoise.name}</DialogTitle>
          </DialogHeader>
          <img src={tortoise.photo_url} alt={tortoise.name} className="w-full rounded-xl object-contain max-h-96" />
        </DialogContent>
      </Dialog>
    )}

    <Dialog open={showHistory} onOpenChange={setShowHistory}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-primary" />
            Riwayat Kandang — {tortoise.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <EnclosureHistoryPanel tortoiseId={tortoise.id} />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}