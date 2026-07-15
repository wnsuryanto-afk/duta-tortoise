import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Loader2, ImagePlus, CheckCircle2 } from "lucide-react";
import { useImageCompression } from "@/lib/useImageCompression";
import { toast } from "sonner";

/**
 * PaymentProofDialog — dialog upload bukti transfer gaji.
 * mode="pay" → tandai dibayar (dengan/tanpa bukti)
 * mode="add_proof" → tambah/ganti bukti pada slip yang sudah dibayar
 *
 * onSuccess dipanggil dengan { payment_proof_url } jika ada bukti, atau {} jika tanpa bukti.
 */
export default function PaymentProofDialog({ slip, mode, onClose, onSuccess }) {
  const [preview, setPreview] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { compressImage, compressing } = useImageCompression();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await compressImage(file);
    if (result) {
      setCompressedFile(result.file);
      setPreview(result.preview);
    } else {
      toast.error("Gagal mengompres gambar");
    }
    e.target.value = "";
  };

  const handleConfirmWithProof = async () => {
    if (!compressedFile) return;
    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file: compressedFile });
      await onSuccess({ payment_proof_url: uploadRes.file_url });
    } catch (err) {
      toast.error("Gagal upload bukti: " + (err.message || "kesalahan"));
    } finally {
      setUploading(false);
    }
  };

  const handlePayWithoutProof = async () => {
    await onSuccess({});
  };

  const busy = uploading || compressing;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "pay" ? "Lampirkan Bukti Transfer" : "Tambah / Ganti Bukti Transfer"}
          </DialogTitle>
          <DialogDescription>
            Slip gaji {slip.employee_name} — periode {slip.period}
          </DialogDescription>
        </DialogHeader>

        {/* Preview / Upload area */}
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview bukti"
              className="w-full rounded-lg border border-border max-h-72 object-contain bg-muted/30"
            />
            <button
              onClick={() => { setPreview(null); setCompressedFile(null); }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/30 transition-colors disabled:opacity-50"
          >
            <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Pilih gambar bukti transfer</p>
            <p className="text-xs text-muted-foreground mt-1">Screenshot m-banking dari galeri atau foto</p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {compressedFile && (
            <Button onClick={handleConfirmWithProof} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {busy
                ? "Memproses..."
                : mode === "pay"
                  ? "Tandai Dibayar dengan Bukti"
                  : "Simpan Bukti"}
            </Button>
          )}
          {!compressedFile && mode === "pay" && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="gap-2"
            >
              {compressing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {compressing ? "Mengompres..." : "Pilih dari Galeri / Kamera"}
            </Button>
          )}
          {mode === "pay" && (
            <Button
              variant="ghost"
              onClick={handlePayWithoutProof}
              disabled={busy}
              className="text-muted-foreground"
            >
              Tanpa Bukti — Tandai Dibayar Saja
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}