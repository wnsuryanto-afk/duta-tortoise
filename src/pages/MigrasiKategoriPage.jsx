import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Loader2, ArrowRight, RefreshCw, PackageOpen } from "lucide-react";

const FEED_CATEGORIES = [
  { value: "sayuran", label: "🥬 Sayuran" },
  { value: "buah", label: "🍎 Buah" },
  { value: "rumput", label: "🌿 Rumput" },
  { value: "suplemen", label: "💊 Suplemen" },
  { value: "pelet", label: "🟤 Pelet" },
  { value: "hay", label: "🌾 Hay" },
  { value: "lainnya", label: "📦 Lainnya" },
];

const WH_CATEGORIES_NON_PAKAN = [
  { value: "obat", label: "💊 Obat" },
  { value: "vitamin", label: "🌿 Vitamin" },
  { value: "suplemen", label: "🧪 Suplemen" },
  { value: "alat_kerja", label: "🔧 Alat Kerja" },
  { value: "peralatan", label: "⚙️ Peralatan" },
  { value: "lainnya", label: "📦 Lainnya" },
];

export default function MigrasiKategoriPage() {
  const qc = useQueryClient();
  const [loadingId, setLoadingId] = useState(null);
  const [migrasiSemuaLoading, setMigrasiSemuaLoading] = useState(false);
  const [hasilMigrasi, setHasilMigrasi] = useState(null);
  const [log, setLog] = useState([]);
  const [showLog, setShowLog] = useState(false);

  // Dialog pindah ke FeedStock
  const [pindahDialog, setPindahDialog] = useState(null);
  const [feedCatPilih, setFeedCatPilih] = useState("lainnya");

  // Dialog ganti kategori
  const [gantiDialog, setGantiDialog] = useState(null);
  const [gantiKatPilih, setGantiKatPilih] = useState("lainnya");

  // Dialog migrasi semua
  const [semuaDialog, setSemuaDialog] = useState(false);
  const [semuaCat, setSemuaCat] = useState("lainnya");

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["migrasi-pakan-items"],
    queryFn: async () => {
      const res = await base44.functions.invoke("migrasiKategoriPakan", { mode: "preview" });
      return res.data?.items || [];
    },
  });

  const handlePindah = async () => {
    setLoadingId(pindahDialog.id);
    const res = await base44.functions.invoke("migrasiKategoriPakan", {
      mode: "migrasi_satu",
      itemId: pindahDialog.id,
      feedCategory: feedCatPilih,
    });
    if (res.data?.success) {
      setLog(res.data.log || []);
      await refetch();
      qc.invalidateQueries({ queryKey: ["feedstocks"] });
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    }
    setLoadingId(null);
    setPindahDialog(null);
  };

  const handleGantiKategori = async () => {
    setLoadingId(gantiDialog.id);
    const res = await base44.functions.invoke("migrasiKategoriPakan", {
      mode: "ganti_kategori",
      itemId: gantiDialog.id,
      gantiKategori: gantiKatPilih,
    });
    if (res.data?.success) {
      setLog(res.data.log || []);
      await refetch();
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    }
    setLoadingId(null);
    setGantiDialog(null);
  };

  const handleMigrasiSemua = async () => {
    setMigrasiSemuaLoading(true);
    const res = await base44.functions.invoke("migrasiKategoriPakan", {
      mode: "migrasi_semua",
      feedCategory: semuaCat,
    });
    if (res.data?.success) {
      setHasilMigrasi(res.data.summary);
      setLog(res.data.log || []);
      await refetch();
      qc.invalidateQueries({ queryKey: ["feedstocks"] });
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    }
    setMigrasiSemuaLoading(false);
    setSemuaDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Migrasi Kategori Pakan</h1>
          <p className="text-muted-foreground text-sm">
            Pindahkan WarehouseItem berkategori "pakan" ke Stok Pakan (FeedStock) yang seharusnya
          </p>
        </div>
        <div className="flex gap-2">
          {log.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowLog(true)} className="gap-1">
              <PackageOpen className="w-4 h-4" /> Lihat Log
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          {items.length > 0 && (
            <Button size="sm" onClick={() => setSemuaDialog(true)} className="gap-1 bg-orange-600 hover:bg-orange-700">
              <ArrowRight className="w-4 h-4" /> Migrasi Semua ({items.length})
            </Button>
          )}
        </div>
      </div>

      {/* Hasil migrasi */}
      {hasilMigrasi && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-700">Migrasi Selesai!</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-2xl font-bold text-green-600">{hasilMigrasi.totalPindah}</p>
              <p className="text-xs text-muted-foreground">Item dipindah ke FeedStock</p>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-2xl font-bold text-blue-600">{hasilMigrasi.totalUsage}</p>
              <p className="text-xs text-muted-foreground">Referensi ItemUsage dipindah</p>
            </div>
          </div>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Memuat data…</p>
        </Card>
      )}

      {/* Kosong */}
      {!isLoading && items.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="font-semibold text-green-700">Tidak ada WarehouseItem berkategori "pakan"</p>
          <p className="text-sm text-muted-foreground mt-1">Semua item pakan sudah ada di tempat yang benar.</p>
        </Card>
      )}

      {/* List item */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold">{items.length} Item Salah Tempat (kategori "pakan" di Gudang)</h2>
          </div>

          {items.map((item) => {
            const isLoading_ = loadingId === item.id;
            return (
              <Card key={item.id} className="p-4 border-orange-200 bg-orange-50/30">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive" className="text-xs">pakan</Badge>
                      <span className="font-semibold">{item.name}</span>
                      {item.sku && <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Stok: {item.current_stock} {item.unit} · Harga: Rp {(item.purchase_price || 0).toLocaleString("id-ID")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" disabled={isLoading_}
                      className="text-xs gap-1 border-green-400 text-green-700 hover:bg-green-50"
                      onClick={() => { setPindahDialog(item); setFeedCatPilih("lainnya"); }}>
                      {isLoading_ ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                      Pindahkan ke Stok Pakan
                    </Button>
                    <Button size="sm" variant="outline" disabled={isLoading_}
                      className="text-xs gap-1 border-blue-400 text-blue-700 hover:bg-blue-50"
                      onClick={() => { setGantiDialog(item); setGantiKatPilih("lainnya"); }}>
                      Ubah Kategori
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isLoading_}
                      className="text-xs text-muted-foreground"
                      onClick={() => {
                        // "Biarkan" — hapus dari tampilan lokal sementara
                        qc.setQueryData(["migrasi-pakan-items"], (old) => (old || []).filter(i => i.id !== item.id));
                      }}>
                      Biarkan
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Pindahkan ke FeedStock */}
      <Dialog open={!!pindahDialog} onOpenChange={() => setPindahDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pindahkan ke Stok Pakan</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Item <span className="font-semibold">"{pindahDialog?.name}"</span> akan dibuat di Stok Pakan dan dihapus dari Gudang. Semua riwayat transaksi (ItemUsage) juga akan dipindah.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Kategori Pakan yang Sesuai</Label>
            <Select value={feedCatPilih} onValueChange={setFeedCatPilih}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEED_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPindahDialog(null)}>Batal</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handlePindah}
              disabled={loadingId === pindahDialog?.id}>
              {loadingId === pindahDialog?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pindahkan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ganti Kategori */}
      <Dialog open={!!gantiDialog} onOpenChange={() => setGantiDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ubah Kategori Item</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ganti kategori <span className="font-semibold">"{gantiDialog?.name}"</span> dari "pakan" ke kategori yang sesuai untuk gudang.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Kategori Baru (Gudang)</Label>
            <Select value={gantiKatPilih} onValueChange={setGantiKatPilih}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WH_CATEGORIES_NON_PAKAN.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setGantiDialog(null)}>Batal</Button>
            <Button className="flex-1" onClick={handleGantiKategori}
              disabled={loadingId === gantiDialog?.id}>
              {loadingId === gantiDialog?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ubah Kategori"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Migrasi Semua */}
      <Dialog open={semuaDialog} onOpenChange={() => setSemuaDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Migrasi Semua ke Stok Pakan</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Semua <span className="font-bold text-orange-600">{items.length} item</span> berkategori "pakan" di Gudang akan dipindahkan ke Stok Pakan sekaligus.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Kategori FeedStock untuk semua item</Label>
            <Select value={semuaCat} onValueChange={setSemuaCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEED_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Bisa diubah per item setelah migrasi.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setSemuaDialog(false)}>Batal</Button>
            <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleMigrasiSemua} disabled={migrasiSemuaLoading}>
              {migrasiSemuaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Migrasi Semua"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log dialog */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Log Migrasi</DialogTitle></DialogHeader>
          <div className="overflow-y-auto font-mono text-xs bg-muted/50 rounded-lg p-4 space-y-1 max-h-[60vh]">
            {log.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}