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
import { Plus, ArrowUp, ArrowDown, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canApprove } from "@/lib/permissions";

function formatRp(v) { return "Rp " + Number(v || 0).toLocaleString("id-ID"); }

function StatusBadge({ status }) {
  const map = {
    selesai: { label: "Selesai", cls: "bg-green-100 text-green-700" },
    menunggu_approval: { label: "Menunggu", cls: "bg-yellow-100 text-yellow-700" },
    disetujui: { label: "Disetujui", cls: "bg-blue-100 text-blue-700" },
    ditolak: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge className={`text-[10px] ${s.cls}`}>{s.label}</Badge>;
}

// ── Movement Form ───────────────────────────────────────────────────────
function MovementForm({ feedstocks, warehouseItems, onClose, threshold }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [form, setForm] = useState({ type: "masuk", item_id: "", item_type: "feedstock", quantity: "", unit_price: "", notes: "", date: format(new Date(), "yyyy-MM-dd") });
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
          Total: {formatRp(Number(form.quantity) * Number(form.unit_price))}
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

// ── MAIN ─────────────────────────────────────────────────────────────
export default function StokPergerakanTab({ movements, feedstocks, warehouseItems, role }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const canApproveRole = canApprove(role);

  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const threshold = 500000; // default, bisa dari CompanySettings

  const filtered = useMemo(() => {
    return movements.filter(m => {
      const matchType = typeFilter === "semua" || m.type === typeFilter;
      const matchStatus = statusFilter === "semua" || m.status === statusFilter;
      const matchSearch = !search || m.item_name?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchStatus && matchSearch;
    });
  }, [movements, typeFilter, statusFilter, search]);

  const handleApprove = async (m) => {
    await base44.entities.StockMovement.update(m.id, {
      status: "disetujui",
      approved_by: user?.full_name || user?.email,
      approved_at: new Date().toISOString(),
    });
    // Update stok setelah disetujui
    const allList = m.item_type === "feedstock" ? feedstocks : warehouseItems;
    const entity = m.item_type === "feedstock" ? base44.entities.FeedStock : base44.entities.WarehouseItem;
    const current = allList.find(i => i.id === m.item_id);
    if (current) {
      const newStock = m.type === "masuk"
        ? current.current_stock + (m.quantity || 0)
        : Math.max(0, current.current_stock - (m.quantity || 0));
      await entity.update(m.item_id, { current_stock: newStock });
    }
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    qc.invalidateQueries({ queryKey: ["warehouse-items"] });
  };

  const handleReject = async (m) => {
    const reason = prompt("Alasan penolakan:");
    if (!reason) return;
    await base44.entities.StockMovement.update(m.id, { status: "ditolak", rejected_reason: reason });
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Tipe</SelectItem>
            <SelectItem value="masuk">↑ Masuk</SelectItem>
            <SelectItem value="keluar">↓ Keluar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
            <SelectItem value="menunggu_approval">Menunggu Approval</SelectItem>
            <SelectItem value="disetujui">Disetujui</SelectItem>
            <SelectItem value="ditolak">Ditolak</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-1.5 h-9 text-sm ml-auto" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Catat Pergerakan
        </Button>
      </div>

      {/* Pending approvals alert */}
      {movements.filter(m => m.status === "menunggu_approval").length > 0 && canApproveRole && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{movements.filter(m => m.status === "menunggu_approval").length} transaksi menunggu approval Anda</span>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tanggal</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Item</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tipe</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Total Nilai</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Oleh</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Belum ada data pergerakan stok</td>
                </tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id} className={`hover:bg-muted/30 transition-colors ${m.status === "menunggu_approval" ? "bg-yellow-50/40" : ""}`}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {m.date ? format(new Date(m.date), "d MMM yy", { locale: idLocale }) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{m.item_name}</p>
                      {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      {m.type === "masuk"
                        ? <span className="flex items-center gap-1 text-green-700 text-xs font-medium"><ArrowUp className="w-3.5 h-3.5" />Masuk</span>
                        : <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><ArrowDown className="w-3.5 h-3.5" />Keluar</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {m.quantity} <span className="text-xs font-normal text-muted-foreground">{m.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs">
                      {m.total_value ? formatRp(m.total_value) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.by_name || m.by_email || "-"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={m.status || "selesai"} /></td>
                    <td className="px-4 py-2.5">
                      {m.status === "menunggu_approval" && canApproveRole && (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleApprove(m)} title="Setujui">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleReject(m)} title="Tolak">
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
          {filtered.length} transaksi
        </div>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pergerakan Stok</DialogTitle>
          </DialogHeader>
          <MovementForm
            feedstocks={feedstocks}
            warehouseItems={warehouseItems}
            onClose={() => setShowForm(false)}
            threshold={threshold}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}