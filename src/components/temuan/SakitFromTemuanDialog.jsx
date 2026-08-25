import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { SEVERITIES } from "@/lib/severity";


/**
 * SakitFromTemuanDialog — form lapor kura sakit dari temuan AI.
 * Pre-isi catatan dari teks temuan, foto bukti dari temuan.
 */
export default function SakitFromTemuanDialog({ finding, user, onClose, onResolved }) {
  const [tortoiseId, setTortoiseId] = useState("");
  const [diagnosis, setDiagnosis] = useState([]);
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState(finding?.finding_text || "");
  const [submitting, setSubmitting] = useState(false);

  const { data: tortoises = [] } = useQuery({
    queryKey: ["active-tortoises-picker"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getActiveTortoisesForPicker");
      return res.data?.tortoises || [];
    },
    enabled: !!finding,
    staleTime: 5 * 60 * 1000,
  });

  const { data: protocols = [] } = useQuery({
    queryKey: ["diagnosis-protocols"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    enabled: !!finding,
    staleTime: 5 * 60 * 1000,
  });

  if (!finding) return null;

  const selectedTortoise = tortoises.find(t => t.id === tortoiseId);
  const canSave = tortoiseId && severity;

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await base44.entities.HealthRecord.create({
        tortoise_id: tortoiseId,
        tortoise_name: selectedTortoise?.name || "",
        date: format(new Date(), "yyyy-MM-dd"),
        type: "sakit",
        source: "manual",
        diagnosis,
        severity,
        description: `Dari temuan foto task "${finding.task_title}": ${finding.finding_text}`,
        photo_urls: finding.photo_url ? [finding.photo_url] : [],
      });

      await onResolved(finding, "sick_report");
      toast.success("Laporan kura sakit dibuat & temuan ditandai selesai");
      onClose();
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={!!finding} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="w-4 h-4 text-red-600" /> Buat Laporan Kura Sakit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {finding.photo_url && (
            <img src={finding.photo_url} alt="Bukti" className="h-24 w-full object-cover rounded-lg border" />
          )}

          <div>
            <Label className="text-xs">Pilih Kura</Label>
            <select
              className="w-full mt-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={tortoiseId}
              onChange={e => setTortoiseId(e.target.value)}
            >
              <option value="">— Pilih kura —</option>
              {tortoises.map(t => (
                <option key={t.id} value={t.id}>
                  {t.code || t.name} — {t.name} {t.enclosure ? `(${t.enclosure})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Diagnosis (opsional)</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {protocols.slice(0, 12).map(p => (
                <button
                  key={p.diagnosis_code}
                  type="button"
                  onClick={() => setDiagnosis(prev =>
                    prev.includes(p.diagnosis_code)
                      ? prev.filter(d => d !== p.diagnosis_code)
                      : [...prev, p.diagnosis_code]
                  )}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    diagnosis.includes(p.diagnosis_code)
                      ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {p.diagnosis_name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Keparahan</Label>
            <div className="flex gap-1.5 mt-1">
              {SEVERITIES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className={`flex-1 h-8 rounded-md border text-xs font-medium ${
                    severity === s.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent border-input"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Catatan (terisi dari temuan)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="resize-none h-20 text-xs mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Batal</Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave || submitting} className="gap-1.5">
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Simpan Laporan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}