import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Camera, TrendingUp, Ruler, Star, StarOff, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PhotoProgressPanel({ tortoise, onClose }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Use photos array from tortoise entity
  const photos = Array.isArray(tortoise.photos) ? [...tortoise.photos] : [];
  const sorted = photos.sort((a, b) => new Date(b.date || b.created_date || 0) - new Date(a.date || a.created_date || 0));

  // Photos with weight for growth chart
  const weightData = photos
    .filter(p => p.weight_grams)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(p => ({
      date: format(new Date(p.date), "d MMM", { locale: id }),
      weight: Number(p.weight_grams),
    }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const newPhoto = {
        url: res.file_url,
        date: new Date().toISOString().split("T")[0],
        weight_grams: tortoise.weight_grams || undefined,
        shell_length_cm: tortoise.shell_length_cm || undefined,
        notes: "",
        is_primary: photos.length === 0,
      };
      const updated = [...photos, newPhoto];
      await base44.entities.Tortoise.update(tortoise.id, { photos: updated });
      qc.invalidateQueries({ queryKey: ["tortoises"] });
      qc.invalidateQueries({ queryKey: ["tortoises-stats"] });
      setUploading(false);
      toast.success("Foto berhasil ditambahkan!");
    } catch (err) {
      setUploading(false);
      toast.error("Gagal upload foto");
    }
  };

  const handleUpdateMetadata = async (idx, updates) => {
    const updated = photos.map((p, i) => i === idx ? { ...p, ...updates } : p);
    await base44.entities.Tortoise.update(tortoise.id, { photos: updated });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    toast.success("Metadata diperbarui!");
  };

  const handleSetPrimary = async (idx) => {
    const updated = photos.map((p, i) => ({ ...p, is_primary: i === idx }));
    await base44.entities.Tortoise.update(tortoise.id, { photos: updated });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    toast.success("Foto utama diperbarui!");
  };

  const handleDelete = async (idx) => {
    const updated = photos.filter((_, i) => i !== idx);
    await base44.entities.Tortoise.update(tortoise.id, { photos: updated });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    setSelectedIdx(null);
    toast.success("Foto dihapus!");
  };

  const handleUpdateFromForm = async (idx, formData) => {
    const updated = photos.map((p, i) => i === idx ? { ...p, ...formData } : p);
    await base44.entities.Tortoise.update(tortoise.id, { photos: updated });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    toast.success("Foto diperbarui!");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Camera className="w-4 h-4 text-primary" />
          Foto Progres Pertumbuhan
        </h3>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Mengupload..." : <><Plus className="w-3.5 h-3.5 mr-1" />Tambah Foto</>}
          </Button>
        </div>
      </div>

      {/* Mini Growth Chart */}
      {weightData.length >= 2 && (
        <div className="bg-muted/30 rounded-xl p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Grafik Pertumbuhan Berat
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weightData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Line type="monotone" dataKey="weight" stroke="#6B9B37" strokeWidth={2} dot={{ r: 4, fill: "#2D5016" }} name="Berat (g)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Photo Grid / Timeline */}
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada foto progres</p>
          <p className="text-xs mt-1">Upload foto pertama untuk mulai tracking pertumbuhan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((photo, idx) => {
            const originalIdx = photos.indexOf(photo);
            return (
              <div key={idx} className={`flex gap-3 p-3 rounded-xl border transition-colors ${selectedIdx === originalIdx ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
                {/* Thumbnail */}
                <button
                  className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border bg-muted"
                  onClick={() => setSelectedIdx(selectedIdx === originalIdx ? null : originalIdx)}
                >
                  <img src={photo.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold">
                      {format(new Date(photo.date), "d MMM yyyy", { locale: id })}
                    </p>
                    {photo.is_primary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-medium">
                        ⭐ Utama
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
                    {photo.weight_grams && (
                      <span className="flex items-center gap-0.5 bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200">
                        ⚖️ {photo.weight_grams}g
                      </span>
                    )}
                    {photo.shell_length_cm && (
                      <span className="flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200">
                        <Ruler className="w-3 h-3" /> {photo.shell_length_cm}cm
                      </span>
                    )}
                  </div>
                  {photo.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic truncate">"{photo.notes}"</p>
                  )}

                  {/* Expanded detail */}
                  {selectedIdx === originalIdx && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      {/* Large preview */}
                      <img src={photo.url} alt={`Foto ${idx + 1}`} className="w-full rounded-lg max-h-60 object-contain bg-muted" />

                      {/* Edit metadata form */}
                      <PhotoEditForm
                        photo={photo}
                        onSave={(data) => handleUpdateFromForm(originalIdx, data)}
                      />

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {!photo.is_primary && (
                          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleSetPrimary(originalIdx)}>
                            <Star className="w-3 h-3" /> Jadikan Foto Utama
                          </Button>
                        )}
                        {photo.is_primary && photos.length > 1 && (
                          <span className="text-xs text-amber-600 flex items-center gap-1 px-2">
                            <StarOff className="w-3 h-3" /> Foto utama saat ini
                          </span>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs text-destructive gap-1 ml-auto" onClick={() => handleDelete(originalIdx)}>
                          <Trash2 className="w-3 h-3" /> Hapus
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhotoEditForm({ photo, onSave }) {
  const [form, setForm] = useState({
    date: photo.date || "",
    weight_grams: photo.weight_grams || "",
    shell_length_cm: photo.shell_length_cm || "",
    notes: photo.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      date: form.date,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
      shell_length_cm: form.shell_length_cm ? Number(form.shell_length_cm) : undefined,
      notes: form.notes,
    });
    setSaving(false);
  };

  // Check if any changes
  const hasChanges =
    form.date !== (photo.date || "") ||
    String(form.weight_grams) !== String(photo.weight_grams || "") ||
    String(form.shell_length_cm) !== String(photo.shell_length_cm || "") ||
    form.notes !== (photo.notes || "");

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2">
        <Label className="text-[10px]">Tanggal Foto</Label>
        <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-[10px]">Berat (gram)</Label>
        <Input type="number" value={form.weight_grams} onChange={e => setForm(p => ({ ...p, weight_grams: e.target.value }))} placeholder="gram" className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-[10px]">Cangkang (cm)</Label>
        <Input type="number" value={form.shell_length_cm} onChange={e => setForm(p => ({ ...p, shell_length_cm: e.target.value }))} placeholder="cm" className="h-8 text-xs" />
      </div>
      <div className="col-span-2">
        <Label className="text-[10px]">Catatan</Label>
        <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="resize-none text-xs" placeholder="Contoh: warna cangkang makin gelap" />
      </div>
      {hasChanges && (
        <div className="col-span-2">
          <Button size="sm" className="w-full text-xs" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      )}
    </div>
  );
}