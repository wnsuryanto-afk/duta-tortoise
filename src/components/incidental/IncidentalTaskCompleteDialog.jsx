/**
 * IncidentalTaskCompleteDialog — konfirmasi sebelum menandai tugas insidentil selesai.
 * Anti-kepencet: keeper harus konfirmasi + lampirkan foto (atau isi alasan tanpa foto).
 * Foto bisa dari KAMERA atau GALERI. Catatan opsional.
 */
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Image as ImageIcon, Loader2, CheckCircle2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { compressImage } from "@/lib/useImageCompression";
import { toast } from "sonner";

export default function IncidentalTaskCompleteDialog({ task, open, onClose, onConfirm }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState("");
  const [noPhoto, setNoPhoto] = useState(false);
  const [noPhotoReason, setNoPhotoReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const reset = () => {
    setPhotoUrl(null);
    setPreview(null);
    setNotes("");
    setNoPhoto(false);
    setNoPhotoReason("");
    setUploading(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      if (!compressed) { setUploading(false); return; }
      setPreview(URL.createObjectURL(compressed.file));
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      setPhotoUrl(file_url);
      setPreview(file_url);
      setNoPhoto(false);
    } catch (e) {
      toast.error("Gagal upload foto: " + (e.message || e));
    }
    setUploading(false);
  };

  const handleConfirm = async () => {
    if (!noPhoto && !photoUrl) {
      toast.error("Lampirkan foto hasil atau centang 'tanpa foto' dengan alasan");
      return;
    }
    if (noPhoto && !noPhotoReason.trim()) {
      toast.error("Wajib isi alasan jika tidak bisa foto");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        photoUrl: noPhoto ? null : photoUrl,
        notes: notes.trim(),
        noPhotoReason: noPhoto ? noPhotoReason.trim() : null,
      });
      reset();
      onClose();
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Tandai selesai?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Task name */}
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <p className="text-xs text-orange-600 font-medium">Tugas</p>
            <p className="text-sm font-semibold text-foreground">{task?.title}</p>
            {task?.notes && <p className="text-xs text-muted-foreground mt-0.5">{task.notes}</p>}
          </div>

          {/* Photo upload */}
          {!noPhoto && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Foto hasil <span className="text-red-500">*</span></p>
              {preview ? (
                <div className="relative inline-block">
                  <img src={preview} alt="Bukti" className="h-32 w-44 object-cover rounded-lg border" />
                  <button
                    onClick={() => { setPhotoUrl(null); setPreview(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => cameraRef.current?.click()} className="gap-1.5">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    Kamera
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => galleryRef.current?.click()} className="gap-1.5">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    Galeri
                  </Button>
                </div>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
            </div>
          )}

          {/* No photo option */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={noPhoto} onChange={e => setNoPhoto(e.target.checked)} className="rounded" />
            Tidak bisa foto (wajib isi alasan)
          </label>
          {noPhoto && (
            <Textarea
              placeholder="Alasan tidak bisa foto (wajib)..."
              value={noPhotoReason}
              onChange={e => setNoPhotoReason(e.target.value)}
              className="h-14 text-xs resize-none"
            />
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Catatan singkat (opsional)</p>
            <Textarea
              placeholder="Catatan hasil pengerjaan..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-16 text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Batal</Button>
          <Button onClick={handleConfirm} disabled={submitting || uploading} className="gap-1.5">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}