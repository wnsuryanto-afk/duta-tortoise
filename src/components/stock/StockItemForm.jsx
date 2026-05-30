import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { generateSKU, getPrefix } from "@/lib/skuUtils";
import { Camera, RefreshCw } from "lucide-react";

/**
 * Reusable form for FeedStock and WarehouseItem.
 * itemType: "feedstock" | "warehouse"
 * editData: existing item or null
 * user: current user
 * allSkus: string[] of existing SKUs in the entity
 * onSaved(item): callback after save
 * onClose(): callback to close
 */

const FEED_CATEGORIES = [
  { value: "sayuran", label: "🥬 Sayuran" },
  { value: "buah", label: "🍎 Buah" },
  { value: "rumput", label: "🌿 Rumput" },
  { value: "suplemen", label: "💊 Suplemen" },
  { value: "pelet", label: "🟤 Pelet" },
  { value: "hay", label: "🌾 Hay" },
  { value: "lainnya", label: "📦 Lainnya" },
];

const WAREHOUSE_CATEGORIES = [
  { value: "obat", label: "💊 Obat" },
  { value: "vitamin", label: "🌿 Vitamin" },
  { value: "suplemen", label: "🧪 Suplemen" },
  { value: "alat_kerja", label: "🔧 Alat Kerja" },
  { value: "peralatan", label: "⚙️ Peralatan" },
  { value: "lainnya", label: "📦 Lainnya" },
];

const FEED_UNITS = ["kg", "gram", "ikat", "buah", "liter", "keranjang"];
const WH_UNITS = ["pcs", "botol", "sachet", "kg", "gram", "liter", "ml", "ikat", "buah", "lusin", "box", "strip"];

export default function StockItemForm({ open, itemType, editData, user, allSkus = [], onSaved, onClose }) {
  const isFeed = itemType === "feedstock";
  const categories = isFeed ? FEED_CATEGORIES : WAREHOUSE_CATEGORIES;
  const units = isFeed ? FEED_UNITS : WH_UNITS;

  const defaultForm = {
    name: "",
    category: isFeed ? "sayuran" : "lainnya",
    unit: isFeed ? "kg" : "pcs",
    current_stock: 0,
    minimum_stock: 1,
    price_per_unit: isFeed ? 0 : undefined,
    purchase_price: !isFeed ? 0 : undefined,
    sku: "",
    photo_url: "",
    notes: "",
    supplier: "",
    is_mandatory: false,
    ...(isFeed ? { daily_ideal: 0, storage_location: "gudang", conversion_notes: "" } : { location: "gudang_utama" }),
  };

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({ ...defaultForm, ...editData });
    } else {
      // Auto-generate SKU on new
      const prefix = getPrefix(defaultForm.category);
      const sku = generateSKU(prefix, allSkus);
      setForm({ ...defaultForm, sku });
    }
  }, [editData, open]);

  const set = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    // Regenerate SKU if category changes and not editing
    if (k === "category" && !editData) {
      next.sku = generateSKU(getPrefix(v), allSkus);
    }
    return next;
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("photo_url", file_url);
    setUploadingPhoto(false);
  };

  const handleRegenerateSKU = () => {
    const prefix = getPrefix(form.category);
    set("sku", generateSKU(prefix, allSkus));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const now = new Date().toISOString();
    const payload = {
      ...form,
      current_stock: Number(form.current_stock) || 0,
      minimum_stock: Number(form.minimum_stock) || 0,
      last_edited_by: user?.email || "",
      last_edited_at: now,
    };
    if (isFeed) {
      payload.price_per_unit = Number(form.price_per_unit) || 0;
      payload.daily_ideal = Number(form.daily_ideal) || 0;
    } else {
      payload.purchase_price = Number(form.purchase_price) || 0;
    }

    const Entity = isFeed ? base44.entities.FeedStock : base44.entities.WarehouseItem;
    let saved;
    if (editData?.id) {
      saved = await Entity.update(editData.id, payload);
    } else {
      saved = await Entity.create(payload);
    }
    setSaving(false);
    onSaved(saved || payload);
  };

  const priceField = isFeed ? "price_per_unit" : "purchase_price";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData?.id ? "Edit" : "Tambah"} {isFeed ? "Pakan" : "Barang"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          {/* Photo */}
          <div className="flex items-center gap-3">
            {form.photo_url ? (
              <img src={form.photo_url} alt="foto" className="w-16 h-16 rounded-lg object-cover border" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
                <Camera className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <Label className="text-xs mb-1 block">Foto Barang</Label>
              <label className="cursor-pointer">
                <span className="text-xs px-3 py-1.5 border rounded-md bg-background hover:bg-muted transition-colors">
                  {uploadingPhoto ? "Mengupload..." : "📷 Pilih Foto"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Nama *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder={isFeed ? "cth: Kubis, Wortel" : "cth: Betadine, Sarung Tangan"} required />
          </div>

          {/* SKU */}
          <div>
            <Label className="text-xs mb-1 block">SKU (auto-generate, bisa diedit)</Label>
            <div className="flex gap-2">
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())}
                placeholder="PKN-0001" className="font-mono" />
              {!editData?.id && (
                <Button type="button" variant="outline" size="icon" onClick={handleRegenerateSKU} title="Generate ulang">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Kategori</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Satuan</Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Stok Saat Ini</Label>
              <Input type="number" min={0} step="0.01" value={form.current_stock}
                onChange={(e) => set("current_stock", e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Stok Minimum</Label>
              <Input type="number" min={0} step="0.01" value={form.minimum_stock}
                onChange={(e) => set("minimum_stock", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Harga/Satuan (Rp)</Label>
              <Input type="number" min={0} value={form[priceField] || ""}
                onChange={(e) => set(priceField, e.target.value)} placeholder="0" />
            </div>
            {isFeed && (
              <div>
                <Label className="text-xs mb-1 block">Kebutuhan Harian Ideal</Label>
                <Input type="number" min={0} step="0.01" value={form.daily_ideal || ""}
                  onChange={(e) => set("daily_ideal", e.target.value)} placeholder="0" />
              </div>
            )}
            {!isFeed && (
              <div>
                <Label className="text-xs mb-1 block">Lokasi Simpan</Label>
                <Select value={form.location || "gudang_utama"} onValueChange={(v) => set("location", v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gudang_utama">Gudang Utama</SelectItem>
                    <SelectItem value="gazebo">Gazebo</SelectItem>
                    <SelectItem value="lemari_obat">Lemari Obat</SelectItem>
                    <SelectItem value="kulkas">Kulkas</SelectItem>
                    <SelectItem value="rak_vitamin">Rak Vitamin</SelectItem>
                    <SelectItem value="gudang_alat">Gudang Alat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isFeed && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Lokasi Simpan</Label>
                <Select value={form.storage_location || "gudang"} onValueChange={(v) => set("storage_location", v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gudang">🏪 Gudang</SelectItem>
                    <SelectItem value="gazebo">⛺ Gazebo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="is_mandatory_f" checked={!!form.is_mandatory}
                  onChange={(e) => set("is_mandatory", e.target.checked)} className="w-4 h-4 accent-primary" />
                <Label htmlFor="is_mandatory_f" className="text-xs cursor-pointer">⚠️ Pakan Wajib</Label>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs mb-1 block">Supplier</Label>
            <Input value={form.supplier || ""} onChange={(e) => set("supplier", e.target.value)}
              placeholder="Nama supplier" />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Catatan</Label>
            <Input value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}
              placeholder="Opsional…" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}