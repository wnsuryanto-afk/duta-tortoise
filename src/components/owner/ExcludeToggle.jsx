import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * ExcludeToggle — hanya tampil jika role === "owner"
 * Props:
 *   record       — object entity dengan field id + excluded_from_reports
 *   entityName   — string, e.g. "FinanceTransaction", "Sale", "DailyChecklist"
 *   queryKey     — array, untuk invalidate setelah update
 *   onToggled?   — callback opsional setelah berhasil toggle
 */
export default function ExcludeToggle({ record, entityName, queryKey, onToggled }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const isExcluded = record?.excluded_from_reports === true;

  const handleToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    const newVal = !isExcluded;
    await base44.entities[entityName].update(record.id, { excluded_from_reports: newVal });
    if (queryKey) qc.invalidateQueries({ queryKey });
    if (onToggled) onToggled(newVal);
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
      {isExcluded && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-muted-foreground font-semibold border border-border">
          🚫 TEST
        </span>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={handleToggle}
        title={isExcluded ? "Klik untuk masukkan kembali ke laporan" : "Klik untuk keluarkan dari laporan"}
        className={`text-[10px] px-2 py-1 rounded-full font-medium border transition-all whitespace-nowrap ${
          isExcluded
            ? "bg-muted text-muted-foreground border-border hover:bg-gray-200"
            : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
        } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {loading ? "..." : isExcluded ? "🚫 Tidak Masuk Laporan" : "📊 Masuk Laporan"}
      </button>
    </div>
  );
}