import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, PackageOpen, AlertTriangle, CheckCircle2, QrCode, ArrowUpCircle, ArrowDownCircle, Printer } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRp } from "@/lib/skuUtils";
import StockItemForm from "@/components/stock/StockItemForm";
import StockTransactionDialog from "@/components/stock/StockTransactionDialog";
import QRScannerDialog from "@/components/stock/QRScannerDialog";
import NiimbotLabelGenerator from "@/components/stock/NiimbotLabelGenerator";
import ItemDetailDialog from "@/components/stock/ItemDetailDialog";
import ApprovalQueueCard from "@/components/stock/ApprovalQueueCard";

const CATEGORIES = [
  { value: "obat", label: "💊 Obat", color: "bg-red-100 text-red-700" },
  { value: "vitamin", label: "🌿 Vitamin", color: "bg-green-100 text-green-700" },
  { value: "suplemen", label: "🧪 Suplemen", color: "bg-purple-100 text-purple-700" },
  { value: "alat_kerja", label: "🔧 Alat Kerja", color: "bg-blue-100 text-blue-700" },
  { value: "peralatan", label: "⚙️ Peralatan", color: "bg-cyan-100 text-cyan-700" },
  { value: "lainnya", label: "📦 Lainnya", color: "bg-gray-100 text-gray-700" },
];

function StockBadge({ item }) {
  if (item.current_stock === 0) return <Badge variant="destructive" className="text-xs">Habis</Badge>;
  if (item.current_stock <= item.minimum_stock) return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Hampir Habis</Badge>;
  return <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Aman</Badge>;
}

export default function WarehousePage() {
  const qc = useQueryClient();
  const { user, role } = useCurrentUser();
  const isAdmin = ["admin", "owner", "manajer"].includes(role);
  const isKeeperOnly = role === "keeper";

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", 300),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["warehouse-transactions"],
    queryFn: () => base44.entities.WarehouseTransaction.list("-date", 200),
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const list = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return list[0] || {};
    },
  });

  const threshold = settings?.stok_approval_threshold ?? 500000;

  const [tab, setTab] = useState("stok");
  const [catFilter, setCatFilter] = useState("semua");
  const [lowFilter, setLowFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [txItem, setTxItem] = useState(null);
  const [txInitialType, setTxInitialType] = useState("masuk");
  const [detailItem, setDetailItem] = useState(null);
  const [labelItems, setLabelItems] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const allSkus = items.map((i) => i.sku).filter(Boolean);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    qc.invalidateQueries({ queryKey: ["warehouse-transactions"] });
  };

  const filtered = items.filter((i) => {
    const matchCat = catFilter === "semua" || i.category === catFilter;
    const matchLow = !lowFilter || i.current_stock <= i.minimum_stock;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || "").toLowerCase().includes(search.toLowerCase()) || (i.code || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchLow && matchSearch;
  });

  const lowItems = items.filter((i) => i.current_stock <= i.minimum_stock);

  const handleScanResult = (sku) => {
    const found = items.find((i) => (i.sku || i.code || "").toUpperCase() === sku.toUpperCase());
    if (found) {
      setScanResult(null);
      setTxItem(found);
      setTxInitialType("keluar");
    } else {
      setScanResult({ notFound: true, sku });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Gudang Gazebo</h1>
          <p className="text-muted-foreground text-sm">Stok <span className="font-medium">obat, vitamin, suplemen & alat kerja</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">💡 Untuk pakan harian, gunakan menu <span className="font-medium">Stok Pakan</span></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowScanner(true)} className="gap-2">
            <QrCode className="w-4 h-4" /> Scan Barang
          </Button>
          {isAdmin && filtered.length > 0 && (
            <Button variant="outline" onClick={() => setLabelItems(filtered)} className="gap-2">
              <Printer className="w-4 h-4" /> Label Massal
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Barang
            </Button>
          )}
        </div>
      </div>

      {/* Approval queue */}
      {isAdmin && <ApprovalQueueCard user={user} />}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Item</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-orange-600">{lowItems.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Stok Rendah/Habis</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-600">{items.length - lowItems.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Stok Aman</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{transactions.filter(t => t.date === format(new Date(), "yyyy-MM-dd")).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Transaksi Hari Ini</p>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="stok">Stok Barang</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="stok" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Cari nama / SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48 h-9" />
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "semua", label: "Semua" }, ...CATEGORIES].map((c) => (
                <button key={c.value} onClick={() => setCatFilter(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${catFilter === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <button onClick={() => setLowFilter(!lowFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${lowFilter ? "bg-orange-500 text-white border-orange-500" : "bg-background border-border hover:bg-muted"}`}>
              ⚠️ Stok Menipis
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Memuat...</div>
          ) : filtered.length === 0 ? (
            <Card className="py-16 text-center text-muted-foreground">
              <PackageOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada data barang</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const isLow = item.current_stock <= item.minimum_stock;
                const cat = CATEGORIES.find((c) => c.value === item.category) || CATEGORIES[5];
                return (
                  <Card key={item.id} className={`p-4 group hover:shadow-md transition-shadow cursor-pointer ${isLow ? "border-orange-300 bg-orange-50/30" : ""}`}
                    onClick={() => setDetailItem(item)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        {item.photo_url && (
                          <img src={item.photo_url} alt={item.name} className="w-12 h-12 rounded object-cover border mb-1.5" />
                        )}
                        <p className="font-semibold text-sm">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                          {item.sku && <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 rounded">{item.sku}</span>}
                          {item.is_mandatory && <Badge className="text-[10px] bg-red-500 text-white px-1 py-0">WAJIB</Badge>}
                        </div>
                      </div>
                      <StockBadge item={item} />
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <p className={`text-3xl font-bold ${isLow ? "text-orange-700" : ""}`}>
                          {item.current_stock}<span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Min: {item.minimum_stock} {item.unit}</p>
                        {!isKeeperOnly && item.purchase_price > 0 && (
                          <p className="text-xs text-muted-foreground">{formatRp(item.purchase_price)}/{item.unit}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}>
                        {!isKeeperOnly && (
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                            onClick={() => { setTxItem(item); setTxInitialType("masuk"); }}>
                            <ArrowUpCircle className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                          onClick={() => { setTxItem(item); setTxInitialType("keluar"); }}>
                          <ArrowDownCircle className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                        {item.sku && isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setLabelItems([item])}>
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => { setEditItem(item); setShowForm(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                              onClick={() => { if (confirm(`Hapus ${item.name}?`)) base44.entities.WarehouseItem.delete(item.id).then(invalidate); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${item.current_stock === 0 ? "bg-destructive" : isLow ? "bg-orange-400" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, (item.current_stock / (item.minimum_stock * 3 || 1)) * 100)}%` }} />
                    </div>
                    {item.location && <p className="text-xs text-muted-foreground mt-2">📍 {item.location}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="riwayat" className="mt-4 space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">Belum ada transaksi</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 100).map((tx) => (
                <Card key={tx.id} className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === "masuk" ? "bg-green-100" : "bg-red-100"}`}>
                    {tx.type === "masuk" ? <ArrowUpCircle className="w-4 h-4 text-green-600" /> : <ArrowDownCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tx.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.quantity} {tx.unit}{tx.notes ? ` · ${tx.notes}` : ""}{tx.created_by_name ? ` · ${tx.created_by_name}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${tx.type === "masuk" ? "text-green-600" : "text-red-500"}`}>
                      {tx.type === "masuk" ? "+" : "-"}{tx.quantity} {tx.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.date && format(new Date(tx.date), "d MMM", { locale: id })}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showForm && (
        <StockItemForm open={showForm} itemType="warehouse" editData={editItem} user={user}
          allSkus={allSkus}
          onSaved={() => { invalidate(); setShowForm(false); setEditItem(null); }}
          onClose={() => { setShowForm(false); setEditItem(null); }} />
      )}

      {txItem && (
        <StockTransactionDialog item={txItem} itemType="warehouse" user={user} role={role}
          threshold={threshold} initialType={txInitialType}
          onClose={(refreshed) => { setTxItem(null); if (refreshed) invalidate(); }} />
      )}

      {detailItem && (
        <ItemDetailDialog item={detailItem} itemType="warehouse" role={role} open={!!detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => { setEditItem(detailItem); setDetailItem(null); setShowForm(true); }}
          onTransaction={() => { setTxItem(detailItem); setTxInitialType("masuk"); setDetailItem(null); }}
          onLabel={() => { setLabelItems([detailItem]); setDetailItem(null); }} />
      )}

      {labelItems && (
        <NiimbotLabelGenerator open={!!labelItems} items={labelItems} onClose={() => setLabelItems(null)} />
      )}

      <QRScannerDialog open={showScanner} onClose={() => setShowScanner(false)} onResult={handleScanResult} />

      {/* Not found */}
      <Dialog open={!!scanResult?.notFound} onOpenChange={() => setScanResult(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Barang Tidak Ditemukan</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">SKU <span className="font-mono font-bold">{scanResult?.sku}</span> tidak ada di gudang.</p>
          {isAdmin && (
            <Button onClick={() => { setScanResult(null); setEditItem(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Tambah Barang Baru
            </Button>
          )}
          <Button variant="outline" onClick={() => setScanResult(null)}>Tutup</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}