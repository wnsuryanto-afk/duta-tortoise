import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * Dialog "Sudah Dibeli" — update stok WarehouseItem atau tandai ShoppingList sudah dibeli.
 * item.type: "warehouse" → update current_stock
 * item.type: "shopping" → mark status "sudah_dibeli"
 */
export default function BoughtItemDialog({ item, onClose, onSaved }) {
  const [newStock, setNewStock] = useState(
    item?.type === "warehouse" ? String(item.current_stock || 0) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (item.type === "warehouse") {
        const val = Number(newStock);
        if (isNaN(val) || val < 0) {
          toast.error("Stok harus angka ≥ 0");
          setSaving(false);
          return;
        }
        const updateData = {
          current_stock: val,
          last_edited_at: new Date().toISOString(),
        };
        if (val > (item.current_stock || 0)) {
          updateData.last_restocked_date = format(new Date(), "yyyy-MM-dd");
        }
        await base44.entities.WarehouseItem.update(item.item_id, updateData);
        toast.success(`Stok ${item.name} diperbarui ke ${val} ${item.unit || ""}`);
      } else if (item.type === "shopping") {
        await base44.entities.ShoppingList.update(item.shopping_list_id, {
          status: "sudah_dibeli",
          tanggal_dibeli: format(new Date(), "yyyy-MM-dd"),
        });
        toast.success(`${item.name} ditandai sudah dibeli`);
      } else if (item.type === "tool_request") {
        await base44.entities.ToolRequest.update(item.tool_request_id, {
          status: "dibeli",
        });
        toast.success(`${item.name} ditandai sudah dibeli`);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm">
        <p className="font-semibold">{item.name}</p>
        {item.type === "warehouse" ? (
          <p className="text-muted-foreground text-xs">
            Stok saat ini: <span className="font-medium text-red-600">{item.current_stock} {item.unit}</span>
          </p>
        ) : item.type === "tool_request" ? (
          <p className="text-muted-foreground text-xs">
            Jumlah: {item.jumlah} pcs · {item.reason || ""}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Jumlah beli: {item.jumlah} {item.satuan}
          </p>
        )}
      </div>

      {item.type === "warehouse" && (
        <div>
          <Label className="text-xs">Stok baru (setelah pembelian)</Label>
          <Input
            type="number"
            min="0"
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
            className="mt-1"
            autoFocus
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Masukkan total stok setelah barang dibeli/diterima
          </p>
        </div>
      )}

      {/* Reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 space-y-1">
        <p className="font-semibold flex items-center gap-1">
          ⚠️ Jangan lupa catat pembelian ini:
        </p>
        <div className="flex gap-3">
          <Link
            to="/petty-cash"
            onClick={onClose}
            className="flex items-center gap-1 underline hover:text-amber-900"
          >
            <Wallet className="w-3 h-3" /> Kas Kecil
          </Link>
          <Link
            to="/finance"
            onClick={onClose}
            className="flex items-center gap-1 underline hover:text-amber-900"
          >
            <TrendingDown className="w-3 h-3" /> Biaya Operasional
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {item.type === "warehouse" ? "Update Stok" : "Tandai Dibeli"}
        </Button>
      </div>
    </div>
  );
}