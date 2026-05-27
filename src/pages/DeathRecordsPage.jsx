import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Trash2, Filter, Download, Skull } from "lucide-react";
import { toast } from "sonner";
import DeathRecordDialog from "@/components/tortoise/DeathRecordDialog";

export default function DeathRecordsPage() {
  const [selectedTortoise, setSelectedTortoise] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [filters, setFilters] = useState({
    cause: "all",
    month: "all",
    year: new Date().getFullYear()
  });

  const { data: deathRecords = [], isLoading } = useQuery({
    queryKey: ["death-records", filters],
    queryFn: async () => {
      const records = await base44.entities.DeathRecord.list("-death_date", 200);
      return records.filter(record => {
        const recordDate = new Date(record.death_date);
        const monthMatch = filters.month === "all" || (recordDate.getMonth() + 1) === parseInt(filters.month);
        const yearMatch = recordDate.getFullYear() === parseInt(filters.year);
        const causeMatch = filters.cause === "all" || record.cause_of_death === filters.cause;
        return monthMatch && yearMatch && causeMatch;
      });
    }
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-all"],
    queryFn: () => base44.entities.Tortoise.list()
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (!confirm("Hapus catatan kematian ini?")) return;
      await base44.entities.DeathRecord.delete(id);
    },
    onSuccess: () => {
      toast.success("Catatan dihapus");
      queryClient.invalidateQueries({ queryKey: ["death-records"] });
    }
  });

  const queryClient = useQueryClient();

  // Statistik
  const stats = {
    total: deathRecords.length,
    thisMonth: deathRecords.filter(r => {
      const d = new Date(r.death_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    thisYear: deathRecords.filter(r => new Date(r.death_date).getFullYear() === new Date().getFullYear()).length,
    byCause: deathRecords.reduce((acc, r) => {
      acc[r.cause_of_death] = (acc[r.cause_of_death] || 0) + 1;
      return acc;
    }, {})
  };

  const causeLabels = {
    sakit: "Sakit",
    tua: "Tua",
    kecelakaan: "Kecelakaan",
    predator: "Predator",
    tidak_diketahui: "Tidak Diketahui",
    lainnya: "Lainnya"
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Catatan Kematian</h1>
          <p className="text-muted-foreground">Dokumentasi dan statistik kematian tortoise</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Skull className="w-4 h-4 mr-2" />
          Catat Kematian
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Kematian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tahun Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisYear}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Penyebab Utama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {Object.entries(stats.byCause).sort((a, b) => b[1] - a[1])[0]?.[0] 
                ? causeLabels[Object.entries(stats.byCause).sort((a, b) => b[1] - a[1])[0][0]]
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <Select value={filters.cause} onValueChange={(v) => setFilters({ ...filters, cause: v })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Penyebab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Penyebab</SelectItem>
                {Object.entries(causeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.month} onValueChange={(v) => setFilters({ ...filters, month: v })}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <SelectItem key={m} value={m}>{format(new Date(2000, m-1, 1), 'MMMM', { locale: id })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.year.toString()} onValueChange={(v) => setFilters({ ...filters, year: parseInt(v) })}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Death Records List */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Kematian</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : deathRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Skull className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Belum ada catatan kematian tortoise</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deathRecords.map((record) => {
                const tort = tortoises.find(t => t.id === record.tortoise_id);
                const lastPhoto = tort?.photos?.slice(-1)[0]?.url || record.photo_urls?.[0];
                return (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {lastPhoto ? (
                      <img src={lastPhoto} alt={record.tortoise_name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-black/10 flex items-center justify-center flex-shrink-0">
                        <Skull className="w-7 h-7 text-black/40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{record.tortoise_name}</span>
                        {tort?.code && <span className="text-xs text-muted-foreground">({tort.code})</span>}
                        <Badge variant="destructive" className="text-xs">Mati</Badge>
                        {record.necropsy_done && <Badge variant="outline" className="text-xs">Autopsi</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(record.death_date), "dd MMMM yyyy", { locale: id })}
                        {" · "}{causeLabels[record.cause_of_death] || record.cause_of_death}
                      </div>
                      {tort?.enclosure && <div className="text-xs text-muted-foreground">Kandang terakhir: {tort.enclosure}</div>}
                      {record.cause_detail && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{record.cause_detail}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(record.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DeathRecordDialog
        tortoise={selectedTortoise}
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setSelectedTortoise(null);
        }}
      />
    </div>
  );
}