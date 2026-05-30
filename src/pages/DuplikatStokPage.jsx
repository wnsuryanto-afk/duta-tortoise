import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Loader2, Merge, RefreshCw, ClipboardList } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL_UNITS = ["pcs", "botol", "sachet", "kg", "gram", "liter", "ml", "ikat", "buah", "lusin", "box", "strip", "keranjang"];

function RingkasanCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export default function DuplikatStokPage() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [log, setLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // id pasangan
  const [pisahDialog, setPisahDialog] = useState(null); // pasangan yang dipilih pisah
  const [namaBaruB, setNamaBaruB] = useState("");
  const [satuanBaruB, setSatuanBaruB] = useState("");

  // Baca daftar duplikat satuan beda dari CompanySettings.notes
  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const list = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return list[0] || {};
    },
  });

  let duplikatList = [];
  try {
    if (settings?.notes) duplikatList = JSON.parse(settings.notes);
  } catch {}

  const jalankanBersih = async () => {
    setRunning(true);
    setSummary(null);
    setLog([]);
    const res = await base44.functions.invoke("bersihkanDuplikatStok", {});
    const data = res.data;
    if (data?.success) {
      setSummary(data.summary);
      setLog(data.summary.log || []);
    }
    await refetchSettings();
    setRunning(false);
  };

  const selesaikan = async (pasangan, action, namaB, satuanB) => {
    const key = `${pasangan.itemA.id}-${pasangan.itemB.id}`;
    setActionLoading(key);
    const payload = {
      action,
      idA: pasangan.itemA.id,
      idB: pasangan.itemB.id,
      entityName: pasangan.entityName,
      namaBaruB: namaB,
      satuanBaruB: satuanB,
    };
    const res = await base44.functions.invoke("selesaikanDuplikatStok", payload);
    if (res.data?.success) {
      // Hapus dari daftar pending di notes
      const newList = duplikatList.filter(d =>
        !(d.itemA.id === pasangan.itemA.id && d.itemB.id === pasangan.itemB.id)
      );
      // Update settings.notes
      if (settings?.id) {
        await base44.entities.CompanySettings.update(settings.id, {
          notes: JSON.stringify(newList),
        });
      }
      await refetchSettings();
      qc.invalidateQueries({ queryKey: ["feedstocks"] });
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    }
    setActionLoading(null);
    setPisahDialog(null);
    setNamaBaruB("");
  };

  const entityLabel = (e) => e === "feedstock" ? "Stok Pakan" : "Gudang";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Bersihkan Duplikat Stok</h1>
          <p className="text-muted-foreground text-sm">Hapus item bertag, gabung duplikat nama, dan selesaikan konflik satuan beda</p>
        </div>
        <div className="flex gap-2">
          {log.length > 0 && (
            <Button variant="outline" onClick={() => setShowLog(true)} className="gap-2">
              <ClipboardList className="w-4 h-4" /> Lihat Log
            </Button>
          )}
          <Button onClick={jalankanBersih} disabled={running} className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {running ? "Memproses..." : "Jalankan Pembersihan"}
          </Button>
        </div>
      </div>

      {/* Info */}
      {!summary && duplikatList.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Klik "Jalankan Pembersihan" untuk mulai proses deteksi & pembersihan duplikat stok.</p>
          <p className="text-xs mt-1">Proses ini akan menghapus item bertag, menggabungkan duplikat nama dengan satuan sama, dan menampilkan daftar duplikat satuan beda untuk keputusan manual.</p>
        </Card>
      )}

      {/* Ringkasan hasil */}
      {summary && (
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ringkasan Hasil Pembersihan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <RingkasanCard icon={CheckCircle2} label="Item Bertag Dihapus" value={summary.hapusDuplikatCount} color="bg-red-100 text-red-600" />
            <RingkasanCard icon={Merge} label="Auto-Gabung Berhasil" value={summary.autoGabungCount} color="bg-green-100 text-green-600" />
            <RingkasanCard icon={AlertTriangle} label="Menunggu Keputusan" value={summary.duplikatSatuanBedaCount} color="bg-orange-100 text-orange-600" />
            <RingkasanCard icon={ClipboardList} label="ItemUsage Dipindah" value={summary.itemUsagePindahCount} color="bg-blue-100 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground">Diproses oleh: {summary.triggeredBy} · {new Date(summary.triggeredAt).toLocaleString("id-ID")}</p>
        </div>
      )}

      {/* Daftar duplikat satuan beda */}
      {duplikatList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold">Duplikat Menunggu Keputusan ({duplikatList.length} pasangan)</h2>
          </div>
          <p className="text-sm text-muted-foreground">Item-item berikut memiliki nama sama tapi satuan berbeda. Pilih tindakan untuk setiap pasangan.</p>

          <div className="space-y-3">
            {duplikatList.map((d, i) => {
              const key = `${d.itemA.id}-${d.itemB.id}`;
              const isLoading = actionLoading === key;
              return (
                <Card key={i} className="p-4 border-orange-200 bg-orange-50/30">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{entityLabel(d.entityName)}</Badge>
                        <span className="font-semibold">{d.itemA.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2.5 rounded-lg bg-background border">
                          <p className="font-medium text-xs text-muted-foreground mb-0.5">Item A</p>
                          <p className="font-semibold">{d.itemA.unit}</p>
                          <p className="text-xs text-muted-foreground">Stok: {d.itemA.current_stock} {d.itemA.unit}</p>
                          <p className="text-xs text-muted-foreground">Kategori: {d.itemA.category}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-background border">
                          <p className="font-medium text-xs text-muted-foreground mb-0.5">Item B</p>
                          <p className="font-semibold">{d.itemB.unit}</p>
                          <p className="text-xs text-muted-foreground">Stok: {d.itemB.current_stock} {d.itemB.unit}</p>
                          <p className="text-xs text-muted-foreground">Kategori: {d.itemB.category}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" disabled={isLoading}
                        className="text-xs gap-1 border-green-400 text-green-700 hover:bg-green-50"
                        onClick={() => selesaikan(d, "gabung_a")}>
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Merge className="w-3 h-3" />}
                        Gabung → pakai {d.itemA.unit}
                      </Button>
                      <Button size="sm" variant="outline" disabled={isLoading}
                        className="text-xs gap-1 border-blue-400 text-blue-700 hover:bg-blue-50"
                        onClick={() => selesaikan(d, "gabung_b")}>
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Merge className="w-3 h-3" />}
                        Gabung → pakai {d.itemB.unit}
                      </Button>
                      <Button size="sm" variant="outline" disabled={isLoading}
                        className="text-xs gap-1"
                        onClick={() => { setPisahDialog(d); setNamaBaruB(`${d.itemB.name} (${d.itemB.unit})`); setSatuanBaruB(d.itemB.unit); }}>
                        Tetap Pisah (rename B)
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {duplikatList.length === 0 && summary && (
        <Card className="p-6 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
          <p className="font-medium text-green-700">Semua duplikat telah diselesaikan!</p>
          <p className="text-sm text-muted-foreground mt-1">Tidak ada pasangan yang menunggu keputusan.</p>
        </Card>
      )}

      {/* Log dialog */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Log Pembersihan</DialogTitle></DialogHeader>
          <div className="overflow-y-auto font-mono text-xs bg-muted/50 rounded-lg p-4 space-y-1 max-h-[60vh]">
            {log.map((l, i) => (
              <p key={i} className={l.startsWith("===") ? "font-bold text-primary mt-3" : l.startsWith("  →") ? "text-muted-foreground pl-4" : ""}>{l}</p>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pisah dialog */}
      <Dialog open={!!pisahDialog} onOpenChange={() => { setPisahDialog(null); setNamaBaruB(""); setSatuanBaruB(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pisahkan Item B</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ubah nama dan/atau satuan item B agar tidak konflik dengan item A.</p>
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs">
              <p className="font-medium text-muted-foreground">Item A (tidak berubah):</p>
              <p className="font-semibold mt-0.5">{pisahDialog?.itemA?.name} — <span className="text-primary">{pisahDialog?.itemA?.unit}</span></p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nama baru Item B</Label>
              <Input value={namaBaruB} onChange={e => setNamaBaruB(e.target.value)} placeholder="Nama baru..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Satuan Item B</Label>
              <Select value={satuanBaruB} onValueChange={setSatuanBaruB}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih satuan..." /></SelectTrigger>
                <SelectContent>
                  {ALL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setPisahDialog(null); setNamaBaruB(""); setSatuanBaruB(""); }}>Batal</Button>
            <Button className="flex-1" disabled={!namaBaruB.trim() || !!actionLoading}
              onClick={() => selesaikan(pisahDialog, "pisah", namaBaruB.trim(), satuanBaruB)}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}