import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, Upload, Loader2, CheckCircle, AlertTriangle, XCircle, Copy, Save } from "lucide-react";

const SEVERITY_CONFIG = {
  ringan: { color: "border-green-300 bg-green-50", badge: "bg-green-100 text-green-800", icon: CheckCircle, iconColor: "text-green-600", label: "Ringan" },
  sedang: { color: "border-yellow-300 bg-yellow-50", badge: "bg-yellow-100 text-yellow-800", icon: AlertTriangle, iconColor: "text-yellow-600", label: "Sedang" },
  berat: { color: "border-red-300 bg-red-50", badge: "bg-red-100 text-red-800", icon: XCircle, iconColor: "text-red-600", label: "Berat" },
};

export default function AIHealthConsultant({ tortoise, onSaveToRecord }) {
  const [open, setOpen] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleConsult = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    setResult(null);
    let imageBase64 = null;
    if (imageFile) {
      imageBase64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result.split(",")[1]);
        reader.readAsDataURL(imageFile);
      });
    }
    const res = await base44.functions.invoke("claudeAI", {
      mode: "health_consult",
      payload: { symptoms, tortoiseName: tortoise?.name || "", imageBase64 },
    });
    setResult(res.data.result);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!result || !tortoise?.id) return;
    setSaving(true);
    const desc = `[AI Konsultasi]\nTingkat: ${result.severity}\nRingkasan: ${result.summary}\n\nKemungkinan penyebab:\n${(result.causes || []).map(c => `- ${c}`).join("\n")}\n\nPenanganan:\n${(result.treatment_steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    await base44.entities.HealthRecord.create({
      tortoise_id: tortoise.id,
      tortoise_name: tortoise.name,
      date: new Date().toISOString().split("T")[0],
      type: "checkup",
      description: desc,
    });
    setSaving(false);
    setSaved(true);
    if (onSaveToRecord) onSaveToRecord();
  };

  const cfg = result ? (SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.sedang) : null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
        <Bot className="w-4 h-4" /> Konsultasi AI 🤖
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" /> Konsultasi Kesehatan AI
              {tortoise && <span className="text-sm font-normal text-muted-foreground">— {tortoise.name}</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Deskripsi Gejala *</label>
              <Textarea
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                rows={4}
                placeholder="Ceritakan gejala yang terlihat: nafsu makan menurun, tidak mau bergerak, mata bengkak, dll..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Foto (opsional)</label>
              <label className="flex items-center gap-2 border-2 border-dashed rounded-xl p-3 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{imageFile ? imageFile.name : "Upload foto kura-kura"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              {imagePreview && <img src={imagePreview} alt="preview" className="mt-2 rounded-lg w-full h-32 object-cover" />}
            </div>

            <Button onClick={handleConsult} disabled={!symptoms.trim() || loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menganalisis...</> : <><Bot className="w-4 h-4 mr-2" /> Analisis Gejala</>}
            </Button>

            {result && cfg && (
              <div className={`border-2 rounded-xl p-4 space-y-3 ${cfg.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <cfg.icon className={`w-5 h-5 ${cfg.iconColor}`} />
                    <span className="font-semibold">Hasil Analisis AI</span>
                  </div>
                  <Badge className={`${cfg.badge} border-0`}>Keparahan: {cfg.label}</Badge>
                </div>

                {result.summary && <p className="text-sm font-medium">{result.summary}</p>}

                {result.causes?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Kemungkinan Penyebab</p>
                    <ul className="space-y-1">{result.causes.map((c, i) => <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground">•</span>{c}</li>)}</ul>
                  </div>
                )}

                {result.treatment_steps?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Penanganan Awal</p>
                    <ol className="space-y-1">{result.treatment_steps.map((s, i) => <li key={i} className="text-sm flex gap-2"><span className="font-medium shrink-0">{i + 1}.</span>{s}</li>)}</ol>
                  </div>
                )}

                {result.vet_advice && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Saran Dokter Hewan</p>
                    <p className="text-sm">{result.vet_advice}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground italic border-t pt-2">⚠️ Hasil analisis AI bukan pengganti diagnosa dokter hewan.</p>

                {tortoise && (
                  <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || saved} className="w-full">
                    {saved ? <><CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Tersimpan ke Rekam Medis</> :
                     saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> :
                     <><Save className="w-4 h-4 mr-2" /> Simpan ke Rekam Medis</>}
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}