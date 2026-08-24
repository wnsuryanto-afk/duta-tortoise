/**
 * RiwayatKlusterPage — seluruh kluster penyakit yang pernah terdeteksi sejak
 * awal data. Dihitung ulang dari HealthRecord (murni membaca), jadi tidak
 * bergantung pada penandaan "sudah ditinjau" di dashboard.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { detectDiseaseClusters } from "@/lib/diseaseClusterUtils";
import DiseaseClusterCard from "@/components/health/DiseaseClusterCard";
import { Button } from "@/components/ui/button";

export default function RiwayatKlusterPage() {
  const { data: healthRecords = [], isLoading } = useQuery({
    queryKey: ["cluster-health-records"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 1000),
    staleTime: 10 * 60 * 1000,
  });
  const { data: tortoises = [] } = useQuery({
    queryKey: ["cluster-tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-name", 500),
    staleTime: 10 * 60 * 1000,
  });

  const clusters = useMemo(() => {
    const enclosureMap = {};
    tortoises.forEach((t) => {
      if (t.id) enclosureMap[t.id] = t.enclosure || "";
    });
    return detectDiseaseClusters(healthRecords, enclosureMap);
  }, [healthRecords, tortoises]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto p-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Link>
        </Button>
        <h1 className="text-xl font-heading font-bold">Riwayat Kluster Penyakit</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Deteksi otomatis: 3 kura atau lebih dengan diagnosis yang sama dalam rentang 3 hari.
        Membaca seluruh catatan kesehatan — berguna untuk melihat pola yang berulang di bulan
        yang sama tiap tahun.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : clusters.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>Belum ada kluster penyakit terdeteksi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {clusters.length} kluster terdeteksi (urut terbaru).
          </p>
          {clusters.map((c) => (
            <DiseaseClusterCard key={c.key} cluster={c} />
          ))}
        </div>
      )}
    </div>
  );
}