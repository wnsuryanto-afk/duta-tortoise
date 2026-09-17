import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Leaf } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import PakanHarianForm, { SOURCES, SOURCE_BADGE } from "@/components/pakan/PakanHarianForm";
import PageHeader from "@/components/common/PageHeader";
import KeadaanKosong from "@/components/common/KeadaanKosong";

const fmtRp = n => "Rp " + (n || 0).toLocaleString("id-ID");

export default function PakanHarianPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [preview, setPreview] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["pakan-harian-list"],
    queryFn: () => base44.entities.PakanHarian.list("-log_date", 500),
  });

  const todayLogs = logs.filter(l => l.log_date === today);
  const todayTotal = todayLogs.reduce((s, l) => s + (l.basket_count || 0), 0);
  const todaySources = [...new Set(todayLogs.map(l => l.feed_source).filter(Boolean))]
    .map(s => SOURCES.find(x => x.value === s)?.label || s);

  const filtered = useMemo(() => logs.filter(l => {
    const matchDate = filterDate === "all" || l.log_date === filterDate;
    const matchSource = filterSource === "all" || l.feed_source === filterSource;
    return matchDate && matchSource;
  }), [logs, filterDate, filterSource]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pakan-harian-list"] });
    qc.invalidateQueries({ queryKey: ["pakan-harian-today"] });
  };

  const canManage = ["owner", "admin", "manajer", "kepala_feeder", "keeper"].includes(role);

  if (!canAccess(role, "pakan-harian")) return <AccessDenied />;

  return (
    <div className="space-y-5">
      {/* Kartu "Hari ini" yang berdiri sendiri di bawah judul memakan satu layar
          penuh untuk satu angka. Angkanya pindah ke kepala; riwayatnya naik. */}
      <PageHeader
        title="Pakan Harian"
        subtitle="Catatan pengambilan pakan"
        icon={Leaf}
        chips={[
          {
            key: "hariini",
            label: "Hari ini",
            value: `${todayTotal} keranjang`,
            tone: todayTotal > 0 ? "good" : "warn",
            title: todaySources.length > 0 ? todaySources.join(", ") : undefined,
          },
          ...(todaySources.length > 0
            ? [{ key: "sumber", label: "Dari", value: todaySources.join(", ") }]
            : []),
        ]}
        actions={
          canManage && (
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4" /> Catat Pengambilan
            </Button>
          )
        }
      />

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Input
          type="date"
          value={filterDate === "all" ? "" : filterDate}
          onChange={e => setFilterDate(e.target.value || "all")}
          className="w-44 h-9"
        />
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Sumber" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Sumber</SelectItem>
            {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Riwayat */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold text-sm">Riwayat Pengambilan</h3></div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Memuat…</div>
        ) : filtered.length === 0 ? (
          <KeadaanKosong
            gambar="kura"
            judul="Belum ada catatan"
            keterangan="Setiap keranjang pakan yang diambil dicatat di sini."
          />
        ) : (
          <div className="divide-y">
            {filtered.map(l => {
              const tripTotal = (l.trip_cost_solar || 0) + (l.trip_cost_rokok || 0);
              const srcLabel = SOURCES.find(s => s.value === l.feed_source)?.label || l.feed_source;
              return (
                <div key={l.id} className="flex items-center gap-3 p-3">
                  <img
                    src={l.photo_url}
                    alt="Bukti"
                    className="w-14 h-14 rounded-lg object-cover border cursor-pointer flex-shrink-0 bg-muted"
                    onClick={() => setPreview(l.photo_url)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {l.log_date ? format(new Date(l.log_date), "d MMM yyyy", { locale: idLocale }) : "—"}
                      </span>
                      <Badge variant="outline" className={`text-[10px] border-0 ${SOURCE_BADGE[l.feed_source] || "bg-muted text-foreground"}`}>
                        {srcLabel}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {l.basket_count || 0} keranjang
                      {l.feed_type_detail && ` · ${l.feed_type_detail}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      oleh {l.recorded_by_name || "—"}{l.notes ? ` · ${l.notes}` : ""}
                    </p>
                    {tripTotal > 0 && (
                      <p className="text-[11px] text-orange-700 font-medium mt-0.5">
                        Trip pasar: {fmtRp(tripTotal)} (solar {fmtRp(l.trip_cost_solar || 0)} + rokok {fmtRp(l.trip_cost_rokok || 0)})
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <PakanHarianForm open={showForm} onClose={() => setShowForm(false)} user={user} onSaved={refresh} />

      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && <img src={preview} alt="Foto besar" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}