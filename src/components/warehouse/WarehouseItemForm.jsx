import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const CATEGORIES = ["obat", "vitamin", "pakan", "alat_kerja", "lainnya"];
const UNITS = ["pcs", "botol", "sachet", "kg", "gram", "liter", "ml", "ikat", "buah", "lusin", "box"];

export default function WarehouseItemForm({ open, editData, onClose }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(editData || {
    name: "", code: "", category: "lainnya", unit: "pcs",
    current_stock: 0, minimum_stock: 1, purchase_price: 0,
    supplier: "", location: "", notes: "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      current_stock: Number(form.current_stock),
      minimum_stock: Number(form.minimum_stock),
      purchase_price: Number(form.purchase_price) || 0,
    };
    if (editData?.id) {
      await base44.entities.WarehouseItem.update(editData.id, data);
    } else {
      await base44.entities.WarehouseItem.create(data);
    }
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData?.id ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nama Barang *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Kode / Barcode</Label>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="cth: OBT-001" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Satuan</Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Stok Saat Ini</Label>
              <Input type="number" min={0} step="0.1" value={form.current_stock} onChange={(e) => set("current_stock", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Stok Minimum</Label>
              <Input type="number" min={0} step="0.1" value={form.minimum_stock} onChange={(e) => set("minimum_stock", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Harga Beli (Rp)</Label>
              <Input type="number" min={0} value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Supplier</Label>
              <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Lokasi Gudang</Label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="cth: Rak A1" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}