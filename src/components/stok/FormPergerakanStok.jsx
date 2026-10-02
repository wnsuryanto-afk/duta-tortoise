import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTestMode } from "@/lib/useTestMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { rupiah } from "@/lib/rupiah";

/**
 * FormPergerakanStok — satu formulir barang MASUK dan KELUAR, dipakai dua tempat.
 *
 * ── Kenapa dikeluarkan jadi berkas sendiri (02-10-2026) ────────────────────
 *
 * Formulir ini dulu hidup di dalam StokPergerakanTab sebagai fungsi lokal,
 * jadi satu-satunya cara memakainya adalah membuka halaman Stok lalu pindah
 * ke tab Pergerakan. Pemiliknya menyebutnya langsung: keluar-masuk barang
 * terasa sulit. Dan memang — ketiga beranda (Owner, Admin, Investor) tidak
 * punya satu pun tombol stok.
 *
 * Yang TIDAK dilakukan: menulis dialog barang-masuk yang baru untuk beranda.
 * Itu akan membuat JALUR KEDUA yang menulis StockMovement dan mengubah stok,
 * dan dua jalur yang menggerakkan angka yang sama adalah cacat yang sudah
 * berkali-kali ditemukan di aplikasi ini. Satu implementasi, dua tempat pasang.
 *
 * `tipeAwal` menentukan tombol mana yang menyala saat dibuka, supaya tombol
 * "Barang Masuk" di beranda tidak mendarat di formulir yang bertanda keluar.
 */
export default function FormPergerakanStok({ feedstocks, warehouseItems, onClose, threshold, tipeAwal = "masuk" }) {
  const { testModeTag } = useTestMode();
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [form, setForm] = useState({ type: tipeAwal === "keluar" ? "keluar" : "masuk", item_id: "", item_type: "feedstock", quantity: "", unit_price: "", notes: "", date: format(new Date(), "yyyy-MM-dd") });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const allOptions = [
    ...feedstocks.map(i => ({ id: i.id, name: i.name, unit: i.unit, type: "feedstock", price: i.price_per_unit || 0 })),
    ...warehouseItems.map(i => ({ id: i.id, name: i.name, unit: i.unit, type: "warehouse", price: i.purchase_price || 0 })),
  ];
  const selectedItem = allOptions.find(o => o.id === form.item_id);

  const handleItemChange = (id) => {
    const it = allOptions.find(o => o.id === id);
    setForm(p => ({ ...p, item_id: id, item_type: it?.type || "feedstock", unit_price: it?.price || "" }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.item_id || !form.quantity) return;
    setSaving(true);
    const total = Number(form.quantity) * Number(form.unit_price || 0);
    const needsApproval = form.type === "keluar" && total >= threshold;
    const status = needsApproval ? "menunggu_approval" : "selesai";

    await base44.entities.StockMovement.create({
      item_id: form.item_id,
      item_name: selectedItem?.name || "",
      item_type: form.item_type,
      type: form.type,
      quantity: Number(form.quantity),
      unit: selectedItem?.unit || "",
      unit_price: Number(form.unit_price || 0),
      total_value: total,
      date: form.date,
      by_email: user?.email || "",
      by_name: user?.full_name || user?.email || "",
      notes: form.notes,
      status,
      ...testModeTag,
    });

    // Update actual stock if selesai
    if (status === "selesai") {
      const src = allOptions.find(o => o.id === form.item_id);
      if (src) {
        const entity = form.item_type === "feedstock" ? base44.entities.FeedStock : base44.entities.WarehouseItem;
        const allList = form.item_type === "feedstock" ? feedstocks : warehouseItems;
        const current = allList.find(i => i.id === form.item_id);
        if (current) {
          const newStock = form.type === "masuk"
            ? current.current_stock + Number(form.quantity)
            : Math.max(0, current.current_stock - Number(form.quantity));
          await entity.update(form.item_id, { current_stock: newStock });
        }
      }
    }

    qc.invalidateQueries({ queryKey: ["stock-movements"] });
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
    setSaving(false);
    onClose();
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => set("type", "masuk")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === "masuk" ? "bg-green-500 text-white border-green-500" : "bg-background border-border"}`}>
          ↑ Stok Masuk
        </button>
        <button type="button" onClick={() => set("type", "keluar")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === "keluar" ? "bg-red-500 text-white border-red-500" : "bg-background border-border"}`}>
          ↓ Stok Keluar
        </button>
      </div>
      <div>
        <Label className="text-xs">Item *</Label>
        <Select value={form.item_id} onValueChange={handleItemChange}>
          <SelectTrigger className="mt-0.5"><SelectValue placeholder="Pilih item..." /></SelectTrigger>
          <SelectContent>
            <optgroup label="Pakan">
              {feedstocks.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </optgroup>
            <optgroup label="Gudang">
              {warehouseItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </optgroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Jumlah * {selectedItem ? `(${selectedItem.unit})` : ""}</Label>
          <Input type="number" min={0.01} step="0.01" value={form.quantity} onChange={e => set("quantity", e.target.value)} required className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Harga Satuan (Rp)</Label>
          <Input type="number" min={0} value={form.unit_price} onChange={e => set("unit_price", e.target.value)} className="mt-0.5" placeholder="0" />
        </div>
      </div>
      {form.quantity && form.unit_price && (
        <div className={`rounded-lg p-2.5 text-sm ${Number(form.quantity) * Number(form.unit_price) >= threshold && form.type === "keluar" ? "bg-yellow-50 border border-yellow-200 text-yellow-800" : "bg-muted text-muted-foreground"}`}>
          Total: {rupiah(Number(form.quantity) * Number(form.unit_price))}
          {Number(form.quantity) * Number(form.unit_price) >= threshold && form.type === "keluar" && (
            <span className="ml-2 font-semibold">⚠️ Butuh Approval</span>
          )}
        </div>
      )}
      <div>
        <Label className="text-xs">Tanggal</Label>
        <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="mt-0.5" />
      </div>
      <div>
        <Label className="text-xs">Keterangan</Label>
        <Input value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-0.5" placeholder="Opsional..." />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button type="submit" className="flex-1" disabled={saving || !form.item_id || !form.quantity}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </form>
  );
}
