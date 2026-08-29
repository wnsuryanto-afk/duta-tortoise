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
import { perubahanSakit } from "@/lib/statusKura";
import { format } from "date-fns";
import { X, Loader2, CheckCircle2, Mic, Square, Sparkles } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
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
  const [treatment, setTreatment] = useState("");
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

  // ── C3 — Lapor pakai suara ──
  //
  // Keeper sedang di kandang, tangan kotor, dan kura sakit tidak menunggu
  // seseorang selesai mengetik. Yang diucapkan masuk ke catatan apa adanya,
  // lalu AI mencoba mengisi diagnosis, tingkat keparahan, dan tindakan.
  //
  // Aturan yang dipegang: AI hanya mengisi kolom yang MASIH KOSONG. Apa pun
  // yang sudah dipilih keeper tidak pernah ditimpa — orang yang melihat kuranya
  // langsung lebih tahu daripada mesin yang membaca kalimat.
  const [parsingSuara, setParsingSuara] = useState(false);
  const [pesanSuara, setPesanSuara] = useState("");

  const prosesUcapan = async (teks) => {
    if (teks === "__MIC_DENIED__") {
      setPesanSuara("Mikrofon belum diizinkan. Buka pengaturan browser untuk mengizinkan, atau ketik seperti biasa.");
      return;
    }
    if (!teks || !teks.trim()) return;

    setNotes((prev) => (prev ? `${prev} ${teks}` : teks));
    setPesanSuara("");
    setParsingSuara(true);
    try {
      const daftarDiagnosis = protocols
        .map((p) => `${p.diagnosis_code} = ${p.diagnosis_name}`)
        .join("; ");
      const hasil = await base44.integrations.Core.InvokeLLM({
        prompt:
          `Keeper peternakan kura melaporkan kura sakit dengan suara. Ubah menjadi data terstruktur.\n\n` +
          `Ucapan: "${teks}"\n\n` +
          `Pilihan diagnosis yang tersedia (kode = nama): ${daftarDiagnosis || "(belum ada)"}\n\n` +
          `Aturan:\n` +
          `- diagnosis_codes: HANYA kode dari daftar di atas yang benar-benar cocok. Kosongkan bila tidak yakin.\n` +
          `- severity: ringan, sedang, berat, atau kritis. Kosongkan bila tidak tergambar dari ucapan.\n` +
          `- treatment: tindakan yang DISEBUT keeper sudah/akan dilakukan. Jangan mengarang tindakan medis.\n` +
          `- Lebih baik mengosongkan daripada menebak.\n\n` +
          `Jawab HANYA dengan JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            diagnosis_codes: { type: "array", items: { type: "string" } },
            severity: { type: "string" },
            treatment: { type: "string" },
          },
        },
      });

      const terisi = [];
      const kode = (hasil?.diagnosis_codes || []).filter((c) =>
        protocols.some((p) => p.diagnosis_code === c),
      );
      if (kode.length > 0 && diagnosis.length === 0) {
        setDiagnosis(kode);
        terisi.push("diagnosis");
      }
      if (hasil?.severity && !severity && SEVERITIES.some((s) => s.value === hasil.severity)) {
        setSeverity(hasil.severity);
        terisi.push("tingkat keparahan");
      }
      if (hasil?.treatment && !treatment.trim()) {
        setTreatment(String(hasil.treatment));
        terisi.push("tindakan");
      }

      setPesanSuara(
        terisi.length > 0
          ? `Terisi otomatis: ${terisi.join(", ")}. Mohon diperiksa dan dibetulkan bila kurang tepat.`
          : "Ucapan sudah masuk ke catatan. Diagnosis dan tingkat keparahan silakan dipilih sendiri.",
      );
    } catch {
      setPesanSuara("Ucapan sudah masuk ke catatan, tapi pengisian otomatis sedang tidak bisa dipakai.");
    }
    setParsingSuara(false);
  };

  const suara = useVoiceInput({ lang: "id-ID", onResult: prosesUcapan });

  if (!open) return null;

  const canSave = kura && diagnosis.length > 0 && severity && treatment.trim();

  const toggleDiagnosis = (code) => {
    setDiagnosis(prev => {
      const next = prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code];
      // Auto-fill severity dari severity_default protokol pertama jika belum dipilih
      if (!severity && next.length > 0) {
        const p = protocols.find(pr => pr.diagnosis_code === next[0]);
        if (p?.severity_default) setSeverity(p.severity_default);
      }
      // Saran perawatan dari protokol mengisi kolom perlakuan bila masih kosong
      if (next.length > 0) {
        const p = protocols.find(pr => pr.diagnosis_code === next[next.length - 1]);
        const saran = p?.perawatan_pendukung;
        if (Array.isArray(saran) && saran.length > 0) {
          setTreatment(prev => prev.trim() ? prev : saran.map((x, i) => `${i + 1}. ${x}`).join("\n"));
        }
      }
      return next;
    });
  };

  const handleClose = () => {
    setKura("");
    setDiagnosis([]);
    setSeverity("");
    setNotes("");
    setTreatment("");
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
      treatment: treatment.trim(),
      description: `Dilaporkan oleh ${user?.full_name || user?.email}. Diagnosis: ${diagNames}${notes ? `. Catatan: ${notes}` : ""}`,
      diagnosis_notes: diagNames,
    });

    // Tandai kuranya sakit pada kedua penandanya sekaligus. Menulis status dan
    // centang secara harfiah seperti sebelumnya tidak menyimpan status asalnya,
    // sehingga kura baby yang sakit lalu sembuh kembali sebagai "aktif" dan
    // klasifikasi baby-nya hilang untuk selamanya.
    try {
      await base44.entities.Tortoise.update(kura, perubahanSakit(t, today));
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
              tortoiseId={savedRecord.tortoise_id}
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
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold" style={{ color: "#1B4332" }}>
                  Catatan Tambahan (opsional)
                </p>
                {suara.supported && (
                  <button
                    type="button"
                    onClick={suara.toggle}
                    disabled={parsingSuara}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all active:scale-95 disabled:opacity-50 ${
                      suara.listening
                        ? "border-red-400 bg-red-50 text-red-600 animate-pulse"
                        : "border-[#1B4332] bg-white text-[#1B4332]"
                    }`}
                  >
                    {parsingSuara ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Membaca...</>
                    ) : suara.listening ? (
                      <><Square className="w-3 h-3" /> Selesai bicara</>
                    ) : (
                      <><Mic className="w-3.5 h-3.5" /> Lapor pakai suara</>
                    )}
                  </button>
                )}
              </div>

              {suara.listening && (
                <div className="mb-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-[11px] font-semibold text-red-700 mb-0.5">Sedang mendengarkan...</p>
                  <p className="text-xs text-gray-700 italic min-h-[1rem]">
                    {suara.interim || "Contoh: kura E3 kode 14 matanya bengkak, sudah saya kasih salep"}
                  </p>
                </div>
              )}

              {pesanSuara && !suara.listening && (
                <div className="mb-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-snug">{pesanSuara}</p>
                </div>
              )}

              <p className="text-xs font-semibold text-gray-700 mb-1.5">
                Perlakuan / tindakan * (wajib diisi)
              </p>
              <textarea
                rows={4}
                value={treatment}
                onChange={e => setTreatment(e.target.value)}
                placeholder="Apa yang dilakukan untuk kura ini? Pilih diagnosis dulu, saran perawatan terisi otomatis."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-400 outline-none mb-3"
              />
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