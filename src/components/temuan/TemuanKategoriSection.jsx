import { CATEGORIES } from "@/lib/temuanCategorize";
import TemuanCard from "./TemuanCard";

/**
 * TemuanKategoriSection — grup temuan per kategori dengan header.
 */
export default function TemuanKategoriSection({ category, findings, recurringKeys, onPhotoClick, onSakit, onIncidental, onResolve, onIgnore }) {
  const cat = CATEGORIES[category] || CATEGORIES.kualitas_foto;
  if (!findings.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{cat.icon}</span>
        <h3 className="text-sm font-bold text-foreground">{cat.label}</h3>
        <span className="text-xs text-muted-foreground">({findings.length})</span>
      </div>
      <div className="space-y-2">
        {findings.map((f, i) => (
          <TemuanCard
            key={`${f.finding_key}_${i}`}
            finding={f}
            isRecurring={recurringKeys.has(f.finding_key)}
            onPhotoClick={onPhotoClick}
            onSakit={onSakit}
            onIncidental={onIncidental}
            onResolve={onResolve}
            onIgnore={onIgnore}
          />
        ))}
      </div>
    </div>
  );
}