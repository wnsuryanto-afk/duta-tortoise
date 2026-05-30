import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, UtensilsCrossed, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { formatRp } from "@/lib/skuUtils";

export default function FeedingLogPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const canCreate = ["admin", "owner", "manajer", "kepala_feeder", "keeper"].includes(role);

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list("name", 100),
  });

  const { data: feedstocks = [] } = useQuery({
    queryKey: ["feedstocks"],
    queryFn: () => base44.entities.FeedStock.list("-name", 200),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["feeding-logs"],
    queryFn: () => base44.entities.FeedingLog.list("-date", 100),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    enclosure_id: "",
    enclosure_name: "",
    notes: "",
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split("T")[0], enclosure_id: "", enclosure_name: "", notes: "" });
    setSelectedItems([]);
    setValidationError("");
  };

  const handleEnclosureSelect = (encId) => {
    const enc = enclosures.find(e => e.id === encId);
    setForm(p => ({ ...p, enclosure_id: encId, enclosure_name: enc?.name || "" }));
  };

  const addFeedItem = (feedId) => {
    if (selectedItems.find(i => i.feedstock_id === feedId)) return;
    const feed = feedstocks.find(f => f.id === feedId);
    if (!feed) return;
    setSelectedItems(prev => [...prev, {
      feedstock_id: feed.id,
      feedstock_name: feed.name,
      feedstock_sku: feed.sku || "",
      quantity: 1,
      unit: feed.unit,
      unit_price: feed.price_per_unit || 0,
      subtotal: feed.price_per_unit || 0,
      _maxStock: feed.current_stock,
    }]);
  };

  const updateItemQty = (feedId, qty) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.feedstock_id !== feedId) return i;
      const q = Number(qty) || 0;
      return { ...i, quantity: q, subtotal: q * i.unit_price };
    }));
  };

  const removeItem = (feedId) => {
    setSelectedItems(prev => prev.filter(i => i.feedstock_id !== feedId));
  };

  const totalCost = selectedItems.reduce((s, i) => s + (i.subtotal || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.enclosure_name) { setValidationError("Pilih kandang terlebih dahulu."); return; }
    if (selectedItems.length === 0) { setValidationError("Tambahkan minimal 1 pakan."); return; }

    // Validasi stok
    for (const item of selectedItems) {
      if (item.quantity > item._maxStock) {
        setValidationError(`Stok ${item.feedstock_name} tidak cukup (tersedia: ${item._maxStock} ${item.unit})`);
        return;
      }
      if (item.quantity <= 0) {
        setValidationError(`Jumlah ${item.feedstock_name} harus lebih dari 0`);
        return;
      }
    }
    setValidationError("");
    setSaving(true);

    const cleanItems = selectedItems.map(({ _maxStock, ...rest }) => rest);

    // Simpan FeedingLog
    const log = await base44.entities.FeedingLog.create({
      date: form.date,
      enclosure_id: form.enclosure_id,
      enclosure_name: form.enclosure_name,
      fed_by_email: user?.email || "",
      fed_by_name: user?.full_name || user?.email || "",
      feed_items: cleanItems,
      total_cost: totalCost,
      notes: form.notes,
    });

    // Kurangi stok FeedStock dan buat StockMovement
    for (const item of selectedItems) {
      const feed = feedstocks.find(f => f.id === item.feedstock_id);
      if (feed) {
        await base44.entities.FeedStock.update(item.feedstock_id, {
          current_stock: Math.max(0, (feed.current_stock || 0) - item.quantity),
          last_edited_by: user?.email || "",
          last_edited_at: new Date().toISOString(),
        });
        // Buat StockMovement untuk audit
        await base44.entities.ItemUsage.create({
          item_id: item.feedstock_id,
          item_type: "feedstock",
          item_name: item.feedstock_name,
          item_sku: item.feedstock_sku,
          type: "keluar",
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_value: item.subtotal,
          by_email: user?.email || "",
          by_name: user?.full_name || user?.email || "",
          notes: `Pemberian pakan: ${form.enclosure_name}`,
          date: form.date,
          status: "selesai",
        });
      }
    }

    qc.invalidateQueries({ queryKey: ["feeding-logs"] });
    qc.invalidateQueries({ queryKey: ["feedstocks"] });
    setSaving(false);
    setShowForm(false);
    resetForm();
  };

  const availableFeedstocks = feedstocks.filter(f =>
    !selectedItems.find(i => i.feedstock_id === f.id) && f.current_stock > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Pemberian Pakan</h1>
          <p className="text-muted-foreground text-sm">Catat pemberian pakan harian per kandang</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Catat Pakan
          </Button>
        )}
      </div>

      {/* Riwayat */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : logs.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada catatan pemberian pakan</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold">{log.enclosure_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.date && format(new Date(log.date + "T00:00:00"), "EEEE, d MMMM yyyy", { locale: id })} · oleh {log.fed_by_name || log.fed_by_email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">{formatRp(log.total_cost || 0)}</p>
                  <p className="text-xs text-muted-foreground">{(log.feed_items || []).length} jenis pakan</p>
                </div>
              </div>
              {(log.feed_items || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {log.feed_items.map((item, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {item.feedstock_name}: {item.quantity} {item.unit}
                    </Badge>
                  ))}
                </div>
              )}
              {log.notes && <p className="text-xs text-muted-foreground mt-2 italic">{log.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catat Pemberian Pakan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Tanggal *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Kandang *</Label>
                {enclosures.length > 0 ? (
                  <Select value={form.enclosure_id} onValueChange={handleEnclosureSelect}>
                    <SelectTrigger><SelectValue placeholder="Pilih kandang" /></SelectTrigger>
                    <SelectContent>
                      {enclosures.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.enclosure_name} onChange={e => setForm(p => ({ ...p, enclosure_name: e.target.value }))} placeholder="Nama kandang" />
                )}
              </div>
            </div>

            {/* Pilih pakan */}
            <div>
              <Label className="text-xs mb-1 block">Tambah Pakan</Label>
              <Select onValueChange={addFeedItem} value="">
                <SelectTrigger><SelectValue placeholder="+ Pilih pakan dari stok..." /></SelectTrigger>
                <SelectContent>
                  {availableFeedstocks.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} — stok: {f.current_stock} {f.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Daftar pakan dipilih */}
            {selectedItems.length > 0 && (
              <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground">Pakan yang akan diberikan:</p>
                {selectedItems.map((item) => {
                  const isOverStock = item.quantity > item._maxStock;
                  return (
                    <div key={item.feedstock_id} className={`flex items-center gap-2 p-2 rounded-lg bg-background border ${isOverStock ? "border-red-300" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.feedstock_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tersedia: {item._maxStock} {item.unit}
                          {item.unit_price > 0 && ` · ${formatRp(item.unit_price)}/${item.unit}`}
                        </p>
                        {isOverStock && (
                          <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Melebihi stok tersedia
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Input
                          type="number" min={0.01} step="0.01"
                          value={item.quantity}
                          onChange={e => updateItemQty(item.feedstock_id, e.target.value)}
                          className={`w-20 h-8 text-sm ${isOverStock ? "border-red-400" : ""}`}
                        />
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(item.feedstock_id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-1 border-t">
                  <span className="text-xs text-muted-foreground">{selectedItems.length} jenis pakan</span>
                  <span className="text-sm font-semibold">Total: {formatRp(totalCost)}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs mb-1 block">Catatan</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opsional..." />
            </div>

            {validationError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-300 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {validationError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); resetForm(); }}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}