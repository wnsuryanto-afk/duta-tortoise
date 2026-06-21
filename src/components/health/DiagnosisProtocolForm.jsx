import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_CONFIG, SEVERITY_CONFIG } from "@/pages/PanduanPenyakitPage";

export default function DiagnosisProtocolForm({ open, onClose, editData, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(editData || {
    diagnosis_code: "",
    diagnosis_name: "",
    diagnosis_name_en: "",
    category: "lainnya",
    severity_default: "ringan",
    gejala_utama: [],
    treatment_items: [],
    perawatan_pendukung: [],
    catatan_penting: "",
    kapan_ke_drh: "",
    image_url: "",
    image_caption: "",
    is_active: true,
  });

  // Local input states for array fields
  const [gejalaInput, setGejalaInput] = useState("");
  const [perawatanInput, setPerawatanInput] = useState("");

  const handleChange = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const addGejala = () => {
    if (!gejalaInput.trim()) return;
    handleChange("gejala_utama", [...(form.gejala_utama || []), gejalaInput.trim()]);
    setGejalaInput("");
  };

  const addPerawatan = () => {
    if (!perawatanInput.trim()) return;
    handleChange("perawatan_pendukung", [...(form.perawatan_pendukung || []), perawatanInput.trim()]);
    setPerawatanInput("");
  };

  const updateTreatmentItem = (idx, field, value) => {
    const items = [...(form.treatment_items || [])];
    items[idx] = { ...items[idx], [field]: value };
    handleChange("treatment_items", items);
  };

  const addTreatmentItem = () => {
    handleChange("treatment_items", [...(form.treatment_items || []), {
      obat_name: "", obat_sku: "", dosis_mg_per_kg: null, dosis_ml_per_kg: null,
      rute: "", frekuensi: "", durasi_hari: null, catatan_dosis: "",
    }]);
  };

  const removeTreatmentItem = (idx) => {
    handleChange("treatment_items", (form.treatment_items || []).filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!form.diagnosis_code?.trim() || !form.diagnosis_name?.trim()) {
      toast.error("Kode diagnosis dan nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editData?.id) {
        await base44.entities.DiagnosisProtocol.update(editData.id, form);
        toast.success("Penyakit diperbarui!");
      } else {
        await base44.entities.DiagnosisProtocol.create(form);
        toast.success("Penyakit baru ditambahkan!");
      }
      qc.invalidateQueries({ queryKey: ["diagnosis-protocols-catalog"] });
      qc.invalidateQueries({ queryKey: ["diagnosis-protocols"] });
      onSaved?.();
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData?.id ? "Edit Penyakit" : "Tambah Penyakit Baru"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kode Diagnosis *</Label>
              <Input value={form.diagnosis_code} onChange={e => handleChange("diagnosis_code", e.target.value)} placeholder="cth: shell_rot" />
            </div>
            <div className="space-y-1.5">
              <Label>Nama (ID) *</Label>
              <Input value={form.diagnosis_name} onChange={e => handleChange("diagnosis_name", e.target.value)} placeholder="cth: Shell Rot" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nama (EN)</Label>
              <Input value={form.diagnosis_name_en} onChange={e => handleChange("diagnosis_name_en", e.target.value)} placeholder="Shell Rot" />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={v => handleChange("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tingkat Keparahan</Label>
            <Select value={form.severity_default || ""} onValueChange={v => handleChange("severity_default", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih keparahan" /></SelectTrigger>
              <SelectContent>
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <Label>URL Gambar</Label>
            <Input value={form.image_url || ""} onChange={e => handleChange("image_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Caption / Sumber Gambar</Label>
            <Input value={form.image_caption || ""} onChange={e => handleChange("image_caption", e.target.value)} placeholder="Sumber: ..." />
          </div>

          {/* Gejala Utama */}
          <div className="space-y-1.5">
            <Label>Gejala Utama</Label>
            <div className="flex gap-2">
              <Input value={gejalaInput} onChange={e => setGejalaInput(e.target.value)} placeholder="Ketik gejala, lalu Enter" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addGejala())} />
              <Button type="button" size="sm" onClick={addGejala}><Plus className="w-4 h-4" /></Button>
            </div>
            {form.gejala_utama?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.gejala_utama.map((g, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                    {g}
                    <button onClick={() => handleChange("gejala_utama", form.gejala_utama.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Treatment Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Penanganan / Obat</Label>
              <Button type="button" size="sm" variant="outline" onClick={addTreatmentItem} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" /> Tambah Obat
              </Button>
            </div>
            {form.treatment_items?.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Belum ada obat ditambahkan</p>
            ) : (
              <div className="space-y-2">
                {form.treatment_items?.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-2.5 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Obat #{idx + 1}</span>
                      <button onClick={() => removeTreatmentItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Nama obat" value={item.obat_name || ""} onChange={e => updateTreatmentItem(idx, "obat_name", e.target.value)} className="h-8 text-xs" />
                      <Input placeholder="SKU" value={item.obat_sku || ""} onChange={e => updateTreatmentItem(idx, "obat_sku", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Input type="number" placeholder="mg/kg" value={item.dosis_mg_per_kg ?? ""} onChange={e => updateTreatmentItem(idx, "dosis_mg_per_kg", e.target.value ? Number(e.target.value) : null)} className="h-8 text-xs" />
                      <Input type="number" placeholder="ml/kg" value={item.dosis_ml_per_kg ?? ""} onChange={e => updateTreatmentItem(idx, "dosis_ml_per_kg", e.target.value ? Number(e.target.value) : null)} className="h-8 text-xs" />
                      <Input placeholder="Rute" value={item.rute || ""} onChange={e => updateTreatmentItem(idx, "rute", e.target.value)} className="h-8 text-xs" />
                      <Input placeholder="Frekuensi" value={item.frekuensi || ""} onChange={e => updateTreatmentItem(idx, "frekuensi", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Durasi (hari)" value={item.durasi_hari ?? ""} onChange={e => updateTreatmentItem(idx, "durasi_hari", e.target.value ? Number(e.target.value) : null)} className="h-8 text-xs" />
                      <Input placeholder="Catatan dosis" value={item.catatan_dosis || ""} onChange={e => updateTreatmentItem(idx, "catatan_dosis", e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Perawatan Pendukung */}
          <div className="space-y-1.5">
            <Label>Perawatan Pendukung</Label>
            <div className="flex gap-2">
              <Input value={perawatanInput} onChange={e => setPerawatanInput(e.target.value)} placeholder="cth: Rendam hangat 30 menit" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPerawatan())} />
              <Button type="button" size="sm" onClick={addPerawatan}><Plus className="w-4 h-4" /></Button>
            </div>
            {form.perawatan_pendukung?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.perawatan_pendukung.map((p, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                    {p}
                    <button onClick={() => handleChange("perawatan_pendukung", form.perawatan_pendukung.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Catatan Penting</Label>
            <Textarea rows={2} value={form.catatan_penting || ""} onChange={e => handleChange("catatan_penting", e.target.value)} placeholder="Peringatan klinis..." />
          </div>

          <div className="space-y-1.5">
            <Label>Kapan ke Dokter Hewan</Label>
            <Textarea rows={2} value={form.kapan_ke_drh || ""} onChange={e => handleChange("kapan_ke_drh", e.target.value)} placeholder="Kondisi yang mengharuskan ke drh..." />
          </div>

          <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-background py-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editData?.id ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}