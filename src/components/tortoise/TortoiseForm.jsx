import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import TortoisePhotoGallery from "./TortoisePhotoGallery";
import { getMissingFields } from "@/lib/incompleteChecks";
import DeathRecordModal from "./DeathRecordModal";
import SickModal from "./SickModal";
import RecoveryModal from "./RecoveryModal";
import { logActivity } from "@/lib/logActivity";

const SPECIES_LIST = [
  { value: "sulcata",     label: "Sulcata (African Spurred)" },
  { value: "red_foot",    label: "Red Foot" },
  { value: "leopard",     label: "Leopard" },
  { value: "aldabra",     label: "Aldabra" },
  { value: "russian",     label: "Russian (Horsfield)" },
  { value: "hermann",     label: "Hermann" },
  { value: "greek",       label: "Greek (Spur-thighed)" },
  { value: "indian_star", label: "Indian Star" },
  { value: "lainnya",     label: "Lainnya" },
];

const SPECIES_PARAMS = {
  sulcata:     { basking_temp_min: 40, basking_temp_max: 45, ambient_temp_min: 28, ambient_temp_max: 32, humidity_min: 40, humidity_max: 60, adult_size_cm: 70, weighing_interval_adult_days: 90 },
  red_foot:    { basking_temp_min: 35, basking_temp_max: 38, ambient_temp_min: 25, ambient_temp_max: 30, humidity_min: 70, humidity_max: 80, adult_size_cm: 32, weighing_interval_adult_days: 90 },
  leopard:     { basking_temp_min: 38, basking_temp_max: 42, ambient_temp_min: 25, ambient_temp_max: 30, humidity_min: 40, humidity_max: 60, adult_size_cm: 55, weighing_interval_adult_days: 90 },
  aldabra:     { basking_temp_min: 35, basking_temp_max: 40, ambient_temp_min: 28, ambient_temp_max: 32, humidity_min: 60, humidity_max: 80, adult_size_cm: 100, weighing_interval_adult_days: 180 },
};

const MORPHS = [
  { value: "normal",              label: "Normal" },
  { value: "het_albino",          label: "Het. Albino (Carrier)" },
  { value: "het_caramel_albino",  label: "Het. Caramel Albino" },
  { value: "het_hypo",            label: "Het. Hypo" },
  { value: "het_ivory",           label: "Het. Ivory" },
  { value: "double_het",          label: "Double Het (Multi-carrier)" },
  { value: "albino",              label: "Albino" },
  { value: "ivory",               label: "Ivory" },
  { value: "caramel_albino",      label: "Caramel Albino" },
  { value: "hypo",                label: "Hypo" },
  { value: "golden_greek",        label: "Golden Greek" },
  { value: "piebald",             label: "Piebald" },
  { value: "genetic_stripe",      label: "Genetic Stripe" },
  { value: "high_yellow",         label: "High Yellow" },
  { value: "dark",                label: "Dark" },
  { value: "paradox",             label: "Paradox" },
  { value: "anerythristic",       label: "Anerythristic" },
  { value: "axanthic",            label: "Axanthic" },
  { value: "melanistic",          label: "Melanistic" },
  { value: "mix",                 label: "Mix (persilangan)" },
  { value: "unknown",             label: "Unknown (belum diketahui)" },
];

const SHELL_TYPES = [
  { value: "normal",      label: "Normal (standar)" },
  { value: "less_scute",  label: "Less Scute (kekurangan sisik)" },
  { value: "over_scute",  label: "Over Scute (kelebihan sisik)" },
  { value: "pyramiding",  label: "Pyramiding (mengerucut)" },
  { value: "smooth",      label: "Smooth (mulus)" },
  { value: "wavy",        label: "Wavy (bergelombang)" },
  { value: "irregular",   label: "Irregular (tidak beraturan)" },
];

// Migrasi: jika editData hanya punya photo_url (string lama), ubah ke array
function initPhotos(editData) {
  if (!editData) return [];
  if (Array.isArray(editData.photos)) return editData.photos;
  if (editData.photo_url) return [{ url: editData.photo_url }];
  return [];
}

// ── Validasi biologis ──────────────────────────────────────────
function getAgeCategory(birthDate) {
  if (!birthDate) return null;
  const ageMonths = (new Date() - new Date(birthDate)) / (1000 * 60 * 60 * 24 * 30.44);
  const ageYears = ageMonths / 12;
  if (ageYears < 1) return "baby";
  if (ageYears < 3) return "juvenile";
  if (ageYears < 5) return "sub_adult";
  return "dewasa";
}

function checkBioWarnings(form) {
  const warnings = [];
  const weight = form.weight_grams ? Number(form.weight_grams) : null;
  const shell = form.shell_length_cm ? Number(form.shell_length_cm) : null;
  const ageGroup = getAgeCategory(form.birth_date);

  if (weight !== null) {
    if (weight <= 0) return [{ field: "weight", msg: "Berat tidak boleh 0 atau negatif", blocking: true }];
    if (ageGroup === "baby" && weight > 2000)
      warnings.push({ field: "weight", msg: `Berat ${weight}g (${(weight/1000).toFixed(1)}kg) tidak wajar untuk baby (<1 thn). Wajar: <2kg` });
    else if (ageGroup === "juvenile" && weight > 15000)
      warnings.push({ field: "weight", msg: `Berat ${(weight/1000).toFixed(1)}kg tidak wajar untuk juvenile (1-3 thn). Wajar: <15kg` });
    else if (ageGroup === "sub_adult" && weight > 30000)
      warnings.push({ field: "weight", msg: `Berat ${(weight/1000).toFixed(1)}kg tidak wajar untuk sub-adult (3-5 thn). Wajar: <30kg` });
    else if (ageGroup === "dewasa" && weight > 100000)
      warnings.push({ field: "weight", msg: `Berat ${(weight/1000).toFixed(1)}kg sangat tidak wajar untuk dewasa. Wajar: <100kg` });
  }

  if (shell !== null && ageGroup) {
    const species = form.species || "sulcata";
    if (ageGroup === "baby" && shell > 15)
      warnings.push({ field: "shell", msg: `Panjang cangkang ${shell}cm tidak wajar untuk baby. Wajar: <15cm` });
    else if (ageGroup === "juvenile" && shell > 35)
      warnings.push({ field: "shell", msg: `Panjang cangkang ${shell}cm tidak wajar untuk juvenile. Wajar: <35cm` });
    else if (ageGroup === "dewasa" && species === "aldabra" && shell > 120)
      warnings.push({ field: "shell", msg: `Panjang cangkang ${shell}cm tidak wajar untuk dewasa aldabra. Wajar: <120cm` });
    else if (ageGroup === "dewasa" && species !== "aldabra" && shell > 85)
      warnings.push({ field: "shell", msg: `Panjang cangkang ${shell}cm tidak wajar untuk dewasa ${species}. Wajar: <85cm` });
  }

  return warnings;
}

export default function TortoiseForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [bioWarnings, setBioWarnings] = useState([]);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [photos, setPhotos] = useState(initPhotos(editData));
  const [thumbnailUrl, setThumbnailUrl] = useState(editData?.photo_url || (initPhotos(editData)[0]?.url || ""));
  const [enclosureOptions, setEnclosureOptions] = useState([]);
  const [showDeathModal, setShowDeathModal]   = useState(false);
  const [showSickModal, setShowSickModal]     = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [pendingStatus, setPendingStatus]     = useState(null); // status yang sedang dalam proses modal
  const [form, setForm] = useState(editData || {
    name: "", code: "", gender: "", morph: "normal",
    species: "sulcata", species_params: SPECIES_PARAMS["sulcata"],
    source: "",
    is_proven: false, proven_year: "", birth_date: "", purchase_date: "", weight_grams: "", shell_length_cm: "",
    status: "aktif", enclosure: "", notes: "",
  });

  const set = (field, value) => { setForm((p) => ({ ...p, [field]: value })); setErrors(e => ({ ...e, [field]: "" })); };
  const setSpecies = (sp) => {
    const params = SPECIES_PARAMS[sp] || null;
    setForm(p => ({ ...p, species: sp, species_params: params }));
  };

  // Load enclosure options from entity
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures-for-dropdown"],
    queryFn: () => base44.entities.Enclosure.list(),
  });

  useEffect(() => {
    setEnclosureOptions(enclosures.map(e => e.name).filter(Boolean));
  }, [enclosures]);

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Nama tortoise wajib diisi";
    if (!form.code?.trim()) e.code = "Kode identifikasi wajib diisi";
    // Gender: hanya wajib jika cangkang >= 20 cm
    const shellLen = form.shell_length_cm ? Number(form.shell_length_cm) : 0;
    const isSmall = shellLen < 20 || form.age_category === "baby";
    if (!isSmall && (!form.gender || form.gender === "belum_diketahui")) e.gender = "Jenis kelamin wajib dipilih";
    if (!form.morph) e.morph = "Morph wajib dipilih";
    if (!form.source || form.source === "tidak_diketahui") e.source = "Asal kura-kura wajib dipilih";
    if (!form.status) e.status = "Status wajib dipilih";
    if (!form.enclosure) e.enclosure = "Kandang wajib dipilih";
    if (!form.weight_grams) e.weight_grams = "Berat wajib diisi";
    if (!form.shell_length_cm) e.shell_length_cm = "Panjang cangkang wajib diisi";
    if (!form.purchase_date && !form.birth_date) e.purchase_date = "Tanggal masuk/lahir wajib diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Validasi strict hanya untuk CREATE, untuk EDIT data lama lebih lenient
  const isOldData = !!editData?.id;

  const handlePhotosChange = (newPhotos, newThumb) => {
    setPhotos(newPhotos);
    setThumbnailUrl(newThumb || "");
  };

  // Intercept status changes for special modals
  const handleStatusChange = (newStatus) => {
    const prevStatus = form.status;
    if (newStatus === "mati" && !editData?.death_date) {
      // Jika belum pernah mati, tampilkan modal kematian
      setPendingStatus(newStatus);
      setShowDeathModal(true);
      return;
    }
    set("status", newStatus);
  };

  const handleDeathSaved = (deathData) => {
    setForm(p => ({ ...p, status: "mati", is_currently_sick: false, previous_status: p.status, last_status_change: new Date().toISOString().split("T")[0], ...deathData }));
    setShowDeathModal(false);
    setPendingStatus(null);
  };

  const handleSickSaved = (healthExtra) => {
    setForm(p => ({
      ...p,
      is_currently_sick: true,
      status: "sakit",
      previous_status: p.status !== "sakit" ? p.status : p.previous_status,
      last_status_change: new Date().toISOString().split("T")[0],
      _pendingHealthData: healthExtra,
    }));
    setShowSickModal(false);
  };

  const handleRecoveryConfirm = (withCheckup) => {
    setForm(p => ({
      ...p,
      is_currently_sick: false,
      status: p.previous_status || "aktif",
      last_status_change: new Date().toISOString().split("T")[0],
      _pendingRecovery: withCheckup,
    }));
    setShowRecoveryModal(false);
  };

  const handleSickToggle = (checked) => {
    if (checked && !form.is_currently_sick) {
      setShowSickModal(true);
    } else if (!checked && form.is_currently_sick) {
      setShowRecoveryModal(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validasi STRICT hanya untuk CREATE, untuk EDIT data lama lebih lenient
    if (!isOldData && !validate()) return;
    
    // Untuk EDIT data lama, validasi hanya field-field dasar
    if (isOldData) {
      const basicErrors = {};
      if (!form.name?.trim()) basicErrors.name = "Nama wajib diisi";
      // Gender: hanya wajib jika cangkang >= 20 cm
      const shellLen = form.shell_length_cm ? Number(form.shell_length_cm) : 0;
      const isSmall = shellLen < 20 || form.age_category === "baby";
      if (!isSmall && !form.gender) basicErrors.gender = "Jenis kelamin wajib dipilih";
      if (!form.status) basicErrors.status = "Status wajib dipilih";
      if (Object.keys(basicErrors).length > 0) {
        setErrors(basicErrors);
        return;
      }
    }

    // Cek validasi biologis
    const warnings = checkBioWarnings(form);
    const hasBlocking = warnings.some(w => w.blocking);
    if (hasBlocking) {
      const blockW = warnings.filter(w => w.blocking);
      setErrors(e => ({ ...e, weight_grams: blockW[0]?.msg || "Data tidak valid" }));
      return;
    }
    if (warnings.length > 0) {
      setBioWarnings(warnings);
      setShowWarningConfirm(true);
      setPendingSubmitData(true); // flag: sudah siap submit setelah konfirm
      return;
    }

    await doSave();
  };

  const handleSaveAnyway = async () => {
    setShowWarningConfirm(false);
    setBioWarnings([]);
    await doSave(true);
  };

  const doSave = async (withWarning = false) => {
    setSaving(true);
    const newWeight = form.weight_grams ? Number(form.weight_grams) : undefined;
    const newLength = form.shell_length_cm ? Number(form.shell_length_cm) : undefined;
    // Auto-create HealthRecord jika sakit baru
    const today = new Date().toISOString().split("T")[0];
    if (form._pendingHealthData && editData?.id) {
      try {
        const existing = await base44.entities.HealthRecord.filter({ tortoise_id: editData.id, date: today, type: "sakit", source: "auto_sick" });
        if (!existing || existing.length === 0) {
          await base44.entities.HealthRecord.create({
            tortoise_id: editData.id,
            tortoise_name: form.name,
            date: today,
            type: "sakit",
            source: "manual",
            ...form._pendingHealthData,
          });
          queryClient.invalidateQueries({ queryKey: ["health-records-all"] });
        }
      } catch (e) { console.warn("Auto health record gagal:", e); }
    }

    // Auto-create HealthRecord recovery jika diperlukan
    if (form._pendingRecovery && editData?.id) {
      try {
        await base44.entities.HealthRecord.create({
          tortoise_id: editData.id,
          tortoise_name: form.name,
          date: today,
          type: "checkup",
          source: "auto_recovery",
          description: "Pulih dari sakit",
        });
        queryClient.invalidateQueries({ queryKey: ["health-records-all"] });
      } catch (e) { console.warn("Auto recovery health record gagal:", e); }
    }

    // Hapus field internal sebelum simpan
    const { _pendingHealthData, _pendingRecovery, ...cleanForm } = form;

    const data = {
      ...cleanForm,
      weight_grams: newWeight,
      shell_length_cm: newLength,
      photos: photos,
      photo_url: thumbnailUrl || (photos[0]?.url || ""),
    };

    let tortoiseId = editData?.id;
    const oldEnclosure = editData?.enclosure || "";
    const newEnclosureName = data.enclosure || "";
    const oldData = editData ? { ...editData } : null;
    const nameChanged = editData?.id && editData?.name && editData.name !== cleanForm.name;
    if (editData?.id) {
      await base44.entities.Tortoise.update(editData.id, data);
      // Sinkronisasi nama ke semua entitas terkait jika nama berubah
      if (nameChanged) {
        base44.functions.invoke("syncTortoiseName", {
          tortoise_id: editData.id,
          new_name: form.name,
        });
      }
      await logActivity({
        action: "update",
        entity_type: "Tortoise",
        entity_id: editData.id,
        entity_name: form.name,
        before: oldData,
        after: data,
        notes: `Status: ${oldData?.status} → ${data.status}`,
      });
    } else {
      const created = await base44.entities.Tortoise.create(data);
      tortoiseId = created.id;
      await logActivity({
        action: "create",
        entity_type: "Tortoise",
        entity_id: created.id,
        entity_name: form.name,
        notes: "Tortoise baru ditambahkan",
      });
    }

    // Sync Enclosure current_count jika kandang berubah
    if (newEnclosureName !== oldEnclosure) {
      try {
        const [allEnc, allTort] = await Promise.all([
          base44.entities.Enclosure.list(),
          base44.entities.Tortoise.list("-created_date", 500),
        ]);
        const activeTort = allTort.filter(t => t.status !== "terjual" && t.status !== "mati");
        // Kandang baru
        if (newEnclosureName) {
          const toEnc = allEnc.find(e => e.name === newEnclosureName);
          if (toEnc) {
            const count = activeTort.filter(t => t.enclosure === newEnclosureName && t.id !== tortoiseId).length + 1;
            await base44.entities.Enclosure.update(toEnc.id, { current_count: count });
          }
        }
        // Kandang lama (jika edit & pindah)
        if (oldEnclosure && oldEnclosure !== newEnclosureName) {
          const fromEnc = allEnc.find(e => e.name === oldEnclosure);
          if (fromEnc) {
            const count = activeTort.filter(t => t.enclosure === oldEnclosure && t.id !== tortoiseId).length;
            await base44.entities.Enclosure.update(fromEnc.id, { current_count: count });
          }
        }
      } catch (_) {}
    }

    // Auto-insert MeasurementHistory jika berat atau panjang berubah (atau tortoise baru)
    const prevWeight = editData?.weight_grams ? Number(editData.weight_grams) : undefined;
    const prevLength = editData?.shell_length_cm ? Number(editData.shell_length_cm) : undefined;
    const weightChanged = newWeight && newWeight !== prevWeight;
    const lengthChanged = newLength && newLength !== prevLength;
    if ((weightChanged || lengthChanged) && tortoiseId) {
      await base44.entities.MeasurementHistory.create({
        tortoise_id: tortoiseId,
        tortoise_name: form.name,
        date: new Date().toISOString().split("T")[0],
        weight_grams: newWeight,
        shell_length_cm: newLength,
        notes: "Otomatis dari update data tortoise",
      });
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
    }

    queryClient.invalidateQueries({ queryKey: ["tortoises"] });
    setSaving(false);
    setPendingSubmitData(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editData?.id ? "Edit Tortoise" : "Tambah Tortoise"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Banner reminder jika data tidak lengkap saat edit */}
          {editData?.id && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-800">
                  ⚠️ Data ini dibuat sebelum aturan baru
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Mohon lengkapi field berikut: {getMissingFields("tortoise", form).join(", ") || "Sudah lengkap"}
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  ✓ Anda tetap bisa menyimpan meskipun ada field kosong
                </p>
              </div>
            </div>
          )}

          {/* Foto Gallery */}
          <div className="space-y-1.5">
            <Label>Foto Tortoise</Label>
            <TortoisePhotoGallery
              photos={photos}
              thumbnailUrl={thumbnailUrl}
              tortoiseName={form.name || "Tortoise"}
              tortoiseCode={form.code || ""}
              onChange={handlePhotosChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={errors.name ? "border-red-500 ring-1 ring-red-400" : ""}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Kode <span className="text-red-500">*</span></Label>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="ST-001"
                className={errors.code ? "border-red-500 ring-1 ring-red-400" : ""}
              />
              {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Jenis Kelamin {(form.shell_length_cm && Number(form.shell_length_cm) >= 20 && form.age_category !== "baby") ? <span className="text-red-500">*</span> : null}</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger className={errors.gender ? "border-red-500 ring-1 ring-red-400" : ""}>
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jantan">♂ Jantan</SelectItem>
                  <SelectItem value="betina">♀ Betina</SelectItem>
                  <SelectItem value="belum_diketahui">? Belum Diketahui</SelectItem>
                </SelectContent>
              </Select>
              {(form.shell_length_cm && Number(form.shell_length_cm) < 20) || form.age_category === "baby" ? (
                <p className="text-xs text-muted-foreground italic">ℹ️ Opsional — gender ditentukan saat cangkang &gt; 20 cm</p>
              ) : errors.gender ? (
                <p className="text-xs text-red-600">{errors.gender}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Disarankan diisi untuk kura dewasa</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Morph / Warna</Label>
              <Select value={form.morph || "normal"} onValueChange={(v) => set("morph", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {MORPHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Species */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Spesies</Label>
              <Select value={form.species || "sulcata"} onValueChange={setSpecies}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {SPECIES_LIST.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-1">
              {form.species_params && (
                <div className="mt-5 p-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 space-y-0.5">
                  <p className="font-semibold mb-1">📊 Parameter Ideal</p>
                  <p>🌡 Basking: {form.species_params.basking_temp_min}–{form.species_params.basking_temp_max}°C</p>
                  <p>🌿 Ambient: {form.species_params.ambient_temp_min}–{form.species_params.ambient_temp_max}°C</p>
                  <p>💧 Kelembapan: {form.species_params.humidity_min}–{form.species_params.humidity_max}%</p>
                  <p>📏 Ukuran dewasa: ~{form.species_params.adult_size_cm} cm</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bentuk Tempurung</Label>
              <Select value={form.shell_type || "normal"} onValueChange={(v) => set("shell_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHELL_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status Kondisi</Label>
              <p className="text-[11px] text-muted-foreground -mt-1">Kategori umur (baby/juvenile/dewasa) dihitung otomatis dari tanggal lahir</p>
              <Select value={form.status === "baby" ? "aktif" : form.status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">✅ Aktif</SelectItem>
                  <SelectItem value="sakit">🤒 Sakit</SelectItem>
                  <SelectItem value="breeding">❤️ Breeding</SelectItem>
                  <SelectItem value="karantina">🔒 Karantina</SelectItem>
                  <SelectItem value="mati">💀 Mati</SelectItem>
                  <SelectItem value="diarsipkan">📁 Diarsipkan</SelectItem>
                </SelectContent>
              </Select>
              {/* Sick toggle */}
              {editData?.id && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="is_sick" checked={!!form.is_currently_sick} onChange={e => handleSickToggle(e.target.checked)} className="w-4 h-4 accent-red-500" />
                  <label htmlFor="is_sick" className="text-xs cursor-pointer text-red-700 font-medium">🏥 Sedang Sakit</label>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Kandang <span className="text-red-500">*</span></Label>
              <Select value={form.enclosure || ""} onValueChange={(v) => set("enclosure", v)}>
                <SelectTrigger className={errors.enclosure ? "border-red-500 ring-1 ring-red-400" : ""}>
                  <SelectValue placeholder="Pilih kandang..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— Tidak ada kandang —</SelectItem>
                  {enclosureOptions.map((encName) => (
                    <SelectItem key={encName} value={encName}>{encName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.enclosure && <p className="text-xs text-red-600">{errors.enclosure}</p>}
              {enclosureOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada kandang. Tambahkan di halaman Tortoise & Kandang.</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Asal Kura-Kura <span className="text-red-500">*</span></Label>
            <Select value={form.source || ""} onValueChange={(v) => set("source", v)}>
              <SelectTrigger className={errors.source ? "border-red-500 ring-1 ring-red-400" : ""}>
                <SelectValue placeholder="Pilih asal usul..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hasil_sendiri">🐣 Hasil Tetas Duta Tortoise (CBB)</SelectItem>
                <SelectItem value="cb">🏠 Captive Bred (CB)</SelectItem>
                <SelectItem value="wc">🌿 Wild Caught (WC)</SelectItem>
                <SelectItem value="f1">🔬 F1 (Generasi pertama dari WC)</SelectItem>
                <SelectItem value="f2">🔬 F2 (Generasi kedua)</SelectItem>
                <SelectItem value="ltc">⏳ LTC (Long Term Captive)</SelectItem>
                <SelectItem value="beli_lokal">🛒 Beli Lokal (tidak diketahui asal)</SelectItem>
                <SelectItem value="import">✈️ Import</SelectItem>
                <SelectItem value="tidak_diketahui">❓ Tidak Diketahui</SelectItem>
              </SelectContent>
            </Select>
            {errors.source && <p className="text-xs text-red-600">{errors.source}</p>}
            {form.source === "hasil_sendiri" && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                ✓ Silsilah akan tersedia — pastikan data induk terisi di breeding record
              </p>
            )}
          </div>

          {/* Proven */}
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 space-y-2">
            <div className="flex items-center gap-3">
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
            {form.is_proven && (
              <div className="space-y-1">
                <Label className="text-xs text-green-700">Tahun Proven</Label>
                <Input
                  type="number"
                  placeholder="Contoh: 2023"
                  min="2000"
                  max={new Date().getFullYear()}
                  value={form.proven_year || ""}
                  onChange={(e) => set("proven_year", e.target.value ? Number(e.target.value) : "")}
                  className="h-8 text-sm bg-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tanggal Lahir / Menetas</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Masuk <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={form.purchase_date || ""}
                onChange={(e) => set("purchase_date", e.target.value)}
                className={errors.purchase_date ? "border-red-500 ring-1 ring-red-400" : ""}
              />
              {errors.purchase_date && <p className="text-xs text-red-600">{errors.purchase_date}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Berat (gram) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                value={form.weight_grams}
                onChange={(e) => set("weight_grams", e.target.value)}
                className={errors.weight_grams ? "border-red-500 ring-1 ring-red-400" : ""}
              />
              {errors.weight_grams && <p className="text-xs text-red-600">{errors.weight_grams}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Panjang Cangkang (cm) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                step="0.1"
                value={form.shell_length_cm}
                onChange={(e) => set("shell_length_cm", e.target.value)}
                className={errors.shell_length_cm ? "border-red-500 ring-1 ring-red-400" : ""}
              />
              {errors.shell_length_cm && <p className="text-xs text-red-600">{errors.shell_length_cm}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>

          {/* ── Banner warning biologis (inline saat sudah tampil confirm) ── */}
          {showWarningConfirm && bioWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">⚠️ Data mungkin tidak akurat:</p>
                  {bioWarnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-700 mt-1">{w.msg}</p>
                  ))}
                </div>
              </div>
              <p className="text-xs text-amber-700">Apakah Anda yakin ingin menyimpan data ini?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowWarningConfirm(false); setBioWarnings([]); setPendingSubmitData(null); }}
                  className="flex-1 py-2 rounded-lg border border-amber-400 text-amber-800 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  Perbaiki Data
                </button>
                <button
                  type="button"
                  onClick={handleSaveAnyway}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Tetap"}
                </button>
              </div>
            </div>
          )}

          {/* Info status mati */}
          {form.status === "mati" && form.death_date && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
              <p className="font-semibold">💀 Status Mati tercatat</p>
              <p>Tanggal: {form.death_date} | Penyebab: {form.death_cause || "belum diisi"}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editData?.id ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
      <DeathRecordModal
        tortoise={form}
        open={showDeathModal}
        onClose={() => { setShowDeathModal(false); setPendingStatus(null); }}
        onSaved={handleDeathSaved}
      />
      <SickModal
        tortoise={form}
        open={showSickModal}
        onClose={() => setShowSickModal(false)}
        onSaved={handleSickSaved}
      />
      <RecoveryModal
        tortoise={form}
        open={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        onConfirm={handleRecoveryConfirm}
      />
    </Dialog>
  );
}