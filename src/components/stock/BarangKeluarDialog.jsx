import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownCircle, Camera, Loader2, X, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useImageCompression } from "@/lib/useImageCompression";
import { useTestMode } from "@/lib/useTestMode";
import { format } from "date-fns";
import ItemSearchSelect from "@/components/stock/ItemSearchSelect";

const KEPERLUAN_OPTIONS = [
  { value: "pemberian_pakan", label: "Pemberian Pakan" },
  { value: "pengobatan_kura", label: "Pengobatan Kura" },
  { value: "kebersihan", label: "Kebersihan" },
  { value: "perbaikan", label: "Perbaikan" },
  { value: "lainnya", label: "Lainnya" },
];

/**
 * Dialog for recording stock OUT (barang keluar / pengambilan).
 * Props:
 *   items: array of WarehouseItem
 *   user: { email, full_name }
 *   role: string
 *   presetItem: WarehouseItem | null
 *   onAddNew: () => void
 *   onScan: () => void
 *   onClose: (refreshed?: boolean) => void
 */
export default function BarangKeluarDialog({ items, user, role, presetItem, onAddNew, onScan, onClose }) {
  const { testModeTag } = useTestMode();
  const { compressImage, compressing } = useImageCompression();
  const savingRef = useRef(false);

  const [selectedItem, setSelectedItem] = useState(presetItem || null);
  const [qty, setQty] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [enclosure, setEnclosure] = useState("");
  const [tortoiseCode, setTortoiseCode] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentStock = selectedItem?.current_stock || 0;
  const qtyNum = Number(qty) || 0;
  const isOverStock = selectedItem && qtyNum > currentStock;
  const isKeeperRole = ["keeper", "kepala_feeder"].includes(role);
  const canOverride = ["owner", "manajer"].includes(role);
  // Keeper rejected if over stock; owner/manajer must fill notes when overriding
  const blockedByStock = isOverStock && isKeeperRole;
  const needsNoteToOverride = isOverStock && canOverride && !notes.trim();
  const canSubmit =
    selectedItem &&
    qtyNum > 0 &&
    keperluan &&
    !saving &&
    !compressing &&
    !uploadingPhoto &&
    !blockedByStock &&
    !needsNoteToOverride;

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
      const newStock = Math.max(0, currentStock - qtyNum);

      await base44.entities.StockMovement.create({
        item_id: selectedItem.id,
        item_type: "warehouse",
        item_name: selectedItem.name,
        item_sku: selectedItem.sku || "",
        type: "keluar",
        quantity: qtyNum,
        unit: selectedItem.unit,
        stock_after: newStock,
        keperluan,
        enclosure_name: enclosure || "",
        tortoise_code: tortoiseCode || "",
        by_email: user?.email || "",
        by_name: user?.full_name || user?.email || "",
        notes: notes || "",
        date: format(new Date(), "yyyy-MM-dd"),
        status: "selesai",
        photo_urls: photoUrl ? [photoUrl] : [],
        ...testModeTag,
      });

      await base44.entities.WarehouseItem.update(selectedItem.id, {
        current_stock: newStock,
        last_edited_by: user?.email || "",
        last_edited_at: new Date().toISOString(),
      });

      onClose(true);
    } catch (err) {
      console.error("BarangKeluar error:", err);
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
            <ArrowDownCircle className="w-5 h-5 text-red-500" />
            📤 Barang Keluar / Pengambilan
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
              Stok saat ini: <strong>{currentStock} {selectedItem.unit}</strong>
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

          {/* Over-stock warning */}
          {isOverStock && (
            <div className={`rounded-lg p-2.5 text-xs border ${blockedByStock ? "bg-red-50 border-red-200 text-red-700" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Stok hanya tersisa {currentStock} {selectedItem.unit}
              </p>
              {blockedByStock && (
                <p className="mt-1">❌ Anda tidak bisa mengeluarkan melebihi stok. Minta owner/manajer untuk mencatat koreksi selisih.</p>
              )}
              {canOverride && needsNoteToOverride && (
                <p className="mt-1">⚠️ Wajib isi catatan koreksi selisih untuk menyimpan.</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Keperluan *</Label>
            <Select value={keperluan} onValueChange={setKeperluan}>
              <SelectTrigger className="mt-0.5">
                <SelectValue placeholder="Pilih keperluan..." />
              </SelectTrigger>
              <SelectContent>
                {KEPERLUAN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kandang (opsional)</Label>
              <Input
                value={enclosure}
                onChange={(e) => setEnclosure(e.target.value)}
                placeholder="mis: W2"
                className="mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs">Kode Kura (opsional)</Label>
              <Input
                value={tortoiseCode}
                onChange={(e) => setTortoiseCode(e.target.value)}
                placeholder="mis: B17"
                className="mt-0.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Foto (opsional)</Label>
            <div className="flex items-center gap-2 mt-0.5">
              <input type="file" accept="image/*" id="foto-keluar" className="hidden" onChange={handlePhoto} />
              <label
                htmlFor="foto-keluar"
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
                  <img src={photoUrl} alt="Bukti" className="w-14 h-14 rounded-lg object-cover border" />
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
            <Label className="text-xs">Catatan {isOverStock && canOverride && <span className="text-red-500">*</span>}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isOverStock && canOverride ? "Wajib: jelaskan koreksi selisih..." : "Opsional..."}
              className="h-16 resize-none mt-0.5"
              maxLength={300}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onClose()}>
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-500 hover:bg-red-600"
              disabled={!canSubmit}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}