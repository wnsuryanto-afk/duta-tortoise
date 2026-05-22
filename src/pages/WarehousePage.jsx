import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, PackageOpen, AlertTriangle, CheckCircle2,
  QrCode, ArrowUpCircle, ArrowDownCircle, History, Printer
} from "lucide-react";
import BarcodeModal from "@/components/warehouse/BarcodeModal";
import PrintAllLabelsDialog from "@/components/warehouse/PrintAllLabelsDialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import QRScanner from "@/components/warehouse/QRScanner";
import WarehouseItemForm from "@/components/warehouse/WarehouseItemForm";

const CATEGORIES = [
  { value: "obat",       label: "💊 Obat",       color: "bg-red-100 text-red-700" },
  { value: "vitamin",    label: "🌿 Vitamin",     color: "bg-green-100 text-green-700" },
  { value: "pakan",      label: "🥬 Pakan",       color: "bg-lime-100 text-lime-700" },
  { value: "alat_kerja", label: "🔧 Alat Kerja",  color: "bg-blue-100 text-blue-700" },
  { value: "lainnya",    label: "📦 Lainnya",      color: "bg-gray-100 text-gray-700" },
];

const catConfig = (cat) => CATEGORIES.find((c) => c.value === cat) || CATEGORIES[4];

function StockBadge({ item }) {
  if (item.current_stock === 0)
    return <Badge variant="destructive" className="text-xs">Habis</Badge>;
  if (item.current_stock <= item.minimum_stock)
    return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Stok Rendah</Badge>;
  return <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Aman</Badge>;
}

export default function WarehousePage() {
  const qc = useQueryClient();
  const { user, role } = useCurrentUser();
  const canEdit = ["admin", "owner", "manajer"].includes(role);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", 300),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["warehouse-transactions"],
    queryFn: () => base44.entities.WarehouseTransaction.list("-date", 200),
  });

  const [tab, setTab] = useState("stok");
  const [catFilter, setCatFilter] = useState("semua");
  const [rackFilter, setRackFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [txDialog, setTxDialog] = useState(null); // item untuk transaksi keluar/masuk
  const [txType, setTxType] = useState("masuk");
  const [txQty, setTxQty] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txPrice, setTxPrice] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [barcodeItem, setBarcodeItem] = useState(null);
  const [showPrintAll, setShowPrintAll] = useState(false);
  const [printAfterSave, setPrintAfterSave] = useState(null); // item to print after save

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    qc.invalidateQueries({ queryKey: ["warehouse-transactions"] });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
  };

  const filtered = items.filter((i) => {
    const matchCat = catFilter === "semua" || i.category === catFilter;
    const matchRack = rackFilter === "semua" || (i.location || "").toLowerCase().includes(`rak ${rackFilter}`) || (i.location || "").toLowerCase().includes(`rak-${rackFilter}`);
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.code || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchRack && matchSearch;
  });

  const lowItems = items.filter((i) => i.current_stock <= i.minimum_stock);

  const handleDelete = async (item) => {
    if (confirm(`Hapus ${item.name}?`)) {
      await base44.entities.WarehouseItem.delete(item.id);
      invalidate();
    }
  };

  const handleScanResult = (code) => {
    setShowScanner(false);
    const found = items.find((i) => i.code === code);
    if (found) {
      setTxDialog(found);
      setTxType("masuk");
    } else {
      // Kode tidak ditemukan → buka form tambah barang baru dengan kode ini
      setEditItem({ code });
      setShowForm(true);
    }
  };

  const handleTransaction = async () => {
    if (!txDialog || !txQty || Number(txQty) <= 0) return;
    setSavingTx(true);
    const qty = Number(txQty);
    const unitPrice = Number(txPrice) || txDialog.purchase_price || 0;
    const total = qty * unitPrice;

    // Update stok
    const newStock = txType === "masuk"
      ? txDialog.current_stock + qty
      : Math.max(0, txDialog.current_stock - qty);
    await base44.entities.WarehouseItem.update(txDialog.id, { current_stock: newStock });

    // Catat transaksi gudang
    await base44.entities.WarehouseTransaction.create({
      item_id: txDialog.id,
      item_name: txDialog.name,
      item_code: txDialog.code || "",
      type: txType,
      quantity: qty,
      unit: txDialog.unit,
      unit_price: unitPrice,
      total_price: total,
      date: format(new Date(), "yyyy-MM-dd"),
      notes: txNotes,
      created_by_name: user?.full_name || user?.email || "",
    });

    // Jika masuk → catat di laporan keuangan sebagai pengeluaran pembelian barang
    if (txType === "masuk" && total > 0) {
      await base44.entities.FinanceTransaction.create({
        type: "pengeluaran",
        category: "pembelian_barang",
        amount: total,
        date: format(new Date(), "yyyy-MM-dd"),
        description: `Beli ${qty} ${txDialog.unit} ${txDialog.name}`,
        created_by_name: user?.full_name || user?.email || "",
      });
    }

    invalidate();
    setTxDialog(null);
    setTxQty("");
    setTxNotes("");
    setTxPrice("");
    setSavingTx(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Gudang Gazebo</h1>
          <p className="text-muted-foreground text-sm">Stok obat, vitamin, pakan & alat kerja</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowScanner(true)} className="gap-2">
            <QrCode className="w-4 h-4" /> Scan Barcode
          </Button>
          <Button variant="outline" onClick={() => setShowPrintAll(true)} className="gap-2">
            <Printer className="w-4 h-4" /> Print Semua Label
          </Button>
          {canEdit && (
            <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Barang
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
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
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Cari nama / kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48"
              />
              <div className="flex flex-wrap gap-1.5">
                {[{ value: "semua", label: "Semua" }, ...CATEGORIES].map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCatFilter(c.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${catFilter === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Filter Rak */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Rak:</span>
              {["semua", "1", "2", "3", "4", "5"].map(r => (
                <button key={r} onClick={() => setRackFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${rackFilter === r ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                  {r === "semua" ? "Semua" : `Rak ${r}`}
                </button>
              ))}
            </div>
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
                const catConf = catConfig(item.category);
                return (
                  <Card key={item.id} className={`p-4 group hover:shadow-md transition-shadow ${isLow ? "border-orange-300 bg-orange-50/30" : ""}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${catConf.color}`}>
                            {catConf.label}
                          </span>
                          {item.code && (
                            <span className="text-[10px] text-muted-foreground font-mono">#{item.code}</span>
                          )}
                        </div>
                      </div>
                      <StockBadge item={item} />
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <p className={`text-3xl font-bold ${isLow ? "text-orange-700" : ""}`}>
                          {item.current_stock}
                          <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Min: {item.minimum_stock} {item.unit}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { setTxDialog(item); setTxType("masuk"); }}>
                          <ArrowUpCircle className="w-3.5 h-3.5 text-green-600" /> Masuk
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { setTxDialog(item); setTxType("keluar"); }}>
                          <ArrowDownCircle className="w-3.5 h-3.5 text-red-500" /> Keluar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Cetak Barcode" onClick={() => setBarcodeItem(item)}>
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditItem(item); setShowForm(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.current_stock === 0 ? "bg-destructive" : isLow ? "bg-orange-400" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, (item.current_stock / (item.minimum_stock * 3 || 1)) * 100)}%` }}
                      />
                    </div>

                    {item.location && <p className="text-xs text-muted-foreground mt-2">📍 {item.location}</p>}
                    {item.supplier && <p className="text-xs text-muted-foreground">🏪 {item.supplier}</p>}
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
                    {tx.type === "masuk"
                      ? <ArrowUpCircle className="w-4 h-4 text-green-600" />
                      : <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tx.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.quantity} {tx.unit}
                      {tx.notes ? ` · ${tx.notes}` : ""}
                      {tx.created_by_name ? ` · ${tx.created_by_name}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${tx.type === "masuk" ? "text-green-600" : "text-red-500"}`}>
                      {tx.type === "masuk" ? "+" : "-"}{tx.quantity} {tx.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.date && format(new Date(tx.date), "d MMM", { locale: id })}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction dialog */}
      <Dialog open={!!txDialog} onOpenChange={(o) => !o && setTxDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {txType === "masuk"
                ? <ArrowUpCircle className="w-5 h-5 text-green-600" />
                : <ArrowDownCircle className="w-5 h-5 text-red-500" />
              }
              {txType === "masuk" ? "Barang Masuk" : "Barang Keluar"} — {txDialog?.name}
            </DialogTitle>
          </DialogHeader>
          {txDialog && (
            <div className="space-y-3 pt-1">
              <div className="flex gap-2">
                <button onClick={() => setTxType("masuk")} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${txType === "masuk" ? "bg-green-500 text-white border-green-500" : "bg-background border-border"}`}>
                  ↑ Masuk
                </button>
                <button onClick={() => setTxType("keluar")} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${txType === "keluar" ? "bg-red-500 text-white border-red-500" : "bg-background border-border"}`}>
                  ↓ Keluar
                </button>
              </div>
              <p className="text-center text-muted-foreground text-sm">Stok saat ini: <strong>{txDialog.current_stock} {txDialog.unit}</strong></p>
              <div>
                <Label className="text-xs">Jumlah ({txDialog.unit}) *</Label>
                <Input type="number" min={0.1} step="0.1" value={txQty} onChange={(e) => setTxQty(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              {txType === "masuk" && (
                <div>
                  <Label className="text-xs">Harga Beli per {txDialog.unit} (Rp)</Label>
                  <Input type="number" min={0} value={txPrice} onChange={(e) => setTxPrice(e.target.value)} placeholder={txDialog.purchase_price || "0"} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: Rp {((Number(txQty) || 0) * (Number(txPrice) || txDialog.purchase_price || 0)).toLocaleString("id-ID")}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-xs">Keterangan</Label>
                <Input value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Opsional..." className="mt-1" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setTxDialog(null)}>Batal</Button>
                <Button className="flex-1" onClick={handleTransaction} disabled={savingTx || !txQty}>
                  {savingTx ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showScanner && <QRScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />}
      {showForm && (
        <WarehouseItemForm
          open={showForm}
          editData={editItem}
          onClose={(savedItem) => {
            setShowForm(false);
            // Jika barang baru disimpan, tawarkan cetak label
            if (savedItem && !editItem?.id) {
              if (confirm(`Barang "${savedItem.name}" berhasil ditambahkan.\n\nCetak label barcode sekarang?`)) {
                setBarcodeItem(savedItem);
              }
            }
          }}
          onBarcode={setBarcodeItem}
        />
      )}
      {barcodeItem && <BarcodeModal open={!!barcodeItem} item={barcodeItem} onClose={() => setBarcodeItem(null)} />}
      {showPrintAll && <PrintAllLabelsDialog open={showPrintAll} items={filtered} onClose={() => setShowPrintAll(false)} />}
    </div>
  );
}