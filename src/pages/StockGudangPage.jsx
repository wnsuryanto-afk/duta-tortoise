import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus, Search, AlertTriangle, CheckCircle2, PackageOpen,
  PlusCircle, MinusCircle, Pencil, Trash2
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canPerformAction } from "@/lib/permissions";
import { format } from "date-fns";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const CATEGORY_TABS = [
  { value: "semua",   label: "Semua" },
  { value: "pakan",   label: "🥬 Pakan" },
  { value: "obat",    label: "💊 Obat" },
  { value: "vitamin", label: "🌿 Vitamin" },
  { value: "alat",    label: "🔧 Alat" },
  { value: "lainnya", label: "📦 Lainnya" },
];

const LOCATION_OPTIONS = [
  { value: "semua",        label: "Semua Lokasi" },
  { value: "gudang_utama", label: "Gudang Utama" },
  { value: "gazebo",       label: "Gazebo" },
  { value: "lemari_obat",  label: "Lemari Obat" },
  { value: "kulkas",       label: "Kulkas" },
  { value: "rak_vitamin",  label: "Rak Vitamin" },
  { value: "gudang_alat",  label: "Gudang Alat" },
  { value: "gudang",       label: "Gudang" },
];

const STOCK_FILTER = [
  { value: "semua",        label: "Semua Stok" },
  { value: "habis",        label: "❌ Habis" },
  { value: "hampir_habis", label: "⚠️ Hampir Habis" },
  { value: "aman",         label: "✅ Aman" },
];

const SORT_OPTIONS = [
  { value: "default",  label: "Default" },
  { value: "name_asc", label: "Nama A-Z" },
  { value: "stock_asc","label": "Stok Terendah" },
  { value: "price_desc", label: "Harga Tertinggi" },
];

const WH_FEED_UNIT_MAP = {
  pcs: "pcs", botol: "botol", sachet: "sachet", kg: "kg", gram: "gram",
  liter: "liter", ml: "ml", ikat: "ikat", buah: "buah", lusin: "lusin",
  box: "box", strip: "strip",
};

function formatRp(val) {
  if (!val) return "Rp 0";
  return "Rp " + Number(val).toLocaleString("id-ID");
}

// Normalise a FeedStock or WarehouseItem into unified shape
function normalise(item, source) {
  const isLow = item.current_stock <= item.minimum_stock;
  const isEmpty = item.current_stock === 0;
  const stockStatus = isEmpty ? "habis" : isLow ? "hampir_habis" : "aman";

  let displayCat = source === "feed" ? "pakan" : item.category || "lainnya";
  if (displayCat === "alat_kerja" || displayCat === "peralatan") displayCat = "alat";

  return {
    ...item,
    _source: source,
    _displayCat: displayCat,
    _isLow: isLow,
    _isEmpty: isEmpty,
    _stockStatus: stockStatus,
    _location: source === "feed"
      ? (item.storage_location || "gudang")
      : (item.location || ""),
    _price: source === "feed"
      ? (item.price_per_unit || 0)
      : (item.purchase_price || 0),
  };
}

// ── STOCK BADGE ─────────────────────────────────────────────────────────────
function StockBadge({ item }) {
  if (item._isEmpty)  return <Badge variant="destructive" className="text-xs">HABIS</Badge>;
  if (item._isLow)    return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Hampir Habis</Badge>;
  return <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Aman</Badge>;
}

// ── UNIFIED ITEM CARD ────────────────────────────────────────────────────────
function ItemCard({ item, onAdjust, onEdit, onDelete, canEdit, canDelete }) {
  const alertable = item.is_mandatory && (item._isEmpty || item._isLow);

  return (
    <Card className={`p-4 group hover:shadow-md transition-shadow ${alertable ? "border-red-400 bg-red-50/30" : item._isLow ? "border-orange-300" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <p className="font-semibold text-sm truncate">{item.name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              item._displayCat === "pakan"   ? "bg-lime-100 text-lime-700" :
              item._displayCat === "obat"    ? "bg-red-100 text-red-700" :
              item._displayCat === "vitamin" ? "bg-green-100 text-green-700" :
              item._displayCat === "alat"    ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {item._displayCat === "pakan" ? "🥬 Pakan" :
               item._displayCat === "obat" ? "💊 Obat" :
               item._displayCat === "vitamin" ? "🌿 Vitamin" :
               item._displayCat === "alat" ? "🔧 Alat" : "📦 Lainnya"}
            </span>
            {item.is_mandatory && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">WAJIB</span>
            )}
          </div>
        </div>
        <StockBadge item={item} />
      </div>

      {/* Stock number */}
      <p className={`text-3xl font-bold mt-2 ${item._isLow ? "text-orange-700" : ""}`}>
        {item.current_stock}
        <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
      </p>
      <p className="text-xs text-muted-foreground">Min: {item.minimum_stock} {item.unit}</p>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${item._isEmpty ? "bg-destructive" : item._isLow ? "bg-orange-400" : "bg-primary"}`}
          style={{ width: `${Math.min(100, (item.current_stock / ((item.minimum_stock * 3) || 1)) * 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-1">
        {item._location && <p className="text-[10px] text-muted-foreground">📍 {item._location}</p>}
        {item._price > 0 && <p className="text-[10px] text-muted-foreground">{formatRp(item._price)}/{item.unit}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onAdjust(item, "tambah")}>
          <PlusCircle className="w-3 h-3" /> Tambah
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onAdjust(item, "kurangi")}>
          <MinusCircle className="w-3 h-3" /> Kurangi
        </Button>
        {canEdit && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── ADD/EDIT FORM ────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  type: "pakan", name: "", unit: "kg", current_stock: 0, minimum_stock: 1,
  price: 0, location: "", is_mandatory: false, notes: "",
  category: "sayuran",
};

function ItemForm({ item, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(item ? {
    type: item._source === "feed" ? "pakan" : (item._displayCat || "obat"),
    name: item.name || "",
    unit: item.unit || "kg",
    current_stock: item.current_stock ?? 0,
    minimum_stock: item.minimum_stock ?? 1,
    price: item._price ?? 0,
    location: item._location || "",
    is_mandatory: item.is_mandatory || false,
    notes: item.notes || "",
    category: item._source === "feed" ? (item.category || "sayuran") : (item.category || "obat"),
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isFood = form.type === "pakan";

    if (isFood) {
      const data = {
        name: form.name, category: form.category, unit: form.unit,
        current_stock: Number(form.current_stock), minimum_stock: Number(form.minimum_stock),
        price_per_unit: Number(form.price), is_mandatory: form.is_mandatory,
        storage_location: form.location || "gudang", notes: form.notes,
      };
      if (item?.id) await base44.entities.FeedStock.update(item.id, data);
      else await base44.entities.FeedStock.create(data);
    } else {
      const catMap = { obat: "obat", vitamin: "vitamin", alat: "alat_kerja", lainnya: "lainnya" };
      const data = {
        name: form.name, category: catMap[form.type] || "lainnya", unit: form.unit,
        current_stock: Number(form.current_stock), minimum_stock: Number(form.minimum_stock),
        purchase_price: Number(form.price), is_mandatory: form.is_mandatory,
        location: form.location, notes: form.notes,
      };
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
      {/* Category selector */}
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
          <Label className="text-xs">Harga Beli per {form.unit || "satuan"}</Label>
          <Input type="number" min={0} value={form.price} onChange={e => set("price", e.target.value)} className="mt-0.5" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="is_mandatory" checked={!!form.is_mandatory}
            onChange={e => set("is_mandatory", e.target.checked)} className="w-4 h-4 accent-primary" />
          <Label htmlFor="is_mandatory" className="text-xs cursor-pointer">⚠️ Barang Wajib</Label>
        </div>
      </div>
      <div>
        <Label className="text-xs">Catatan</Label>
        <Input value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-0.5" placeholder="Opsional..." />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button type="submit" className="flex-1" disabled={saving || !form.name}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

// ── ADJUST DIALOG ────────────────────────────────────────────────────────────
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
    const newStock = mode === "tambah"
      ? item.current_stock + delta
      : Math.max(0, item.current_stock - delta);

    if (item._source === "feed") {
      await base44.entities.FeedStock.update(item.id, { current_stock: newStock });
    } else {
      await base44.entities.WarehouseItem.update(item.id, { current_stock: newStock });
      await base44.entities.WarehouseTransaction.create({
        item_id: item.id, item_name: item.name,
        type: mode === "tambah" ? "masuk" : "keluar",
        quantity: delta, unit: item.unit,
        date: format(new Date(), "yyyy-MM-dd"),
        created_by_name: user?.full_name || user?.email || "",
      });
    }
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setMode("tambah")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "tambah" ? "bg-green-500 text-white border-green-500" : "bg-background border-border"}`}>
          ↑ Tambah
        </button>
        <button onClick={() => setMode("kurangi")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "kurangi" ? "bg-red-500 text-white border-red-500" : "bg-background border-border"}`}>
          ↓ Kurangi
        </button>
      </div>
      <p className="text-center text-muted-foreground text-sm">Stok: <strong>{item.current_stock} {item.unit}</strong></p>
      <div>
        <Label className="text-xs">Jumlah ({item.unit}) *</Label>
        <Input type="number" min={0.1} step="0.1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="mt-1 text-center text-lg" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !amount || Number(amount) <= 0}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function StockGudangPage() {
  const { role } = useCurrentUser();
  const canEdit   = canPerformAction(role, "feedstock", "edit") || canPerformAction(role, "warehouse", "edit");
  const canCreate = canPerformAction(role, "feedstock", "create") || canPerformAction(role, "warehouse", "create");
  const canDel    = canPerformAction(role, "feedstock", "delete") || canPerformAction(role, "warehouse", "delete");

  const qc = useQueryClient();

  const { data: rawFeed = [] } = useQuery({
    queryKey: ["feedstocks"],
    queryFn: () => base44.entities.FeedStock.list("-created_date", 300),
  });
  const { data: rawWH = [] } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", 300),
  });

  const [tabCat, setTabCat]         = useState("semua");
  const [search, setSearch]         = useState("");
  const [locFilter, setLocFilter]   = useState("semua");
  const [mandFilter, setMandFilter] = useState("semua");
  const [stockFilter, setStockFilter] = useState("semua");
  const [sortBy, setSortBy]         = useState("default");
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustMode, setAdjustMode] = useState("tambah");

  // Combine + normalise
  const allItems = useMemo(() => [
    ...rawFeed.map(i => normalise(i, "feed")),
    ...rawWH.map(i => normalise(i, "warehouse")),
  ], [rawFeed, rawWH]);

  // Stats
  const mandatoryAlerts = allItems.filter(i => i.is_mandatory && i._isLow).length;
  const totalHabis      = allItems.filter(i => i._isEmpty).length;
  const totalLow        = allItems.filter(i => i._isLow && !i._isEmpty).length;

  // Filter + sort
  const filtered = useMemo(() => {
    let list = allItems.filter(item => {
      const matchCat  = tabCat === "semua" || item._displayCat === tabCat;
      const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase());
      const matchLoc  = locFilter === "semua" || item._location === locFilter;
      const matchMand = mandFilter === "semua" || (mandFilter === "wajib" ? item.is_mandatory : !item.is_mandatory);
      const matchStock = stockFilter === "semua" || item._stockStatus === stockFilter;
      return matchCat && matchSearch && matchLoc && matchMand && matchStock;
    });

    // Sort: mandatory+empty first by default
    list.sort((a, b) => {
      if (sortBy === "default") {
        const aScore = a._isEmpty ? 0 : a._isLow ? 1 : 2;
        const bScore = b._isEmpty ? 0 : b._isLow ? 1 : 2;
        return aScore - bScore;
      }
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "stock_asc") return (a.current_stock || 0) - (b.current_stock || 0);
      if (sortBy === "price_desc") return (b._price || 0) - (a._price || 0);
      return 0;
    });
    return list;
  }, [allItems, tabCat, search, locFilter, mandFilter, stockFilter, sortBy]);

  const handleDelete = async (item) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    if (item._source === "feed") await base44.entities.FeedStock.delete(item.id);
    else await base44.entities.WarehouseItem.delete(item.id);
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Stok & Gudang</h1>
          <p className="text-muted-foreground text-sm">Pakan, obat, vitamin & peralatan ({allItems.length} item)</p>
        </div>
        <div className="flex gap-2">
          {mandatoryAlerts > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-300">
              <AlertTriangle className="w-3.5 h-3.5" /> {mandatoryAlerts} wajib kritis!
            </div>
          )}
          {canCreate && (
            <Button className="gap-2" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Tambah Item
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-2xl font-bold">{allItems.length}</p><p className="text-xs text-muted-foreground">Total Item</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-red-600">{totalHabis}</p><p className="text-xs text-muted-foreground">Stok Habis</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-orange-500">{totalLow}</p><p className="text-xs text-muted-foreground">Hampir Habis</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-green-600">{allItems.length - totalHabis - totalLow}</p><p className="text-xs text-muted-foreground">Stok Aman</p></Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={tabCat} onValueChange={setTabCat}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {CATEGORY_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama barang..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={locFilter} onValueChange={setLocFilter}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LOCATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mandFilter} onValueChange={setMandFilter}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Wajib & Opsional</SelectItem>
              <SelectItem value="wajib">⚠️ Wajib Saja</SelectItem>
              <SelectItem value="opsional">Opsional Saja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STOCK_FILTER.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {CATEGORY_TABS.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {filtered.length === 0 ? (
              <Card className="py-16 text-center text-muted-foreground">
                <PackageOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Tidak ada item di kategori ini</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(item => (
                  <ItemCard key={item._source + item.id} item={item}
                    canEdit={canEdit} canDelete={canDel}
                    onAdjust={(it, mode) => { setAdjustItem(it); setAdjustMode(mode); }}
                    onEdit={it => { setEditItem(it); setShowForm(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

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
            <DialogTitle className="text-base">{adjustMode === "tambah" ? "Tambah" : "Kurangi"} Stok — {adjustItem?.name}</DialogTitle>
          </DialogHeader>
          {adjustItem && <AdjustDialog item={adjustItem} onClose={() => setAdjustItem(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}