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
import { Plus, RotateCcw, Search } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";

function StatusBadge({ borrow }) {
  if (borrow.return_date) {
    const cond = borrow.return_condition;
    if (cond === "hilang") return <Badge className="bg-red-100 text-red-700 text-[10px]">❌ Hilang</Badge>;
    if (cond === "rusak") return <Badge className="bg-orange-100 text-orange-700 text-[10px]">⚠️ Rusak</Badge>;
    return <Badge className="bg-green-100 text-green-700 text-[10px]">✅ Dikembalikan</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-700 text-[10px]">📤 Dipinjam</Badge>;
}

// ── Borrow Form ────────────────────────────────────────────────────────
function BorrowForm({ warehouseItems, feedstocks, onClose }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [form, setForm] = useState({
    item_id: "", item_type: "warehouse",
    borrower_name: user?.full_name || "",
    borrower_email: user?.email || "",
    borrow_date: new Date().toISOString(),
    expected_return_date: "",
    purpose: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const allOptions = [
    ...warehouseItems.map(i => ({ id: i.id, name: i.name, unit: i.unit, type: "warehouse" })),
    ...feedstocks.map(i => ({ id: i.id, name: i.name, unit: i.unit, type: "feedstock" })),
  ];
  const selectedItem = allOptions.find(o => o.id === form.item_id);

  const handleItemChange = (id) => {
    const it = allOptions.find(o => o.id === id);
    set("item_id", id);
    set("item_type", it?.type || "warehouse");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.item_id || !form.borrower_name) return;
    setSaving(true);
    await base44.entities.ItemBorrow.create({
      item_id: form.item_id,
      item_name: selectedItem?.name || "",
      item_type: form.item_type,
      borrower_email: form.borrower_email,
      borrower_name: form.borrower_name,
      borrow_date: form.borrow_date,
      expected_return_date: form.expected_return_date || undefined,
      purpose: form.purpose,
      notes: form.notes,
      approval_status: "approved",
    });
    qc.invalidateQueries({ queryKey: ["item-borrows"] });
    setSaving(false);
    onClose();
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <Label className="text-xs">Item yang Dipinjam *</Label>
        <Select value={form.item_id} onValueChange={handleItemChange}>
          <SelectTrigger className="mt-0.5"><SelectValue placeholder="Pilih item..." /></SelectTrigger>
          <SelectContent>
            <optgroup label="Alat & Gudang">
              {warehouseItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </optgroup>
            <optgroup label="Pakan">
              {feedstocks.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </optgroup>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Nama Peminjam *</Label>
        <Input value={form.borrower_name} onChange={e => set("borrower_name", e.target.value)} required className="mt-0.5" />
      </div>
      <div>
        <Label className="text-xs">Tujuan Peminjaman</Label>
        <Input value={form.purpose} onChange={e => set("purpose", e.target.value)} className="mt-0.5" placeholder="Untuk apa?" />
      </div>
      <div>
        <Label className="text-xs">Rencana Tanggal Kembali</Label>
        <Input type="date" value={form.expected_return_date} onChange={e => set("expected_return_date", e.target.value)} className="mt-0.5" />
      </div>
      <div>
        <Label className="text-xs">Catatan</Label>
        <Input value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-0.5" placeholder="Opsional..." />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button type="submit" className="flex-1" disabled={saving || !form.item_id || !form.borrower_name}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </form>
  );
}

// ── Return Dialog ─────────────────────────────────────────────────────
function ReturnDialog({ borrow, onClose }) {
  const qc = useQueryClient();
  const [condition, setCondition] = useState("baik");
  const [saving, setSaving] = useState(false);

  const handleReturn = async () => {
    setSaving(true);
    await base44.entities.ItemBorrow.update(borrow.id, {
      return_date: new Date().toISOString(),
      return_condition: condition,
    });
    qc.invalidateQueries({ queryKey: ["item-borrows"] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-xl p-3">
        <p className="font-semibold text-sm">{borrow.item_name}</p>
        <p className="text-xs text-muted-foreground">Dipinjam oleh: {borrow.borrower_name}</p>
      </div>
      <div>
        <Label className="text-xs">Kondisi Saat Dikembalikan *</Label>
        <div className="flex gap-2 mt-1.5">
          {[["baik","✅ Baik"],["rusak","⚠️ Rusak"],["hilang","❌ Hilang"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setCondition(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${condition === v ? "bg-primary text-primary-foreground" : "bg-background border-border"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleReturn} disabled={saving}>{saving ? "Menyimpan..." : "Tandai Dikembalikan"}</Button>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────
export default function StokPeminjamanTab({ borrows, warehouseItems, feedstocks }) {
  const [showForm, setShowForm] = useState(false);
  const [returnItem, setReturnItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState("semua");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return borrows.filter(b => {
      const matchSearch = !search || b.item_name?.toLowerCase().includes(search.toLowerCase()) || b.borrower_name?.toLowerCase().includes(search.toLowerCase());
      const isReturned = !!b.return_date;
      if (statusFilter === "dipinjam" && isReturned) return false;
      if (statusFilter === "dikembalikan" && !isReturned) return false;
      if (statusFilter === "hilang_rusak" && !(b.return_condition === "hilang" || b.return_condition === "rusak")) return false;
      return matchSearch;
    });
  }, [borrows, statusFilter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari item/peminjam..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="dipinjam">📤 Masih Dipinjam</SelectItem>
            <SelectItem value="dikembalikan">✅ Sudah Kembali</SelectItem>
            <SelectItem value="hilang_rusak">⚠️ Hilang / Rusak</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-1.5 h-9 text-sm ml-auto" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Peminjaman Baru
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tgl Pinjam</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Item</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Peminjam</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tujuan</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Rencana Kembali</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Belum ada data peminjaman</td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {b.borrow_date ? format(new Date(b.borrow_date), "d MMM yy", { locale: idLocale }) : "-"}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{b.item_name}</td>
                    <td className="px-4 py-2.5 text-xs">{b.borrower_name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.purpose || "-"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {b.expected_return_date ? format(new Date(b.expected_return_date), "d MMM yy", { locale: idLocale }) : "-"}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge borrow={b} /></td>
                    <td className="px-4 py-2.5 text-right">
                      {!b.return_date && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-green-700" onClick={() => setReturnItem(b)}>
                          <RotateCcw className="w-3 h-3" /> Kembalikan
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
          {filtered.length} peminjaman
        </div>
      </Card>

      {/* New Borrow Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Peminjaman Baru</DialogTitle></DialogHeader>
          <BorrowForm warehouseItems={warehouseItems} feedstocks={feedstocks} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={!!returnItem} onOpenChange={o => { if (!o) setReturnItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tandai Dikembalikan</DialogTitle></DialogHeader>
          {returnItem && <ReturnDialog borrow={returnItem} onClose={() => setReturnItem(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}