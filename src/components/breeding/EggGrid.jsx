import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EGG_STATUS = [
  { value: "belum_dicek", label: "⬜ Belum Dicek",  bg: "bg-blue-100",  border: "border-blue-300", text: "text-blue-700" },
  { value: "fertile",     label: "✅ Fertile",       bg: "bg-green-100", border: "border-green-400", text: "text-green-700" },
  { value: "infertil",    label: "❌ Infertil",      bg: "bg-red-100",   border: "border-red-400",  text: "text-red-700" },
  { value: "menetas",     label: "🐢 Menetas",       bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-700" },
  { value: "gagal",       label: "💀 Gagal",         bg: "bg-gray-700",  border: "border-gray-800", text: "text-white" },
];

const statusColor = {
  belum_dicek: "bg-blue-100 border-blue-300 text-blue-600 border-dashed",
  fertile:     "bg-green-200 border-green-500 text-green-800",
  infertil:    "bg-red-200 border-red-500 text-red-800",
  menetas:     "bg-amber-200 border-amber-500 text-amber-800",
  gagal:       "bg-gray-600 border-gray-700 text-white",
};

// BottomSheet untuk mobile
function EggBottomSheet({ egg, candlingAllowed, daysSinceLaying, onClose, onSave }) {
  const [status, setStatus] = useState(egg.status);
  const [checkDate, setCheckDate] = useState(egg.check_date || new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState(egg.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(egg.egg_number, status, checkDate, notes);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      {/* Sheet */}
      <div
        className="relative bg-background rounded-t-2xl shadow-2xl"
        style={{ height: "60vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-base">Telur #{egg.egg_number}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4" style={{ height: "calc(60vh - 130px)" }}>
          {/* Status chips */}
          <div className="grid grid-cols-1 gap-2">
            {EGG_STATUS.map(s => {
              const isDisabled = (s.value === "fertile" || s.value === "infertil") && !candlingAllowed;
              return (
                <button
                  key={s.value}
                  onClick={() => !isDisabled && setStatus(s.value)}
                  disabled={isDisabled}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left font-medium transition-all
                    ${status === s.value ? `${s.bg} ${s.border} ${s.text} border-2` : "bg-muted/40 border-transparent text-foreground"}
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : "active:scale-95"}
                  `}
                >
                  <span className="text-base">{s.label}</span>
                  {status === s.value && <span className="ml-auto text-xs">✓</span>}
                  {isDisabled && <span className="ml-auto text-xs">🔒 Candling H+30</span>}
                </button>
              );
            })}
          </div>

          <div>
            <Label className="text-xs">Tanggal Cek (opsional)</Label>
            <Input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Catatan (opsional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1" placeholder="Catatan kondisi telur..." />
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EggGrid({ breeding, onRequestNewTortoise }) {
  const qc = useQueryClient();
  const [activeEgg, setActiveEgg] = useState(null); // egg_number
  const [saving, setSaving] = useState(false);
  const [showHatchModal, setShowHatchModal] = useState(null); // egg_number setelah menetas

  const records = breeding.egg_records || [];
  const eggCount = breeding.egg_count || records.length;

  const daysSinceLaying = breeding.egg_laying_date
    ? differenceInDays(new Date(), new Date(breeding.egg_laying_date))
    : 0;
  const candlingAllowed = daysSinceLaying >= 30;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const summary = {
    belum_dicek: records.filter(e => e.status === "belum_dicek").length,
    fertile:     records.filter(e => e.status === "fertile").length,
    infertil:    records.filter(e => e.status === "infertil").length,
    menetas:     records.filter(e => e.status === "menetas").length,
    gagal:       records.filter(e => e.status === "gagal").length,
  };

  const updateEggStatus = async (eggNumber, newStatus, checkDate, notes) => {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const updated = records.map(e =>
      e.egg_number === eggNumber
        ? {
            ...e,
            status: newStatus,
            check_date: checkDate || today,
            notes: notes || e.notes,
            hatch_date: newStatus === "menetas" ? today : e.hatch_date,
          }
        : e
    );

    // Recalculate counts
    const hatchedCount = updated.filter(e => e.status === "menetas").length;
    const failedCount  = updated.filter(e => e.status === "gagal" || e.status === "infertil").length;
    const allFinal     = updated.every(e => e.status !== "belum_dicek" && e.status !== "fertile");
    const breedingStatus = allFinal
      ? (hatchedCount > 0 ? "menetas" : "gagal")
      : breeding.status;

    await base44.entities.Breeding.update(breeding.id, {
      egg_records: updated,
      hatched_count: hatchedCount,
      failed_count: failedCount,
      status: breedingStatus,
    });
    qc.invalidateQueries({ queryKey: ["breedings"] });
    setSaving(false);
    setActiveEgg(null);
    toast.success(`Telur #${eggNumber} → ${newStatus}`);

    // Prompt daftarkan kura jika menetas
    if (newStatus === "menetas") {
      setShowHatchModal(eggNumber);
    }
  };

  const markAll = async (status) => {
    if (!candlingAllowed && (status === "fertile" || status === "infertil")) {
      toast.error(`Candling baru bisa setelah 30 hari (sisa ${30 - daysSinceLaying} hari)`);
      return;
    }
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const updated = records.map(e => ({ ...e, status, check_date: today }));
    const hatchedCount = updated.filter(e => e.status === "menetas").length;
    const failedCount  = updated.filter(e => e.status === "gagal" || e.status === "infertil").length;
    await base44.entities.Breeding.update(breeding.id, {
      egg_records: updated,
      hatched_count: hatchedCount,
      failed_count: failedCount,
    });
    qc.invalidateQueries({ queryKey: ["breedings"] });
    setSaving(false);
    toast.success(`Semua telur ditandai ${status}`);
  };

  if (eggCount === 0) return <p className="text-xs text-muted-foreground">Tidak ada data telur</p>;

  const activeEggData = activeEgg !== null ? records.find(e => e.egg_number === activeEgg) : null;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">✅ Fertile: {summary.fertile}</span>
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">❌ Infertil: {summary.infertil}</span>
        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">🐢 Menetas: {summary.menetas}</span>
        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">⬜ Belum Cek: {summary.belum_dicek}</span>
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
      <div className="flex flex-wrap gap-2 relative">
        {records.map((egg) => (
          <div key={egg.egg_number} className="relative">
            <button
              onClick={() => setActiveEgg(activeEgg === egg.egg_number ? null : egg.egg_number)}
              className={`w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all hover:scale-110 active:scale-95 ${statusColor[egg.status] || statusColor.belum_dicek}`}
              title={`Telur #${egg.egg_number} — ${egg.status}`}
            >
              {egg.egg_number}
            </button>

            {/* DESKTOP: inline chip popup */}
            {!isMobile && activeEgg === egg.egg_number && (
              <div className="absolute z-50 top-12 left-0 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[150px]">
                <p className="text-[10px] text-muted-foreground font-medium px-1 mb-1">Telur #{egg.egg_number}</p>
                {EGG_STATUS.map(s => {
                  const isDisabled = (s.value === "fertile" || s.value === "infertil") && !candlingAllowed;
                  return (
                    <button
                      key={s.value}
                      onClick={() => !isDisabled && updateEggStatus(egg.egg_number, s.value, null, null)}
                      disabled={saving || isDisabled || egg.status === s.value}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg mb-0.5 transition-colors
                        ${egg.status === s.value ? "bg-primary/10 font-bold" : "hover:bg-muted"}
                        ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}
                      `}
                    >
                      {s.label}
                      {isDisabled && <span className="ml-1 text-[9px]">🔒</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MOBILE: Bottom sheet */}
      {isMobile && activeEgg !== null && activeEggData && (
        <EggBottomSheet
          egg={activeEggData}
          candlingAllowed={candlingAllowed}
          daysSinceLaying={daysSinceLaying}
          onClose={() => setActiveEgg(null)}
          onSave={updateEggStatus}
        />
      )}

      {/* Modal: Daftarkan kura baru setelah menetas */}
      {showHatchModal !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowHatchModal(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-background rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-3">
              <div className="text-4xl">🐢</div>
              <h3 className="font-bold text-lg">Telur #{showHatchModal} menetas!</h3>
              <p className="text-sm text-muted-foreground">Daftarkan kura baru hasil penetasan ini?</p>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowHatchModal(null)}>
                  Nanti Saja
                </Button>
                <Button className="flex-1" onClick={() => {
                  setShowHatchModal(null);
                  onRequestNewTortoise?.({
                    parent_male: breeding.male_name,
                    parent_female: breeding.female_name,
                    birth_date: new Date().toISOString().split("T")[0],
                    status: "baby",
                    source: "hasil_sendiri",
                    enclosure: "Baby 1",
                  });
                }}>
                  Ya, Daftarkan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}