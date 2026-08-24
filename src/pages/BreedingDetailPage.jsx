import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowLeft, Printer, AlertTriangle } from "lucide-react";
import EggLabelGenerator, { candlingDate30, isCandlingLate } from "@/components/breeding/EggLabelGenerator";
import EggGrid from "@/components/breeding/EggGrid";
import ParentHealthBadges from "@/components/breeding/ParentHealthBadges";

const statusColors = {
  bertelur: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  inkubasi: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  menetas: "bg-primary/10 text-primary border-primary/20",
  gagal: "bg-destructive/10 text-destructive border-destructive/20",
  selesai: "bg-green-100 text-green-800 border-green-400",
};

function Info({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-red-600 font-bold" : ""}`}>{value}</p>
    </div>
  );
}

export default function BreedingDetailPage() {
  const { id } = useParams();
  const [showLabel, setShowLabel] = useState(false);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["breeding-detail", id],
    queryFn: () => base44.entities.Breeding.filter({ id }),
    enabled: !!id,
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["breeding-detail-health"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const b = list[0];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat data pembiakan...</div>;
  }
  if (!b) {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-muted-foreground">Data pembiakan tidak ditemukan.</p>
        <Button asChild variant="outline" size="sm"><Link to="/breeding">Kembali ke Breeding</Link></Button>
      </div>
    );
  }

  const cd = candlingDate30(b.egg_laying_date);
  const late = isCandlingLate(b);
  const hatchStr = (b.estimated_hatch_start && b.estimated_hatch_end)
    ? `${format(new Date(b.estimated_hatch_start), "d MMM", { locale: idLocale })} – ${format(new Date(b.estimated_hatch_end), "d MMM yyyy", { locale: idLocale })}`
    : "—";

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/breeding"><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Link>
        </Button>
        <h1 className="text-xl font-heading font-bold flex-1 truncate">Rincian Pembiakan</h1>
        <Button size="sm" variant="outline" onClick={() => setShowLabel(true)}>
          <Printer className="w-4 h-4 mr-1" /> Cetak Label
        </Button>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-lg">{b.male_name} × {b.female_name}</h2>
          <Badge variant="outline" className={`capitalize ${statusColors[b.status] || ""}`}>{b.status}</Badge>
        </div>

        <ParentHealthBadges
          maleId={b.male_id}
          femaleId={b.female_id}
          maleName={b.male_name}
          femaleName={b.female_name}
          healthRecords={healthRecords}
          refDate={b.egg_laying_date}
        />

        {late && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Candling terlambat — segera periksa telur (H+30 sudah lewat).
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Info label="Jumlah Telur" value={`${b.egg_count || 0} butir`} />
          <Info label="Tanggal Bertelur" value={b.egg_laying_date ? format(new Date(b.egg_laying_date), "d MMMM yyyy", { locale: idLocale }) : "—"} />
          <Info label="Perkiraan Menetas" value={hatchStr} />
          <Info label="Candling (H+30)" value={cd ? format(cd, "d MMMM yyyy", { locale: idLocale }) : "—"} highlight={late} />
          <Info label="Inkubator" value={b.incubator_name || "—"} />
          <Info label="Tray" value={b.tray_number ? `Tray ${b.tray_number}` : "—"} />
          <Info label="Musim" value={b.season_year ? `Musim ${b.season_year}` : "—"} />
          <Info label="Suhu Inkubasi" value={b.incubation_temp ? `${b.incubation_temp}°C` : "—"} />
        </div>

        {b.notes && <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">{b.notes}</div>}
      </Card>

      {b.egg_count > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Telur</p>
          <EggGrid breeding={b} />
        </Card>
      )}

      {showLabel && (
        <EggLabelGenerator breedings={[b]} open={showLabel} onClose={() => setShowLabel(false)} />
      )}
    </div>
  );
}