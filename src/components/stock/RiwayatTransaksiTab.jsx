import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Trash2, Calendar, Package } from "lucide-react";
import { safeFormatDate } from "@/lib/safeDate";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const KEPERLUAN_LABELS = {
  pemberian_pakan: "Pakan",
  pengobatan_kura: "Obat Kura",
  kebersihan: "Kebersihan",
  perbaikan: "Perbaikan",
  lainnya: "Lainnya",
};

function safeDateTime(dateStr, createdDate) {
  // Prefer created_date for full timestamp; fall back to date field
  const ts = createdDate || dateStr;
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    return format(d, "d MMM yy · HH:mm", { locale: idLocale });
  } catch {
    return "—";
  }
}

/**
 * Enhanced transaction history tab with filters, detailed columns, and
 * delete-with-stock-reversal (owner/manajer only).
 *
 * Props:
 *   movements: StockMovement[]
 *   items: WarehouseItem[]  (for stock reversal on delete)
 *   role: string
 *   onRefresh: () => void
 */
export default function RiwayatTransaksiTab({ movements, items, role, onRefresh }) {
  const qc = useQueryClient();
  const canDelete = ["owner", "manajer"].includes(role);
  const [deleting, setDeleting] = useState(null);

  const [typeFilter, setTypeFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayCount = movements.filter((m) => m.date === todayStr).length;

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const matchType = typeFilter === "semua" || m.type === typeFilter;
      const matchSearch =
        !search ||
        (m.item_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.item_sku || "").toLowerCase().includes(search.toLowerCase());
      const matchFrom = !dateFrom || (m.date || "") >= dateFrom;
      const matchTo = !dateTo || (m.date || "") <= dateTo;
      return matchType && matchSearch && matchFrom && matchTo;
    });
  }, [movements, typeFilter, search, dateFrom, dateTo]);

  const handleDelete = async (tx) => {
    if (!confirm(`Hapus transaksi ${tx.type} ${tx.quantity} ${tx.unit} ${tx.item_name}?\nStok akan dikembalikan seperti semula.`)) return;
    setDeleting(tx.id);
    try {
      // Reverse stock
      const item = items.find((i) => i.id === tx.item_id);
      if (item) {
        const reversal = tx.type === "masuk" ? -(tx.quantity || 0) : (tx.quantity || 0);
        const newStock = Math.max(0, (item.current_stock || 0) + reversal);
        await base44.entities.WarehouseItem.update(tx.item_id, {
          current_stock: newStock,
          last_edited_by: "system (delete reversal)",
          last_edited_at: new Date().toISOString(),
        });
      }
      await base44.entities.StockMovement.delete(tx.id);

      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["warehouse-items"] });
      qc.invalidateQueries({ queryKey: ["warehouse-transactions"] });
      onRefresh?.();
    } catch (err) {
      console.error("Delete tx error:", err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Today summary card */}
      <Card className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{todayCount}</p>
          <p className="text-xs text-muted-foreground">Transaksi Hari Ini</p>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari nama / SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-40 h-9"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Jenis</SelectItem>
            <SelectItem value="masuk">↑ Masuk</SelectItem>
            <SelectItem value="keluar">↓ Keluar</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-9" placeholder="Dari" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-9" placeholder="Sampai" />
        {(search || typeFilter !== "semua" || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setTypeFilter("semua"); setDateFrom(""); setDateTo(""); }}>
            Reset
          </Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada transaksi</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map((tx) => {
            const isMasuk = tx.type === "masuk";
            const photo = tx.photo_urls?.[0];
            const keperluanLabel = tx.keperluan ? KEPERLUAN_LABELS[tx.keperluan] || tx.keperluan : null;
            return (
              <Card key={tx.id} className="p-3 flex items-center gap-3 group">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isMasuk ? "bg-green-100" : "bg-red-100"}`}>
                  {isMasuk ? <ArrowUp className="w-4 h-4 text-green-600" /> : <ArrowDown className="w-4 h-4 text-red-500" />}
                </div>
                {photo && (
                  <img src={photo} alt="Nota" className="w-10 h-10 rounded-lg object-cover border flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {safeDateTime(tx.date, tx.created_date)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {isMasuk ? (
                      tx.supplier && <Badge variant="outline" className="text-[9px] py-0">📦 {tx.supplier}</Badge>
                    ) : (
                      keperluanLabel && <Badge variant="outline" className="text-[9px] py-0">{keperluanLabel}</Badge>
                    )}
                    {tx.enclosure_name && <Badge variant="outline" className="text-[9px] py-0">🏠 {tx.enclosure_name}</Badge>}
                    {tx.tortoise_code && <Badge variant="outline" className="text-[9px] py-0">🐢 {tx.tortoise_code}</Badge>}
                    {tx.by_name && <span className="text-[10px] text-muted-foreground">· {tx.by_name}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${isMasuk ? "text-green-600" : "text-red-500"}`}>
                    {isMasuk ? "+" : "-"}{tx.quantity} {tx.unit}
                  </p>
                  {tx.stock_after != null && (
                    <p className="text-[10px] text-muted-foreground">Sisa: {tx.stock_after} {tx.unit}</p>
                  )}
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={deleting === tx.id}
                    onClick={() => handleDelete(tx)}
                    title="Hapus & kembalikan stok"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">{filtered.length} transaksi</p>
    </div>
  );
}