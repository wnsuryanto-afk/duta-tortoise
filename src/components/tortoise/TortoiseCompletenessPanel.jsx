import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { INCOMPLETE_CHECKS, completenessScore } from "@/lib/incompleteChecks";

/**
 * Panel kelengkapan profil tortoise — ditampilkan di detail card
 */
export default function TortoiseCompletenessPanel({ tortoise, onEdit }) {
  const fields = INCOMPLETE_CHECKS.tortoise.fields;
  const score = completenessScore("tortoise", tortoise);
  const isLow = score < 80;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">Kelengkapan Profil</span>
        <span className={`text-xs font-bold ${isLow ? "text-amber-600" : "text-green-600"}`}>{score}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${isLow ? "bg-amber-400" : "bg-green-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {fields.map(f => {
          const ok = f.check(tortoise);
          return (
            <span key={f.key} className={`text-[10px] flex items-center gap-0.5 ${ok ? "text-green-600" : "text-amber-600"}`}>
              {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
              {f.label}
            </span>
          );
        })}
      </div>

      {/* Tombol Lengkapi */}
      {isLow && onEdit && (
        <button
          onClick={onEdit}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold hover:bg-amber-200 transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          Lengkapi Profil
        </button>
      )}
    </div>
  );
}