import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { getBreedingMilestones } from "@/lib/breedingCalendarUtils";

const STATUS_LABEL = {
  bertelur: "Bertelur",
  inkubasi: "Di Inkubator",
  menetas: "Menetas",
  gagal: "Gagal",
  selesai: "Selesai",
};

function DateRow({ label, date, estimated, range }) {
  let value = "—";
  if (date) value = format(date, "d MMMM yyyy", { locale: idLocale });
  else if (range && range[0]) {
    const s = format(range[0], "d MMM", { locale: idLocale });
    const e = range[1] ? format(range[1], "d MMM", { locale: idLocale }) : s;
    value = `±${s} – ±${e}`;
  }
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium text-right ${estimated ? "text-amber-600" : "text-foreground"}`}>
        {estimated && date ? "± " : ""}{value}
      </span>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${color || "bg-muted text-muted-foreground"}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] mt-1 leading-tight">{label}</p>
    </div>
  );
}

export default function BreedingBatchDetail({ batch, onClose }) {
  if (!batch) return null;
  const m = getBreedingMilestones(batch);
  const statusLabel = STATUS_LABEL[batch.status] || batch.status;
  const hatchRate = batch.egg_count > 0
    ? Math.round(((batch.hatched_count || 0) / batch.egg_count) * 100)
    : 0;

  return (
    <Dialog open={!!batch} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detail Batch Breeding</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Parents */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Induk</p>
            <p className="text-sm font-semibold">
              ♀ {batch.female_name} <span className="text-muted-foreground">×</span> ♂ {batch.male_name}
            </p>
            {batch.clutch_number && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Clutch #{batch.clutch_number} · Musim {batch.season_year}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {statusLabel}
              </span>
              {batch.incubator_name && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  🌡️ {batch.incubator_name}
                  {batch.tray_number ? ` · Tray ${batch.tray_number}` : ""}
                </span>
              )}
            </div>
          </div>

          {/* Dates / Timeline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Timeline</p>
            <DateRow label="Kawin" date={m.mating} />
            <DateRow
              label="Bertelur"
              date={m.eggLaying}
              estimated={!m.eggLaying}
              range={!m.eggLaying ? [m.estEggLayStart, m.estEggLayEnd] : null}
            />
            <DateRow
              label="Perkiraan menetas"
              date={m.hatch}
              estimated={!m.hatch}
              range={!m.hatch ? [m.estHatchStart, m.estHatchEnd] : null}
            />
            {m.hatch && <DateRow label="Menetas" date={m.hatch} />}
            {m.completed && <DateRow label="Selesai" date={m.completed} />}
          </div>

          {/* Egg stats */}
          {batch.egg_count > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Hasil Telur</p>
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="Total Telur" value={batch.egg_count} color="bg-amber-50 text-amber-700" />
                <StatBox label="Fertile" value={batch.fertile_count || 0} color="bg-blue-50 text-blue-700" />
                <StatBox label="Menetas" value={batch.hatched_count || 0} color="bg-green-50 text-green-700" />
                <StatBox label="Gagal" value={batch.failed_count || 0} color="bg-red-50 text-red-600" />
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-muted-foreground">Hatch rate</span>
                <span className={`text-sm font-bold ${hatchRate >= 50 ? "text-green-600" : hatchRate > 0 ? "text-amber-600" : "text-red-500"}`}>
                  {hatchRate}%
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          {batch.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Catatan</p>
              <p className="text-xs text-foreground bg-muted/30 rounded-lg p-2.5">{batch.notes}</p>
            </div>
          )}

          {/* Egg records (baby codes) */}
          {batch.egg_records && batch.egg_records.filter(e => e.tortoise_code).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Bayi Menetas</p>
              <div className="flex flex-wrap gap-1">
                {batch.egg_records.filter(e => e.tortoise_code).map((e, i) => (
                  <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                    🐣 {e.tortoise_code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}