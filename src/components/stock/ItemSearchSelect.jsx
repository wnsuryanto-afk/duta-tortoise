import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode, Plus, Check } from "lucide-react";

/**
 * Searchable item picker for stock transactions.
 * Props:
 *   items: array of { id, name, sku, current_stock, unit, category }
 *   value: selected item id
 *   onChange: (item | null) => void
 *   role: string
 *   onAddNew: () => void  (optional — shows "+ item baru" for admin/owner)
 *   onScan: () => void    (optional — shows scan button)
 */
export default function ItemSearchSelect({ items, value, onChange, role, onAddNew, onScan }) {
  const [search, setSearch] = useState("");
  const selected = items.find((i) => i.id === value);

  if (selected) {
    return (
      <div className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            {selected.sku ? `${selected.sku} · ` : ""}Stok: {selected.current_stock} {selected.unit}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" className="ml-2 flex-shrink-0" onClick={() => onChange(null)}>
          Ganti
        </Button>
      </div>
    );
  }

  const filtered = items
    .filter(
      (i) =>
        !search ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.sku || "").toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 30);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Cari nama / SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        {onScan && (
          <Button type="button" variant="outline" size="icon" onClick={onScan} title="Scan QR">
            <QrCode className="w-4 h-4" />
          </Button>
        )}
        {onAddNew && ["admin", "owner"].includes(role) && (
          <Button type="button" variant="outline" size="icon" onClick={onAddNew} title="Tambah item baru">
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="p-3 text-center text-sm text-muted-foreground">Tidak ada item ditemukan</p>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item)}
              className="w-full p-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.sku ? `${item.sku} · ` : ""}Stok: {item.current_stock} {item.unit}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}