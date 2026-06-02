import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EGG_STATUS = [
  { value: "belum_dicek", label: "⬜ Belum Dicek",  bg: "bg-blue-100",  border: "border-blue-400",  text: "text-blue-700" },
  { value: "fertile",     label: "✅ Fertile",       bg: "bg-green-100", border: "border-green-500", text: "text-green-800" },
  { value: "infertil",    label: "❌ Infertil",      bg: "bg-red-100",   border: "border-red-500",   text: "text-red-800" },
  { value: "menetas",     label: "🐣 Menetas",       bg: "bg-amber-100", border: "border-amber-500", text: "text-amber-800" },
  { value: "gagal",       label: "⚫ Gagal",         bg: "bg-gray-700",  border: "border-gray-800",  text: "text-white" },
];

const STATUS_CELL = {
  belum_dicek: "bg-blue-100 border-blue-300 text-blue-600 border-dashed",
  fertile:     "bg-green-200 border-green-500 text-green-800",
  infertil:    "bg-red-200   border-red-500   text-red-800",
  menetas:     "bg-amber-200 border-amber-500 text-amber-800",
  gagal:       "bg-gray-600  border-gray-700  text-white",
};

// ── Bottom Sheet (Mobile) ─────────────────────────────────────────────────────
function EggBottomSheet({ egg, candlingAllowed, onClose, onSave }) {
  const [status, setStatus] = useState(egg.status || "belum_dicek");
  const [notes, setNotes] = useState(egg.notes || "");
  const [saving, setSaving] = useState(false);

  // lock scroll when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await onSave(egg.egg_number, status, new Date().toISOString().split("T")[0], notes);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 9999 }} onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Sheet */}
      <div
        className="relative bg-background rounded-t-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-bold text-base">Telur #{egg.egg_number}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: "calc(80vh - 160px)" }}>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pilih Status</p>
          <div className="space-y-2">
            {EGG_STATUS.map(s => {
              const isDisabled = (s.value === "fertile" || s.value === "infertil") && !candlingAllowed;
              const isSelected = status === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => !isDisabled && setStatus(s.value)}
                  disabled={isDisabled}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-left font-medium transition-all active:scale-98
                    ${isSelected ? `${s.bg} ${s.border} ${s.text}` : "bg-muted/30 border-transparent text-foreground hover:bg-muted"}
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <span className="text-sm">{s.label}</span>
                  <span className="flex items-center gap-2">
                    {isDisabled && <span className="text-[10px] text-muted-foreground">🔒 H+30</span>}
                    {isSelected && <span className="text-base">✓</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Catatan (opsional)</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              placeholder="Kondisi telur, warna, dll..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t bg-background">
          <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Desktop Popup ─────────────────────────────────────────────────────────────
function EggDesktopPopup({ egg, candlingAllowed, onClose, onSave }) {
  const [saving, setSaving] = useState(false);

  const handleSelect = async (value) => {
    setSaving(true);
    await onSave(egg.egg_number, value, new Date().toISOString().split("T")[0], egg.notes || "");
    setSaving(false);
    onClose();
  };

  return (
    <div className="absolute z-50 top-12 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-xl p-2 min-w-[170px]">
      <p className="text-[10px] text-muted-foreground font-semibold px-2 py-1 uppercase tracking-wide">Telur #{egg.egg_number}</p>
      {EGG_STATUS.map(s => {
        const isDisabled = (s.value === "fertile" || s.value === "infertil") && !candlingAllowed;
        return (
          <button
            key={s.value}
            onClick={() => !isDisabled && !saving && handleSelect(s.value)}
            disabled={saving || isDisabled}
            className={`w-full text-left text-xs px-3 py-2 rounded-lg mb-0.5 transition-colors flex items-center justify-between
              ${egg.status === s.value ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted"}
              ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span>{s.label}</span>
            {isDisabled && <span className="text-[9px] text-muted-foreground">🔒</span>}
            {egg.status === s.value && !isDisabled && <span className="text-[10px]">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Hatch Modal ───────────────────────────────────────────────────────────────
function HatchModal({ eggNumber, breeding, onClose, onRegister }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-background rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-3">
          <div className="text-5xl">🐢</div>
          <h3 className="font-bold text-lg">Telur #{eggNumber} Menetas!</h3>
          <p className="text-sm text-muted-foreground">Daftarkan kura baru hasil penetasan ini ke dalam sistem?</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Nanti Saja</Button>
            <Button className="flex-1" onClick={onRegister}>Ya, Daftarkan</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EggGrid({ breeding, onRequestNewTortoise }) {
  const qc = useQueryClient();
  const [activeEgg, setActiveEgg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHatchModal, setShowHatchModal] = useState(null);

  // Detect mobile by window width (reactive)
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Build records: if no egg_records yet, generate from egg_count
  const eggCount = breeding.egg_count || 0;
  const records = (() => {
    const r = breeding.egg_records || [];
    if (r.length > 0) return r;
    return Array.from({ length: eggCount }, (_, i) => ({
      egg_number: i + 1, status: "belum_dicek", check_date: null, hatch_date: null, notes: "",
    }));
  })();

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

  const updateEggStatus = async (eggNumber, newStatus, checkDate, notes) => {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const updated = records.map(e =>
      e.egg_number === eggNumber
        ? { ...e, status: newStatus, check_date: checkDate || today, notes: notes ?? e.notes, hatch_date: newStatus === "menetas" ? today : e.hatch_date }
        : e
    );
    const hatchedCount = updated.filter(e => e.status === "menetas").length;
    const failedCount  = updated.filter(e => e.status === "gagal" || e.status === "infertil").length;
    const allFinal     = updated.every(e => e.status !== "belum_dicek" && e.status !== "fertile");
    const breedingStatus = allFinal ? (hatchedCount > 0 ? "menetas" : "gagal") : breeding.status;

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
    if (newStatus === "menetas") setShowHatchModal(eggNumber);
  };

  const markAll = async (status) => {
    if (!candlingAllowed && (status === "fertile" || status === "infertil")) {
      toast.error(`Candling tersedia setelah ${30 - daysSinceLaying} hari lagi`);
      return;
    }
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const updated = records.map(e => ({ ...e, status, check_date: today }));
    const hatchedCount = updated.filter(e => e.status === "menetas").length;
    const failedCount  = updated.filter(e => e.status === "gagal" || e.status === "infertil").length;
    await base44.entities.Breeding.update(breeding.id, {
      egg_records: updated, hatched_count: hatchedCount, failed_count: failedCount,
    });
    qc.invalidateQueries({ queryKey: ["breedings"] });
    setSaving(false);
    toast.success(`Semua telur → ${status}`);
  };

  if (eggCount === 0) return <p className="text-xs text-muted-foreground">Tidak ada data telur</p>;

  const activeEggData = activeEgg !== null ? records.find(e => e.egg_number === activeEgg) : null;

  return (
    <div className="space-y-3">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {summary.fertile > 0 && <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">✅ Fertile: {summary.fertile}</span>}
        {summary.infertil > 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">❌ Infertil: {summary.infertil}</span>}
        {summary.menetas > 0 && <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">🐣 Menetas: {summary.menetas}</span>}
        {summary.belum_dicek > 0 && <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">⬜ Belum Cek: {summary.belum_dicek}</span>}
        {summary.gagal > 0 && <span className="px-2 py-1 rounded-full bg-gray-700 text-white">⚫ Gagal: {summary.gagal}</span>}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
        <div className="bg-green-400 transition-all" style={{ width: `${(summary.fertile / eggCount) * 100}%` }} />
        <div className="bg-amber-400 transition-all" style={{ width: `${(summary.menetas / eggCount) * 100}%` }} />
        <div className="bg-red-400 transition-all" style={{ width: `${(summary.infertil / eggCount) * 100}%` }} />
        <div className="bg-gray-600 transition-all" style={{ width: `${(summary.gagal / eggCount) * 100}%` }} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => markAll("fertile")} disabled={saving || !candlingAllowed}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed">
          ✅ Semua Fertile
        </button>
        <button onClick={() => markAll("infertil")} disabled={saving || !candlingAllowed}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed">
          ❌ Semua Infertil
        </button>
        {!candlingAllowed && (
          <span className="text-[11px] text-muted-foreground self-center">🔒 Candling H+30 (sisa {30 - daysSinceLaying} hari)</span>
        )}
      </div>

      {/* Egg grid */}
      <div className="flex flex-wrap gap-2">
        {records.map((egg) => (
          <div key={egg.egg_number} className="relative">
            <button
              onClick={() => setActiveEgg(activeEgg === egg.egg_number ? null : egg.egg_number)}
              className={`w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all hover:scale-110 active:scale-95 ${STATUS_CELL[egg.status] || STATUS_CELL.belum_dicek}`}
              title={`Telur #${egg.egg_number} — ${egg.status}`}
            >
              {egg.egg_number}
            </button>

            {/* Desktop popup */}
            {!isMobile && activeEgg === egg.egg_number && activeEggData && (
              <EggDesktopPopup
                egg={activeEggData}
                candlingAllowed={candlingAllowed}
                onClose={() => setActiveEgg(null)}
                onSave={updateEggStatus}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && activeEgg !== null && activeEggData && (
        <EggBottomSheet
          egg={activeEggData}
          candlingAllowed={candlingAllowed}
          onClose={() => setActiveEgg(null)}
          onSave={updateEggStatus}
        />
      )}

      {/* Hatch modal */}
      {showHatchModal !== null && (
        <HatchModal
          eggNumber={showHatchModal}
          breeding={breeding}
          onClose={() => setShowHatchModal(null)}
          onRegister={() => {
            setShowHatchModal(null);
            onRequestNewTortoise?.({
              parent_male: breeding.male_name,
              parent_female: breeding.female_name,
              birth_date: new Date().toISOString().split("T")[0],
              status: "baby",
              source: "hasil_sendiri",
              enclosure: "Baby 1",
            });
          }}
        />
      )}
    </div>
  );
}