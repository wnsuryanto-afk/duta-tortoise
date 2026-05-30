import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, Package, AlertTriangle } from "lucide-react";

const MEDICAL_CATEGORIES = ["obat", "vitamin", "suplemen"];

export default function TreatmentItemsPicker({ items, warehouseItems, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const medItems = warehouseItems.filter(w => MEDICAL_CATEGORIES.includes(w.category));
  const filtered = medItems.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (warehouseItem) => {
    const already = items.find(i => i.item_id === warehouseItem.id);
    if (already) return;
    const newRow = {
      item_id: warehouseItem.id,
      item_name: warehouseItem.name,
      item_sku: warehouseItem.sku || "",
      quantity: 1,
      unit: warehouseItem.unit,
      unit_price: warehouseItem.purchase_price || 0,
      subtotal: warehouseItem.purchase_price || 0,
      _available_stock: warehouseItem.current_stock || 0,
    };
    onChange([...items, newRow]);
    setShowPicker(false);
    setSearch("");
  };

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateQty = (idx, qty) => {
    const updated = items.map((it, i) => {
      if (i !== idx) return it;
      const q = Math.max(0, Number(qty) || 0);
      return { ...it, quantity: q, subtotal: q * it.unit_price };
    });
    onChange(updated);
  };

  const totalBiaya = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);

  return (
    <div className="space-y-3">
      {/* List obat yang sudah ditambah */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it, idx) => {
            const available = it._available_stock ?? 0;
            const overStock = it.quantity > available;
            return (
              <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${overStock ? "border-red-300 bg-red-50" : "border-border bg-muted/30"}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stok tersedia: <span className={overStock ? "text-red-600 font-semibold" : ""}>{available} {it.unit}</span>
                    {it.item_sku && <span className="ml-2 font-mono">{it.item_sku}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number" min={0} max={available}
                    value={it.quantity}
                    onChange={(e) => updateQty(idx, e.target.value)}
                    className={`w-20 h-8 text-sm text-center ${overStock ? "border-red-400" : ""}`}
                  />
                  <span className="text-xs text-muted-foreground w-8">{it.unit}</span>
                </div>
                <div className="text-right shrink-0 w-24">
                  <p className="text-xs text-muted-foreground">Subtotal</p>
                  <p className="font-semibold text-sm">Rp {(it.subtotal || 0).toLocaleString("id-ID")}</p>
                </div>
                <button type="button" onClick={() => removeItem(idx)}
                  className="text-red-400 hover:text-red-600 p-1 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
                {overStock && (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" title="Melebihi stok tersedia!" />
                )}
              </div>
            );
          })}
          <div className="flex justify-end pr-12">
            <p className="text-sm font-semibold text-orange-700">
              Total: Rp {totalBiaya.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      )}

      {/* Tombol + Tambah Obat */}
      {!showPicker ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowPicker(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Tambah Obat / Perlengkapan
        </Button>
      ) : (
        <div className="border rounded-xl p-3 space-y-2 bg-background shadow-sm">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama obat atau SKU..."
              className="h-8 text-sm"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowPicker(false); setSearch(""); }}>
              Tutup
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada item ditemukan</p>
            ) : filtered.map(w => {
              const alreadyAdded = items.some(i => i.item_id === w.id);
              return (
                <button
                  key={w.id} type="button"
                  onClick={() => addItem(w)}
                  disabled={alreadyAdded}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    alreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
                  }`}
                >
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stok: {w.current_stock} {w.unit} · Rp {(w.purchase_price || 0).toLocaleString("id-ID")}/{w.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-xs capitalize">{w.category}</Badge>
                    {alreadyAdded && <Badge className="text-xs">Ditambahkan</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}