import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  PackageOpen,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  Leaf,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canPerformAction } from "@/lib/permissions";
import { format } from "date-fns";

const CATEGORIES = [
  { value: "sayuran", label: "🥬 Sayuran" },
  { value: "buah", label: "🍎 Buah" },
  { value: "rumput", label: "🌿 Rumput" },
  { value: "suplemen", label: "💊 Suplemen" },
  { value: "lainnya", label: "📦 Lainnya" },
];

const UNITS = ["kg", "gram", "ikat", "buah", "liter"];

const SULCATA_IDEAL_FEEDS = [
  { name: "Rumput Sudan / Gajah", category: "rumput", unit: "kg", current_stock: 5, minimum_stock: 3, price_per_unit: 5000, daily_ideal: 1, notes: "Pakan utama harian sulcata" },
  { name: "Daun Pepaya", category: "sayuran", unit: "ikat", current_stock: 3, minimum_stock: 2, price_per_unit: 3000, daily_ideal: 1, notes: "Bergizi tinggi, diberikan 2-3x seminggu" },
  { name: "Kubis / Sawi", category: "sayuran", unit: "kg", current_stock: 2, minimum_stock: 1, price_per_unit: 8000, daily_ideal: 0.5, notes: "Hindari terlalu banyak, batasi 2x seminggu" },
  { name: "Wortel", category: "sayuran", unit: "kg", current_stock: 1, minimum_stock: 0.5, price_per_unit: 10000, daily_ideal: 0.3, notes: "Kaya beta karoten, 2x seminggu" },
  { name: "Labu Kuning", category: "sayuran", unit: "kg", current_stock: 1, minimum_stock: 0.5, price_per_unit: 6000, daily_ideal: 0.3, notes: "Bergizi, sesuai untuk semua ukuran" },
  { name: "Daun Kelor", category: "sayuran", unit: "ikat", current_stock: 2, minimum_stock: 1, price_per_unit: 2000, daily_ideal: 0.5, notes: "Supergizi, bagus untuk pertumbuhan" },
  { name: "Semangka (tanpa biji)", category: "buah", unit: "buah", current_stock: 2, minimum_stock: 1, price_per_unit: 15000, daily_ideal: 0.1, notes: "Hidrasi, 1-2x seminggu" },
  { name: "Pisang", category: "buah", unit: "buah", current_stock: 5, minimum_stock: 3, price_per_unit: 2000, daily_ideal: 0.1, notes: "Sesekali saja, kandungan gula tinggi" },
  { name: "Kalsium / Cuttlebone", category: "suplemen", unit: "buah", current_stock: 3, minimum_stock: 2, price_per_unit: 5000, daily_ideal: 0, notes: "Taruh di kandang, ad libitum" },
  { name: "Vitamin Reptil", category: "suplemen", unit: "gram", current_stock: 50, minimum_stock: 20, price_per_unit: 500, daily_ideal: 0, notes: "Taburkan ke pakan 1x seminggu" },
];

const EMPTY_FORM = {
  name: "",
  category: "sayuran",
  unit: "kg",
  current_stock: 0,
  minimum_stock: 1,
  price_per_unit: 0,
  daily_ideal: 0,
  notes: "",
};

function StockStatusBadge({ stock }) {
  if (stock.current_stock === 0)
    return <Badge variant="destructive" className="text-xs">Habis</Badge>;
  if (stock.current_stock <= stock.minimum_stock)
    return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Stok Rendah</Badge>;
  return <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Aman</Badge>;
}

function formatRp(val) {
  if (!val) return "Rp 0";
  return "Rp " + Number(val).toLocaleString("id-ID");
}

export default function FeedStockPage() {
  const { user, role } = useCurrentUser();
  const canEdit = canPerformAction(role, "feedstock", "edit");
  const canCreate = canPerformAction(role, "feedstock", "create");
  const canDelete = canPerformAction(role, "feedstock", "delete");

  const qc = useQueryClient();
  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ["feedstocks"],
    queryFn: () => base44.entities.FeedStock.list(),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjustDialog, setAdjustDialog] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState("add");
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["feedstocks"] });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? base44.entities.FeedStock.update(editing.id, data)
        : base44.entities.FeedStock.create(data),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FeedStock.delete(id),
    onSuccess: invalidate,
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ id, newStock, delta, isAdd, stock }) => {
      await base44.entities.FeedStock.update(id, { current_stock: newStock });
      // Catat ke pengeluaran jika ada harga
      const price = stock.price_per_unit || 0;
      if (price > 0 && delta > 0) {
        const totalCost = price * delta;
        await base44.entities.FinanceTransaction.create({
          type: isAdd ? "pengeluaran" : "pemasukan",
          category: "operasional",
          amount: totalCost,
          date: format(new Date(), "yyyy-MM-dd"),
          description: `${isAdd ? "Beli" : "Return"} pakan: ${stock.name} ${delta} ${stock.unit} @ ${formatRp(price)}`,
          created_by_name: user?.full_name || user?.email || "",
        });
        qc.invalidateQueries({ queryKey: ["finance-transactions"] });
      }
    },
    onSuccess: () => {
      invalidate();
      setAdjustDialog(null);
      setAdjustAmount("");
    },
  });

  const handleEdit = (stock) => {
    setEditing(stock);
    setForm({ ...EMPTY_FORM, ...stock });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      current_stock: Number(form.current_stock),
      minimum_stock: Number(form.minimum_stock),
      price_per_unit: Number(form.price_per_unit || 0),
      daily_ideal: Number(form.daily_ideal || 0),
    });
  };

  const handleAdjust = (isAdd) => {
    const delta = Number(adjustAmount);
    if (!delta || delta <= 0) return;
    const newStock = Math.max(
      0,
      adjustDialog.current_stock + (isAdd ? delta : -delta)
    );
    adjustMutation.mutate({ id: adjustDialog.id, newStock, delta, isAdd, stock: adjustDialog });
  };

  const handleSeedIdealFeeds = async () => {
    setSeeding(true);
    for (const feed of SULCATA_IDEAL_FEEDS) {
      await base44.entities.FeedStock.create(feed);
    }
    invalidate();
    setShowSeedDialog(false);
    setSeeding(false);
  };

  const lowCount = stocks.filter((s) => s.current_stock <= s.minimum_stock).length;
  const totalValue = stocks.reduce((sum, s) => sum + ((s.price_per_unit || 0) * (s.current_stock || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold">Stok Pakan</h1>
          <p className="text-muted-foreground mt-1">Kelola persediaan pakan kura-kura</p>
        </div>
        <div className="flex gap-2">
          {canCreate && stocks.length === 0 && (
            <Button variant="outline" onClick={() => setShowSeedDialog(true)}>
              <Leaf className="w-4 h-4" /> Isi Pakan Ideal Sulcata
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Tambah Pakan
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <PackageOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stocks.length}</p>
            <p className="text-xs text-muted-foreground">Total Item</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-700">{lowCount}</p>
            <p className="text-xs text-muted-foreground">Perlu Diisi</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-100">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">{stocks.length - lowCount}</p>
            <p className="text-xs text-muted-foreground">Stok Aman</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Nilai Total Stok</p>
          <p className="text-sm font-bold text-primary">{formatRp(totalValue)}</p>
        </Card>
      </div>

      {/* Stock List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : stocks.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <PackageOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada data stok pakan</p>
          {canCreate && (
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={() => setShowSeedDialog(true)}>
                <Leaf className="w-4 h-4" /> Isi Pakan Ideal Sulcata
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" /> Tambah Manual
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stocks.map((s) => {
            const isLow = s.current_stock <= s.minimum_stock;
            const stockValue = (s.price_per_unit || 0) * (s.current_stock || 0);
            return (
              <Card key={s.id} className={`p-4 group hover:shadow-md transition-shadow ${isLow ? "border-orange-300 bg-orange-50/30" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORIES.find((c) => c.value === s.category)?.label || s.category}
                    </p>
                  </div>
                  <StockStatusBadge stock={s} />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className={`text-3xl font-bold ${isLow ? "text-orange-700" : "text-foreground"}`}>
                      {s.current_stock}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Min: {s.minimum_stock} {s.unit}</p>
                    {s.daily_ideal > 0 && (
                      <p className="text-xs text-primary mt-0.5">Ideal harian: {s.daily_ideal} {s.unit}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {s.price_per_unit > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground">{formatRp(s.price_per_unit)}/{s.unit}</p>
                        <p className="text-xs font-medium text-primary">{formatRp(stockValue)}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${s.current_stock === 0 ? "bg-destructive" : isLow ? "bg-orange-400" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, (s.current_stock / (s.minimum_stock * 3 || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {s.notes && <p className="text-xs text-muted-foreground mt-2 italic">{s.notes}</p>}

                <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(canEdit || role === "keeper" || role === "manajer") && (
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1"
                      onClick={() => { setAdjustDialog(s); setAdjustAmount(""); setAdjustType("add"); }}>
                      Update Stok
                    </Button>
                  )}
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pakan" : "Tambah Pakan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div>
              <Label className="text-xs mb-1 block">Nama Pakan *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Kubis, Wortel, Rumput Sudan" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Satuan</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Stok Saat Ini</Label>
                <Input type="number" min={0} step="0.1" value={form.current_stock}
                  onChange={(e) => setForm({ ...form, current_stock: e.target.value })} required />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Stok Minimum</Label>
                <Input type="number" min={0} step="0.1" value={form.minimum_stock}
                  onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Harga/Satuan (Rp)</Label>
                <Input type="number" min={0} value={form.price_per_unit}
                  onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })}
                  placeholder="0" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Kebutuhan Harian Ideal</Label>
                <Input type="number" min={0} step="0.1" value={form.daily_ideal}
                  onChange={(e) => setForm({ ...form, daily_ideal: e.target.value })}
                  placeholder="0" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Catatan (opsional)</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="cth: beli dari Pak Budi" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={(o) => { if (!o) setAdjustDialog(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Update Stok — {adjustDialog?.name}</DialogTitle>
          </DialogHeader>
          {adjustDialog && (
            <div className="space-y-4 pt-2">
              <p className="text-center text-3xl font-bold">
                {adjustDialog.current_stock}
                <span className="text-sm font-normal text-muted-foreground ml-1">{adjustDialog.unit}</span>
              </p>
              {adjustDialog.price_per_unit > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Harga: {formatRp(adjustDialog.price_per_unit)}/{adjustDialog.unit}
                </p>
              )}
              <div>
                <Label className="text-xs mb-1 block">Jumlah</Label>
                <Input type="number" min={0} step="0.1" value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0" className="text-center text-lg" />
              </div>
              {adjustDialog.price_per_unit > 0 && adjustAmount > 0 && (
                <p className="text-center text-xs text-primary font-medium">
                  Total: {formatRp(adjustDialog.price_per_unit * Number(adjustAmount))}
                  {" "}→ otomatis dicatat ke keuangan
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="text-destructive border-destructive/30"
                  onClick={() => handleAdjust(false)} disabled={adjustMutation.isPending}>
                  <MinusCircle className="w-4 h-4" /> Kurangi
                </Button>
                <Button onClick={() => handleAdjust(true)} disabled={adjustMutation.isPending}>
                  <PlusCircle className="w-4 h-4" /> Tambah
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Seed ideal feeds dialog */}
      <Dialog open={showSeedDialog} onOpenChange={setShowSeedDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🌿 Isi Pakan Ideal Sulcata</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Sistem akan mengisi {SULCATA_IDEAL_FEEDS.length} jenis pakan yang direkomendasikan untuk sulcata, lengkap dengan stok awal, minimum stok, harga, dan kebutuhan harian.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {SULCATA_IDEAL_FEEDS.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-3 py-1.5">
                  <span>{f.name}</span>
                  <span className="text-muted-foreground">{f.current_stock} {f.unit} · {formatRp(f.price_per_unit)}/{f.unit}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowSeedDialog(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleSeedIdealFeeds} disabled={seeding}>
                {seeding ? "Mengisi..." : "Isi Sekarang"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}