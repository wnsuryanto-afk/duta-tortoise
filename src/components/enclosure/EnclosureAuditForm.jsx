import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const ASPECTS = ["kebersihan", "ketersediaan_air", "ketersediaan_pakan", "kondisi_lantai", "pencahayaan", "ventilasi", "kepadatan_isi"];
const ASPECT_LABELS = {
  kebersihan: "Kebersihan",
  ketersediaan_air: "Ketersediaan Air",
  ketersediaan_pakan: "Ketersediaan Pakan",
  kondisi_lantai: "Kondisi Lantai",
  pencahayaan: "Pencahayaan",
  ventilasi: "Ventilasi",
  kepadatan_isi: "Kepadatan Isi Kandang",
};

const SCORE_LABELS = ["", "Sangat Buruk", "Buruk", "Cukup", "Baik", "Sangat Baik"];

function calcGrade(total, max) {
  const pct = (total / max) * 100;
  if (pct >= 85) return "A";
  if (pct >= 70) return "B";
  if (pct >= 55) return "C";
  return "D";
}

export default function EnclosureAuditForm({ data, enclosures, onSave, onClose, auditorName }) {
  const today = new Date().toISOString().split("T")[0];
  const initChecklist = ASPECTS.map(a => ({ aspect: a, score: 3, notes: "" }));

  const [form, setForm] = useState(data || {
    enclosure_name: "",
    audit_date: today,
    auditor_name: auditorName || "",
    action_items: "",
    follow_up_date: "",
  });
  const [checklist, setChecklist] = useState(data?.checklist || initChecklist);
  const [saving, setSaving] = useState(false);

  const setScore = (aspect, score) => setChecklist(prev => prev.map(c => c.aspect === aspect ? { ...c, score } : c));
  const setNotes = (aspect, notes) => setChecklist(prev => prev.map(c => c.aspect === aspect ? { ...c, notes } : c));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totalScore = checklist.reduce((s, c) => s + (c.score || 0), 0);
  const maxScore = ASPECTS.length * 5;
  const grade = calcGrade(totalScore, maxScore);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, checklist, total_score: totalScore, grade };
    if (data?.id) await base44.entities.EnclosureAudit.update(data.id, payload);
    else await base44.entities.EnclosureAudit.create(payload);
    onSave();
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Kandang *</Label>
          {enclosures.length > 0 ? (
            <Select value={form.enclosure_name} onValueChange={v => set("enclosure_name", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih kandang" /></SelectTrigger>
              <SelectContent>{enclosures.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Input required value={form.enclosure_name} onChange={e => set("enclosure_name", e.target.value)} placeholder="Nama kandang" />
          )}
        </div>
        <div>
          <Label>Tanggal Audit *</Label>
          <Input type="date" required value={form.audit_date} onChange={e => set("audit_date", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Nama Auditor *</Label>
        <Input required value={form.auditor_name} onChange={e => set("auditor_name", e.target.value)} />
      </div>

      {/* Scoring */}
      <div>
        <Label className="text-base font-semibold">Penilaian Per Aspek</Label>
        <div className="mt-3 space-y-4">
          {checklist.map(item => (
            <div key={item.aspect} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{ASPECT_LABELS[item.aspect] || item.aspect}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{SCORE_LABELS[item.score]}</span>
                  <span className="text-sm font-bold text-primary w-4 text-right">{item.score}</span>
                </div>
              </div>
              <div className="flex gap-1 mb-2">
                {[1,2,3,4,5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScore(item.aspect, s)}
                    className={`flex-1 h-8 rounded text-xs font-semibold transition-colors ${item.score >= s ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"}`}
                  >{s}</button>
                ))}
              </div>
              <Input
                value={item.notes}
                onChange={e => setNotes(item.aspect, e.target.value)}
                placeholder="Catatan (opsional)"
                className="h-7 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Score Summary */}
      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
        <div>
          <div className="text-sm text-muted-foreground">Total Skor</div>
          <div className="text-2xl font-bold">{totalScore}<span className="text-sm text-muted-foreground">/{maxScore}</span></div>
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Grade</div>
          <div className={`text-3xl font-bold ${grade === "A" ? "text-green-600" : grade === "B" ? "text-blue-600" : grade === "C" ? "text-yellow-600" : "text-red-600"}`}>{grade}</div>
        </div>
      </div>

      <div>
        <Label>Tindakan Perbaikan</Label>
        <Textarea value={form.action_items || ""} onChange={e => set("action_items", e.target.value)} rows={3} placeholder="Tulis tindakan yang perlu dilakukan..." />
      </div>
      <div>
        <Label>Tanggal Follow Up</Label>
        <Input type="date" value={form.follow_up_date || ""} onChange={e => set("follow_up_date", e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={saving || !form.enclosure_name}>{saving ? "Menyimpan..." : "Simpan Audit"}</Button>
      </div>
    </form>
  );
}