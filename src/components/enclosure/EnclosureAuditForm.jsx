import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ASPECTS = ["kebersihan", "ketersediaan_air", "ketersediaan_pakan", "kondisi_lantai", "pencahayaan", "ventilasi", "kepadatan_isi"];
const ASPECT_LABELS = {
  kebersihan: "Kebersihan",
  ketersediaan_air: "Ketersediaan Air",
  ketersediaan_pakan: "Ketersediaan Pakan",
  kondisi_lantai: "Kondisi Lantai",
  pencahayaan: "Pencahayaan",
  ventilasi: "Ventilasi",
  kepadatan_isi: "Kepadatan Isi",
};

function calcGrade(score) {
  const max = ASPECTS.length * 5;
  const pct = (score / max) * 100;
  if (pct >= 85) return "A";
  if (pct >= 70) return "B";
  if (pct >= 55) return "C";
  return "D";
}

export default function EnclosureAuditForm({ data, enclosures, onSave, onClose, auditorName }) {
  const today = new Date().toISOString().split("T")[0];
  const initChecklist = ASPECTS.map(a => ({ aspect: a, score: 3, notes: "" }));
  const [form, setForm] = useState({
    enclosure_name: data?.enclosure_name || "",
    audit_date: data?.audit_date || today,
    auditor_name: data?.auditor_name || auditorName || "",
    checklist: data?.checklist || initChecklist,
    action_items: data?.action_items || "",
    follow_up_date: data?.follow_up_date || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setScore = (idx, score) => setForm(f => ({ ...f, checklist: f.checklist.map((c, i) => i === idx ? { ...c, score } : c) }));
  const setNotes = (idx, notes) => setForm(f => ({ ...f, checklist: f.checklist.map((c, i) => i === idx ? { ...c, notes } : c) }));

  const totalScore = form.checklist.reduce((s, c) => s + (c.score || 0), 0);
  const grade = calcGrade(totalScore);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, total_score: totalScore, grade };
    if (data?.id) await base44.entities.EnclosureAudit.update(data.id, payload);
    else await base44.entities.EnclosureAudit.create(payload);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label>Nama Kandang *</Label>
          {enclosures.length > 0 ? (
            <Select value={form.enclosure_name} onValueChange={v => set("enclosure_name", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih kandang..." /></SelectTrigger>
              <SelectContent>{enclosures.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Input required value={form.enclosure_name} onChange={e => set("enclosure_name", e.target.value)} placeholder="Nama kandang" />
          )}
        </div>
        <div>
          <Label>Tanggal Audit *</Label>
          <Input required type="date" value={form.audit_date} onChange={e => set("audit_date", e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Nama Auditor *</Label>
          <Input required value={form.auditor_name} onChange={e => set("auditor_name", e.target.value)} />
        </div>
      </div>

      {/* Score summary */}
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
        <div className="text-2xl font-bold">{grade}</div>
        <div>
          <div className="text-sm font-medium">Total Skor: {totalScore}/{ASPECTS.length * 5}</div>
          <div className="text-xs text-muted-foreground">A≥85% · B≥70% · C≥55% · D&lt;55%</div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {form.checklist.map((item, i) => (
          <div key={i} className="border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{ASPECT_LABELS[item.aspect] || item.aspect}</span>
              <span className="text-sm font-bold text-primary">{item.score}/5</span>
            </div>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button" onClick={() => setScore(i, s)}
                  className={`flex-1 h-8 rounded-md text-xs font-semibold transition-all ${item.score >= s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted-foreground/20"}`}>
                  {s}
                </button>
              ))}
            </div>
            <Input
              value={item.notes || ""}
              onChange={e => setNotes(i, e.target.value)}
              placeholder="Catatan (opsional)..."
              className="h-7 text-xs"
            />
          </div>
        ))}
      </div>

      <div>
        <Label>Tindakan Perbaikan</Label>
        <Textarea value={form.action_items || ""} onChange={e => set("action_items", e.target.value)} rows={2} placeholder="Apa yang perlu diperbaiki..." />
      </div>
      <div>
        <Label>Tanggal Follow Up</Label>
        <Input type="date" value={form.follow_up_date || ""} onChange={e => set("follow_up_date", e.target.value)} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit">Simpan Audit</Button>
      </div>
    </form>
  );
}