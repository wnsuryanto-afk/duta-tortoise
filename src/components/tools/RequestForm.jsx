import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { compressImage } from "@/lib/useImageCompression";

export default function RequestForm({ user, onClose, onSaved }) {
  const [toolName, setToolName] = useState("");
  const [reason, setReason] = useState("rusak");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!toolName.trim()) { toast.error("Nama alat wajib diisi"); return; }
    if (!photoUrl) { toast.error("Foto wajib diupload"); return; }
    setSaving(true);
    try {
      await base44.entities.ToolRequest.create({
        tool_name: toolName.trim(),
        requester_name: user?.full_name || user?.email,
        requester_email: user?.email,
        reason,
        quantity: Number(quantity) || 1,
        photo_url: photoUrl,
        notes: notes.trim() || null,
        request_date: format(new Date(), "yyyy-MM-dd"),
        status: "menunggu",
      });
      toast.success("Pengajuan terkirim");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  const reasonLabels = { rusak: "Rusak", hilang: "Hilang", perlu_tambahan: "Perlu tambahan" };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Nama alat</Label>
        <Input
          value={toolName}
          onChange={(e) => setToolName(e.target.value)}
          placeholder="Nama alat yang diajukan"
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Alasan</Label>
        <div className="mt-1 flex gap-2">
          {Object.entries(reasonLabels).map(([val, label]) => (
            <Button
              key={val}
              size="sm"
              variant={reason === val ? "default" : "outline"}
              className="flex-1"
              onClick={() => setReason(val)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Jumlah</Label>
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="mt-1 w-24"
        />
      </div>

      {/* FOTO WAJIB — tanpa capture attribute (kamera ATAU galeri) */}
      <div>
        <Label className="text-xs">Foto (wajib)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
        {photoUrl ? (
          <div className="relative mt-1">
            <img src={photoUrl} alt="foto alat" className="w-full max-h-40 object-contain rounded-lg border" />
            <button type="button" onClick={() => setPhotoUrl("")} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="mt-1 w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/40 hover:bg-primary/5">
            {uploading ? <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /> : <ImagePlus className="w-6 h-6 mx-auto text-muted-foreground" />}
            <p className="text-xs text-muted-foreground mt-1">{uploading ? "Mengupload..." : "Upload foto (wajib)"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Kamera atau galeri</p>
          </button>
        )}
      </div>

      <div>
        <Label className="text-xs">Catatan (opsional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Detail kondisi, spesifikasi yang dibutuhkan, dll."
          className="mt-1 h-14 resize-none text-sm"
          maxLength={300}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Batal</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={saving || uploading || !photoUrl}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Ajukan
        </Button>
      </div>
    </div>
  );
}