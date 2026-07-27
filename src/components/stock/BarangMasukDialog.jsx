import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpCircle, Camera, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useImageCompression } from "@/lib/useImageCompression";
import { useTestMode } from "@/lib/useTestMode";
import { format } from "date-fns";
import ItemSearchSelect from "@/components/stock/ItemSearchSelect";

/**
 * Dialog for recording stock IN (barang masuk).
 * Props:
 *   items: array of WarehouseItem
 *   user: { email, full_name }
 *   role: string
 *   presetItem: WarehouseItem | null  (optional pre-selected item)
 *   onAddNew: () => void  (opens StockItemForm from parent)
 *   onScan: () => void     (opens QR scanner from parent)
 *   onClose: (refreshed?: boolean) => void
 */
export default function BarangMasukDialog({ items, user, role, presetItem, onAddNew, onScan, onClose }) {
  const { testModeTag } = useTestMode();
  const { compressImage, compressing } = useImageCompression();
  const savingRef = useRef(false);

  const [selectedItem, setSelectedItem] = useState(presetItem || null);
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [supplier, setSupplier] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = selectedItem && Number(qty) > 0 && !saving && !compressing && !uploadingPhoto;

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      if (compressed) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
        setPhotoUrl(file_url);
      }
    } catch {
      // silent
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    try {
      const delta = Number(qty);
      const newStock = (selectedItem.current_stock || 0) + delta;
      const purchasePrice = Number(totalPrice) || 0;

      await base44.entities.StockMovement.create({
        item_id: selectedItem.id,
        item_type: "warehouse",
        item_name: selectedItem.name,
        item_sku: selectedItem.sku || "",
        type: "masuk",
        quantity: delta,
        unit: selectedItem.unit,
        total_purchase_price: purchasePrice,
        stock_after: newStock,
        supplier: supplier || "",
        by_email: user?.email || "",
        by_name: user?.full_name || user?.email || "",
        notes: notes || "",
        date,
        status: "selesai",
        photo_urls: photoUrl ? [photoUrl] : [],
        ...testModeTag,
      });

      await base44.entities.WarehouseItem.update(selectedItem.id, {
        current_stock: newStock,
        last_restocked_date: date,
        last_edited_by: user?.email || "",
        last_edited_at: new Date().toISOString(),
      });

      if (purchasePrice > 0) {
        await base44.entities.FinanceTransaction.create({
          type: "pengeluaran",
          category: selectedItem.category === "pakan" ? "pakan" : "obat_perawatan",
          amount: purchasePrice,
          date,
          description: `Beli ${delta} ${selectedItem.unit} ${selectedItem.name}${supplier ? ` dari ${supplier}` : ""}`,
          created_by_name: user?.full_name || user?.email || "",
          ...testModeTag,
        });
      }

      onClose(true);
    } catch (err) {
      console.error("BarangMasuk error:", err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowUpCircle className="w-5 h-5 text-green-600" />
            📥 Barang Masuk
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <Label className="text-xs mb-1.5 block">Pilih Item *</Label>
            <ItemSearchSelect
              items={items}
              value={selectedItem?.id || null}
              onChange={(item) => setSelectedItem(item)}
              role={role}
              onAddNew={onAddNew}
              onScan={onScan}
            />
          </div>

          {selectedItem && (
            <p className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg py-1.5">
              Stok saat ini: <strong>{selectedItem.current_stock} {selectedItem.unit}</strong>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jumlah *</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                required
                className="mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs">Satuan</Label>
              <Input value={selectedItem?.unit || ""} disabled className="mt-0.5 bg-muted/30" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5" />
          </div>

          <div>
            <Label className="text-xs">Sumber / Supplier</Label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Opsional, mis: Toko Sukses"
              className="mt-0.5"
            />
          </div>

          <div>
            <Label className="text-xs">Harga Beli Total (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              placeholder="Kosongkan jika tidak tahu"
              className="mt-0.5"
            />
          </div>

          <div>
            <Label className="text-xs">Foto Nota</Label>
            <div className="flex items-center gap-2 mt-0.5">
              <input type="file" accept="image/*" id="nota-masuk" className="hidden" onChange={handlePhoto} />
              <label
                htmlFor="nota-masuk"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground transition-colors"
              >
                {uploadingPhoto || compressing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {uploadingPhoto ? "Mengunggah..." : compressing ? "Mengompres..." : "Ambil / Pilih Foto"}
              </label>
              {photoUrl && (
                <div className="relative">
                  <img src={photoUrl} alt="Nota" className="w-14 h-14 rounded-lg object-cover border" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional..."
              className="h-16 resize-none mt-0.5"
              maxLength={300}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onClose()}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={!canSubmit}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}