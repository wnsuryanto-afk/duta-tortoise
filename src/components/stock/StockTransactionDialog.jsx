import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle } from "lucide-react";
import { formatRp } from "@/lib/skuUtils";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";

/**
 * Dialog untuk stok masuk/keluar + approval otomatis jika nilai > threshold.
 * Props:
 *   item: { id, name, sku, current_stock, unit, price_per_unit/purchase_price, category }
 *   itemType: "feedstock" | "warehouse"
 *   user: { email, full_name }
 *   role: string
 *   threshold: number (from CompanySettings.stok_approval_threshold, default 500000)
 *   onClose(refreshed?: boolean)
 *   initialType: "masuk" | "keluar"
 */
export default function StockTransactionDialog({ item, itemType, user, role, threshold = 500000, onClose, initialType = "masuk" }) {
  const [txType, setTxType] = useState(initialType);
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const canMasuk = ["admin", "owner", "manajer", "kepala_feeder"].includes(role);
  const canKeluar = ["admin", "owner", "manajer", "kepala_feeder", "keeper"].includes(role);

  const price = item?.price_per_unit || item?.purchase_price || 0;
  const totalValue = (Number(qty) || 0) * price;
  const needsApproval = txType === "keluar" && totalValue > threshold;
  const isKeeperOnly = role === "keeper";

  const Entity = itemType === "feedstock"
    ? base44.entities.FeedStock
    : base44.entities.WarehouseItem;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qty || Number(qty) <= 0) return;
    setSaving(true);

    const delta = Number(qty);
    const status = needsApproval ? "menunggu_approval" : "selesai";

    // Record usage
    await base44.entities.ItemUsage.create({
      item_id: item.id,
      item_type: itemType,
      item_name: item.name,
      item_sku: item.sku || item.code || "",
      type: txType,
      quantity: delta,
      unit: item.unit,
      unit_price: price,
      total_value: totalValue,
      by_email: user?.email || "",
      by_name: user?.full_name || user?.email || "",
      notes,
      date: format(new Date(), "yyyy-MM-dd"),
      status,
    });

    // Only update stock if no approval needed
    if (status === "selesai") {
      const newStock = txType === "masuk"
        ? item.current_stock + delta
        : Math.max(0, item.current_stock - delta);
      await Entity.update(item.id, {
        current_stock: newStock,
        last_edited_by: user?.email || "",
        last_edited_at: new Date().toISOString(),
      });

      // Finance transaction for masuk
      if (txType === "masuk" && totalValue > 0) {
        await base44.entities.FinanceTransaction.create({
          type: "pengeluaran",
          category: itemType === "feedstock" ? "pakan" : "obat_perawatan",
          amount: totalValue,
          date: format(new Date(), "yyyy-MM-dd"),
          description: `Beli ${delta} ${item.unit} ${item.name} (${item.sku || ""})`,
          created_by_name: user?.full_name || user?.email || "",
        });
      }
    } else {
      // Notify admin/owner about approval needed
      try {
        const admins = await base44.asServiceRole?.entities?.User?.list() || [];
        for (const admin of admins.filter(u => ["admin", "owner"].includes(u.role))) {
          await base44.entities.Notification.create({
            recipient_email: admin.email,
            recipient_role: admin.role,
            title: "⚠️ Approval Stok Keluar Diperlukan",
            message: `${user?.full_name || user?.email} mengajukan stok keluar ${item.name}: ${delta} ${item.unit} senilai ${formatRp(totalValue)}. Melebihi batas approval.`,
            type: "warning",
            category: "stok",
            created_at: new Date().toISOString(),
          });
        }
      } catch (_) {}
    }

    setSaving(false);
    onClose(true);
  };

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {txType === "masuk"
              ? <ArrowUpCircle className="w-5 h-5 text-green-600" />
              : <ArrowDownCircle className="w-5 h-5 text-red-500" />}
            {txType === "masuk" ? "Stok Masuk" : "Stok Keluar"} — {item.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {/* Type toggle */}
          <div className="flex gap-2">
            {canMasuk && !isKeeperOnly && (
              <button type="button" onClick={() => setTxType("masuk")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${txType === "masuk" ? "bg-green-500 text-white border-green-500" : "bg-background border-border hover:bg-muted"}`}>
                ↑ Masuk
              </button>
            )}
            {canKeluar && (
              <button type="button" onClick={() => setTxType("keluar")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${txType === "keluar" ? "bg-red-500 text-white border-red-500" : "bg-background border-border hover:bg-muted"}`}>
                ↓ Keluar / Ambil
              </button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Stok saat ini: <strong>{item.current_stock} {item.unit}</strong>
          </p>

          <div>
            <Label className="text-xs">Jumlah ({item.unit}) *</Label>
            <Input type="number" min={0.01} step="0.01" value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0" className="mt-1" required />
          </div>

          {/* Show price info for non-keeper */}
          {!isKeeperOnly && price > 0 && qty && (
            <div className={`rounded-lg p-2 text-xs ${needsApproval ? "bg-orange-50 border border-orange-200" : "bg-muted/40"}`}>
              <p>Harga satuan: <strong>{formatRp(price)}/{item.unit}</strong></p>
              <p>Total nilai: <strong>{formatRp(totalValue)}</strong></p>
              {needsApproval && (
                <p className="text-orange-700 font-semibold mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Melebihi batas ({formatRp(threshold)}) — butuh approval admin
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Keterangan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional…" className="mt-1" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onClose()}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving || !qty}>
              {saving ? "Menyimpan..." : needsApproval ? "Ajukan Approval" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}