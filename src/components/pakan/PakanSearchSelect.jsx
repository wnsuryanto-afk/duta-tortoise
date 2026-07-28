import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CATEGORIES = [
  { value: "sayuran", label: "Sayuran" },
  { value: "buah", label: "Buah" },
  { value: "rumput", label: "Rumput" },
  { value: "suplemen", label: "Suplemen" },
  { value: "pelet", label: "Pelet" },
  { value: "hay", label: "Hay" },
  { value: "lainnya", label: "Lainnya" },
];

const UNITS = ["kg", "gram", "ikat", "buah", "liter", "keranjang", "karung"];

/**
 * Searchable feed item picker — all roles can add new pakan types inline.
 * Props:
 *   items: FeedStock[]
 *   value: selected item id
 *   onChange: (item | null) => void
 *   user: { email, full_name }
 */
export default function PakanSearchSelect({ items, value, onChange, user }) {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("sayuran");
  const [newUnit, setNewUnit] = useState("kg");
  const [creating, setCreating] = useState(false);

  const selected = items.find((i) => i.id === value);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await base44.entities.FeedStock.create({
        name: newName.trim(),
        category: newCategory,
        unit: newUnit,
        current_stock: 0,
        minimum_stock: 1,
        price_per_unit: 0,
        last_edited_by: user?.email || "",
        last_edited_at: new Date().toISOString(),
      });
      onChange(created);
      setShowNew(false);
      setNewName("");
    } catch (e) {
      console.error("Create feed error:", e);
    } finally {
      setCreating(false);
    }
  };

  if (selected) {
    return (
      <div className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            Stok: {selected.current_stock} {selected.unit}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" className="ml-2 flex-shrink-0" onClick={() => onChange(null)}>
          Ganti
        </Button>
      </div>
    );
  }

  if (showNew) {
    return (
      <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
        <p className="text-xs font-semibold">+ Jenis Pakan Baru</p>
        <Input placeholder="Nama pakan..." value={newName} onChange={(e) => setNewName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newUnit} onValueChange={setNewUnit}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowNew(false)}>Batal</Button>
          <Button type="button" size="sm" className="flex-1" onClick={handleCreate} disabled={!newName.trim() || creating}>
            {creating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />} Buat
          </Button>
        </div>
      </div>
    );
  }

  const filtered = items
    .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 30);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Cari pakan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={() => setShowNew(true)} title="Tambah jenis pakan baru">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="p-3 text-center text-sm text-muted-foreground">Tidak ada pakan ditemukan</p>
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
                Stok: {item.current_stock} {item.unit}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}