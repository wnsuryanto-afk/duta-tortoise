import { useState, useMemo, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, PlusCircle, MinusCircle, Pencil, Trash2, PackageOpen, AlertTriangle, Camera, X, Clock, CheckCircle2, Eye, Printer } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { canPerformAction } from "@/lib/permissions";
import WarehouseLabelModal from "@/components/warehouse/WarehouseLabelModal";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { statusStok, URUTAN_STATUS, stokHabis } from "@/lib/stokMenipis";

function formatRp(v) { return "Rp " + Number(v || 0).toLocaleString("id-ID"); }

// stockStatus lokal dihapus. Ambangnya sendiri (`< minimum * 1.5` untuk
// "waspada") membuat barang yang sama berlencana Waspada di sini dan Aman di
// halaman Gudang. Sekarang satu aturan: lib/stokMenipis.js.
function stockStatus(item) {
  return statusStok(item);
}

function StockStatusBadge({ item }) {
  const s = stockStatus(item);
  if (s === "tidak_dilacak") return <Badge className="bg-muted text-muted-foreground text-[10px]">Tidak dilacak</Badge>;
  if (s === "habis") return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">🔴 Habis</Badge>;
  if (s === "menipis") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">🟡 Menipis</Badge>;
  return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">🟢 Aman</Badge>;
}

function SourceBadge({ src }) {
  if (src === "feed") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-700 font-medium">🥬 Pakan</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">📦 Gudang</span>;
}

// Category-based placeholder icons
const CAT_ICONS = { pakan: "🥬", sayuran: "🥬", buah: "🍎", rumput: "🌿", hay: "🌾", pelet: "🟤", obat: "💊", vitamin: "🌿", suplemen: "💉", alat_kerja: "🔧", peralatan: "🔧", alat: "🔧", lainnya: "📦" };
function catIcon(item) { return CAT_ICONS[item._cat] || CAT_ICONS[item.category] || "📦"; }

// ── Expired Date Badge ─────────────────────────────────────────────────
function ExpiredBadge({ date, item, onSetExpired }) {
  if (!["obat", "vitamin", "suplemen"].includes(item._cat)) return null;
  if (!date) {
    return (
      <button onClick={() => onSetExpired(item)} title="Set tanggal kadaluarsa"
        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-dashed border-border hover:bg-gray-200 transition-colors whitespace-nowrap">
        ⚪ Set Exp
      </button>
    );
  }
  const days = differenceInDays(parseISO(date), new Date());
  if (days < 0) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold border border-red-200">🔴 Expired!</span>;
  if (days <= 30) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-semibold border border-yellow-200">🟡 {days}h lagi</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">🟢 {format(parseISO(date), "MMM yy")}</span>;
}

// ── Photo Thumbnail ────────────────────────────────────────────────────
function PhotoCell({ item, onPreview, onUpload, canEdit }) {
  if (item.photo_url) {
    return (
      <button onClick={() => onPreview(item.photo_url)} className="group relative w-11 h-11 rounded-lg overflow-hidden border border-border flex-shrink-0 hover:opacity-90 transition-opacity">
        <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    );
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-11 h-11 rounded-lg border border-dashed border-border bg-muted/50 flex items-center justify-center text-xl">{catIcon(item)}</div>
      {canEdit && (
        <button onClick={() => onUpload(item)} className="text-[9px] text-blue-600 hover:underline whitespace-nowrap flex items-center gap-0.5">
          <Camera className="w-2.5 h-2.5" /> Upload
        </button>
      )}
    </div>
  );
}

// ── Photo Upload Dialog ────────────────────────────────────────────────
function PhotoUploadDialog({ item, onClose }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [preview, setPreview] = useState(item.photo_url || null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setError("Ukuran file maks. 2MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { setError("Format harus JPG, PNG, atau WebP"); return; }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (item._src === "feed") await base44.entities.FeedStock.update(item.id, { photo_url: file_url });
    else await base44.entities.WarehouseItem.update(item.id, { photo_url: file_url });
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div onClick={() => fileRef.current?.click()} className="cursor-pointer border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center h-40 gap-2 hover:bg-muted/40 transition-colors relative overflow-hidden">
        {preview ? <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover rounded-xl" /> : (
          <><Camera className="w-8 h-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Klik untuk pilih foto</p><p className="text-xs text-muted-foreground">JPG/PNG/WebP maks. 2MB</p></>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !file}>{saving ? "Mengunggah..." : "Simpan Foto"}</Button>
      </div>
    </div>
  );
}

// ── Set Expired Dialog ─────────────────────────────────────────────────
function SetExpiredDialog({ item, onClose }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(item.expired_date || "");
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    await base44.entities.WarehouseItem.update(item.id, { expired_date: date || null });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setSaving(false);
    onClose();
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Set tanggal kadaluarsa untuk <strong>{item.name}</strong></p>
      <div>
        <Label className="text-xs">Tanggal Kadaluarsa</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </div>
  );
}

// ── Item Detail Dialog ─────────────────────────────────────────────────
function ItemDetailDialog({ item, onClose, onEdit, onUploadPhoto, canEdit }) {
  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements-detail", item.id],
    queryFn: () => base44.entities.StockMovement.filter({ item_id: item.id }, "-date", 10),
  });
  const price = item._src === "feed" ? (item.price_per_unit || 0) : (item.purchase_price || 0);
  const isExpirable = ["obat", "vitamin", "suplemen"].includes(item._cat);

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div className="flex gap-4 items-start">
        <div className="relative">
          {item.photo_url
            ? <img src={item.photo_url} alt={item.name} className="w-24 h-24 rounded-xl object-cover border border-border" />
            : <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center text-4xl">{catIcon(item)}</div>
          }
          {canEdit && (
            <button onClick={() => onUploadPhoto(item)} className="absolute -bottom-2 -right-2 bg-card border border-border rounded-full p-1.5 shadow-sm hover:bg-muted transition-colors">
              <Camera className="w-3.5 h-3.5 text-primary" />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
          {item.sku && <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <SourceBadge src={item._src} />
            <StockStatusBadge item={item} />
            {item.is_mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">WAJIB</span>}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Stok Saat Ini</p>
          <p className="font-bold text-lg">{item.current_stock} <span className="text-xs font-normal">{item.unit}</span></p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Minimum Stok</p>
          <p className="font-semibold">{item.minimum_stock} {item.unit}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Harga</p>
          <p className="font-semibold">{formatRp(price)}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Lokasi</p>
          <p className="font-semibold">{item._loc || "-"}</p>
        </div>
        {item.supplier && (
          <div className="bg-muted/40 rounded-lg p-3 col-span-2">
            <p className="text-xs text-muted-foreground">Supplier</p>
            <p className="font-semibold">{item.supplier}</p>
          </div>
        )}
        {isExpirable && (
          <div className="bg-muted/40 rounded-lg p-3 col-span-2">
            <p className="text-xs text-muted-foreground">Tanggal Kadaluarsa</p>
            <p className="font-semibold">{item.expired_date ? format(parseISO(item.expired_date), "dd MMM yyyy") : "Belum diisi"}</p>
          </div>
        )}
        {item.notes && (
          <div className="bg-muted/40 rounded-lg p-3 col-span-2">
            <p className="text-xs text-muted-foreground">Catatan</p>
            <p className="text-sm">{item.notes}</p>
          </div>
        )}
      </div>

      {/* Movement history */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">History Pergerakan (10 Terakhir)</p>
        {movements.length === 0
          ? <p className="text-xs text-muted-foreground italic">Belum ada pergerakan tercatat</p>
          : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {movements.map(m => (
                <div key={m.id} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${m.type === "masuk" ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                  {m.type === "masuk" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /> : <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                  <span className={`font-semibold ${m.type === "masuk" ? "text-green-700" : "text-red-700"}`}>
                    {m.type === "masuk" ? "+" : "-"}{m.quantity} {m.unit}
                  </span>
                  <span className="text-muted-foreground flex-1 truncate">{m.notes || m.by_name || "-"}</span>
                  <span className="text-muted-foreground flex-shrink-0 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{m.date}</span>
                </div>
              ))}
            </div>
          )}
      </div>

      {canEdit && (
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={() => onUploadPhoto(item)}>
            <Camera className="w-4 h-4" /> Ganti Foto
          </Button>
          <Button className="flex-1 gap-1.5" onClick={() => onEdit(item)}>
            <Pencil className="w-4 h-4" /> Edit Data
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Item Form ─────────────────────────────────────────────────────────
const EMPTY = { type: "pakan", name: "", unit: "kg", current_stock: 0, minimum_stock: 1, price: 0, location: "", is_mandatory: false, notes: "", category: "sayuran" };

function ItemForm({ item, onClose }) {
  const qc = useQueryClient();
  const fileRef = useRef();
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
    expired_date: item.expired_date || "",
  } : EMPTY);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(item?.photo_url || null);
  const [photoError, setPhotoError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotoSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setPhotoError("Maks. 2MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { setPhotoError("Format JPG/PNG/WebP"); return; }
    setPhotoError("");
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const isFeed = form.type === "pakan";
  const isExpirable = ["obat", "vitamin", "suplemen"].includes(form.type);
  const showMinWarning = form.is_mandatory && Number(form.minimum_stock) < 1;
  const showPriceWarning = Number(form.price) === 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let photo_url = item?.photo_url || null;
    if (photoFile) {
      const res = await base44.integrations.Core.UploadFile({ file: photoFile });
      photo_url = res.file_url;
    }
    if (isFeed) {
      const data = { name: form.name, category: form.category, unit: form.unit, current_stock: Number(form.current_stock), minimum_stock: Number(form.minimum_stock), price_per_unit: Number(form.price), is_mandatory: form.is_mandatory, storage_location: form.location || "gudang", notes: form.notes, photo_url };
      if (item?.id) await base44.entities.FeedStock.update(item.id, data);
      else await base44.entities.FeedStock.create(data);
    } else {
      const catMap = { obat: "obat", vitamin: "vitamin", suplemen: "suplemen", alat: "alat_kerja", lainnya: "lainnya" };
      const data = { name: form.name, category: catMap[form.type] || form.type || "lainnya", unit: form.unit, current_stock: Number(form.current_stock), minimum_stock: Number(form.minimum_stock), purchase_price: Number(form.price), is_mandatory: form.is_mandatory, location: form.location, notes: form.notes, photo_url, expired_date: form.expired_date || null };
      if (item?.id) await base44.entities.WarehouseItem.update(item.id, data);
      else await base44.entities.WarehouseItem.create(data);
    }
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setSaving(false);
    onClose();
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      {/* Category */}
      <div>
        <Label className="text-xs">Kategori *</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {[["pakan","🥬 Pakan"],["obat","💊 Obat"],["vitamin","🌿 Vitamin"],["suplemen","💉 Suplemen"],["alat","🔧 Alat"],["lainnya","📦 Lainnya"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => set("type", v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.type === v ? "bg-primary text-primary-foreground" : "bg-background border-border hover:bg-muted"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <Label className="text-xs">Nama *</Label>
        <Input value={form.name} onChange={e => set("name", e.target.value)} required className="mt-0.5" />
      </div>

      {/* Photo upload */}
      <div>
        <Label className="text-xs">Foto Item (opsional, maks. 2MB)</Label>
        <div className="flex items-center gap-3 mt-1">
          <div onClick={() => fileRef.current?.click()} className="cursor-pointer w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden hover:bg-muted/80 transition-colors flex-shrink-0">
            {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
              <Camera className="w-3.5 h-3.5" /> {photoPreview ? "Ganti Foto" : "Pilih Foto"}
            </Button>
            {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelect} />
        </div>
      </div>

      {/* Feed sub-category */}
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
          <Label className="text-xs">Stok Minimum {form.is_mandatory && <span className="text-red-500">*min 1</span>}</Label>
          <Input type="number" min={form.is_mandatory ? 1 : 0} step="0.1" value={form.minimum_stock} onChange={e => set("minimum_stock", e.target.value)} className={`mt-0.5 ${showMinWarning ? "border-red-400" : ""}`} />
          {showMinWarning && <p className="text-xs text-red-600 mt-0.5">Item wajib memerlukan minimum stock untuk alert</p>}
        </div>
        <div>
          <Label className="text-xs">Harga/{form.unit || "satuan"}</Label>
          <Input type="number" min={0} value={form.price} onChange={e => set("price", e.target.value)} className={`mt-0.5 ${showPriceWarning ? "border-yellow-400" : ""}`} />
          {showPriceWarning && <p className="text-xs text-yellow-600 mt-0.5">Disarankan mengisi harga untuk kalkulasi nilai stok</p>}
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="mand" checked={!!form.is_mandatory} onChange={e => set("is_mandatory", e.target.checked)} className="w-4 h-4 accent-primary" />
          <Label htmlFor="mand" className="text-xs cursor-pointer">⚠️ Barang Wajib</Label>
        </div>
      </div>

      {/* Expired date for warehouse medical items */}
      {isExpirable && !isFeed && (
        <div>
          <Label className="text-xs">Tanggal Kadaluarsa</Label>
          <Input type="date" value={form.expired_date} onChange={e => set("expired_date", e.target.value)} className="mt-0.5" />
        </div>
      )}

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
    if (item._src === "feed") await base44.entities.FeedStock.update(item.id, { current_stock: newStock });
    else await base44.entities.WarehouseItem.update(item.id, { current_stock: newStock });
    await base44.entities.StockMovement.create({
      item_id: item.id, item_name: item.name,
      item_type: item._src === "feed" ? "feedstock" : "warehouse",
      type: mode === "tambah" ? "masuk" : "keluar",
      quantity: delta, unit: item.unit,
      date: format(new Date(), "yyyy-MM-dd"),
      by_email: user?.email || "", by_name: user?.full_name || user?.email || "", status: "selesai",
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
  const [detailItem, setDetailItem] = useState(null);
  const [photoItem, setPhotoItem] = useState(null);
  const [expiredItem, setExpiredItem] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selected, setSelected] = useState({});
  const [labelItems, setLabelItems] = useState(null);
  const selectedCount = Object.keys(selected).length;

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
        return URUTAN_STATUS[stockStatus(a)] - URUTAN_STATUS[stockStatus(b)];
      });
  }, [allItems, search, catFilter, stockFilter]);

  const criticalMandatory = allItems.filter(i => i.is_mandatory && ["habis", "menipis"].includes(stockStatus(i))).length;
  const mandatoryEmpty    = allItems.filter(stokHabis).length;

  const handleDelete = async (item) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    if (item._src === "feed") await base44.entities.FeedStock.delete(item.id);
    else await base44.entities.WarehouseItem.delete(item.id);
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
  };

  const openEdit = (item) => { setDetailItem(null); setEditItem(item); setShowForm(true); };
  const openUpload = (item) => { setDetailItem(null); setPhotoItem(item); };

  // Show "Item Wajib Habis" alert banner
  const showMandatoryAlert = mandatoryEmpty > 0;

  return (
    <div className="space-y-4">
      {/* Alert: item wajib habis */}
      {showMandatoryAlert && (
        <div
          onClick={() => { setStockFilter("habis"); setCatFilter("semua"); setSearch(""); }}
          className="cursor-pointer flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-300 rounded-xl text-red-700 hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">⚠️ {mandatoryEmpty} Item Wajib Stok Habis!</p>
            <p className="text-xs opacity-80">Klik untuk filter item kritis — segera restok</p>
          </div>
        </div>
      )}

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
            <SelectItem value="suplemen">💉 Suplemen</SelectItem>
            <SelectItem value="alat">🔧 Alat</SelectItem>
            <SelectItem value="lainnya">📦 Lainnya</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="habis">🔴 Habis</SelectItem>
            <SelectItem value="menipis">🟡 Menipis</SelectItem>
            <SelectItem value="tidak_dilacak">Tidak dilacak</SelectItem>
            <SelectItem value="aman">🟢 Aman</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          {criticalMandatory > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-300">
              <AlertTriangle className="w-3.5 h-3.5" /> {criticalMandatory} wajib kritis!
            </div>
          )}
          {canEdit && selectedCount > 0 && (
            <Button variant="outline" className="gap-1.5 h-9 text-sm"
              onClick={() => setLabelItems(filtered.filter(i => selected[i._src + "_" + i.id]))}>
              <Printer className="w-4 h-4" /> Cetak Label Terpilih ({selectedCount})
            </Button>
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
                  <th className="px-2 py-2.5 w-8">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-primary"
                      checked={filtered.length > 0 && filtered.every(i => selected[i._src + "_" + i.id])}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(prev => ({ ...prev, ...Object.fromEntries(filtered.map(i => [i._src + "_" + i.id, true])) }));
                        } else {
                          setSelected(prev => {
                            const n = { ...prev };
                            filtered.forEach(i => delete n[i._src + "_" + i.id]);
                            return n;
                          });
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground w-14">Foto</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Nama Item</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Kategori</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Stok</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Kadaluarsa</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => (
                  <tr key={item._src + item.id} className={`hover:bg-muted/30 transition-colors ${stockStatus(item) === "habis" ? "bg-red-50/50" : ""}`}>
                    {/* Select */}
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 accent-primary"
                        checked={!!selected[item._src + "_" + item.id]}
                        onChange={(e) => {
                          const k = item._src + "_" + item.id;
                          setSelected(prev => {
                            const n = { ...prev };
                            if (e.target.checked) n[k] = true; else delete n[k];
                            return n;
                          });
                        }}
                      />
                    </td>
                    {/* Photo */}
                    <td className="px-3 py-2">
                      <PhotoCell item={item} onPreview={url => setPhotoPreview(url)} onUpload={openUpload} canEdit={canEdit} />
                    </td>
                    {/* Name — clickable for detail */}
                    <td className="px-4 py-2.5">
                      <button onClick={() => setDetailItem(item)} className="text-left hover:text-primary transition-colors">
                        <p className="font-medium hover:underline">{item.name}</p>
                        {item.is_mandatory && <span className="text-[10px] text-red-600 font-semibold">WAJIB</span>}
                        {item.sku && <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>}
                      </button>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-2.5">
                      <SourceBadge src={item._src} />
                    </td>
                    {/* Stock */}
                    <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                      {item.current_stock} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                    </td>
                    {/* Expired */}
                    <td className="px-4 py-2.5">
                      <ExpiredBadge date={item.expired_date} item={item} onSetExpired={i => setExpiredItem(i)} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-2.5"><StockStatusBadge item={item} /></td>
                    {/* Actions */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Sesuaikan stok" onClick={() => setAdjustItem(item)}>
                          <PlusCircle className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Kurangi stok" onClick={() => setAdjustItem(item)}>
                          <MinusCircle className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Cetak Label" onClick={() => setLabelItems([item])}>
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
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

      {/* Photo Preview Modal */}
      <Dialog open={!!photoPreview} onOpenChange={o => { if (!o) setPhotoPreview(null); }}>
        <DialogContent className="max-w-lg p-2">
          {photoPreview && <img src={photoPreview} alt="Preview" className="w-full rounded-xl object-contain max-h-[80vh]" />}
        </DialogContent>
      </Dialog>

      {/* Item Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={o => { if (!o) setDetailItem(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Item</DialogTitle>
          </DialogHeader>
          {detailItem && <ItemDetailDialog item={detailItem} onClose={() => setDetailItem(null)} onEdit={openEdit} onUploadPhoto={openUpload} canEdit={canEdit} />}
        </DialogContent>
      </Dialog>

      {/* Upload Photo Dialog */}
      <Dialog open={!!photoItem} onOpenChange={o => { if (!o) setPhotoItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="w-4 h-4" /> Upload Foto — {photoItem?.name}</DialogTitle>
          </DialogHeader>
          {photoItem && <PhotoUploadDialog item={photoItem} onClose={() => setPhotoItem(null)} />}
        </DialogContent>
      </Dialog>

      {/* Set Expired Dialog */}
      <Dialog open={!!expiredItem} onOpenChange={o => { if (!o) setExpiredItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tanggal Kadaluarsa</DialogTitle>
          </DialogHeader>
          {expiredItem && <SetExpiredDialog item={expiredItem} onClose={() => setExpiredItem(null)} />}
        </DialogContent>
      </Dialog>

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

      {/* Cetak Label */}
      {labelItems && (
        <WarehouseLabelModal open={!!labelItems} items={labelItems} onClose={() => setLabelItems(null)} />
      )}
    </div>
  );
}