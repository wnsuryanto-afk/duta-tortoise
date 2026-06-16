import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Thermometer } from "lucide-react";
import { format } from "date-fns";

export default function KeeperIncubatorWidget() {
  const { data: incubators = [] } = useQuery({
    queryKey: ["incubators-keeper"],
    queryFn: () => base44.entities.Incubator.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: readings = [] } = useQuery({
    queryKey: ["incubator-readings-keeper"],
    queryFn: () => base44.entities.IncubatorReading.list("-created_date", 100),
    staleTime: 3 * 60 * 1000,
  });

  if (incubators.length === 0) return null;

  // Ambil reading terakhir per inkubator
  const latestByIncubator = {};
  readings.forEach(r => {
    if (!latestByIncubator[r.incubator_id]) {
      latestByIncubator[r.incubator_id] = r;
    }
  });

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Thermometer className="w-4 h-4 text-orange-500" />
        <h2 className="font-semibold text-sm">🌡️ Status Inkubator</h2>
      </div>
      <div className="space-y-3">
        {incubators.map(inc => {
          const last = latestByIncubator[inc.id];
          const temp = last?.temperature ?? inc.current_temperature ?? null;
          const hum = last?.humidity ?? inc.current_humidity ?? null;

          // Target range sulcata: 29-31°C, 60-80%
          const tempOk = temp !== null ? (temp >= 28 && temp <= 33) : null;
          const humOk = hum !== null ? (hum >= 55 && hum <= 85) : null;
          const isAlert = tempOk === false || humOk === false;
          const hasData = temp !== null || hum !== null;

          return (
            <div key={inc.id} className={`p-3 rounded-lg border ${isAlert ? "bg-red-50 border-red-200" : hasData ? "bg-green-50 border-green-200" : "bg-muted/40 border-border"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{inc.name}</p>
                  {last?.created_date && (
                    <p className="text-[10px] text-muted-foreground">
                      Update: {format(new Date(last.created_date), "d MMM HH:mm")}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isAlert ? "bg-red-100 text-red-700" : hasData ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {isAlert ? "⚠️ Alert" : hasData ? "✓ Normal" : "—"}
                </span>
              </div>
              {hasData && (
                <div className="flex gap-4 mt-2">
                  {temp !== null && (
                    <div className="text-center">
                      <p className={`text-lg font-bold ${tempOk === false ? "text-red-600" : "text-foreground"}`}>{temp}°C</p>
                      <p className="text-[10px] text-muted-foreground">Suhu</p>
                    </div>
                  )}
                  {hum !== null && (
                    <div className="text-center">
                      <p className={`text-lg font-bold ${humOk === false ? "text-red-600" : "text-foreground"}`}>{hum}%</p>
                      <p className="text-[10px] text-muted-foreground">Kelembaban</p>
                    </div>
                  )}
                </div>
              )}
              {!hasData && <p className="text-xs text-muted-foreground mt-1">Belum ada data pembacaan</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}