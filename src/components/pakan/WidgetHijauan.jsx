import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Leaf, ChevronRight, AlertTriangle } from "lucide-react";
import { hitungHijauan } from "@/lib/hijauanPakan";

/**
 * WidgetHijauan — porsi hijauan 30 hari terakhir.
 *
 * Hijau bila >= 80%, merah bila di bawah. Hitungannya di lib/hijauanPakan.js;
 * di sini hanya tampilannya, karena aturan angkanya perlu bisa diuji sendiri
 * tanpa menggambar layar.
 */
export default function WidgetHijauan() {
  const { data: logs = [] } = useQuery({
    queryKey: ["pakan-harian-list"],
    queryFn: () => base44.entities.PakanHarian.list("-log_date", 500),
  });
  const { data: feedstocks = [] } = useQuery({
    queryKey: ["feedstocks"],
    queryFn: () => base44.entities.FeedStock.list("-created_date", 300),
  });

  const h = useMemo(() => hitungHijauan(logs, feedstocks), [logs, feedstocks]);
  const adaData = h.persen !== null;
  const cukup = adaData && h.persen >= 80;
  const angka = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 });

  return (
    <Card className={`p-4 border-l-4 ${!adaData ? "border-l-border" : cukup ? "border-l-green-600" : "border-l-red-500"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${!adaData ? "bg-muted" : cukup ? "bg-green-100" : "bg-red-100"}`}>
            {adaData && !cukup
              ? <AlertTriangle className="w-4 h-4 text-red-600" />
              : <Leaf className={`w-4 h-4 ${adaData ? "text-green-600" : "text-muted-foreground"}`} />}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Porsi hijauan · {h.jendela} hari terakhir</p>
            <p className={`text-2xl font-bold tabular ${!adaData ? "text-muted-foreground" : cukup ? "text-green-700" : "text-red-600"}`}>
              {adaData ? `${angka(h.persen)}%` : "Belum ada data"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {adaData
                ? `${angka(h.hijauanKg)} kg hijauan dari ${angka(h.totalKg)} kg pakan tercatat · hijau bila ≥ 80%`
                : "Belum ada berat pakan tercatat pada rentang ini."}
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground">Hari tanpa catatan</p>
          <p className={`text-lg font-bold tabular ${h.hariTanpa > 0 ? "text-amber-700" : "text-green-700"}`}>
            {h.hariTanpa} <span className="text-xs font-medium text-muted-foreground">dari {h.jendela}</span>
          </p>
          <Link to="/pakan-harian" className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5">
            Catat pakan <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Hanya berat dalam kilogram yang bisa dinilai; keranjang bukan kilogram. */}
      <p className="text-[10px] text-muted-foreground mt-2">
        Dihitung dari catatan yang ditimbang (kg). Golongan bahan diambil dari Stok Pakan.
      </p>
    </Card>
  );
}