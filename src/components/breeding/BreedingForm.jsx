import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Camera, X, ImagePlus, AlertTriangle } from "lucide-react";
import { addDays, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function BreedingForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 200),
  });

  const { data: incubators = [] } = useQuery({
    queryKey: ["incubators"],
    queryFn: () => base44.entities.Incubator.list(),
  });

  const males = tortoises.filter((t) => t.gender === "jantan" && (t.status === "aktif" || t.status === "breeding"));
  const females = tortoises.filter((t) => t.gender === "betina" && (t.status === "aktif" || t.status === "breeding"));

  const [form, setForm] = useState(editData || {
    male_name: "", female_name: "", male_id: "", female_id: "",
    egg_laying_date: "", egg_count: "",
    estimated_hatch_date_start: "",
    estimated_hatch_date_end: "",
    estimated_hatch_date: "",
    incubator_name: "",
    status: "bertelur", incubation_temp: "", notes: "", photos: [],
  });

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, photos: [...(prev.photos || []), { url: file_url }] }));
    setUploadingPhoto(false);
  };

  const removePhoto = (idx) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const handleChange = (field, value) => { setForm((prev) => ({ ...prev, [field]: value })); setErrors(e => ({ ...e, [field]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.male_name?.trim()) e.male_name = "Tortoise jantan wajib dipilih";
    if (!form.female_name?.trim()) e.female_name = "Tortoise betina wajib dipilih";
    if (!form.egg_laying_date) e.egg_laying_date = "Tanggal bertelur wajib diisi";
    if (!form.egg_count) e.egg_count = "Jumlah telur wajib diisi";
    if (!form.status) e.status = "Status wajib dipilih";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleMaleSelect = (id) => {
    const male = tortoises.find((t) => t.id === id);
    setForm((prev) => ({ ...prev, male_id: id, male_name: male?.name || "" }));
    // Auto-proven jika belum proven
    if (male && !male.is_proven) {
      queryClient.setQueryData(["tortoises"], (old) =>
        old?.map(t => t.id === id ? { ...t, is_proven: true } : t)
      );
      base44.entities.Tortoise.update(id, { is_proven: true });
    }
  };

  const handleFemaleSelect = (id) => {
    const female = tortoises.find((t) => t.id === id);
    setForm((prev) => ({ ...prev, female_id: id, female_name: female?.name || "" }));
    // Auto-proven jika belum proven
    if (female && !female.is_proven) {
      queryClient.setQueryData(["tortoises"], (old) =>
        old?.map(t => t.id === id ? { ...t, is_proven: true } : t)
      );
      base44.entities.Tortoise.update(id, { is_proven: true });
    }
  };

  const handleEggLayingDate = (value) => {
    let start = "";
    let end = "";
    if (value) {
      start = format(addDays(new Date(value), 80), "yyyy-MM-dd");
      end = format(addDays(new Date(value), 105), "yyyy-MM-dd");
    }
    setForm((prev) => ({
      ...prev,
      egg_laying_date: value,
      estimated_hatch_date_start: start,
      estimated_hatch_date_end: end,
      estimated_hatch_date: end,
    }));
  };

  const handleManualEstimateChange = (field, value) => {
    // Field estimasi sekarang read-only, tapi tetap handle untuk safety
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const data = {
      ...form,
      egg_count: form.egg_count ? Number(form.egg_count) : undefined,
      incubation_temp: form.incubation_temp ? Number(form.incubation_temp) : undefined,
      season_year: form.season_year || (form.egg_laying_date ? new Date(form.egg_laying_date).getFullYear() : new Date().getFullYear()),
    };
    if (editData?.id) {
      await base44.entities.Breeding.update(editData.id, data);
    } else {
      await base44.entities.Breeding.create(data);
    }

    // Update current_eggs di inkubator jika dipilih
    // NOTE: current_eggs sekarang dihitung otomatis dari Breeding, tapi kita tetap update untuk backward compatibility
    if (form.incubator_name && form.egg_count) {
      const inc = incubators.find(i => i.name === form.incubator_name);
      if (inc) {
        // Hapus logic update current_eggs karena sekarang dihitung otomatis dari Breeding
        queryClient.invalidateQueries({ queryKey: ["incubators"] });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["breedings"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editData?.id ? "Edit Pembiakan" : "Tambah Pembiakan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Jantan <span className="text-red-500">*</span></Label>
              {males.length > 0 ? (
                <Select value={form.male_id} onValueChange={handleMaleSelect}>
                  <SelectTrigger className={errors.male_name ? "border-red-500" : ""}><SelectValue placeholder="Pilih jantan" /></SelectTrigger>
                  <SelectContent>
                    {males.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.male_name} onChange={(e) => handleChange("male_name", e.target.value)} placeholder="Nama jantan" className={errors.male_name ? "border-red-500" : ""} />
              )}
              {errors.male_name && <p className="text-xs text-red-500">{errors.male_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Betina <span className="text-red-500">*</span></Label>
              {females.length > 0 ? (
                <Select value={form.female_id} onValueChange={handleFemaleSelect}>
                  <SelectTrigger className={errors.female_name ? "border-red-500" : ""}><SelectValue placeholder="Pilih betina" /></SelectTrigger>
                  <SelectContent>
                    {females.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.female_name} onChange={(e) => handleChange("female_name", e.target.value)} placeholder="Nama betina" className={errors.female_name ? "border-red-500" : ""} />
              )}
              {errors.female_name && <p className="text-xs text-red-500">{errors.female_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status <span className="text-red-500">*</span></Label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bertelur">Bertelur</SelectItem>
                  <SelectItem value="inkubasi">Inkubasi</SelectItem>
                  <SelectItem value="menetas">Menetas</SelectItem>
                  <SelectItem value="gagal">Gagal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Suhu Inkubasi (°C)</Label>
              <Input type="number" step="0.1" value={form.incubation_temp} onChange={(e) => handleChange("incubation_temp", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tanggal Bertelur <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.egg_laying_date} onChange={(e) => handleEggLayingDate(e.target.value)} className={errors.egg_laying_date ? "border-red-500" : ""} />
              {errors.egg_laying_date && <p className="text-xs text-red-500">{errors.egg_laying_date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah Telur <span className="text-red-500">*</span></Label>
              <Input type="number" value={form.egg_count} onChange={(e) => handleChange("egg_count", e.target.value)} className={errors.egg_count ? "border-red-500" : ""} />
              {errors.egg_count && <p className="text-xs text-red-500">{errors.egg_count}</p>}
            </div>
          </div>

          {/* Perkiraan menetas range 80-105 hari - AUTO READ ONLY */}
          {(form.estimated_hatch_date_start || form.estimated_hatch_date_end) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-medium text-amber-800 mb-1">🥚 Perkiraan masa penetasan (80–105 hari):</p>
              <p className="text-sm font-bold text-amber-900">
                {form.estimated_hatch_date_start && format(new Date(form.estimated_hatch_date_start), "d MMM yyyy", { locale: idLocale })}
                {" s/d "}
                {form.estimated_hatch_date_end && format(new Date(form.estimated_hatch_date_end), "d MMM yyyy", { locale: idLocale })}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estimasi Menetas Awal <span className="text-muted-foreground font-normal">(+80 hari)</span></Label>
              <Input type="date" value={form.estimated_hatch_date_start} onChange={(e) => handleManualEstimateChange("estimated_hatch_date_start", e.target.value)} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estimasi Menetas Akhir <span className="text-muted-foreground font-normal">(+105 hari)</span></Label>
              <Input type="date" value={form.estimated_hatch_date_end} onChange={(e) => handleManualEstimateChange("estimated_hatch_date_end", e.target.value)} disabled />
            </div>
          </div>

          {/* Lokasi Inkubator */}
          <div className="space-y-1.5">
            <Label>Lokasi Inkubator</Label>
            <Select value={form.incubator_name || ""} onValueChange={v => handleChange("incubator_name", v || "")}>
              <SelectTrigger><SelectValue placeholder="Pilih inkubator..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Belum ditentukan</SelectItem>
                {incubators.filter(i => i.is_active !== false).map(inc => {
                  const isFull = inc.capacity_eggs && inc.current_eggs >= inc.capacity_eggs;
                  return (
                    <SelectItem key={inc.id} value={inc.name} disabled={isFull}>
                      {inc.name} (terisi: {inc.current_eggs || 0}/{inc.capacity_eggs || "∞"}) {isFull ? "— PENUH" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {form.incubator_name && (() => {
              const inc = incubators.find(i => i.name === form.incubator_name);
              if (inc && inc.capacity_eggs && inc.current_eggs >= inc.capacity_eggs) {
                return (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    ⚠️ Inkubator sudah penuh. Pilih inkubator lain.
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Foto Dokumentasi */}
          <div className="space-y-1.5">
            <Label>Foto Dokumentasi</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(form.photos || []).map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ImagePlus className="w-5 h-5 mb-1" /><span className="text-[10px]">Galeri</span></>}
                </button>
                <button type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Camera className="w-5 h-5 mb-1" /><span className="text-[10px]">Kamera</span>
                </button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => handlePhotoUpload(e.target.files?.[0])} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => handlePhotoUpload(e.target.files?.[0])} />
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving || !form.male_name?.trim() || !form.female_name?.trim() || !form.egg_laying_date || !form.egg_count || !form.status}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editData?.id ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}