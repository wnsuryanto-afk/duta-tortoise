/**
 * DeathRecordModal — modal wajib isi saat status tortoise diubah ke "mati"
 * Props: tortoise, open, onClose, onSaved(deathData)
 */
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Camera, Loader2, X, AlertTriangle } from "lucide-react";

const DEATH_CAUSES = [
  { value: "sakit",           label: "💊 Sakit / Penyakit" },
  { value: "umur_tua",        label: "🧓 Umur Tua" },
  { value: "kecelakaan",      label: "💥 Kecelakaan" },
  { value: "predator",        label: "🦅 Predator" },
  { value: "stress",          label: "😰 Stres" },
  { value: "egg_binding",     label: "🥚 Egg Binding" },
  { value: "tidak_diketahui", label: "❓ Tidak Diketahui" },
  { value: "lainnya",         label: "📝 Lainnya" },
];

export default function DeathRecordModal({ tortoise, open, onClose, onSaved }) {
  const today = new Date().toISOString().split("T")[0];
  const [deathDate, setDeathDate]         = useState(today);
  const [cause, setCause]                 = useState("");
  const [notes, setNotes]                 = useState("");
  const [necropsyDone, setNecropsyDone]   = useState(false);
  const [necropsyFindings, setNecropsyFindings] = useState("");
  const [deathVideoUrl, setDeathVideoUrl] = useState(tortoise?.death_video_url || "");
  const [photos, setPhotos]               = useState([]);
  const [uploading, setUploading]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [photoError, setPhotoError]       = useState("");
  const fileRef = useRef();

  const canSave = cause && photos.length >= 1;

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 5) {
      setPhotoError("Maksimal 5 foto bukti kematian");
      return;
    }
    setPhotoError("");
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotos(p => [...p, file_url]);
    }
    setUploading(false);
  };

  const removePhoto = (idx) => setPhotos(p => p.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const deathData = {
      death_date: deathDate,
      death_cause: cause,
      death_photos: photos,
      death_notes: notes || undefined,
      necropsy_done: necropsyDone,
      necropsy_findings: necropsyDone ? necropsyFindings : undefined,
      death_video_url: deathVideoUrl || undefined,
    };
    onSaved(deathData);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            💀 Catatan Kematian — {tortoise?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">Isi data kematian dengan lengkap. Foto bukti minimal 1 wajib diupload.</p>
          </div>

          {/* Tanggal */}
          <div>
            <Label className="text-xs">Tanggal Kematian *</Label>
            <Input type="date" value={deathDate} onChange={e => setDeathDate(e.target.value)} className="mt-1" max={today} />
          </div>

          {/* Penyebab */}
          <div>
            <Label className="text-xs">Penyebab Kematian *</Label>
            <Select value={cause} onValueChange={setCause}>
              <SelectTrigger className={`mt-1 ${!cause ? "border-red-300" : ""}`}>
                <SelectValue placeholder="Pilih penyebab..." />
              </SelectTrigger>
              <SelectContent>
                {DEATH_CAUSES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Foto Bukti */}
          <div>
            <Label className="text-xs">Foto Bukti * (min. 1, maks. 5)</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {photos.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 hover:bg-muted/40 transition-colors">
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
                  <span className="text-[9px] text-muted-foreground">Upload</span>
                </label>
              )}
            </div>
            {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
            {photos.length === 0 && <p className="text-xs text-red-500 mt-1">⚠️ Minimal 1 foto wajib diupload</p>}
          </div>

          {/* Catatan */}
          <div>
            <Label className="text-xs">Catatan Tambahan</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1" placeholder="Kondisi saat ditemukan, riwayat singkat..." />
          </div>

          {/* Otopsi */}
          <div className="p-3 rounded-lg bg-muted/40 space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="necropsy" checked={necropsyDone} onChange={e => setNecropsyDone(e.target.checked)} className="w-4 h-4 accent-primary" />
              <label htmlFor="necropsy" className="text-sm cursor-pointer font-medium">🔬 Otopsi dilakukan</label>
            </div>
            {necropsyDone && (
              <Textarea value={necropsyFindings} onChange={e => setNecropsyFindings(e.target.value)} rows={2} placeholder="Temuan otopsi..." className="text-sm" />
            )}
          </div>

          {/* Video URL (opsional) */}
          <div>
            <Label className="text-xs">Video Kematian (opsional — URL atau upload)</Label>
            {deathVideoUrl ? (
              <div className="flex items-center gap-2 mt-1 p-2 bg-muted/40 rounded-lg border border-border text-xs">
                <span className="flex-1 truncate text-green-700">✓ Video tersedia</span>
                <button type="button" onClick={() => setDeathVideoUrl("")} className="text-red-500 hover:underline">Hapus</button>
              </div>
            ) : (
              <Input value={deathVideoUrl} onChange={e => setDeathVideoUrl(e.target.value)} placeholder="https://..." className="mt-1 text-xs" />
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button
              type="button"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5"
              disabled={!canSave || saving}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "💾"}
              Simpan & Konfirmasi Mati
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}