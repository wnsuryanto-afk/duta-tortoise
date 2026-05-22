import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Video, Skull } from "lucide-react";
import TortoisePhotoGallery from "./TortoisePhotoGallery";
import IncompleteBanner from "@/components/common/IncompleteBanner";
import { getMissingFields } from "@/lib/incompleteChecks";
import DeathRecordDialog from "./DeathRecordDialog";
import { logActivity } from "@/lib/logActivity";

const MORPHS = [
  { value: "normal",         label: "Normal" },
  { value: "albino",         label: "Albino" },
  { value: "ivory",          label: "Ivory" },
  { value: "caramel_albino", label: "Caramel Albino" },
  { value: "hypo",           label: "Hypo" },
  { value: "golden_greek",   label: "Golden Greek" },
  { value: "piebald",        label: "Piebald" },
  { value: "genetic_stripe", label: "Genetic Stripe" },
  { value: "high_yellow",    label: "High Yellow" },
  { value: "dark",           label: "Dark" },
  { value: "paradox",        label: "Paradox" },
  { value: "anerythristic",  label: "Anerythristic" },
  { value: "axanthic",       label: "Axanthic" },
  { value: "melanistic",     label: "Melanistic" },
  { value: "mix",            label: "Mix (persilangan)" },
  { value: "unknown",        label: "Unknown (belum diketahui)" },
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

export default function TortoiseForm({ open, onClose, editData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState(initPhotos(editData));
  const [thumbnailUrl, setThumbnailUrl] = useState(editData?.photo_url || (initPhotos(editData)[0]?.url || ""));
  const [deathVideoUrl, setDeathVideoUrl] = useState(editData?.death_video_url || "");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [enclosureOptions, setEnclosureOptions] = useState([]);
  const [showDeathDialog, setShowDeathDialog] = useState(false);
  const [form, setForm] = useState(editData || {
    name: "", code: "", gender: "belum_diketahui", morph: "normal",
    source: "tidak_diketahui",
    is_proven: false, birth_date: "", purchase_date: "", weight_grams: "", shell_length_cm: "",
    status: "aktif", enclosure: "", notes: "",
  });

  const set = (field, value) => { setForm((p) => ({ ...p, [field]: value })); setErrors(e => ({ ...e, [field]: "" })); };

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
    if (!form.gender) e.gender = "Jenis kelamin wajib dipilih";
    if (!form.morph) e.morph = "Morph wajib dipilih";
    if (!form.source) e.source = "Asal kura-kura wajib dipilih";
    if (!form.status) e.status = "Status wajib dipilih";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Validasi strict hanya untuk CREATE, untuk EDIT data lama lebih lenient
  const isOldData = !!editData?.id;

  const handlePhotosChange = (newPhotos, newThumb) => {
    setPhotos(newPhotos);
    setThumbnailUrl(newThumb || "");
  };

  const isMati = form.status === "mati";

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setVideoError("");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setDeathVideoUrl(file_url);
    setUploadingVideo(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validasi STRICT hanya untuk CREATE, untuk EDIT data lama lebih lenient
    if (!isOldData && !validate()) return;
    
    // Untuk EDIT data lama, validasi hanya field-field dasar
    if (isOldData) {
      const basicErrors = {};
      if (!form.name?.trim()) basicErrors.name = "Nama wajib diisi";
      if (!form.gender) basicErrors.gender = "Jenis kelamin wajib dipilih";
      if (!form.status) basicErrors.status = "Status wajib dipilih";
      if (Object.keys(basicErrors).length > 0) {
        setErrors(basicErrors);
        return;
      }
    }
    
    // Validasi wajib video saat status mati
    if (isMati) {
      if (!deathVideoUrl) {
        setVideoError("Wajib upload video saat status kura-kura Mati.");
        return;
      }
    }
    setVideoError("");
    setSaving(true);
    const newWeight = form.weight_grams ? Number(form.weight_grams) : undefined;
    const newLength = form.shell_length_cm ? Number(form.shell_length_cm) : undefined;
    const data = {
      ...form,
      weight_grams: newWeight,
      shell_length_cm: newLength,
      photos: photos,
      photo_url: thumbnailUrl || (photos[0]?.url || ""),
      death_video_url: deathVideoUrl || undefined,
    };

    let tortoiseId = editData?.id;
    const oldEnclosure = editData?.enclosure || "";
    const newEnclosureName = data.enclosure || "";
    const oldData = editData ? { ...editData } : null;
    if (editData?.id) {
      await base44.entities.Tortoise.update(editData.id, data);
      await logActivity({
        action: "update",
        entity_type: "Tortoise",
        entity_id: editData.id,
        entity_name: form.name,
        changes: { before: oldData, after: data },
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
              onChange={handlePhotosChange}
            />
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
              <Label>Status</Label>
              <div className="flex gap-2">
                <Select value={form.status} onValueChange={(v) => set("status", v)} className="flex-1">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="baby">🐣 Baby (&lt;10cm)</SelectItem>
                    <SelectItem value="sakit">Sakit</SelectItem>
                    <SelectItem value="breeding">Breeding</SelectItem>
                    <SelectItem value="karantina">Karantina</SelectItem>
                    <SelectItem value="mati">Mati</SelectItem>
                    <SelectItem value="terjual">Terjual</SelectItem>
                    <SelectItem value="diarsipkan">Diarsipkan</SelectItem>
                  </SelectContent>
                </Select>
                {editData?.id && form.status !== "mati" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowDeathDialog(true)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    title="Catat Kematian"
                  >
                    <Skull className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Kandang</Label>
              <Select value={form.enclosure || ""} onValueChange={(v) => set("enclosure", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih kandang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Tidak ada kandang</SelectItem>
                  {enclosureOptions.map((encName) => (
                    <SelectItem key={encName} value={encName}>{encName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {enclosureOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada kandang. Tambahkan di halaman Tortoise & Kandang.</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Asal Kura-Kura (Source)</Label>
            <Select value={form.source || "tidak_diketahui"} onValueChange={(v) => set("source", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hasil_sendiri">🐣 Hasil Sendiri (CBB — Captive Bred & Born)</SelectItem>
                <SelectItem value="beli_lokal">🛒 Beli Lokal</SelectItem>
                <SelectItem value="import">✈️ Import (CB — Captive Born)</SelectItem>
                <SelectItem value="tidak_diketahui">❓ Tidak Diketahui</SelectItem>
              </SelectContent>
            </Select>
            {form.source === "hasil_sendiri" && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                ✓ Silsilah akan tersedia — pastikan data induk terisi di breeding record
              </p>
            )}
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
              <Label>Tanggal Lahir / Menetas</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Pembelian</Label>
              <Input type="date" value={form.purchase_date || ""} onChange={(e) => set("purchase_date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Berat (gram)</Label>
              <Input type="number" value={form.weight_grams} onChange={(e) => set("weight_grams", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Panjang Cangkang (cm)</Label>
              <Input type="number" step="0.1" value={form.shell_length_cm} onChange={(e) => set("shell_length_cm", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>

          {/* Wajib foto + video saat mati */}
          {isMati && (
            <div className="space-y-3 p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-medium text-red-800">Status Mati — Dokumentasi Wajib</p>
              </div>
              <p className="text-xs text-red-700">Video wajib diupload sebagai bukti dokumentasi kematian.</p>

              {/* Upload Video */}
              <div className="space-y-1.5">
                <Label className="text-red-800">Video Dokumentasi *</Label>
                {deathVideoUrl ? (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-red-200">
                    <Video className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs text-green-700 font-medium truncate flex-1">Video berhasil diupload ✓</span>
                    <button type="button" onClick={() => setDeathVideoUrl("")} className="text-xs text-red-500 hover:underline">Hapus</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-red-300 rounded-lg p-3 hover:border-red-400 transition-colors bg-white">
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo} />
                    {uploadingVideo
                      ? <><Loader2 className="w-4 h-4 animate-spin text-red-500" /><span className="text-xs text-red-600">Mengupload video...</span></>
                      : <><Video className="w-4 h-4 text-red-400" /><span className="text-xs text-red-600">Klik untuk upload video</span></>
                    }
                  </label>
                )}
              </div>
              {videoError && (
                <p className="text-xs text-red-600 font-medium">{videoError}</p>
              )}
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
      <DeathRecordDialog
        tortoise={editData}
        open={showDeathDialog}
        onOpenChange={setShowDeathDialog}
      />
    </Dialog>
  );
}