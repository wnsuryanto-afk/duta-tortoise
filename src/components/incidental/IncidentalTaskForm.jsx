/**
 * IncidentalTaskForm — dialog untuk owner/admin/manajer membuat tugas insidentil.
 * Template cepat, pilih karyawan, poin, tenggat, catatan, foto acuan.
 * Setelah simpan: kirim notifikasi ke karyawan yang ditugaskan.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import MicButton from "@/components/incidental/MicButton";

const TEMPLATES = [
  "Bersihkan sarang semut",
  "Perbaiki kran wastafel",
  "Ganti/cek kran selang rusak",
];

export default function IncidentalTaskForm({ open, onClose, user }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState(""); // "" = siapa saja
  const [points, setPoints] = useState(10);
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Input suara untuk kolom Judul & Catatan (Web Speech API, id-ID)
  const titleVoice = useVoiceInput({
    onResult: (text) => {
      if (text === "__MIC_DENIED__") {
        toast.error("Izin mikrofon ditolak. Aktifkan di pengaturan browser untuk pakai input suara.");
        return;
      }
      setTitle((prev) => (prev ? prev.replace(/\s+$/, "") + " " + text : text));
    },
  });
  const notesVoice = useVoiceInput({
    onResult: (text) => {
      if (text === "__MIC_DENIED__") {
        toast.error("Izin mikrofon ditolak. Aktifkan di pengaturan browser untuk pakai input suara.");
        return;
      }
      setNotes((prev) => (prev ? prev.replace(/\s+$/, "") + " " + text : text));
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const assignable = users.filter((u) => ["keeper", "kepala_feeder"].includes(u.role));

  const reset = () => {
    setTitle("");
    setAssignedTo("");
    setPoints(10);
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
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
      toast.error("Judul tugas wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const assignee = assignable.find((u) => u.email === assignedTo);
      const created = await base44.entities.IncidentalTask.create({
        title: title.trim(),
        assigned_to_email: assignedTo || "",
        assigned_to_name: assignee?.full_name || (assignedTo ? "" : "Siapa saja"),
        points: Number(points) || 0,
        due_date: dueDate,
        notes: notes.trim(),
        photo_url: photoUrl || "",
        status: "pending",
        is_active: true,
        created_by_email: user.email,
        created_by_name: user.full_name || user.email,
      });

      // Kirim notifikasi ke karyawan yang ditugaskan
      const targets = assignedTo ? [assignedTo] : assignable.map((u) => u.email);
      const nowIso = new Date().toISOString();
      for (const email of targets) {
        await base44.entities.Notification.create({
          recipient_email: email,
          title: "📌 Tugas Baru dari Owner",
          message: `${title.trim()} — ${Number(points) || 0} poin, tenggat ${dueDate}`,
          type: "info",
          priority: "sedang",
          category: "sistem",
          action_label: "Lihat Tugas",
          action_url: "/",
          related_entity_id: created.id,
          related_entity_type: "IncidentalTask",
          is_read: false,
          is_dismissed: false,
          created_at: nowIso,
        });
      }

      toast.success("Tugas insidentil dibuat & notifikasi terkirim");
      qc.invalidateQueries({ queryKey: ["incidental-tasks-all"] });
      reset();
      onClose();
    } catch (e) {
      toast.error("Gagal membuat: " + (e.message || e));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📌 Buat Tugas Insidentil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template cepat */}
          <div>
            <Label className="text-xs">Template Cepat</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTitle(t)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 active:scale-95 transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Judul */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="title">Judul Tugas *</Label>
              <MicButton
                supported={titleVoice.supported}
                listening={titleVoice.listening}
                interim={titleVoice.interim}
                onToggle={titleVoice.toggle}
                label="🎤 Dikte judul"
              />
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth: Bersihkan sarang semut di W3"
            />
            <p className="text-[11px] text-muted-foreground">
              Ketik manual atau dikte via mikrofon. Hasil suara bisa diedit sebelum simpan.
            </p>
          </div>

          {/* Karyawan */}
          <div className="space-y-1.5">
            <Label htmlFor="assign">Ditugaskan ke</Label>
            <select
              id="assign"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Siapa saja (keeper & kepala feeder)</option>
              {assignable.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.full_name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Poin & Tenggat */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="points">Poin</Label>
              <Input
                id="points"
                type="number"
                min="0"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due">Tenggat</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="notes">Catatan / Instruksi (opsional)</Label>
              <MicButton
                supported={notesVoice.supported}
                listening={notesVoice.listening}
                interim={notesVoice.interim}
                onToggle={notesVoice.toggle}
                label="🎤 Dikte catatan"
              />
            </div>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail singkat pekerjaan..."
              className="resize-none h-16 text-sm"
              maxLength={300}
            />
          </div>

          {/* Foto acuan */}
          <div className="space-y-1.5">
            <Label>Foto Acuan (opsional)</Label>
            {photoUrl ? (
              <div className="relative w-fit">
                <img src={photoUrl} alt="Acuan" className="w-24 h-20 rounded-lg object-cover border" />
                <button
                  onClick={() => setPhotoUrl("")}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="w-24 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400">
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-gray-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading || !title.trim()}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {saving ? "Menyimpan..." : "Buat & Beri Tahu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}