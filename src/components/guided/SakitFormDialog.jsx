/**
 * SakitFormDialog — Form lapor kura sakit (darurat).
 * Dipakai oleh bottom-nav "Lapor Sakit" dan FAB "+" (aksi cepat).
 * Diagnosis dipilih dari DiagnosisProtocol (diagnosis_code disimpan ke field `diagnosis`).
 * Severity wajib dipilih. Setelah simpan, jika severity sedang/berat/kritis,
 * tampilkan CareTaskSuggestionPanel (Alur 1).
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import SickTortoisePicker from "@/components/health/SickTortoisePicker";
import CareTaskSuggestionPanel from "@/components/health/CareTaskSuggestionPanel";

const SEVERITIES = [
  { value: "ringan", label: "🟡 Ringan" },
  { value: "sedang", label: "🟠 Sedang" },
  { value: "berat",  label: "🔴 Berat" },
  { value: "kritis", label: "🚨 Kritis" },
];

const TRIGGER_SEVERITIES = ["sedang", "berat", "kritis"];

export default function SakitFormDialog({ open, onClose, user }) {
  const qc = useQueryClient();
  const [kura, setKura] = useState("");
  const [diagnosis, setDiagnosis] = useState([]);
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const {
    data: tortoises = [],
    isLoading: tortoisesLoading,
    error: tortoisesError,
    refetch: refetchTortoises,
  } = useQuery({
    queryKey: ["active-tortoises-picker"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getActiveTortoisesForPicker");
      return res.data?.tortoises || [];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: protocols = [] } = useQuery({
    queryKey: ["diagnosis-protocols"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  if (!open) return null;

  const canSave = kura && diagnosis.length > 0 && severity;

  const toggleDiagnosis = (code) => {
    setDiagnosis(prev => {
      const next = prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code];
      // Auto-fill severity dari severity_default protokol pertama jika belum dipilih
      if (!severity && next.length > 0) {
        const p = protocols.find(pr => pr.diagnosis_code === next[0]);
        if (p?.severity_default) setSeverity(p.severity_default);
      }
      return next;
    });
  };

  const handleClose = () => {
    setKura("");
    setDiagnosis([]);
    setSeverity("");
    setNotes("");
    setSavedRecord(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSave) return;
    setSubmitting(true);
    const t = tortoises.find(x => x.id === kura);
    const diagNames = diagnosis
      .map(c => protocols.find(p => p.diagnosis_code === c)?.diagnosis_name || c)
      .join(", ");

    await base44.entities.HealthRecord.create({
      tortoise_id: kura,
      tortoise_name: t?.name || kura,
      date: today,
      type: "sakit",
      diagnosis,
      severity,
      description: `Dilaporkan oleh ${user?.full_name || user?.email}. Diagnosis: ${diagNames}${notes ? `. Catatan: ${notes}` : ""}`,
      diagnosis_notes: diagNames,
    });

    // Set is_currently_sick=true pada Tortoise
    try {
      await base44.entities.Tortoise.update(kura, { is_currently_sick: true, status: "sakit" });
    } catch {}

    qc.invalidateQueries({ queryKey: ["health-records"] });
    qc.invalidateQueries({ queryKey: ["sick-tortoises-today"] });
    setSubmitting(false);
    setSavedRecord({
      tortoise_name: t?.name || kura,
      tortoise_code: t?.code,
      diagnosis,
      severity,
    });
  };

  const showCarePanel = savedRecord && TRIGGER_SEVERITIES.includes(savedRecord.severity);

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: "#1B4332" }}>
          <div className="flex items-center gap-2 text-white">
            <span className="text-xl">🤒</span>
            <span className="font-bold">Lapor Kura Sakit</span>
          </div>
          <button onClick={handleClose}><X className="w-5 h-5 text-white" /></button>
        </div>

        {/* Success (ringan) */}
        {savedRecord && !showCarePanel ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-bold text-green-700">Laporan tercatat!</p>
          </div>
        ) : savedRecord && showCarePanel ? (
          /* Care task suggestion panel */
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-3 py-2 border border-green-200">
              <CheckCircle2 className="w-4 h-4" />
              <p className="text-sm font-semibold">Laporan tercatat! Severity: {savedRecord.severity}</p>
            </div>
            <CareTaskSuggestionPanel
              diagnoses={savedRecord.diagnosis}
              severity={savedRecord.severity}
              type="sakit"
              tortoiseName={savedRecord.tortoise_name}
              tortoiseCode={savedRecord.tortoise_code}
              protocols={protocols}
            />
            <button
              onClick={handleClose}
              className="w-full font-bold py-3 rounded-xl text-white active:scale-95"
              style={{ backgroundColor: "#E76F00" }}
            >
              Selesai
            </button>
          </div>
        ) : (
          /* Form */
          <div className="p-5 space-y-4">
            <SickTortoisePicker
              tortoises={tortoises}
              loading={tortoisesLoading}
              error={tortoisesError}
              onRetry={refetchTortoises}
              value={kura}
              onChange={setKura}
              accent="red"
            />

            {/* Diagnosis multi-select dari DiagnosisProtocol */}
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#1B4332" }}>
                Diagnosis * (pilih semua yang sesuai)
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {protocols.map(p => {
                  const sel = diagnosis.includes(p.diagnosis_code);
                  return (
                    <button
                      key={p.diagnosis_code}
                      onClick={() => toggleDiagnosis(p.diagnosis_code)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        sel ? "text-white border-[#1B4332]" : "bg-background border-border hover:bg-muted"
                      }`}
                      style={sel ? { backgroundColor: "#1B4332" } : {}}
                    >
                      {p.diagnosis_name}
                    </button>
                  );
                })}
                {protocols.length === 0 && (
                  <p className="text-xs text-muted-foreground">Memuat diagnosis...</p>
                )}
              </div>
              {diagnosis.length === 0 && (
                <p className="text-xs text-red-500 mt-1">⚠️ Pilih minimal 1 diagnosis</p>
              )}
            </div>

            {/* Severity */}
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#1B4332" }}>
                Tingkat Keparahan *
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SEVERITIES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSeverity(s.value)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                      severity === s.value
                        ? "text-white border-[#1B4332]"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                    style={severity === s.value ? { backgroundColor: "#1B4332" } : {}}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan tambahan (opsional) */}
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#1B4332" }}>
                Catatan Tambahan (opsional)
              </p>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Gejala visual, kondisi kura, dll..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[#1B4332] outline-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !canSave}
              className="w-full text-white font-bold py-4 rounded-xl disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#E76F00" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                "📋 Laporkan Sekarang"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}