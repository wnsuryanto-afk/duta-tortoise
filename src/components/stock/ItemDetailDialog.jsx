import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Printer, Package, User, Clock } from "lucide-react";
import QRCodeDisplay from "./QRCodeDisplay";
import { formatRp } from "@/lib/skuUtils";
import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Shared item detail modal for FeedStock & WarehouseItem.
 */
export default function ItemDetailDialog({ item, itemType, role, open, onClose, onEdit, onTransaction, onLabel }) {
  if (!item) return null;

  const isAdminRole = ["admin", "owner", "manajer"].includes(role);
  const isKeeperOnly = role === "keeper";
  const price = item.price_per_unit || item.purchase_price || 0;
  const sku = item.sku;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo */}
          {item.photo_url && (
            <img src={item.photo_url} alt={item.name}
              className="w-full h-40 object-cover rounded-lg border" />
          )}

          {/* QR Code */}
          {sku && (
            <div className="flex flex-col items-center py-3 bg-muted/30 rounded-lg">
              <QRCodeDisplay value={sku} size={120} />
              <p className="text-xs text-muted-foreground mt-2">QR berisi SKU — scan untuk akses cepat</p>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Stok Saat Ini</p>
              <p className="font-bold text-lg">{item.current_stock} <span className="text-xs font-normal">{item.unit}</span></p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Stok Minimum</p>
              <p className="font-semibold">{item.minimum_stock} {item.unit}</p>
            </div>
            {!isKeeperOnly && price > 0 && (
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Harga/Satuan</p>
                <p className="font-semibold">{formatRp(price)}</p>
              </div>
            )}
            {!isKeeperOnly && price > 0 && (
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Nilai Stok</p>
                <p className="font-semibold text-primary">{formatRp(price * item.current_stock)}</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            {item.category && (
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                <span>Kategori: {item.category}</span>
              </div>
            )}
            {item.supplier && (
              <div className="flex items-center gap-2">
                <span>🏪 Supplier: {item.supplier}</span>
              </div>
            )}
            {item.notes && <p className="italic">{item.notes}</p>}
          </div>

          {/* Audit trail */}
          {isAdminRole && (item.created_by_id || item.last_edited_by) && (
            <div className="bg-muted/20 rounded-lg p-3 space-y-1 text-xs">
              <p className="font-semibold text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Riwayat Pengeditan
              </p>
              {item.last_edited_by && (
                <p>Terakhir diubah oleh: <strong>{item.last_edited_by}</strong></p>
              )}
              {item.last_edited_at && (
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(item.last_edited_at), "d MMM yyyy HH:mm", { locale: id })}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" className="gap-1" onClick={onTransaction}>
              📦 Stok Masuk/Keluar
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={onLabel}>
              <Printer className="w-3.5 h-3.5" /> Buat Label
            </Button>
            {isAdminRole && (
              <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}