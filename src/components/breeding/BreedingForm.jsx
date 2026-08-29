import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { logActivity } from "@/lib/logActivity";
import { Loader2, Camera, X, ImagePlus, AlertTriangle, Download } from "lucide-react";
import { addDays, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { downloadLabel, generateKodeLabel } from "@/lib/labelUtils";
import TortoiseSearchSelect from "@/components/health/TortoiseSearchSelect";
import { recoveryDaysAgo } from "@/lib/parentHealthUtils";
import { selaraskanEggRecords } from "@/lib/hasilInkubasi";
import { calculateIncubatorEggs as hitungTelurInkubator } from "@/lib/breedingUtils";

export default function BreedingForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewQR, setPreviewQR] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [form, setForm] = useState(editData || {
    male_name: "", female_name: "", male_id: "", female_id: "",
    egg_laying_date: "", egg_count: "",
    estimated_hatch_date_start: "",
    estimated_hatch_date_end: "",
    estimated_hatch_start: "",
    estimated_hatch_end: "",
    estimated_hatch_date: "",
    incubator_name: "",
    tray_number: "",
    status: "bertelur", incubation_temp: "", notes: "", photos: [],
  });

  // Generate QR saat kode kopling berubah
  const previewKode = generateKodeLabel(form.male_name, form.female_name, form.egg_laying_date);
  useEffect(() => {
    if (!previewKode) { setPreviewQR(""); return; }
    import("qrcode").then(QRCode => {
      QRCode.toDataURL(previewKode, { width: 120, margin: 1, color: { dark: "#166534", light: "#ffffff" } },
        (err, url) => { if (!err) setPreviewQR(url); }
      );
    });
  }, [previewKode]);

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 200),
  });

  const { data: incubators = [] } = useQuery({
    queryKey: ["incubators"],
    queryFn: () => base44.entities.Incubator.list(),
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["breeding-form-health"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 200),
  });

  const males = tortoises.filter((t) => t.gender === "jantan" && (t.status === "aktif" || t.status === "breeding"));
  const females = tortoises.filter((t) => t.gender === "betina" && (t.status === "aktif" || t.status === "breeding"));

  // Keterangan "baru sembuh <30 hari" di pemilih kura (membaca HealthRecord).
  const recoveryInfoMap = useMemo(() => {
    const m = {};
    const now = new Date();
    tortoises.forEach((t) => {
      const d = recoveryDaysAgo(t.id, healthRecords, now);
      if (d != null) m[t.id] = d;
    });
    return m;
  }, [tortoises, healthRecords]);

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
    if (!form.incubator_name) e.incubator_name = "Lokasi inkubator wajib dipilih";
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
      estimated_hatch_start: start,
      estimated_hatch_end: end,
      estimated_hatch_date: end,
    }));
  };

  const handleManualEstimateChange = (field, value) => {
    // Field estimasi sekarang read-only, tapi tetap handle untuk safety
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Salinan ketiga dari perhitungan yang sama dulu ada di sini. Sekarang
  // memakai pustaka bersama, supaya formulir dan halaman inkubator tidak bisa
  // lagi menjawab "berapa telur di inkubator ini" dengan cara yang berbeda.
  const hitungTelur = (nama, id) => hitungTelurInkubator(nama, breedings, id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const eggCount = form.egg_count ? Number(form.egg_count) : 0;
    // Baris telur diselaraskan dengan jumlah telur, bukan hanya dibuat saat
    // masih kosong. Dengan aturan lama, mengoreksi jumlah telur pada clutch
    // yang sudah ada tidak pernah ikut mengubah barisnya: isi 10 lalu koreksi
    // jadi 12, dan barisnya tetap 10 selamanya. Dari situlah lencana "Data
    // telur perlu dicek ulang" muncul, dan dari situ pula persentase
    // keberhasilannya jadi bergantung tombol mana yang menutup clutch-nya.
    //
    // Pengurangan hanya membuang baris yang belum dicek — baris yang sudah
    // punya hasil adalah catatan telur yang benar-benar ada.
    const egg_records = selaraskanEggRecords(form.egg_records, eggCount);

    const data = {
      ...form,
      egg_count: eggCount || undefined,
      egg_records,
      // Tautan ke inkubatornya disimpan sebagai id, bukan hanya namanya.
      incubator_id: incubators.find(i => i.name === form.incubator_name)?.id || undefined,
      incubation_temp: form.incubation_temp ? Number(form.incubation_temp) : undefined,
      tray_number: form.tray_number ? Number(form.tray_number) : undefined,
      season_year: form.season_year || (form.egg_laying_date ? new Date(form.egg_laying_date).getFullYear() : new Date().getFullYear()),
      estimated_hatch_start: form.estimated_hatch_start || form.estimated_hatch_date_start || undefined,
      estimated_hatch_end: form.estimated_hatch_end || form.estimated_hatch_date_end || undefined,
    };
    if (editData?.id) {
      await base44.entities.Breeding.update(editData.id, data);
      await logActivity({
        action: "update",
        entity_type: "Breeding",
        entity_id: editData.id,
        entity_name: `${form.male_name} × ${form.female_name}`,
        before: editData,
        after: data,
      });
    } else {
      const created = await base44.entities.Breeding.create(data);
      await logActivity({
        action: "create",
        entity_type: "Breeding",
        entity_id: created.id,
        entity_name: `${form.male_name} × ${form.female_name}`,
        notes: "Data breeding baru ditambahkan",
      });
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
                <TortoiseSearchSelect
                  tortoises={males}
                  value={form.male_id}
                  onChange={handleMaleSelect}
                  showKandangFilter
                  showHealthWarning
                  recoveryInfoMap={recoveryInfoMap}
                  placeholder="Pilih jantan"
                />
              ) : (
                <Input value={form.male_name} onChange={(e) => handleChange("male_name", e.target.value)} placeholder="Nama jantan" className={errors.male_name ? "border-red-500" : ""} />
              )}
              {errors.male_name && <p className="text-xs text-red-500">{errors.male_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Betina <span className="text-red-500">*</span></Label>
              {females.length > 0 ? (
                <TortoiseSearchSelect
                  tortoises={females}
                  value={form.female_id}
                  onChange={handleFemaleSelect}
                  showKandangFilter
                  showHealthWarning
                  recoveryInfoMap={recoveryInfoMap}
                  placeholder="Pilih betina"
                />
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

          {/* Lokasi Inkubator - WAJIB - DINAMIS dari entity Incubator */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Lokasi Inkubator <span className="text-red-500">*</span></Label>
              <Select value={form.incubator_name || ""} onValueChange={v => { handleChange("incubator_name", v); }}>
                <SelectTrigger className={errors.incubator_name ? "border-red-500" : ""}><SelectValue placeholder="Pilih inkubator..." /></SelectTrigger>
                <SelectContent>
                  {incubators.filter(i => i.is_active !== false).map(inc => {
                    const eggs = hitungTelur(inc.name, inc.id);
                    return (
                      <SelectItem key={inc.id} value={inc.name}>
                        {inc.name} ({eggs}/{inc.capacity_eggs || "∞"})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.incubator_name && <p className="text-xs text-red-500">{errors.incubator_name}</p>}
              {form.incubator_name && (() => {
                const inc = incubators.find(i => i.name === form.incubator_name);
                const calculatedEggs = hitungTelur(form.incubator_name, inc?.id);
                if (inc && inc.capacity_eggs && calculatedEggs >= inc.capacity_eggs) {
                  return (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      ⚠️ Inkubator penuh. Pilih lain.
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Tray <span className="text-muted-foreground font-normal text-xs">(opsional)</span></Label>
              <Input type="number" min="1" value={form.tray_number} onChange={(e) => handleChange("tray_number", e.target.value)} placeholder="cth: 1" />
            </div>
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

          {/* Preview Label Telur - muncul saat data cukup */}
          {form.male_name && form.female_name && form.egg_laying_date && (() => {
            const kode = previewKode;
            const d = new Date(form.egg_laying_date);
            const tglStr = d.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
            const hatch = new Date(d.getTime()+90*86400000).toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
            const male = males.find(t => t.id === form.male_id);
            const female = females.find(t => t.id === form.female_id);
            return (
              <div className="border-2 border-green-200 rounded-xl overflow-hidden bg-gradient-to-br from-green-50 to-yellow-50">
                <div className="bg-gradient-to-r from-green-800 to-green-600 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐢</span>
                    <div>
                      <div className="text-white font-bold text-xs">DUTA TORTOISE</div>
                      <div className="text-green-200 text-[9px]">Label Kotak Telur</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-white/20 rounded-full px-2 py-0.5 text-white text-[9px] font-bold">{form.incubator_name || "—"}</div>
                    <div className="text-green-200 text-[9px] mt-0.5">{tglStr}</div>
                  </div>
                </div>
                <div className="bg-yellow-100 border-b border-dashed border-yellow-400 px-3 py-1 flex justify-between items-center">
                  <span className="text-[9px] text-yellow-800 font-semibold">🔖 KODE KOPLING</span>
                  <span className="text-[10px] font-black text-yellow-900">{kode}</span>
                </div>
                <div className="px-3 py-2 flex gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-1.5">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                      <div className="text-[8px] text-blue-600 font-bold">♂ Jantan</div>
                      <div className="text-sm font-black text-blue-900 leading-tight">{form.male_name}</div>
                      <div className="text-[8px] text-blue-500">📍 {male?.enclosure || "—"}</div>
                    </div>
                    <div className="bg-pink-50 border border-pink-200 rounded-lg px-2 py-1.5">
                      <div className="text-[8px] text-pink-600 font-bold">♀ Betina</div>
                      <div className="text-sm font-black text-pink-900 leading-tight">{form.female_name}</div>
                      <div className="text-[8px] text-pink-500">📍 {female?.enclosure || "—"}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg px-2 py-1">
                      <div className="text-[8px] text-muted-foreground">🥚 Jumlah Telur</div>
                      <div className="text-[10px] font-bold text-yellow-800">{form.egg_count ? form.egg_count+" butir" : "—"}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg px-2 py-1">
                      <div className="text-[8px] text-muted-foreground">📅 Bertelur</div>
                      <div className="text-[10px] font-bold text-green-800">{tglStr}</div>
                    </div>
                    <div className="col-span-2 bg-orange-50 rounded-lg px-2 py-1">
                      <div className="text-[8px] text-muted-foreground">🐣 Est. Menetas</div>
                      <div className="text-[10px] font-bold text-orange-800">{hatch}</div>
                    </div>
                  </div>
                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
                    {previewQR
                      ? <img src={previewQR} width={72} height={72} className="rounded-lg border-2 border-green-600" alt="QR" />
                      : <div className="w-[72px] h-[72px] rounded-lg border-2 border-green-200 bg-green-50 flex items-center justify-center text-[9px] text-muted-foreground">QR...</div>
                    }
                    <div className="text-[7px] bg-green-800 text-white rounded-full px-2 py-0.5 font-bold">F2 · CB</div>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <Button
                    type="button"
                    onClick={() => downloadLabel({
                      maleCode: form.male_name,
                      femaleCode: form.female_name,
                      maleEnclosure: male?.enclosure || "",
                      femaleEnclosure: female?.enclosure || "",
                      tglBertelur: form.egg_laying_date,
                      eggCount: form.egg_count,
                      inkubatorName: form.incubator_name,
                    })}
                    className="w-full bg-green-700 hover:bg-green-600 text-white text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Label (PNG)
                  </Button>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving || !form.male_name?.trim() || !form.female_name?.trim() || !form.egg_laying_date || !form.egg_count || !form.status || !form.incubator_name}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editData?.id ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}