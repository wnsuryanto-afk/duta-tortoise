import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, PlusCircle, MinusCircle, Pencil, Trash2, PackageOpen, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { canPerformAction } from "@/lib/permissions";
import { useCurrentUser } from "@/lib/useCurrentUser";

function formatRp(v) { return "Rp " + Number(v || 0).toLocaleString("id-ID"); }

function stockStatus(item) {
  if (item.current_stock === 0) return "kritis";
  if (item.current_stock < item.minimum_stock) return "kritis";
  if (item.current_stock < item.minimum_stock * 1.5) return "waspada";
  return "aman";
}

function StockStatusBadge({ item }) {
  const s = stockStatus(item);
  if (s === "kritis") return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">🔴 Kritis</Badge>;
  if (s === "waspada") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">🟡 Waspada</Badge>;
  return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">🟢 Aman</Badge>;
}

function SourceBadge({ src }) {
  if (src === "feed") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-700 font-medium">🥬 Pakan</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">📦 Gudang</span>;
}

// ── Item Form ────────────────────────────────────────────────────────────
const EMPTY = { type: "pakan", name: "", unit: "kg", current_stock: 0, minimum_stock: 1, price: 0, location: "", is_mandatory: false, notes: "", category: "sayuran" };

function ItemForm({ item, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(item ? {
    type: item._src === "feed" ? "pakan" : (item.category || "obat"),
    name: item.name || "",
    unit: item.unit || "kg",
    current_stock: item.current_stock ?? 0,
    minimum_stock: item.minimum_stock ?? 1,
    price: item._src === "feed" ? (item.price_per_unit || 0) : (item.purchase_price || 0),
    location: item._src === "feed" ? (item.storage_location || "gudang") : (item.location || ""),
    is_mandatory: item.is_mandatory || false,
    notes: item.notes || "",
    category: item._src === "feed" ? (item.category || "sayuran") : (item.category || "obat"),
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isFood = form.type === "pakan";
    if (isFood) {
      const data = { name: form.name, category: form.category, unit: form.unit, current_stock: Number(form.current_stock), minimum_stock: Number(form.minimum_stock), price_per_unit: Number(form.price), is_mandatory: form.is_mandatory, storage_location: form.location || "gudang", notes: form.notes };
      if (item?.id) await base44.entities.FeedStock.update(item.id, data);
      else await base44.entities.FeedStock.create(data);
    } else {
      const catMap = { obat: "obat", vitamin: "vitamin", alat: "alat_kerja", lainnya: "lainnya" };
      const data = { name: form.name, category: catMap[form.type] || form.type || "lainnya", unit: form.unit, current_stock: Number(form.current_stock), minimum_stock: Number(form.minimum_stock), purchase_price: Number(form.price), is_mandatory: form.is_mandatory, location: form.location, notes: form.notes };
      if (item?.id) await base44.entities.WarehouseItem.update(item.id, data);
      else await base44.entities.WarehouseItem.create(data);
    }
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setSaving(false);
    onClose();
  };

  const isFeed = form.type === "pakan";

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <Label className="text-xs">Kategori *</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {[["pakan","🥬 Pakan"],["obat","💊 Obat"],["vitamin","🌿 Vitamin"],["alat","🔧 Alat"],["lainnya","📦 Lainnya"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => set("type", v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.type === v ? "bg-primary text-primary-foreground" : "bg-background border-border hover:bg-muted"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs">Nama *</Label>
        <Input value={form.name} onChange={e => set("name", e.target.value)} required className="mt-0.5" />
      </div>
      {isFeed && (
        <div>
          <Label className="text-xs">Sub-Kategori Pakan</Label>
          <Select value={form.category} onValueChange={v => set("category", v)}>
            <SelectTrigger className="mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sayuran">🥬 Sayuran</SelectItem>
              <SelectItem value="buah">🍎 Buah</SelectItem>
              <SelectItem value="rumput">🌿 Rumput/Hay</SelectItem>
              <SelectItem value="suplemen">💊 Suplemen</SelectItem>
              <SelectItem value="pelet">🟤 Pelet</SelectItem>
              <SelectItem value="lainnya">📦 Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Satuan *</Label>
          <Select value={form.unit} onValueChange={v => set("unit", v)}>
            <SelectTrigger className="mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["kg","gram","liter","ml","pcs","botol","sachet","ikat","buah","box","strip","lusin"].map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Lokasi Simpan</Label>
          <Select value={form.location || (isFeed ? "gudang" : "")} onValueChange={v => set("location", v)}>
            <SelectTrigger className="mt-0.5"><SelectValue placeholder="Pilih..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gudang_utama">Gudang Utama</SelectItem>
              <SelectItem value="gazebo">Gazebo</SelectItem>
              <SelectItem value="lemari_obat">Lemari Obat</SelectItem>
              <SelectItem value="kulkas">Kulkas</SelectItem>
              <SelectItem value="rak_vitamin">Rak Vitamin</SelectItem>
              <SelectItem value="gudang_alat">Gudang Alat</SelectItem>
              <SelectItem value="gudang">Gudang</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Stok Saat Ini</Label>
          <Input type="number" min={0} step="0.1" value={form.current_stock} onChange={e => set("current_stock", e.target.value)} className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Stok Minimum</Label>
          <Input type="number" min={0} step="0.1" value={form.minimum_stock} onChange={e => set("minimum_stock", e.target.value)} className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Harga Beli/{form.unit || "satuan"}</Label>
          <Input type="number" min={0} value={form.price} onChange={e => set("price", e.target.value)} className="mt-0.5" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="mand" checked={!!form.is_mandatory} onChange={e => set("is_mandatory", e.target.checked)} className="w-4 h-4 accent-primary" />
          <Label htmlFor="mand" className="text-xs cursor-pointer">⚠️ Barang Wajib</Label>
        </div>
      </div>
      <div>
        <Label className="text-xs">Catatan</Label>
        <Input value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-0.5" placeholder="Opsional..." />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button type="submit" className="flex-1" disabled={saving || !form.name}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </form>
  );
}

// ── Adjust Dialog ─────────────────────────────────────────────────────
function AdjustDialog({ item, onClose }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("tambah");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const delta = Number(amount);
    if (!delta || delta <= 0) return;
    setSaving(true);
    const newStock = mode === "tambah" ? item.current_stock + delta : Math.max(0, item.current_stock - delta);
    if (item._src === "feed") {
      await base44.entities.FeedStock.update(item.id, { current_stock: newStock });
    } else {
      await base44.entities.WarehouseItem.update(item.id, { current_stock: newStock });
    }
    // Log ke StockMovement
    await base44.entities.StockMovement.create({
      item_id: item.id,
      item_name: item.name,
      item_type: item._src === "feed" ? "feedstock" : "warehouse",
      type: mode === "tambah" ? "masuk" : "keluar",
      quantity: delta,
      unit: item.unit,
      date: format(new Date(), "yyyy-MM-dd"),
      by_email: user?.email || "",
      by_name: user?.full_name || user?.email || "",
      status: "selesai",
    });
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setMode("tambah")} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "tambah" ? "bg-green-500 text-white border-green-500" : "bg-background border-border"}`}>↑ Tambah</button>
        <button onClick={() => setMode("kurangi")} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "kurangi" ? "bg-red-500 text-white border-red-500" : "bg-background border-border"}`}>↓ Kurangi</button>
      </div>
      <p className="text-center text-muted-foreground text-sm">Stok: <strong>{item.current_stock} {item.unit}</strong></p>
      <div>
        <Label className="text-xs">Jumlah ({item.unit}) *</Label>
        <Input type="number" min={0.1} step="0.1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="mt-1 text-center text-lg" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !amount || Number(amount) <= 0}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────
export default function StokInventoryTab({ feedstocks, warehouseItems, role }) {
  const qc = useQueryClient();
  const canEdit   = canPerformAction(role, "feedstock", "edit") || canPerformAction(role, "warehouse", "edit");
  const canCreate = canPerformAction(role, "feedstock", "create") || canPerformAction(role, "warehouse", "create");
  const canDel    = canPerformAction(role, "feedstock", "delete") || canPerformAction(role, "warehouse", "delete");

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("semua");
  const [stockFilter, setStockFilter] = useState("semua");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);

  const allItems = useMemo(() => [
    ...feedstocks.map(i => ({ ...i, _src: "feed", _price: i.price_per_unit || 0, _loc: i.storage_location || "gudang", _cat: "pakan" })),
    ...warehouseItems.map(i => {
      let cat = i.category || "lainnya";
      if (cat === "alat_kerja" || cat === "peralatan") cat = "alat";
      return { ...i, _src: "warehouse", _price: i.purchase_price || 0, _loc: i.location || "", _cat: cat };
    }),
  ], [feedstocks, warehouseItems]);

  const filtered = useMemo(() => {
    return allItems
      .filter(i => {
        const matchSearch = !search || i.name?.toLowerCase().includes(search.toLowerCase());
        const matchCat = catFilter === "semua" || i._cat === catFilter;
        const s = stockStatus(i);
        const matchStock = stockFilter === "semua" || s === stockFilter;
        return matchSearch && matchCat && matchStock;
      })
      .sort((a, b) => {
        const as = stockStatus(a); const bs = stockStatus(b);
        const order = { kritis: 0, waspada: 1, aman: 2 };
        return order[as] - order[bs];
      });
  }, [allItems, search, catFilter, stockFilter]);

  const criticalMandatory = allItems.filter(i => i.is_mandatory && stockStatus(i) === "kritis").length;

  const handleDelete = async (item) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    if (item._src === "feed") await base44.entities.FeedStock.delete(item.id);
    else await base44.entities.WarehouseItem.delete(item.id);
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
  };

  return (
    <div className="space-y-4">
      {/* Filters + action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama barang..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            <SelectItem value="pakan">🥬 Pakan</SelectItem>
            <SelectItem value="obat">💊 Obat</SelectItem>
            <SelectItem value="vitamin">🌿 Vitamin</SelectItem>
            <SelectItem value="alat">🔧 Alat</SelectItem>
            <SelectItem value="lainnya">📦 Lainnya</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="kritis">🔴 Kritis</SelectItem>
            <SelectItem value="waspada">🟡 Waspada</SelectItem>
            <SelectItem value="aman">🟢 Aman</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          {criticalMandatory > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-300">
              <AlertTriangle className="w-3.5 h-3.5" /> {criticalMandatory} wajib kritis!
            </div>
          )}
          {canCreate && (
            <Button className="gap-1.5 h-9 text-sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Tambah Item
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <PackageOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Tidak ada item yang cocok dengan filter</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Nama Item</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Kategori</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Stok Saat Ini</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Min. Stok</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Lokasi</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => (
                  <tr key={item._src + item.id} className={`hover:bg-muted/30 transition-colors ${stockStatus(item) === "kritis" ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.is_mandatory && <span className="text-[10px] text-red-600 font-semibold">WAJIB</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <SourceBadge src={item._src} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {item.current_stock} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                      {item.minimum_stock} {item.unit}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item._loc || "-"}</td>
                    <td className="px-4 py-2.5"><StockStatusBadge item={item} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Tambah stok" onClick={() => setAdjustItem(item)}>
                          <PlusCircle className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Kurangi stok" onClick={() => setAdjustItem(item)}>
                          <MinusCircle className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(item); setShowForm(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDel && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
            {filtered.length} item ditampilkan dari {allItems.length} total
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit Item" : "Tambah Item Stok"}</DialogTitle>
          </DialogHeader>
          <ItemForm item={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} />
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={o => { if (!o) setAdjustItem(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Sesuaikan Stok — {adjustItem?.name}</DialogTitle>
          </DialogHeader>
          {adjustItem && <AdjustDialog item={adjustItem} onClose={() => setAdjustItem(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}