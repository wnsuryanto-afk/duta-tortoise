/**
 * LaporRusakDialog — dialog untuk keeper/kepala_feeder melaporkan barang rusak.
 * Input: kondisi (rusak_ringan/rusak_berat/hilang), keterangan, foto (kamera/galeri).
 * Memanggil backend function "reportBrokenItem" yang:
 *   - update WarehouseItem condition fields
 *   - auto-create ToolRequest (menunggu approval)
 *   - notifikasi owner & manajer
 *
 * Props: item, user, onClose, onSaved
 */
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { compressImage } from "@/lib/useImageCompression";
import { safeFormatDate } from "@/lib/safeDate";

const CONDITIONS = [
  { value: "rusak_ringan", label: "⚠️ Rusak Ringan", desc: "Masih bisa dipakai" },
  { value: "rusak_berat", label: "🔴 Rusak Berat", desc: "Perlu ganti" },
  { value: "hilang", label: "❓ Hilang", desc: "Tidak ditemukan" },
];

export default function LaporRusakDialog({ item, onClose, onSaved }) {
  const [condition, setCondition] = useState("rusak_berat");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      toast.error("Format harus JPG/PNG/WEBP");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, quality: 0.8 });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      setPhotoUrl(file_url);
    } catch (err) {
      toast.error("Gagal upload: " + (err?.message || ""));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!photoUrl) { toast.error("Foto wajib diupload"); return; }
    if (!note.trim()) { toast.error("Keterangan kerusakan wajib diisi"); return; }
    setSaving(true);
    try {
      const resp = await base44.functions.invoke("reportBrokenItem", {
        warehouse_item_id: item.id,
        condition,
        condition_note: note.trim(),
        condition_photo_url: photoUrl,
      });
      toast.success("Laporan rusak terkirim. Pengajuan barang baru dibuat untuk persetujuan.");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.data?.error || err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" /> Lapor Rusak
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Item info (read-only) */}
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground">Barang:</p>
            <p className="font-semibold text-sm">{item?.name}</p>
            {item?.sku && <p className="text-[10px] font-mono text-muted-foreground">{item.sku}</p>}
            {item?.condition_reported_at && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Laporan sebelumnya: {safeFormatDate(item.condition_reported_at, "d MMM yyyy")}
              </p>
            )}
          </div>

          {/* Condition selector */}
          <div>
            <Label className="text-xs mb-1.5 block">Kondisi <span className="text-red-500">*</span></Label>
            <div className="space-y-1.5">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(c.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    condition === c.value
                      ? "border-red-400 bg-red-50 text-red-700 font-semibold"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {c.label} <span className="text-xs text-muted-foreground font-normal">— {c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="text-xs mb-1 block">Keterangan Kerusakan <span className="text-red-500">*</span></Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jelaskan kerusakan: apa yang rusak, sejak kapan, dll."
              className="h-16 text-sm resize-none"
              maxLength={300}
            />
          </div>

          {/* Photo — tanpa capture attribute (kamera ATAU galeri) */}
          <div>
            <Label className="text-xs mb-1 block">Foto Kondisi <span className="text-red-500">*</span></Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFile}
            />
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="foto kondisi" className="w-full max-h-40 object-contain rounded-lg border" />
                <button type="button" onClick={() => setPhotoUrl("")} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-red-400 hover:bg-red-50/30">
                {uploading ? <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /> : <ImagePlus className="w-6 h-6 mx-auto text-muted-foreground" />}
                <p className="text-xs text-muted-foreground mt-1">{uploading ? "Mengupload..." : "Upload foto (wajib)"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Kamera atau galeri</p>
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Batal</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5" onClick={handleSubmit} disabled={saving || uploading || !photoUrl || !note.trim()}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Kirim Laporan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}