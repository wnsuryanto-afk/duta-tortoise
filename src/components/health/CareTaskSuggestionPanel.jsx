import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardPlus, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getCareIcon } from "@/lib/careIconUtils";

const TRIGGER_SEVERITIES = ["sedang", "berat", "kritis"];
const CARE_TASK_POINTS = 15;

/**
 * CareTaskSuggestionPanel — OTOMATIS.
 *
 * Muncul saat type="sakit" AND severity in [sedang, berat, kritis] AND ada
 * DiagnosisProtocol dengan perawatan_pendukung untuk diagnosis terpilih.
 *
 * PERUBAHAN PENTING: tugas perawatan dibuat OTOMATIS begitu panel muncul,
 * tidak lagi menunggu seseorang menekan tombol. Sebelumnya tombol itu praktis
 * tidak pernah ditekan — tujuh laporan sakit sepanjang Juli 2026 tidak
 * menghasilkan satu pun tugas perawatan, sehingga kura sakit dilaporkan lalu
 * tidak pernah ditindaklanjuti.
 *
 * Satu tugas per kura per diagnosis (15 poin), seluruh langkah perawatan
 * menjadi sub-langkah centang di dalam tugas.
 */
export default function CareTaskSuggestionPanel({
  diagnoses,
  severity,
  type,
  tortoiseId,
  tortoiseName,
  tortoiseCode,
  protocols: prefetched,
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null); // { created, skipped }
  const autoRan = useRef(false);

  const { data: fetched = [] } = useQuery({
    queryKey: ["diagnosis-protocols"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
    enabled: !prefetched,
  });
  const protocols = useMemo(() => prefetched || fetched, [prefetched, fetched]);

  // Semua hook harus berada di atas early return — jangan pindahkan ke bawah.
  const matched = useMemo(() => {
    if (type !== "sakit" || !TRIGGER_SEVERITIES.includes(severity)) return [];
    const selected = diagnoses || [];
    if (!selected.length) return [];
    return selected
      .map((d) => ({
        diagnosis: d,
        protocol: protocols.find((p) => p.diagnosis_code === d || p.diagnosis_name === d),
      }))
      .filter((m) => m.protocol && m.protocol.perawatan_pendukung?.length > 0);
  }, [diagnoses, severity, type, protocols]);

  const handleCreate = useCallback(async () => {
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
          // Tautan ke kuranya disimpan sebagai id. Tanpa ini, satu-satunya
          // penghubung tugas ke kura adalah judulnya, yang harus diurai balik
          // dan putus begitu nama kuranya diubah.
          tortoise_id: tortoiseId || undefined,
          tortoise_code: tortoiseCode || "",
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
      qc.invalidateQueries({ queryKey: ["incidental-tasks-mine"] });
      qc.invalidateQueries({ queryKey: ["harus-dibeli"] });
      setResult({ created: createdCount, skipped: skippedCount });

      if (createdCount > 0) {
        toast.success(
          `${createdCount} tugas perawatan otomatis dibuat untuk ${tortoiseLabel} (@${CARE_TASK_POINTS} poin)`
        );
      }
    } catch (err) {
      setResult(null);
      toast.error("Gagal membuat tugas perawatan: " + (err?.message || ""));
    }
    setCreating(false);
  }, [matched, qc, tortoiseCode, tortoiseName]);

  // Jalankan sekali saja begitu ada protokol yang cocok.
  useEffect(() => {
    if (autoRan.current) return;
    if (matched.length === 0) return;
    autoRan.current = true;
    handleCreate();
  }, [matched, handleCreate]);

  if (type !== "sakit" || !TRIGGER_SEVERITIES.includes(severity)) return null;
  if (!(diagnoses || []).length) return null;

  if (matched.length === 0) {
    return (
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border">
        ℹ️ Tidak ada protokol perawatan untuk diagnosis ini, jadi tidak ada tugas yang dibuat otomatis.
      </div>
    );
  }

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
        {creating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : result ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <ClipboardPlus className="w-4 h-4" />
        )}
        {creating
          ? "Membuat tugas perawatan…"
          : result
          ? "Tugas perawatan sudah dibuat"
          : "Tugas Perawatan untuk Keeper"}
      </p>
      <p className="text-[11px] text-muted-foreground mb-2">
        Kura: <strong>{tortoiseCode || tortoiseName}</strong> · Severity: {severity}
      </p>

      <div className="bg-white/50 rounded-lg p-2 mb-2 border border-border">
        <p className="text-[11px] font-semibold text-[#1B4332] mb-0.5">
          {result
            ? `${result.created} tugas dibuat${result.skipped ? `, ${result.skipped} dilewati karena sudah ada` : ""} (@${CARE_TASK_POINTS} poin per tugas)`
            : `${matched.length} tugas akan dibuat otomatis (@${CARE_TASK_POINTS} poin per tugas)`}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Tugas muncul di daftar tugas keeper hari ini. Tiap langkah di bawah menjadi centangan
          di dalam tugas; poin diberikan sekali per tugas, bukan per langkah.
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

      {/* Tombol hanya sebagai cadangan bila pembuatan otomatis gagal */}
      {!creating && !result && (
        <Button
          variant="outline"
          className="w-full mt-2 gap-1.5"
          onClick={handleCreate}
        >
          <RefreshCw className="w-4 h-4" />
          Coba buat ulang
        </Button>
      )}
    </Card>
  );
}
