/**
 * MicButton — tombol mikrofon untuk input suara via Web Speech API.
 * - Jika tidak didukung browser → tidak render (form tetap jalan ketik manual).
 * - Saat mendengarkan: merah + label "Mendengarkan... ketuk untuk berhenti".
 * - Teks interim ditampilkan di bawah tombol saat sedang merekam.
 */
import { Mic, Square } from "lucide-react";

export default function MicButton({ supported, listening, interim, onToggle, label }) {
  if (!supported) return null;
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
          listening
            ? "bg-red-500 text-white border-red-500 animate-pulse"
            : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
        }`}
        title={listening ? "Ketuk untuk berhenti" : "Ketuk untuk bicara"}
      >
        {listening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
        {listening ? "Mendengarkan... ketuk untuk berhenti" : label || "🎤 Bicara"}
      </button>
      {listening && interim && (
        <p className="text-[11px] text-red-600 italic px-1">…{interim}</p>
      )}
    </div>
  );
}