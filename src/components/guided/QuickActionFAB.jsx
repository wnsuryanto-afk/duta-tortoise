/**
 * QuickActionFAB — Floating "+" button untuk keeper & kepala_feeder.
 * Muncul di semua halaman GuidedMode. 3 aksi besar dengan label teks.
 */
import { useState } from "react";
import { Plus, X, Lightbulb } from "lucide-react";
import IncidentalTaskUsulanForm from "@/components/incidental/IncidentalTaskUsulanForm";

export default function QuickActionFAB({ onLaporSakit, onCatatPakan, onTugasHariIni, user }) {
  const [open, setOpen] = useState(false);
  const [showUsulan, setShowUsulan] = useState(false);

  const run = (fn) => () => { setOpen(false); fn(); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 z-50 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform"
        title="Aksi Cepat"
        aria-label="Aksi Cepat"
      >
        <Plus className="w-7 h-7" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-card rounded-3xl shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <p className="font-bold text-foreground">Aksi Cepat</p>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={run(onLaporSakit)}
                className="w-full flex items-center gap-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl active:scale-95 transition-all hover:bg-red-100"
              >
                <span className="text-3xl">🤒</span>
                <div className="text-left">
                  <p className="font-bold text-red-800 text-base">Lapor Kura Sakit</p>
                  <p className="text-xs text-red-600">Catat kondisi darurat kura</p>
                </div>
              </button>
              <button
                onClick={run(onCatatPakan)}
                className="w-full flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-2xl active:scale-95 transition-all hover:bg-green-100"
              >
                <span className="text-3xl">🥬</span>
                <div className="text-left">
                  <p className="font-bold text-green-800 text-base">Catat Pakan</p>
                  <p className="text-xs text-green-600">Catat pengambilan pakan</p>
                </div>
              </button>
              <button
                onClick={run(onTugasHariIni)}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl active:scale-95 transition-all hover:bg-blue-100"
              >
                <span className="text-3xl">✅</span>
                <div className="text-left">
                  <p className="font-bold text-blue-800 text-base">Tugas Hari Ini</p>
                  <p className="text-xs text-blue-600">Kembali ke checklist</p>
                </div>
              </button>
              <button
                onClick={run(() => setShowUsulan(true))}
                className="w-full flex items-center gap-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl active:scale-95 transition-all hover:bg-purple-100"
              >
                <span className="text-3xl flex-shrink-0"><Lightbulb className="w-7 h-7 text-purple-600" /></span>
                <div className="text-left">
                  <p className="font-bold text-purple-800 text-base">Usulkan Tugas</p>
                  <p className="text-xs text-purple-600">Ada pekerjaan di luar SOP?</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <IncidentalTaskUsulanForm
        open={showUsulan}
        onClose={() => setShowUsulan(false)}
        user={user}
      />
    </>
  );
}