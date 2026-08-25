/**
 * SickModal — modal paksa isi saat kura ditandai sakit (is_currently_sick: false→true)
 * Props: tortoise, open, onClose, onSaved(healthData)
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { SEVERITIES } from "@/lib/severity";

const DIAGNOSES = [
  { value: "infeksi_saluran_pernapasan", label: "Infeksi Saluran Pernapasan" },
  { value: "rns", label: "RNS (Runny Nose Syndrome)" },
  { value: "pneumonia", label: "Pneumonia" },
  { value: "shell_rot", label: "Shell Rot" },
  { value: "pyramiding", label: "Pyramiding" },
  { value: "retak_cangkang", label: "Retak Cangkang" },
  { value: "mbd", label: "MBD (Metabolic Bone Disease)" },
  { value: "hipovitaminosis_a", label: "Hipovitaminosis A" },
  { value: "gout", label: "Gout" },
  { value: "sembelit", label: "Sembelit" },
  { value: "diare", label: "Diare" },
  { value: "anorexia", label: "Anorexia / Tidak Mau Makan" },
  { value: "cacingan", label: "Cacingan" },
  { value: "infeksi_mata", label: "Infeksi Mata" },
  { value: "luka_gigitan", label: "Luka Gigitan" },
  { value: "abses", label: "Abses" },
  { value: "stres", label: "Stres" },
  { value: "dehidrasi", label: "Dehidrasi" },
  { value: "heat_stroke", label: "Heat Stroke" },
  { value: "egg_binding", label: "Egg Binding" },
  { value: "lainnya", label: "Lainnya" },
];


export default function SickModal({ tortoise, open, onClose, onSaved }) {
  const [diagnosis, setDiagnosis]     = useState([]);
  const [severity, setSeverity]       = useState("");
  const [description, setDescription] = useState("");
  const [vetName, setVetName]         = useState("");
  const [tempC, setTempC]             = useState("");
  const [saving, setSaving]           = useState(false);

  const canSave = diagnosis.length > 0 && severity;

  const toggleDiagnosis = (val) => {
    setDiagnosis(prev => prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]);
  };

  const handleSave = () => {
    if (!canSave) return;
    setSaving(true);
    onSaved({
      diagnosis,
      severity,
      description,
      vet_name: vetName || undefined,
      temperature_C: tempC ? Number(tempC) : undefined,
    });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-red-700">🏥 Catat Kondisi Sakit — {tortoise?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground bg-red-50 border border-red-100 rounded-lg p-2">
            Lengkapi data kondisi sakit agar rekam medis tercatat dengan benar.
          </p>

          {/* Diagnosis multi-select */}
          <div>
            <Label className="text-xs">Diagnosis * (pilih semua yang sesuai)</Label>
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
              {DIAGNOSES.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDiagnosis(d.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    diagnosis.includes(d.value)
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {diagnosis.length === 0 && <p className="text-xs text-red-500 mt-1">⚠️ Pilih minimal 1 diagnosis</p>}
          </div>

          {/* Severity */}
          <div>
            <Label className="text-xs">Tingkat Keparahan *</Label>
            <div className="flex gap-2 mt-1.5">
              {SEVERITIES.map(s => (
                <button key={s.value} type="button" onClick={() => setSeverity(s.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${severity === s.value ? "bg-primary text-primary-foreground" : "bg-background border-border hover:bg-muted"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suhu + Dokter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Suhu Tubuh (°C)</Label>
              <Input type="number" step="0.1" value={tempC} onChange={e => setTempC(e.target.value)} placeholder="mis: 28.5" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Nama Dokter Hewan</Label>
              <Input value={vetName} onChange={e => setVetName(e.target.value)} placeholder="opsional" className="mt-1" />
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <Label className="text-xs">Deskripsi Kondisi</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1" placeholder="Kondisi yang diamati..." />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="button" className="flex-1" disabled={!canSave || saving} onClick={handleSave}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Simpan Catatan Sakit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}