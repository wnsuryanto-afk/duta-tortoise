import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";

const MORPHS = [
  { value: "normal",      label: "Normal" },
  { value: "over_scute",  label: "Over Scute" },
  { value: "less_scute",  label: "Less Scute" },
  { value: "het_albino",  label: "Het Albino" },
  { value: "ivory",       label: "Ivory" },
  { value: "albino",      label: "Albino" },
];

export default function TortoiseForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState(editData || {
    name: "", code: "", gender: "belum_diketahui", morph: "normal",
    is_proven: false, birth_date: "", weight_grams: "", shell_length_cm: "",
    status: "aktif", enclosure: "", photo_url: "", notes: "",
  });

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("photo_url", file_url);
    setUploadingPhoto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
      shell_length_cm: form.shell_length_cm ? Number(form.shell_length_cm) : undefined,
    };
    if (editData?.id) {
      await base44.entities.Tortoise.update(editData.id, data);
    } else {
      await base44.entities.Tortoise.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["tortoises"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editData?.id ? "Edit Tortoise" : "Tambah Tortoise"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Foto */}
          <div className="space-y-1.5">
            <Label>Foto Tortoise</Label>
            <div className="flex items-center gap-3">
              {form.photo_url ? (
                <div className="relative w-20 h-20">
                  <img src={form.photo_url} alt="foto" className="w-20 h-20 rounded-xl object-cover border" />
                  <button type="button" onClick={() => set("photo_url", "")}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed flex items-center justify-center text-muted-foreground">
                  <Upload className="w-5 h-5" />
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <span className="text-sm text-primary underline hover:no-underline">
                  {uploadingPhoto ? "Mengupload..." : "Pilih foto"}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Kode</Label>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="ST-001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Jenis Kelamin</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jantan">♂ Jantan</SelectItem>
                  <SelectItem value="betina">♀ Betina</SelectItem>
                  <SelectItem value="belum_diketahui">? Belum Diketahui</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jenis / Morph</Label>
              <Select value={form.morph || "normal"} onValueChange={(v) => set("morph", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MORPHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="breeding">Breeding</SelectItem>
                  <SelectItem value="terjual">Terjual</SelectItem>
                  <SelectItem value="mati">Mati</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kandang</Label>
              <Input value={form.enclosure} onChange={(e) => set("enclosure", e.target.value)} placeholder="Kandang A" />
            </div>
          </div>

          {/* Proven checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
            <input
              type="checkbox"
              id="is_proven"
              checked={!!form.is_proven}
              onChange={(e) => set("is_proven", e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <label htmlFor="is_proven" className="text-sm font-medium text-green-800 cursor-pointer">
              ✅ Proven — sudah terbukti kawin / bertelur
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tanggal Lahir</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Berat (gram)</Label>
              <Input type="number" value={form.weight_grams} onChange={(e) => set("weight_grams", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Panjang Cangkang (cm)</Label>
            <Input type="number" step="0.1" value={form.shell_length_cm} onChange={(e) => set("shell_length_cm", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving || uploadingPhoto}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editData?.id ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}