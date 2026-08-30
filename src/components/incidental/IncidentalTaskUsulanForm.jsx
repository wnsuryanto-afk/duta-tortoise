/**
 * IncidentalTaskUsulanForm — dialog untuk KEEPER & KEPALA FEEDER mengajukan
 * tugas insidentil atas inisiatif mereka. Form minimal: judul, keterangan,
 * foto kondisi (opsional), dan perkiraan waktu pengerjaan (bobot).
 *
 * Keeper TIDAK mengisi poin bebas — poin ditentukan dari bobot yang dipilih.
 * Tugas dibuat dengan status "usulan" (menunggu persetujuan owner/manajer/admin).
 * Poin belum dihitung sampai disetujui.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { BOBOT_OPTIONS, pointsForBobot } from "@/lib/incidentalBobot";

export default function IncidentalTaskUsulanForm({ open, onClose, user }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [bobot, setBobot] = useState("ringan");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setNotes("");
    setBobot("ringan");
    setPhotoUrl("");
  };

  const handlePhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
    } catch {
      toast.error("Gagal upload foto");
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Judul pekerjaan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const points = pointsForBobot(bobot);
      await base44.entities.IncidentalTask.create({
        title: title.trim(),
        assigned_to_email: user.email,
        assigned_to_name: user.full_name || user.email,
        points,
        bobot,
        due_date: format(new Date(), "yyyy-MM-dd"),
        notes: notes.trim(),
        photo_url: photoUrl || "",
        status: "usulan",
        is_active: true,
        material_status: "ready",
        created_by_email: user.email,
        created_by_name: user.full_name || user.email,
      });
      toast.success("Usulan terkirim — menunggu persetujuan owner/manajer.");
      qc.invalidateQueries({ queryKey: ["incidental-tasks-all"] });
      reset();
      onClose();
    } catch (e) {
      toast.error("Gagal mengajukan: " + (e.message || e));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✍️ Usulkan Tugas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-2">
            Usulan akan ditinjau owner/manajer/admin. Poin baru berlaku setelah disetujui.
          </p>

          {/* Judul */}
          <div className="space-y-1.5">
            <Label htmlFor="u-title">Judul Pekerjaan *</Label>
            <Input
              id="u-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth: Perbaiki pagar kandang W3"
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-1.5">
            <Label htmlFor="u-notes">Keterangan Singkat</Label>
            <Textarea
              id="u-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jelaskan kondisi / mengapa perlu dikerjakan..."
              className="resize-none h-16 text-sm"
              maxLength={300}
            />
          </div>

          {/* Foto kondisi */}
          <div className="space-y-1.5">
            <Label>Foto Kondisi (opsional, dianjurkan)</Label>
            {photoUrl ? (
              <div className="relative w-fit">
                <img src={photoUrl} alt="Kondisi" className="w-24 h-20 rounded-lg object-cover border" />
                <button
                  onClick={() => setPhotoUrl("")}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <label className="flex-1 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-[11px] text-muted-foreground mt-1">📷 Kamera</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
                  />
                </label>
                <label className="flex-1 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-[11px] text-muted-foreground mt-1">🖼️ Galeri</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Bobot = perkiraan waktu pengerjaan */}
          <div className="space-y-1.5">
            <Label>Perkiraan Waktu Pengerjaan *</Label>
            <div className="grid grid-cols-3 gap-2">
              {BOBOT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setBobot(o.value)}
                  className={`rounded-lg border-2 px-2 py-2 text-center transition-all ${
                    bobot === o.value
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-border bg-card text-muted-foreground hover:border-orange-200"
                  }`}
                >
                  <p className="text-xs font-semibold">{o.label}</p>
                  <p className="text-[10px] opacity-80">{o.desc}</p>
                  <p className="text-[10px] font-bold mt-0.5">{o.points} poin</p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Poin ditentukan sistem dari bobot. Owner/manajer bisa mengubahnya saat menyetujui.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading || !title.trim()}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {saving ? "Mengirim..." : "Kirim Usulan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}