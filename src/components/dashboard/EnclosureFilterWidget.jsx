import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shell, HeartPulse, MapPin } from "lucide-react";

const ENCLOSURE_ORDER = ["W1","W2","W3","W4","W5","N1","N2","E1","E2","E3","E4","E5","L2"];

const healthConfig = {
  critical: { dot: "bg-red-500", label: "Sakit" },
  warning:  { dot: "bg-yellow-400", label: "Vaksin" },
  ok:       { dot: "bg-green-400", label: "Sehat" },
  none:     { dot: "bg-muted-foreground/30", label: "-" },
};

function getHealthStatus(rec) {
  if (!rec) return "none";
  if (rec.type === "sakit" || rec.type === "obat") return "critical";
  if (rec.type === "vaksin") return "warning";
  return "ok";
}

export default function EnclosureFilterWidget() {
  const [selectedEnclosure, setSelectedEnclosure] = useState(null);

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 300),
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["health-records-all"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 500),
  });

  const latestHealthMap = useMemo(() => {
    const map = {};
    healthRecords.forEach((r) => {
      if (!r.tortoise_id) return;
      if (!map[r.tortoise_id] || r.date > map[r.tortoise_id].date) {
        map[r.tortoise_id] = r;
      }
    });
    return map;
  }, [healthRecords]);

  // Daftar kandang unik, diurutkan
  const enclosures = useMemo(() => {
    const set = new Set(tortoises.map((t) => t.enclosure || "Tidak Ada Kandang"));
    return Array.from(set).sort((a, b) => {
      const ai = ENCLOSURE_ORDER.indexOf(a);
      const bi = ENCLOSURE_ORDER.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });
  }, [tortoises]);

  // Kura-kura aktif di kandang terpilih (atau semua jika tidak dipilih)
  const displayTortoises = useMemo(() => {
    const base = tortoises.filter((t) => t.status === "aktif" || t.status === "breeding");
    if (!selectedEnclosure) return base;
    return base.filter((t) => (t.enclosure || "Tidak Ada Kandang") === selectedEnclosure);
  }, [tortoises, selectedEnclosure]);

  const criticalCount = displayTortoises.filter(
    (t) => getHealthStatus(latestHealthMap[t.id]) === "critical"
  ).length;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm">Filter per Kandang</h2>
        {criticalCount > 0 && (
          <Badge className="bg-red-100 text-red-700 text-[11px] ml-auto">
            {criticalCount} butuh perawatan
          </Badge>
        )}
      </div>

      {/* Tombol pilih kandang */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedEnclosure(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            selectedEnclosure === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-muted"
          }`}
        >
          Semua
        </button>
        {enclosures.map((enc) => {
          const count = tortoises.filter(
            (t) => (t.enclosure || "Tidak Ada Kandang") === enc && (t.status === "aktif" || t.status === "breeding")
          ).length;
          const hasCritical = tortoises.some(
            (t) => (t.enclosure || "Tidak Ada Kandang") === enc && getHealthStatus(latestHealthMap[t.id]) === "critical"
          );
          return (
            <button
              key={enc}
              onClick={() => setSelectedEnclosure(enc === selectedEnclosure ? null : enc)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                selectedEnclosure === enc
                  ? "bg-primary text-primary-foreground border-primary"
                  : hasCritical
                  ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {hasCritical && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
              {enc}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* List kura-kura */}
      {displayTortoises.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Tidak ada kura-kura di kandang ini.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {displayTortoises.map((t) => {
            const hStatus = getHealthStatus(latestHealthMap[t.id]);
            const hConf = healthConfig[hStatus];
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm ${
                  hStatus === "critical" ? "border-red-200 bg-red-50" : "border-border bg-muted/30"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                  {t.photo_url ? (
                    <img src={t.photo_url} alt={t.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <Shell className="w-4 h-4 text-primary/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.enclosure || "—"}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${hConf.dot}`} />
                  <span className={`text-[11px] ${hStatus === "critical" ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                    {hConf.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}