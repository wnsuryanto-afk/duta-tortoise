import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * Dialog "Sudah Dibeli" — koreksi stok gudang, atau tandai permintaan alat dibeli.
 *
 * KOREKSI STOK, BUKAN PENERIMAAN BARANG. Layar ini menimpa angka stok
 * langsung. Versi lama melakukannya tanpa jejak apa pun: tidak ada catatan
 * siapa yang mengubah, dari berapa ke berapa, atau kenapa. Buku pergerakan
 * stok jadi tidak bisa dipercaya — jumlah di gudang tidak lagi sama dengan
 * jumlah masuk dikurangi jumlah keluar, dan tidak ada cara menelusuri
 * selisihnya. Sekarang tiap koreksi menulis StockMovement-nya sendiri.
 *
 * item.type: "warehouse"     → koreksi current_stock + StockMovement
 * item.type: "tool_request"  → tandai permintaan alat dibeli
 *
 * item.type "shopping" SENGAJA tidak lagi ditangani di sini. Menandai baris
 * daftar belanja "sudah dibeli" tanpa menambah stok dan tanpa mencatat biaya
 * membuat barangnya lenyap dari daftar sementara gudang dan laba rugi tidak
 * tahu apa-apa. Jalannya satu: halaman Pembelian.
 */
export default function BoughtItemDialog({ item, onClose, onSaved }) {
  const [newStock, setNewStock] = useState(
    item?.type === "warehouse" ? String(item.current_stock || 0) : ""
  );
  const [saving, setSaving] = useState(false);
  const { user } = useCurrentUser();

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
        const lama = Number(item.current_stock) || 0;
        const selisih = val - lama;

        const updateData = {
          current_stock: val,
          last_edited_at: new Date().toISOString(),
        };
        if (val > lama) {
          updateData.last_restocked_date = format(new Date(), "yyyy-MM-dd");
        }
        await base44.entities.WarehouseItem.update(item.item_id, updateData);

        // Jejak koreksinya. Tanpa baris ini, stok berubah tanpa ada yang tahu
        // siapa dan kenapa — dan perkiraan pemakaian ikut salah membacanya.
        if (selisih !== 0) {
          try {
            await base44.entities.StockMovement.create({
              item_id: item.item_id,
              item_type: "warehouse",
              item_name: item.name,
              item_sku: item.sku || "",
              type: selisih > 0 ? "masuk" : "keluar",
              quantity: Math.abs(selisih),
              unit: item.unit || "pcs",
              unit_price: 0,
              total_value: 0,
              stock_after: val,
              keperluan: "lainnya",
              date: format(new Date(), "yyyy-MM-dd"),
              status: "selesai",
              by_email: user?.email || "",
              by_name: user?.full_name || user?.email || "",
              notes: `KOREKSI STOK dari kas kecil: ${lama} → ${val} ${item.unit || ""}. Bukan penerimaan barang; nilainya sengaja Rp 0 supaya tidak terhitung sebagai pembelian maupun pemakaian.`,
            });
          } catch { /* stok sudah dikoreksi; jejaknya gagal ditulis */ }
        }

        toast.success(`Stok ${item.name} dikoreksi ${lama} → ${val} ${item.unit || ""}`);
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