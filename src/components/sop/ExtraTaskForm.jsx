import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function ExtraTaskForm({ open, onClose, user, today, onSaved }) {
  const [form, setForm] = useState({ title: "", description: "" });
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: existingTasks = [] } = useQuery({
    queryKey: ["incidental-tasks-today", today],
    queryFn: () => base44.entities.IncidentalTask.filter({ status: "pending", due_date: today }),
    enabled: open,
    staleTime: 30 * 1000,
  });

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhoto(file_url);
    } catch {}
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const extractCodes = (text) => {
      const matches = (text || "").toLowerCase().match(/([a-z]{1,5}[-]?\d{1,5})/g);
      return matches || [];
    };
    const newCodes = extractCodes(form.title);
    if (newCodes.length > 0) {
      const dup = existingTasks.find(t => {
        const existingCodes = extractCodes(t.title);
        return newCodes.some(c => existingCodes.includes(c));
      });
      if (dup) {
        toast.warning(`Sudah ada tugas "${dup.title}" untuk kura ini hari ini — kerjakan tugas tersebut saja ya`);
        return;
      }
    }
    setSaving(true);
    try {
      await base44.entities.MaintenanceLog.create({
        check_key: `${user.email}__extra__${Date.now()}__${today}`,
        enclosure_id: "extra",
        enclosure_name: "Tugas Tambahan",
        freq: "harian",
        item_id: `extra_${Date.now()}`,
        item_label: form.title.trim(),
        period_key: today,
        is_done: true,
        done_at: format(new Date(), "HH:mm"),
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: 0,
        is_extra: true,
        extra_description: form.description.trim(),
        photo_url: photo || "",
        approval_status: "pending",
      });
      setForm({ title: "", description: "" });
      setPhoto(null);
      onSaved?.();
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="w-5 h-5" /> Tambah Pekerjaan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama Pekerjaan *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="cth: Perbaiki pipa air"
            />
          </div>
          <div>
            <Label>Deskripsi (opsional)</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Detail pekerjaan..."
            />
          </div>
          <div>
            <Label>Foto Dokumentasi (opsional)</Label>
            <div className="mt-1">
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="Foto" className="w-full h-32 object-cover rounded-xl border" />
                  <button
                    onClick={() => setPhoto(null)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    <Camera className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-500">
                    {uploading ? "Mengupload..." : "Pilih / Ambil Foto"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Pekerjaan akan tampil dengan label "Tambahan". Poin ditentukan Owner/Manajer saat approval.
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="w-full gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? "Menyimpan..." : "Simpan Pekerjaan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}