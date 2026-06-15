import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EGG_STATUS = [
  { value: "belum_dicek", label: "⬜ Belum Dicek",  bg: "bg-gray-100",  border: "border-gray-400",  text: "text-gray-700" },
  { value: "fertile",     label: "🟢 Fertile",       bg: "bg-green-100", border: "border-green-500", text: "text-green-800" },
  { value: "infertil",    label: "🔴 Infertil",      bg: "bg-red-100",   border: "border-red-500",   text: "text-red-800" },
  { value: "menetas",     label: "🟡 Menetas",       bg: "bg-amber-100", border: "border-amber-500", text: "text-amber-800" },
  { value: "gagal",       label: "⚫ Gagal",         bg: "bg-gray-700",  border: "border-gray-800",  text: "text-white" },
];

const STATUS_CELL = {
  belum_dicek: "bg-gray-100 border-gray-300 text-gray-500 border-dashed",
  fertile:     "bg-green-200 border-green-500 text-green-800",
  infertil:    "bg-red-200   border-red-500   text-red-800",
  menetas:     "bg-amber-300 border-amber-500 text-amber-900",
  gagal:       "bg-gray-700  border-gray-800  text-white",
};

// Generate next baby code: BB-YYYYNNN
async function generateBabyCode() {
  const year = new Date().getFullYear();
  const prefix = `BB-${year}`;
  const existing = await base44.entities.Tortoise.filter({ source: "hasil_sendiri" }, "-created_date", 200);
  const nums = existing
    .map(t => t.code || "")
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.replace(prefix, ""), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

// ── Hatch Create Dialog ────────────────────────────────────────────────────────
function HatchCreateDialog({ eggNumber, breeding, hatchDate, onClose, onCreated, onSkip }) {
  const [form, setForm] = useState({
    code: "",
    gender: "belum_diketahui",
    enclosure: "",
    birth_date: hatchDate,
  });
  const [saving, setSaving] = useState(false);
  const [loadingCode, setLoadingCode] = useState(true);

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    generateBabyCode().then(code => {
      setForm(prev => ({ ...prev, code }));
      setLoadingCode(false);
    });
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCreate = async () => {
    if (!form.code || !form.enclosure) {
      toast.error("Kode bayi dan kandang wajib diisi");
      return;
    }
    setSaving(true);
    const newTortoise = await base44.entities.Tortoise.create({
      code: form.code,
      name: form.code,
      birth_date: form.birth_date,
      gender: form.gender,
      source: "hasil_sendiri",
      status: "aktif",
      age_category: "baby",
      enclosure: form.enclosure,
      parent_male: breeding.male_name,
      parent_female: breeding.female_name,
      last_breeding_id: breeding.id,
      weighing_interval_days: 14,
      is_archived: false,
      morph: "normal",
    });
    setSaving(false);
    toast.success(`🐢 Baby ${form.code} berhasil ditambahkan ke kandang ${form.enclosure}`);
    onCreated(newTortoise.id, form.code, form.enclosure);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>🐢 Telur #{eggNumber} Menetas!</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          <p className="text-sm text-muted-foreground">Daftarkan kura baru hasil penetasan ini?</p>

          <div className="space-y-1.5">
            <Label>Kode Bayi *</Label>
            <Input
              value={loadingCode ? "Membuat kode..." : form.code}
              onChange={e => set("code", e.target.value)}
              disabled={loadingCode}
              placeholder="BB-2026001"
            />
            <p className="text-xs text-muted-foreground">Auto-generate, bisa diedit</p>
          </div>

          <div className="space-y-1.5">
            <Label>Jenis Kelamin</Label>
            <Select value={form.gender} onValueChange={v => set("gender", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="belum_diketahui">Belum Diketahui</SelectItem>
                <SelectItem value="jantan">Jantan</SelectItem>
                <SelectItem value="betina">Betina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Kandang Tujuan *</Label>
            <Select value={form.enclosure} onValueChange={v => set("enclosure", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih kandang..." /></SelectTrigger>
              <SelectContent>
                {enclosures.filter(e => e.is_active !== false).map(e => (
                  <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tanggal Menetas</Label>
            <Input type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" onClick={onSkip} disabled={saving}>
              Lewati
            </Button>
            <Button onClick={handleCreate} disabled={saving || loadingCode || !form.enclosure}>
              {saving ? "Menyimpan..." : "🐢 Buat Data Kura"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Bottom Sheet (Mobile) ─────────────────────────────────────────────────────
function EggBottomSheet({ egg, candlingAllowed, onClose, onSave }) {
  const [status, setStatus] = useState(egg.status || "belum_dicek");
  const [notes, setNotes] = useState(egg.notes || "");
  const [saving, setSaving] = useState(false);

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
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-background rounded-t-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-bold text-base">Telur #{egg.egg_number}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
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
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-left font-medium transition-all
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
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="resize-none text-sm" placeholder="Kondisi telur..." />
          </div>
        </div>
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function EggGrid({ breeding }) {
  const qc = useQueryClient();
  const [activeEgg, setActiveEgg] = useState(null);
  const [saving, setSaving] = useState(false);
  // { eggNumber, hatchDate } — triggers HatchCreateDialog
  const [pendingHatch, setPendingHatch] = useState(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const eggCount = breeding.egg_count || 0;
  const records = (() => {
    const r = breeding.egg_records || [];
    if (r.length > 0) return r;
    return Array.from({ length: eggCount }, (_, i) => ({
      egg_number: i + 1, status: "belum_dicek", check_date: null, hatch_date: null, notes: "", tortoise_id: null, tortoise_code: null,
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

  const registeredBabies = records.filter(e => e.status === "menetas" && e.tortoise_id);

  const updateEggStatus = async (eggNumber, newStatus, checkDate, notes) => {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const updated = records.map(e =>
      e.egg_number === eggNumber
        ? { ...e, status: newStatus, check_date: checkDate || today, notes: notes ?? e.notes, hatch_date: newStatus === "menetas" ? (e.hatch_date || today) : e.hatch_date }
        : e
    );
    const hatchedCount = updated.filter(e => e.status === "menetas").length;
    const failedCount  = updated.filter(e => e.status === "gagal").length;
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

    if (newStatus === "menetas") {
      setPendingHatch({ eggNumber, hatchDate: today });
    }
  };

  const handleHatchCreated = async (tortoiseId, tortoiseCode, enclosure) => {
    if (!pendingHatch) return;
    // Save tortoise_id and tortoise_code back to egg_records
    const updated = records.map(e =>
      e.egg_number === pendingHatch.eggNumber
        ? { ...e, tortoise_id: tortoiseId, tortoise_code: tortoiseCode }
        : e
    );
    await base44.entities.Breeding.update(breeding.id, { egg_records: updated });
    qc.invalidateQueries({ queryKey: ["breedings"] });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    setPendingHatch(null);
  };

  const handleHatchSkip = () => {
    setPendingHatch(null);
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
    const failedCount  = updated.filter(e => e.status === "gagal").length;
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
        {summary.menetas > 0 && (
          <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
            🐢 {summary.menetas}/{eggCount} Menetas
          </span>
        )}
        {summary.fertile > 0 && <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">🟢 Fertile: {summary.fertile}</span>}
        {summary.infertil > 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">🔴 Infertil: {summary.infertil}</span>}
        {summary.belum_dicek > 0 && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">⬜ Belum Cek: {summary.belum_dicek}</span>}
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
          🟢 Semua Fertile
        </button>
        <button onClick={() => markAll("infertil")} disabled={saving || !candlingAllowed}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed">
          🔴 Semua Infertil
        </button>
        {!candlingAllowed && (
          <span className="text-[11px] text-muted-foreground self-center">🔒 Candling H+30 (sisa {30 - daysSinceLaying} hari)</span>
        )}
      </div>

      {/* Egg grid */}
      <div className="flex flex-wrap gap-2">
        {records.map((egg) => (
          <div key={egg.egg_number} className="relative flex flex-col items-center gap-0.5">
            <button
              onClick={() => setActiveEgg(activeEgg === egg.egg_number ? null : egg.egg_number)}
              className={`w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all hover:scale-110 active:scale-95 ${STATUS_CELL[egg.status] || STATUS_CELL.belum_dicek}`}
              title={`Telur #${egg.egg_number} — ${egg.status}`}
            >
              {egg.egg_number}
            </button>
            {/* Badge kura yang sudah dibuat */}
            {egg.status === "menetas" && egg.tortoise_code && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 cursor-pointer hover:bg-green-200 font-medium whitespace-nowrap"
                title={`Lihat profil: ${egg.tortoise_code}`}
                onClick={() => window.open(`/tortoise?id=${egg.tortoise_id}`, "_blank")}
              >
                {egg.tortoise_code} →
              </span>
            )}
            {egg.status === "menetas" && !egg.tortoise_code && (
              <span className="text-[9px] px-1 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">belum didata</span>
            )}

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

      {/* Daftar kode bayi dari clutch ini */}
      {registeredBabies.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-amber-800 mb-1.5">🐢 Baby dari clutch ini:</p>
          <div className="flex flex-wrap gap-1.5">
            {registeredBabies.map(e => (
              <span key={e.egg_number} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium">
                {e.tortoise_code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {isMobile && activeEgg !== null && activeEggData && (
        <EggBottomSheet
          egg={activeEggData}
          candlingAllowed={candlingAllowed}
          onClose={() => setActiveEgg(null)}
          onSave={updateEggStatus}
        />
      )}

      {/* Hatch create dialog */}
      {pendingHatch && (
        <HatchCreateDialog
          eggNumber={pendingHatch.eggNumber}
          breeding={breeding}
          hatchDate={pendingHatch.hatchDate}
          onClose={() => setPendingHatch(null)}
          onCreated={handleHatchCreated}
          onSkip={handleHatchSkip}
        />
      )}
    </div>
  );
}