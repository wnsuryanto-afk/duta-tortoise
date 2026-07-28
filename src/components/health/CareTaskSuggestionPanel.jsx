import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getCareIcon } from "@/lib/careIconUtils";

const TRIGGER_SEVERITIES = ["sedang", "berat", "kritis"];
const CARE_TASK_POINTS = 15;

/**
 * CareTaskSuggestionPanel — Alur 1 (semi-otomatis).
 * Muncul saat type="sakit" AND severity in [sedang, berat, kritis] AND
 * ada DiagnosisProtocol dengan perawatan_pendukung untuk diagnosis terpilih.
 *
 * PERBAIKAN: Buat SATU tugas per kura per diagnosis (15 poin), dengan seluruh
 * langkah perawatan sebagai sub-langkah (daftar centang di dalam tugas),
 * bukan 5-6 tugas terpisah @10 poin.
 */
export default function CareTaskSuggestionPanel({
  diagnoses,
  severity,
  type,
  tortoiseName,
  tortoiseCode,
  protocols: prefetched,
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: fetched = [] } = useQuery({
    queryKey: ["diagnosis-protocols"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
    enabled: !prefetched,
  });
  const protocols = prefetched || fetched;

  if (type !== "sakit" || !TRIGGER_SEVERITIES.includes(severity)) return null;

  const selected = diagnoses || [];
  if (!selected.length) return null;

  const matched = selected
    .map((d) => ({
      diagnosis: d,
      protocol: protocols.find((p) => p.diagnosis_code === d || p.diagnosis_name === d),
    }))
    .filter((m) => m.protocol && m.protocol.perawatan_pendukung?.length > 0);

  if (matched.length === 0) {
    return (
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border">
        ℹ️ Tidak ada saran tugas perawatan untuk diagnosis ini.
      </div>
    );
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const me = await base44.auth.me().catch(() => null);
      const tortoiseLabel = tortoiseCode || tortoiseName || "Kura";

      const existing = await base44.entities.IncidentalTask.filter({
        status: "pending",
        due_date: today,
      });
      const existingTitles = new Set(existing.map((t) => (t.title || "").toLowerCase()));

      let createdCount = 0;
      let skippedCount = 0;

      for (const { protocol } of matched) {
        const diagnosisName = protocol.diagnosis_name || protocol.diagnosis_code;
        const title = `Perawatan ${tortoiseLabel} — ${diagnosisName}`;

        if (existingTitles.has(title.toLowerCase())) {
          skippedCount++;
          continue;
        }

        const subSteps = (protocol.perawatan_pendukung || []).map((item) => ({
          label: item,
          is_checked: false,
        }));

        await base44.entities.IncidentalTask.create({
          title,
          due_date: today,
          points: CARE_TASK_POINTS,
          status: "pending",
          notes: `Auto dari diagnosis ${diagnosisName}. Wajib foto kondisi kura. Tandai selesai bila semua langkah dikerjakan.`,
          sub_steps: subSteps,
          created_by_email: me?.email,
          created_by_name: me?.full_name || me?.email,
          is_active: true,
          material_status: "ready",
        });
        existingTitles.add(title.toLowerCase());
        createdCount++;
      }

      qc.invalidateQueries({ queryKey: ["incidental-tasks"] });
      qc.invalidateQueries({ queryKey: ["harus-dibeli"] });

      if (createdCount > 0) {
        toast.success(`${createdCount} tugas perawatan dibuat untuk ${tortoiseLabel} (@${CARE_TASK_POINTS} poin per tugas)`);
      }
      if (skippedCount > 0) {
        toast.info(`${skippedCount} tugas dilewati (sudah ada)`);
      }
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setCreating(false);
  };

  const previewItems = matched.flatMap(({ protocol }) =>
    (protocol.perawatan_pendukung || []).map((item, i) => ({
      key: `${protocol.diagnosis_code || protocol.diagnosis_name}-${i}`,
      diagnosisName: protocol.diagnosis_name,
      item,
    }))
  );

  return (
    <Card className="p-3 border-l-4 border-l-[#1B4332] bg-[#F0F7F2]/40">
      <p className="text-sm font-bold text-[#1B4332] flex items-center gap-1.5 mb-1">
        <ClipboardPlus className="w-4 h-4" />
        Sarankan Tugas Perawatan untuk Keeper
      </p>
      <p className="text-[11px] text-muted-foreground mb-2">
        Kura: <strong>{tortoiseCode || tortoiseName}</strong> · Severity: {severity}
      </p>

      <div className="bg-white/50 rounded-lg p-2 mb-2 border border-border">
        <p className="text-[11px] font-semibold text-[#1B4332] mb-0.5">
          Akan dibuat: {matched.length} tugas (@{CARE_TASK_POINTS} poin per tugas)
        </p>
        <p className="text-[10px] text-muted-foreground">
          Tiap tugas berisi daftar langkah perawatan sebagai centangan. Poin diberikan sekali per tugas, bukan per langkah.
        </p>
      </div>

      <div className="space-y-1.5">
        {previewItems.map((it, idx) => {
          const icon = getCareIcon(it.item);
          return (
            <div
              key={it.key}
              className="flex items-start gap-2.5 rounded-lg p-2 border border-transparent bg-white/30"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <span className="text-lg flex-shrink-0 leading-tight">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-relaxed">{it.item}</p>
                <p className="text-[10px] text-muted-foreground">{it.diagnosisName}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        className="w-full mt-2 gap-1.5 text-white"
        style={{ backgroundColor: "#E76F00" }}
        onClick={handleCreate}
        disabled={creating}
      >
        {creating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ClipboardPlus className="w-4 h-4" />
        )}
        Buat Tugas Perawatan (@{CARE_TASK_POINTS} poin)
      </Button>
    </Card>
  );
}