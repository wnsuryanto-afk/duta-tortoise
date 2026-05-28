import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

const EGG_STATUS = [
  { value: "belum_dicek", label: "⬜ Belum Dicek",  color: "bg-gray-100 border-gray-300 text-gray-600" },
  { value: "fertile",     label: "✅ Fertile",       color: "bg-green-100 border-green-400 text-green-700" },
  { value: "infertil",    label: "❌ Infertil",      color: "bg-red-100 border-red-400 text-red-700" },
  { value: "menetas",     label: "🐢 Menetas",       color: "bg-amber-100 border-amber-400 text-amber-700" },
  { value: "gagal",       label: "💀 Gagal",         color: "bg-gray-700 border-gray-800 text-white" },
];

const statusColor = {
  belum_dicek: "bg-gray-100 border-gray-300 text-gray-500",
  fertile:     "bg-green-200 border-green-500 text-green-800",
  infertil:    "bg-red-200 border-red-500 text-red-800",
  menetas:     "bg-amber-200 border-amber-500 text-amber-800",
  gagal:       "bg-gray-600 border-gray-700 text-white",
};

export default function EggGrid({ breeding }) {
  const qc = useQueryClient();
  const [popupEgg, setPopupEgg] = useState(null); // egg_number
  const [saving, setSaving] = useState(false);

  const records = breeding.egg_records || [];
  const eggCount = breeding.egg_count || records.length;

  // Days since laying — candling only after 30 days
  const daysSinceLaying = breeding.egg_laying_date
    ? differenceInDays(new Date(), new Date(breeding.egg_laying_date))
    : 0;
  const candlingAllowed = daysSinceLaying >= 30;

  const summary = {
    belum_dicek: records.filter(e => e.status === "belum_dicek").length,
    fertile:     records.filter(e => e.status === "fertile").length,
    infertil:    records.filter(e => e.status === "infertil").length,
    menetas:     records.filter(e => e.status === "menetas").length,
    gagal:       records.filter(e => e.status === "gagal").length,
  };

  const updateEggStatus = async (eggNumber, newStatus) => {
    setSaving(true);
    const updated = records.map(e =>
      e.egg_number === eggNumber ? { ...e, status: newStatus, check_date: new Date().toISOString().split("T")[0] } : e
    );
    await base44.entities.Breeding.update(breeding.id, { egg_records: updated });
    qc.invalidateQueries({ queryKey: ["breedings"] });
    setSaving(false);
    setPopupEgg(null);
    toast.success(`Telur #${eggNumber} → ${newStatus}`);
  };

  const markAll = async (status) => {
    if (!candlingAllowed && (status === "fertile" || status === "infertil")) {
      toast.error(`Candling baru bisa setelah 30 hari (sisa ${30 - daysSinceLaying} hari)`);
      return;
    }
    setSaving(true);
    const updated = records.map(e => ({ ...e, status, check_date: new Date().toISOString().split("T")[0] }));
    await base44.entities.Breeding.update(breeding.id, { egg_records: updated });
    qc.invalidateQueries({ queryKey: ["breedings"] });
    setSaving(false);
    toast.success(`Semua telur ditandai ${status}`);
  };

  if (eggCount === 0) return <p className="text-xs text-muted-foreground">Tidak ada data telur</p>;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">✅ Fertile: {summary.fertile}</span>
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">❌ Infertil: {summary.infertil}</span>
        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">🐢 Menetas: {summary.menetas}</span>
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">⬜ Belum Cek: {summary.belum_dicek}</span>
        {summary.gagal > 0 && <span className="px-2 py-1 rounded-full bg-gray-700 text-white">💀 Gagal: {summary.gagal}</span>}
      </div>

      {/* Progress bar */}
      {eggCount > 0 && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
          <div className="bg-green-400 transition-all" style={{ width: `${(summary.fertile / eggCount) * 100}%` }} />
          <div className="bg-amber-400 transition-all" style={{ width: `${(summary.menetas / eggCount) * 100}%` }} />
          <div className="bg-red-400 transition-all" style={{ width: `${(summary.infertil / eggCount) * 100}%` }} />
          <div className="bg-gray-600 transition-all" style={{ width: `${(summary.gagal / eggCount) * 100}%` }} />
        </div>
      )}

      {/* Quick action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => markAll("fertile")}
          disabled={saving || !candlingAllowed}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ✅ Tandai Semua Fertile
        </button>
        <button
          onClick={() => markAll("infertil")}
          disabled={saving || !candlingAllowed}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ❌ Tandai Semua Infertil
        </button>
        {!candlingAllowed && (
          <span className="text-[11px] text-muted-foreground self-center">
            🔒 Candling tersedia setelah {30 - daysSinceLaying} hari lagi
          </span>
        )}
      </div>

      {/* Egg grid */}
      <div className="flex flex-wrap gap-1.5 relative">
        {records.map((egg) => (
          <div key={egg.egg_number} className="relative">
            <button
              onClick={() => setPopupEgg(popupEgg === egg.egg_number ? null : egg.egg_number)}
              className={`w-9 h-9 rounded-lg border-2 text-xs font-bold transition-all hover:scale-110 ${statusColor[egg.status] || statusColor.belum_dicek}`}
              title={`Telur #${egg.egg_number} — ${egg.status}`}
            >
              {egg.egg_number}
            </button>
            {/* Popup */}
            {popupEgg === egg.egg_number && (
              <div className="absolute z-50 top-10 left-0 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[140px]">
                <p className="text-[10px] text-muted-foreground font-medium px-1 mb-1">Telur #{egg.egg_number}</p>
                {EGG_STATUS.map(s => {
                  const isDisabled = (s.value === "fertile" || s.value === "infertil") && !candlingAllowed;
                  return (
                    <button
                      key={s.value}
                      onClick={() => !isDisabled && updateEggStatus(egg.egg_number, s.value)}
                      disabled={saving || isDisabled || egg.status === s.value}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg mb-0.5 transition-colors
                        ${egg.status === s.value ? "bg-primary/10 font-bold" : "hover:bg-muted"}
                        ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}
                      `}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}