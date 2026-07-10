/**
 * IncidentalTaskForm — dialog untuk owner/admin/manajer membuat tugas insidentil.
 * Template cepat, pilih karyawan, poin, tenggat, catatan, foto acuan (kamera ATAU galeri),
 * kebutuhan barang opsional dengan auto-status Siap Dikerjakan / Menunggu Barang.
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
import { Loader2, Camera, Image as ImageIcon, X, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import MicButton from "@/components/incidental/MicButton";

const TEMPLATES = [
  "Bersihkan sarang semut",
  "Perbaiki kran wastafel",
  "Ganti/cek kran selang rusak",
];

const EMPTY_ITEM = { item_name: "", quantity: 1, unit: "", notes: "", is_available: false };

export default function IncidentalTaskForm({ open, onClose, user }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [points, setPoints] = useState(10);
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requiredItems, setRequiredItems] = useState([]);

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

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items-for-incidental"],
    queryFn: () => base44.entities.WarehouseItem.list(),
    staleTime: 60 * 1000,
  });

  const assignable = users.filter((u) => ["keeper", "kepala_feeder"].includes(u.role));

  const reset = () => {
    setTitle("");
    setAssignedTo("");
    setPoints(10);
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setPhotoUrl("");
    setRequiredItems([]);
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

  const updateItem = (idx, field, value) => {
    setRequiredItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setRequiredItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setRequiredItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Judul tugas wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const cleanItems = requiredItems
        .filter((i) => i.item_name.trim())
        .map(({ item_name, quantity, unit, notes, is_available }) => ({
          item_name: item_name.trim(),
          quantity: Number(quantity) || 1,
          unit: (unit || "").trim(),
          notes: (notes || "").trim(),
          is_available: !!is_available,
        }));

      const materialStatus =
        cleanItems.length === 0 || cleanItems.every((i) => i.is_available)
          ? "ready"
          : "waiting_materials";

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
        required_items: cleanItems,
        material_status: materialStatus,
        created_by_email: user.email,
        created_by_name: user.full_name || user.email,
      });

      // Hanya kirim notifikasi "Tugas Baru" jika siap dikerjakan.
      // Tugas "Menunggu Barang" akan diberi tahu otomatis saat barang tersedia.
      if (materialStatus === "ready") {
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
      }

      toast.success(
        materialStatus === "waiting_materials"
          ? "Tugas dibuat — menunggu barang. Lihat di Daftar Belanja."
          : "Tugas insidentil dibuat & notifikasi terkirim"
      );
      qc.invalidateQueries({ queryKey: ["incidental-tasks-all"] });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-shopping"] });
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

          {/* Foto acuan — Kamera ATAU Galeri */}
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
              <div className="flex gap-2">
                <label className="flex-1 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-[11px] text-gray-500 mt-1">📷 Kamera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
                  />
                </label>
                <label className="flex-1 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-[11px] text-gray-500 mt-1">🖼️ Galeri</span>
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

          {/* Butuh Barang? */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="w-4 h-4" /> Butuh Barang? (opsional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1 text-xs h-7"
              >
                <Plus className="w-3 h-3" /> Tambah Barang
              </Button>
            </div>
            {requiredItems.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Tidak butuh barang khusus — tugas langsung siap dikerjakan karyawan.
              </p>
            ) : (
              <div className="space-y-2">
                {requiredItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border p-2.5 space-y-2 bg-muted/30">
                    <div className="flex gap-2">
                      <Input
                        list="warehouse-items-suggest"
                        placeholder="Nama barang (cth: kran air)"
                        value={item.item_name}
                        onChange={(e) => updateItem(idx, "item_name", e.target.value)}
                        className="h-8 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="w-8 h-8 flex-shrink-0 rounded-md border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Jml"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        list="unit-suggest"
                        placeholder="Satuan"
                        value={item.unit}
                        onChange={(e) => updateItem(idx, "unit", e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Catatan"
                        value={item.notes}
                        onChange={(e) => updateItem(idx, "notes", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.is_available}
                        onChange={(e) => updateItem(idx, "is_available", e.target.checked)}
                        className="rounded"
                      />
                      <span>Barang sudah tersedia?</span>
                    </label>
                  </div>
                ))}
                <datalist id="warehouse-items-suggest">
                  {warehouseItems.map((w) => (
                    <option key={w.id} value={w.name} />
                  ))}
                </datalist>
                <datalist id="unit-suggest">
                  {["pcs", "buah", "batang", "kg", "gram", "liter", "ml", "box", "lembar", "lusin", "set", "roll", "sak"].map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
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