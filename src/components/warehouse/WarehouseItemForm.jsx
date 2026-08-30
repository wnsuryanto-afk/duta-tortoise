import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Camera, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "obat",       label: "💊 Obat-obatan" },
  { value: "vitamin",    label: "🌿 Vitamin & Suplemen" },
  { value: "pakan",      label: "🥬 Pakan Utama" },
  { value: "alat_kerja", label: "🔧 Alat & Peralatan" },
  { value: "lainnya",    label: "📦 Lainnya" },
];

const LOCATIONS = [
  { value: "Gudang Utama",    label: "🏠 Gudang Utama" },
  { value: "Gazebo",          label: "🌿 Gazebo" },
  { value: "Lemari Obat",     label: "🏥 Lemari Obat" },
  { value: "Kulkas",          label: "❄️ Kulkas" },
  { value: "Rak Vitamin",     label: "📦 Rak Vitamin" },
  { value: "Gudang Alat",     label: "🔧 Gudang Alat" },
];

const UNITS = ["pcs", "botol", "sachet", "kg", "gram", "liter", "ml", "ikat", "buah", "lusin", "box", "strip"];

export default function WarehouseItemForm({ open, editData, onClose, onBarcode }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef();
  const videoRef = useRef();
  const [cameraMode, setCameraMode] = useState(false);

  const initForm = editData || {
    name: "", code: "", category: "lainnya", unit: "pcs",
    current_stock: 0, minimum_stock: 1, purchase_price: 0,
    supplier: "", location: "", notes: "", is_mandatory: false,
  };
  const [form, setForm] = useState(initForm);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const requiredFilled = form.name && form.category && form.unit && form.minimum_stock !== "" && form.purchase_price !== "" && form.location;

  const handleScanFile = async (file) => {
    if (!file) return;
    setScanning(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: "Extract the barcode or QR code number/text from this image. Return ONLY the raw code string, nothing else. If no barcode found, return 'NOT_FOUND'.",
        file_urls: [file_url],
      });
      const code = (result || "").trim();
      if (code && code !== "NOT_FOUND") {
        set("code", code);
        toast.success(`✅ Barcode ${code} berhasil dibaca`);
      } else {
        toast.error("Barcode tidak terdeteksi di foto ini");
      }
    } catch {
      toast.error("Gagal membaca barcode");
    }
    setScanning(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requiredFilled) return;
    setSaving(true);
    const data = {
      ...form,
      current_stock: Number(form.current_stock),
      minimum_stock: Number(form.minimum_stock),
      purchase_price: Number(form.purchase_price) || 0,
    };
    let saved;
    if (editData?.id) {
      await base44.entities.WarehouseItem.update(editData.id, data);
      saved = { ...data, id: editData.id };
    } else {
      saved = await base44.entities.WarehouseItem.create(data);
    }
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setSaving(false);
    onClose(saved);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData?.id ? "Edit Barang" : editData?.code && !editData?.id ? `Tambah Barang (Kode: ${editData.code})` : "Tambah Barang"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          {/* Nama */}
          <div>
            <Label className="text-xs">Nama Barang <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required
              className={`mt-1 ${!form.name ? "border-red-300" : ""}`} />
          </div>

          {/* Kode + Scan */}
          <div>
            <Label className="text-xs">Kode / Barcode</Label>
            <div className="flex gap-2 mt-1">
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="cth: OBT-001" className="flex-1" />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs flex-shrink-0"
                onClick={() => fileRef.current?.click()} disabled={scanning}>
                {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                Scan
              </Button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => handleScanFile(e.target.files?.[0])} />
            </div>
          </div>

          {/* Kategori + Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kategori <span className="text-red-500">*</span></Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className={`mt-1 text-xs ${!form.category ? "border-red-300" : ""}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.category === "pakan" && (
                <div className="mt-1.5 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700">
                    <span className="font-semibold">Perhatian:</span> Pakan harian (sayur, rumput, buah, pelet, hay) sebaiknya dikelola di menu <span className="font-semibold">Stok Pakan</span> agar tidak tercatat dobel di dua tempat.
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Satuan <span className="text-red-500">*</span></Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger className={`mt-1 text-xs ${!form.unit ? "border-red-300" : ""}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stok */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Stok Saat Ini</Label>
              <Input type="number" min={0} step="0.1" value={form.current_stock} onChange={(e) => set("current_stock", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Stok Min. <span className="text-red-500">*</span></Label>
              <Input type="number" min={0} step="0.1" value={form.minimum_stock}
                onChange={(e) => set("minimum_stock", e.target.value)}
                className={`mt-1 ${form.minimum_stock === "" ? "border-red-300" : ""}`} />
            </div>
            <div>
              <Label className="text-xs">Harga Beli (Rp) <span className="text-red-500">*</span></Label>
              <Input type="number" min={0} value={form.purchase_price}
                onChange={(e) => set("purchase_price", e.target.value)}
                className={`mt-1 ${form.purchase_price === "" ? "border-red-300" : ""}`} />
            </div>
          </div>

          {/* Lokasi + Supplier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Lokasi / Rak <span className="text-red-500">*</span></Label>
              <Select value={form.location || ""} onValueChange={(v) => set("location", v)}>
                <SelectTrigger className={`mt-1 text-xs ${!form.location ? "border-red-300" : ""}`}>
                  <SelectValue placeholder="Pilih lokasi..." />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Supplier</Label>
              <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Status Wajib */}
          <div>
            <Label className="text-xs">Status Wajib <span className="text-red-500">*</span></Label>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => set("is_mandatory", true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.is_mandatory ? "bg-red-500 text-white border-red-500" : "bg-background border-border hover:bg-muted"}`}>
                🔴 WAJIB
              </button>
              <button type="button" onClick={() => set("is_mandatory", false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${!form.is_mandatory ? "bg-gray-200 text-foreground border-border" : "bg-background border-border hover:bg-muted"}`}>
                ⚪ TIDAK WAJIB
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1" />
          </div>

          {!requiredFilled && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Lengkapi semua field wajib (*) untuk menyimpan
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onClose()}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving || !requiredFilled}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}