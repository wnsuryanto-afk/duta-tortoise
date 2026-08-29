import { useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, PackageOpen, Plus, Pencil, Trash2, CheckCircle2, Leaf, QrCode, Printer } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { formatRp } from "@/lib/skuUtils";
import StockItemForm from "@/components/stock/StockItemForm";
import StockTransactionDialog from "@/components/stock/StockTransactionDialog";
import QRScannerDialog from "@/components/stock/QRScannerDialog";
import NiimbotLabelGenerator from "@/components/stock/NiimbotLabelGenerator";
import ItemDetailDialog from "@/components/stock/ItemDetailDialog";
import ApprovalQueueCard from "@/components/stock/ApprovalQueueCard";
import DataLengkapFilter from "@/components/stock/DataLengkapFilter";
import IncompleteBadges, { isItemIncomplete } from "@/components/stock/IncompleteBadges";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PakanMasukDialog from "@/components/pakan/PakanMasukDialog";
import PakanKeluarDialog from "@/components/pakan/PakanKeluarDialog";
import RiwayatPakanTab from "@/components/pakan/RiwayatPakanTab";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = [
  { value: "sayuran", label: "🥬 Sayuran" },
  { value: "buah", label: "🍎 Buah" },
  { value: "rumput", label: "🌿 Rumput" },
  { value: "suplemen", label: "💊 Suplemen" },
  { value: "pelet", label: "🟤 Pelet" },
  { value: "hay", label: "🌾 Hay" },
  { value: "lainnya", label: "📦 Lainnya" },
];

const SULCATA_IDEAL_FEEDS = [
  { name: "Rumput Sudan / Gajah", category: "rumput", unit: "kg", current_stock: 5, minimum_stock: 3, price_per_unit: 5000, daily_ideal: 1, notes: "Pakan utama harian sulcata" },
  { name: "Daun Pepaya", category: "sayuran", unit: "ikat", current_stock: 3, minimum_stock: 2, price_per_unit: 3000, daily_ideal: 1 },
  { name: "Kubis / Sawi", category: "sayuran", unit: "kg", current_stock: 2, minimum_stock: 1, price_per_unit: 8000, daily_ideal: 0.5 },
  { name: "Wortel", category: "sayuran", unit: "kg", current_stock: 1, minimum_stock: 0.5, price_per_unit: 10000, daily_ideal: 0.3 },
  { name: "Labu Kuning", category: "sayuran", unit: "kg", current_stock: 1, minimum_stock: 0.5, price_per_unit: 6000, daily_ideal: 0.3 },
  { name: "Daun Kelor", category: "sayuran", unit: "ikat", current_stock: 2, minimum_stock: 1, price_per_unit: 2000, daily_ideal: 0.5 },
  { name: "Semangka (tanpa biji)", category: "buah", unit: "buah", current_stock: 2, minimum_stock: 1, price_per_unit: 15000, daily_ideal: 0.1 },
  { name: "Pisang", category: "buah", unit: "buah", current_stock: 5, minimum_stock: 3, price_per_unit: 2000, daily_ideal: 0.1 },
  { name: "Kalsium / Cuttlebone", category: "suplemen", unit: "buah", current_stock: 3, minimum_stock: 2, price_per_unit: 5000 },
  { name: "Vitamin Reptil", category: "suplemen", unit: "gram", current_stock: 50, minimum_stock: 20, price_per_unit: 500 },
];

function StockStatusBadge({ s }) {
  if (s.current_stock === 0) return <Badge variant="destructive" className="text-xs">Habis</Badge>;
  if (s.current_stock <= s.minimum_stock) return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Stok Rendah</Badge>;
  return <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Aman</Badge>;
}

export default function FeedStockPage() {
  const { user, role } = useCurrentUser();
  const isAdmin = ["admin", "owner", "manajer"].includes(role);
  const isKeeperOnly = role === "keeper";
  const canEdit = isAdmin;
  const canCreate = isAdmin || role === "kepala_feeder";
  const canDelete = isAdmin;

  const qc = useQueryClient();
  const { data: stocks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["feedstocks", "-created_date", 100],
    queryFn: () => base44.entities.FeedStock.list("-created_date", 100),
    staleTime: 5 * 60 * 1000,
    retry: false, // jangan retry otomatis — user bisa tap refresh manual
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const list = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return list[0] || {};
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: false,
  });

  const threshold = settings?.stok_approval_threshold ?? 500000;

  const [catFilter, setCatFilter] = useState("semua");
  const [lowFilter, setLowFilter] = useState(false);
  const [lengkapFilter, setLengkapFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [generatingSKU, setGeneratingSKU] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [txItem, setTxItem] = useState(null);
  const [txInitialType, setTxInitialType] = useState("masuk");
  const [detailItem, setDetailItem] = useState(null);
  const [labelItems, setLabelItems] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState("stok");
  const [showPakanMasuk, setShowPakanMasuk] = useState(false);
  const [showPakanKeluar, setShowPakanKeluar] = useState(false);

  const { data: feedMovements = [] } = useQuery({
    queryKey: ["feed-movements"],
    queryFn: () => base44.entities.StockMovement.filter({ item_type: "feedstock" }, "-created_date", 200),
    staleTime: 30 * 1000,
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const masukToday = feedMovements.filter(m => m.type === "masuk" && m.date === todayStr);
  const keluarToday = feedMovements.filter(m => m.type === "keluar" && m.date === todayStr);
  const [showSeed, setShowSeed] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const allSkus = useMemo(() => stocks.map((s) => s.sku).filter(Boolean), [stocks]);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["feedstocks"] });

  const handleGenerateSKU = async () => {
    setGeneratingSKU(true);
    await base44.functions.invoke("backfillSKU", {});
    invalidate();
    setGeneratingSKU(false);
  };

  const filtered = stocks.filter((s) => {
    const matchCat = catFilter === "semua" || s.category === catFilter;
    const matchLow = !lowFilter || s.current_stock <= s.minimum_stock;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.sku || "").toLowerCase().includes(search.toLowerCase());
    const inc = isItemIncomplete(s, "feedstock");
    const matchLengkap = lengkapFilter === "semua" || (lengkapFilter === "belum" ? inc : !inc);
    return matchCat && matchLow && matchSearch && matchLengkap;
  }).sort((a, b) => {
    if (lengkapFilter !== "belum") return 0;
    const scoreA = [!a.photo_url, !a.sku, !(a.price_per_unit > 0), !a.unit].filter(Boolean).length;
    const scoreB = [!b.photo_url, !b.sku, !(b.price_per_unit > 0), !b.unit].filter(Boolean).length;
    return scoreB - scoreA;
  });

  const lowCount = stocks.filter((s) => s.current_stock <= s.minimum_stock).length;
  const totalValue = stocks.reduce((sum, s) => sum + ((s.price_per_unit || 0) * (s.current_stock || 0)), 0);

  const handleScanResult = (sku) => {
    const found = stocks.find((s) => (s.sku || "").toUpperCase() === sku.toUpperCase());
    if (found) {
      setScanResult(null);
      setTxItem(found);
      setTxInitialType("keluar");
    } else {
      setScanResult({ notFound: true, sku });
    }
  };

  const handleSeedIdealFeeds = async () => {
    setSeeding(true);
    for (const feed of SULCATA_IDEAL_FEEDS) {
      await base44.entities.FeedStock.create({
        ...feed,
        last_edited_by: user?.email || "",
        last_edited_at: new Date().toISOString(),
      });
    }
    invalidate();
    setShowSeed(false);
    setSeeding(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold">Stok Pakan</h1>
          <p className="text-muted-foreground mt-1">Kelola persediaan pakan kura-kura</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowScanner(true)} className="gap-2">
            <QrCode className="w-4 h-4" /> Scan Barang
          </Button>
          <Button variant="outline" onClick={() => setShowPakanMasuk(true)} className="gap-2 bg-green-50 border-green-300 text-green-700 hover:bg-green-100">
            <ArrowUpCircle className="w-4 h-4" /> Pakan Masuk
          </Button>
          <Button variant="outline" onClick={() => setShowPakanKeluar(true)} className="gap-2 bg-red-50 border-red-300 text-red-700 hover:bg-red-100">
            <ArrowDownCircle className="w-4 h-4" /> Pakan Keluar
          </Button>
          {isAdmin && filtered.length > 0 && (
            <Button variant="outline" onClick={() => setLabelItems(filtered)} className="gap-2">
              <Printer className="w-4 h-4" /> Label Massal
            </Button>
          )}
          {canCreate && stocks.length === 0 && (
            <Button variant="outline" onClick={() => setShowSeed(true)}>
              <Leaf className="w-4 h-4" /> Isi Pakan Ideal Sulcata
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Tambah Pakan
            </Button>
          )}
        </div>
      </div>

      {/* Approval queue (admin only) */}
      {isAdmin && <ApprovalQueueCard user={user} />}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10"><PackageOpen className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{stocks.length}</p><p className="text-xs text-muted-foreground">Total Item</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
          <div><p className="text-2xl font-bold text-orange-700">{lowCount}</p><p className="text-xs text-muted-foreground">Perlu Diisi</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-100"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-green-700">{stocks.length - lowCount}</p><p className="text-xs text-muted-foreground">Stok Aman</p></div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Nilai Total Stok</p>
          <p className="text-sm font-bold text-primary">{formatRp(totalValue)}</p>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-100"><ArrowUpCircle className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-green-700">{masukToday.length}</p><p className="text-xs text-muted-foreground">Pakan Masuk Hari Ini</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-100"><ArrowDownCircle className="w-5 h-5 text-red-500" /></div>
          <div><p className="text-2xl font-bold text-red-600">{keluarToday.length}</p><p className="text-xs text-muted-foreground">Pakan Keluar Hari Ini</p></div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="stok">📦 Stok Pakan</TabsTrigger>
          <TabsTrigger value="riwayat">📋 Riwayat Transaksi</TabsTrigger>
        </TabsList>
        <TabsContent value="stok" className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Cari nama / SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44 h-9" />
        <div className="flex rounded-lg border overflow-hidden h-9 text-xs">
          {[["semua", "Semua"], ...CATEGORIES.map(c => [c.value, c.label])].map(([v, l]) => (
            <button key={v} onClick={() => setCatFilter(v)}
              className={`px-3 font-medium transition-colors border-r last:border-r-0 ${catFilter === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => setLowFilter(!lowFilter)}
          className={`px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${lowFilter ? "bg-orange-500 text-white border-orange-500" : "bg-background border-border hover:bg-muted"}`}>
          ⚠️ Stok Menipis
        </button>
        <DataLengkapFilter
          items={stocks}
          isIncomplete={(s) => isItemIncomplete(s, "feedstock")}
          lengkapFilter={lengkapFilter}
          onChangeLengkap={setLengkapFilter}
          isAdmin={isAdmin}
          onGenerateSKU={handleGenerateSKU}
          generatingSKU={generatingSKU}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : isError ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground">Gagal memuat data stok pakan.</p>
          <Button variant="outline" onClick={() => refetch()}>Coba Lagi</Button>
        </div>
      ) : stocks.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <PackageOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada data stok pakan</p>
          {canCreate && (
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={() => setShowSeed(true)}><Leaf className="w-4 h-4" /> Isi Pakan Ideal</Button>
              <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Tambah Manual</Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const isLow = s.current_stock <= s.minimum_stock;
            const incomplete = isItemIncomplete(s, "feedstock");
            return (
              <Card key={s.id} className={`p-4 group hover:shadow-md transition-shadow cursor-pointer ${incomplete ? "border-l-4 border-l-yellow-400" : ""} ${isLow && s.is_mandatory ? "border-red-400 bg-red-50/30" : isLow ? "border-orange-300 bg-orange-50/30" : ""}`}
                onClick={() => setDetailItem(s)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    {/* Photo thumbnail or placeholder */}
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="w-12 h-12 rounded object-cover border mb-1.5" />
                    ) : canEdit ? (
                      <button onClick={e => { e.stopPropagation(); setEditItem(s); setShowForm(true); }}
                        className="w-12 h-12 rounded border border-dashed border-yellow-400 bg-yellow-50 flex flex-col items-center justify-center mb-1.5 text-yellow-600 hover:bg-yellow-100 transition-colors">
                        <span className="text-lg">📷</span>
                        <span className="text-[8px] leading-tight">Tambah</span>
                      </button>
                    ) : null}
                    <p className="font-semibold text-sm">{s.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-xs text-muted-foreground">{CATEGORIES.find(c => c.value === s.category)?.label}</span>
                      {s.sku && <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 rounded">{s.sku}</span>}
                      {s.is_mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">⚠️ Wajib</span>}
                    </div>
                    {incomplete && <IncompleteBadges item={s} itemType="feedstock" />}
                  </div>
                  <StockStatusBadge s={s} />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className={`text-3xl font-bold ${isLow ? "text-orange-700" : ""}`}>
                      {s.current_stock}<span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Min: {s.minimum_stock} {s.unit}</p>
                  </div>
                  <div className="text-right">
                    {!isKeeperOnly && s.price_per_unit > 0 && (
                      <p className="text-xs text-muted-foreground">{formatRp(s.price_per_unit)}/{s.unit}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${s.current_stock === 0 ? "bg-destructive" : isLow ? "bg-orange-400" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (s.current_stock / (s.minimum_stock * 3 || 1)) * 100)}%` }} />
                </div>

                <div className="flex gap-1 mt-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1"
                    onClick={() => { setTxItem(s); setTxInitialType("keluar"); }}>
                    Ambil
                  </Button>
                  {canEdit && (
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1"
                      onClick={() => { setTxItem(s); setTxInitialType("masuk"); }}>
                      Tambah Stok
                    </Button>
                  )}
                  {canEdit && incomplete && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                      onClick={() => { setEditItem(s); setShowForm(true); }}>
                      ✏️ Lengkapi
                    </Button>
                  )}
                  {s.sku && isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Buat Label"
                      onClick={() => setLabelItems([s])}>
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canEdit && !incomplete && (
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditItem(s); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => { if (confirm(`Hapus ${s.name}?`)) base44.entities.FeedStock.delete(s.id).then(invalidate); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

        </TabsContent>
        <TabsContent value="riwayat">
          <RiwayatPakanTab movements={feedMovements} items={stocks} role={role} onRefresh={() => { invalidate(); qc.invalidateQueries({ queryKey: ["feed-movements"] }); }} />
        </TabsContent>
      </Tabs>

      {/* Forms & Dialogs */}
      {showForm && (
        <StockItemForm open={showForm} itemType="feedstock" editData={editItem} user={user}
          allSkus={allSkus} allItems={stocks}
          onSaved={() => { invalidate(); setShowForm(false); setEditItem(null); }}
          onClose={() => { setShowForm(false); setEditItem(null); }} />
      )}

      {txItem && (
        <StockTransactionDialog item={txItem} itemType="feedstock" user={user} role={role}
          threshold={threshold} initialType={txInitialType}
          onClose={(refreshed) => { setTxItem(null); if (refreshed) invalidate(); }} />
      )}

      {detailItem && (
        <ItemDetailDialog item={detailItem} itemType="feedstock" role={role} open={!!detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => { setEditItem(detailItem); setDetailItem(null); setShowForm(true); }}
          onTransaction={() => { setTxItem(detailItem); setTxInitialType("masuk"); setDetailItem(null); }}
          onLabel={() => { setLabelItems([detailItem]); setDetailItem(null); }} />
      )}

      {labelItems && (
        <NiimbotLabelGenerator open={!!labelItems} items={labelItems}
          onClose={() => setLabelItems(null)} />
      )}

      {showPakanMasuk && (
        <PakanMasukDialog
          items={stocks}
          user={user}
          role={role}
          onClose={(refreshed) => { setShowPakanMasuk(false); if (refreshed) { invalidate(); qc.invalidateQueries({ queryKey: ["feed-movements"] }); } }}
        />
      )}
      {showPakanKeluar && (
        <PakanKeluarDialog
          items={stocks}
          user={user}
          role={role}
          onClose={(refreshed) => { setShowPakanKeluar(false); if (refreshed) { invalidate(); qc.invalidateQueries({ queryKey: ["feed-movements"] }); } }}
        />
      )}
      <QRScannerDialog open={showScanner} onClose={() => setShowScanner(false)} onResult={handleScanResult} />

      {/* Not found dialog after scan */}
      <Dialog open={!!scanResult?.notFound} onOpenChange={() => setScanResult(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Barang Tidak Ditemukan</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">SKU <span className="font-mono font-bold">{scanResult?.sku}</span> tidak ada di database pakan.</p>
          {canCreate && (
            <Button onClick={() => { setScanResult(null); setEditItem(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Tambah Barang Baru
            </Button>
          )}
          <Button variant="outline" onClick={() => setScanResult(null)}>Tutup</Button>
        </DialogContent>
      </Dialog>

      {/* Seed dialog */}
      <Dialog open={showSeed} onOpenChange={setShowSeed}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🌿 Isi Pakan Ideal Sulcata</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Mengisi {SULCATA_IDEAL_FEEDS.length} jenis pakan rekomendasi sulcata.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowSeed(false)}>Batal</Button>
            <Button className="flex-1" onClick={handleSeedIdealFeeds} disabled={seeding}>
              {seeding ? "Mengisi..." : "Isi Sekarang"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}