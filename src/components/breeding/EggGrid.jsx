import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { tulisInduk } from "@/lib/silsilah";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { X, Shell, Baby, ExternalLink, Lock, LockOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { hatchRateClutch } from "@/lib/hasilInkubasi";

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

// ── Egg Detail Popup (Desktop) ─────────────────────────────────────────────────
function EggDetailPopup({ egg, breeding, breedingStatus, candlingAllowed, onClose, onUpdateStatus, onOpenHatchCreate }) {
  const [confirmChange, setConfirmChange] = useState(null); // status to change to
  const [saving, setSaving] = useState(false);

  const isReadonly = breedingStatus === "selesai";
  const hasBaby = egg.status === "menetas" && egg.tortoise_id;

  const handleChangeStatus = async (newStatus) => {
    if (newStatus === egg.status) { onClose(); return; }
    // If changing from "menetas" and baby exists → confirm
    if (egg.status === "menetas" && egg.tortoise_id) {
      setConfirmChange(newStatus);
      return;
    }
    setSaving(true);
    await onUpdateStatus(egg.egg_number, newStatus);
    setSaving(false);
    onClose();
  };

  const handleConfirmChange = async () => {
    setSaving(true);
    await onUpdateStatus(egg.egg_number, confirmChange);
    setSaving(false);
    setConfirmChange(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[999]" onClick={onClose} />
      <div
        className="fixed z-[1000] bg-card border border-border rounded-xl shadow-2xl p-4 w-[320px]"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxHeight: "85vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Telur #{egg.egg_number}</p>
            <Badge className={`mt-1 ${egg.status === "menetas" ? "bg-amber-100 text-amber-800 border-amber-300" : egg.status === "gagal" ? "bg-gray-700 text-white" : "bg-muted text-foreground"}`}>
              {egg.status === "menetas" ? "🐢 Menetas" : egg.status === "gagal" ? "⚫ Gagal" : egg.status === "fertile" ? "🟢 Fertile" : egg.status === "infertil" ? "🔴 Infertil" : "⬜ Belum Dicek"}
            </Badge>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isReadonly && (
          <div className="mb-3 p-2.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" /> Inkubasi sudah selesai — data terkunci
          </div>
        )}

        {/* Baby info for hatched eggs */}
        {egg.status === "menetas" && (
          <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-900 mb-2">🐢 Telur Menetas</p>
            {hasBaby ? (
              <div className="space-y-2">
                <p className="text-sm font-bold text-amber-800">Baby: {egg.tortoise_code}</p>
                <div className="flex gap-2">
                  <a
                    href={`/tortoise?id=${egg.tortoise_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 font-medium"
                  >
                    <ExternalLink className="w-3 h-3" /> Lihat Profil Kura
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-amber-700">Belum ada data kura dibuat.</p>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { onClose(); onOpenHatchCreate(egg.egg_number); }}
                  disabled={isReadonly}
                >
                  <Baby className="w-3.5 h-3.5" /> Buat Data Kura Sekarang
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Status change buttons (only if not readonly) */}
        {!isReadonly && (
          <div>
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">
              {egg.status === "menetas" ? "Ubah Status (koreksi)" : "Pilih Status"}
            </p>
            <div className="space-y-1">
              {EGG_STATUS.map(s => {
                const isDisabled = (s.value === "fertile" || s.value === "infertil") && !candlingAllowed;
                const isActive = egg.status === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => !isDisabled && !saving && handleChangeStatus(s.value)}
                    disabled={saving || isDisabled}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-between
                      ${isActive ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted"}
                      ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <span>{s.label}</span>
                    {isDisabled && <span className="text-[9px] text-muted-foreground">🔒 H+30</span>}
                    {isActive && <span className="text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog for changing from menetas */}
      {confirmChange && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center" onClick={() => setConfirmChange(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl p-5 w-[340px]" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-sm mb-2">⚠️ Konfirmasi Ubah Status</p>
            <p className="text-sm text-muted-foreground mb-4">
              Baby <strong>{egg.tortoise_code}</strong> sudah dibuat dari telur ini. Yakin ubah status ke "{confirmChange}"? Data kura tidak otomatis terhapus.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmChange(null)}>Batal</Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirmChange} disabled={saving}>
                {saving ? "..." : "Ya, Ubah"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Egg Bottom Sheet (Mobile) ──────────────────────────────────────────────────
function EggBottomSheet({ egg, breeding, breedingStatus, candlingAllowed, onClose, onUpdateStatus, onOpenHatchCreate }) {
  const [status, setStatus] = useState(egg.status || "belum_dicek");
  const [notes, setNotes] = useState(egg.notes || "");
  const [saving, setSaving] = useState(false);
  const [confirmChange, setConfirmChange] = useState(null);

  const isReadonly = breedingStatus === "selesai";
  const hasBaby = egg.status === "menetas" && egg.tortoise_id;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const triggerSave = async (newStatus) => {
    if (newStatus === egg.status) { onClose(); return; }
    if (egg.status === "menetas" && egg.tortoise_id) {
      setConfirmChange(newStatus);
      return;
    }
    setSaving(true);
    await onUpdateStatus(egg.egg_number, newStatus, new Date().toISOString().split("T")[0], notes);
    setSaving(false);
    onClose();
  };

  const handleConfirmChange = async () => {
    setSaving(true);
    await onUpdateStatus(egg.egg_number, confirmChange, new Date().toISOString().split("T")[0], notes);
    setSaving(false);
    setConfirmChange(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 9999 }} onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-background rounded-t-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h3 className="font-bold text-base">Telur #{egg.egg_number}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: "calc(85vh - 160px)" }}>

            {isReadonly && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Inkubasi sudah selesai — data terkunci
              </div>
            )}

            {/* Baby info */}
            {egg.status === "menetas" && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold text-amber-900 mb-2">🐢 Telur Menetas</p>
                {hasBaby ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-amber-800">Baby: {egg.tortoise_code}</p>
                    <a
                      href={`/tortoise?id=${egg.tortoise_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" /> Lihat Profil Kura
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-700">Belum ada data kura dibuat.</p>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => { onClose(); onOpenHatchCreate(egg.egg_number); }}
                      disabled={isReadonly}
                    >
                      <Baby className="w-3.5 h-3.5" /> Buat Data Kura Sekarang
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!isReadonly && (
              <>
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
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="resize-none text-sm" />
                </div>
              </>
            )}
          </div>
          {!isReadonly && (
            <div className="flex gap-3 px-5 py-4 border-t bg-background">
              <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
              <Button className="flex-1" onClick={() => triggerSave(status)} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmChange && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" onClick={() => setConfirmChange(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl p-5 w-[340px]" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-sm mb-2">⚠️ Konfirmasi Ubah Status</p>
            <p className="text-sm text-muted-foreground mb-4">
              Baby <strong>{egg.tortoise_code}</strong> sudah dibuat dari telur ini. Yakin ubah status ke "{confirmChange}"? Data kura tidak otomatis terhapus.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmChange(null)}>Batal</Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirmChange} disabled={saving}>
                {saving ? "..." : "Ya, Ubah"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Hatch Create Dialog ────────────────────────────────────────────────────────
function HatchCreateDialog({ eggNumber, breeding, hatchDate, onClose, onCreated, onSkip }) {
  const [form, setForm] = useState({
    code: "",
    gender: "belum_diketahui",
    enclosure: "",
    birth_date: hatchDate,
    weight_grams: "",
  });
  const [saving, setSaving] = useState(false);
  const [loadingCode, setLoadingCode] = useState(true);

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list("-created_date", 200),
    staleTime: 5 * 60 * 1000,
  });
  const { data: femaleTortoise } = useQuery({
    queryKey: ["tortoise-female", breeding?.female_id],
    queryFn: () => breeding?.female_id ? base44.entities.Tortoise.get(breeding.female_id) : null,
    enabled: !!breeding?.female_id,
  });

  useEffect(() => {
    (async () => {
      const year = new Date().getFullYear();
      const prefix = `BB-${year}`;
      const existing = await base44.entities.Tortoise.list("-created_date", 2000);
      const nums = existing
        .map(t => t.code || "")
        .filter(c => c.startsWith(prefix))
        .map(c => parseInt(c.replace(prefix, ""), 10))
        .filter(n => !isNaN(n));
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      setForm(prev => ({ ...prev, code: `${prefix}${String(next).padStart(3, "0")}` }));
      setLoadingCode(false);
    })();
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
      species: femaleTortoise?.species || "sulcata",
      source: "hasil_sendiri",
      status: "aktif",
      age_category: "baby",
      enclosure: form.enclosure,
      // ID induk, bukan namanya. Nama ikut berubah saat kura diganti nama dan
      // sambungan silsilahnya lepas tanpa peringatan; ID tidak. Bila induknya
      // memang belum terdaftar sebagai kura, namanya tetap dipakai supaya
      // penetasan masih bisa dicatat.
      parent_male: tulisInduk(breeding.male_id, breeding.male_name),
      parent_female: tulisInduk(breeding.female_id, breeding.female_name),
      last_breeding_id: breeding.id,
      weight_grams: form.weight_grams ? Number(form.weight_grams) : undefined,
      weighing_interval_days: 14,
      is_archived: false,
      morph: "normal",
      purchase_price: 0,
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
            <Input value={loadingCode ? "Membuat kode..." : form.code} onChange={e => set("code", e.target.value)} disabled={loadingCode} />
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
          <div className="space-y-1.5">
            <Label>Berat Awal (gram) — opsional</Label>
            <Input type="number" min="0" value={form.weight_grams} onChange={e => set("weight_grams", e.target.value)} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" onClick={onSkip} disabled={saving}>Lewati</Button>
            <Button onClick={handleCreate} disabled={saving || loadingCode || !form.enclosure}>
              {saving ? "Menyimpan..." : "🐢 Buat Data Kura"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Selesaikan Inkubasi Dialog ─────────────────────────────────────────────────
function SelesaikanDialog({ breeding, eggRecords, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);

  const menetasCount = eggRecords.filter(e => e.status === "menetas").length;
  const fertileCount = eggRecords.filter(e => e.status === "fertile").length;
  const infertilCount = eggRecords.filter(e => e.status === "infertil").length;
  const gagalCount = eggRecords.filter(e => e.status === "gagal").length;
  const total = eggRecords.length;
  const hatchRate = total > 0 ? Math.round((menetasCount / total) * 100) : 0;

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl p-5 w-[380px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-lg mb-1">✅ Selesaikan Inkubasi</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Yakin selesaikan inkubasi batch <strong>{breeding.male_name} × {breeding.female_name}</strong>? Setelah selesai, status telur tidak bisa diubah lagi.
        </p>

        <div className="bg-muted/40 rounded-xl p-3 space-y-1.5 text-sm mb-4">
          <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">📊 Ringkasan:</p>
          <div className="flex justify-between"><span>🐢 Menetas:</span> <strong>{menetasCount} ekor</strong></div>
          <div className="flex justify-between"><span>🟢 Fertile (belum menetas):</span> <strong>{fertileCount} butir</strong></div>
          <div className="flex justify-between"><span>🔴 Infertil:</span> <strong>{infertilCount} butir</strong></div>
          <div className="flex justify-between"><span>⚫ Gagal:</span> <strong>{gagalCount} butir</strong></div>
          <div className="flex justify-between border-t pt-1.5 mt-1.5">
            <span>📈 Hatch Rate:</span> <strong className="text-primary">{hatchRate}%</strong>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
          <Button className="flex-1 gap-1.5 bg-green-700 hover:bg-green-800" onClick={handleConfirm} disabled={saving}>
            {saving ? "Menyimpan..." : <><CheckCircle2 className="w-4 h-4" /> Ya, Selesaikan</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Buka Kembali Dialog ────────────────────────────────────────────────────────
function BukaKembaliDialog({ breeding, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl p-5 w-[340px]" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-lg mb-1">🔓 Buka Kembali Inkubasi</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Buka kembali inkubasi <strong>{breeding.male_name} × {breeding.female_name}</strong>? Status akan kembali menjadi "Bertelur" dan semua telur bisa diedit lagi.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
          <Button variant="destructive" className="flex-1" onClick={handleConfirm} disabled={saving}>
            {saving ? "..." : "Ya, Buka Kembali"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EggGrid({ breeding, onRefresh }) {
  const qc = useQueryClient();
  const { role } = useCurrentUser();
  const [activeEgg, setActiveEgg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingHatch, setPendingHatch] = useState(null);
  const [showSelesaiDialog, setShowSelesaiDialog] = useState(false);
  const [showBukaKembaliDialog, setShowBukaKembaliDialog] = useState(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isReadonly = breeding.status === "selesai";
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
    fertile_only: records.filter(e => e.status === "fertile").length,
    infertil:    records.filter(e => e.status === "infertil").length,
    menetas:     records.filter(e => e.status === "menetas").length,
    gagal:       records.filter(e => e.status === "gagal").length,
  };
  // fertile TOTAL = fertile_only + menetas + gagal (menetas & gagal are sub-categories)
  const fertileTotal = summary.fertile_only + summary.menetas + summary.gagal;
  // berkembang = fertile yang masih dalam proses (belum menetas, belum gagal)
  const berkembang = summary.fertile_only;
  // Validation
  const calculatedTotal = fertileTotal + summary.infertil + summary.belum_dicek;
  const dataMismatch = calculatedTotal !== eggCount;

  const registeredBabies = records.filter(e => e.status === "menetas" && e.tortoise_id);
  const allChecked = summary.belum_dicek === 0;

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

    await base44.entities.Breeding.update(breeding.id, {
      egg_records: updated,
      hatched_count: hatchedCount,
      failed_count: failedCount,
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

  const handleHatchSkip = () => { setPendingHatch(null); };

  const handleOpenHatchCreate = (eggNumber) => {
    setPendingHatch({ eggNumber, hatchDate: new Date().toISOString().split("T")[0] });
  };

  const handleSelesaikanInkubasi = async () => {
    const menetasCount = records.filter(e => e.status === "menetas").length;
    const fertileCount = records.filter(e => e.status === "fertile").length;
    const infertilCount = records.filter(e => e.status === "infertil").length;
    const gagalCount = records.filter(e => e.status === "gagal").length;
    // Penyebutnya lewat satu fungsi bersama. Dialog penetasan dulu membaginya
    // dengan `egg_count`, EggGrid dengan jumlah baris — untuk clutch yang kedua
    // angkanya berselisih, hasilnya bergantung tombol mana yang ditekan.
    const hatchRate = hatchRateClutch(breeding, menetasCount);

    await base44.entities.Breeding.update(breeding.id, {
      status: "selesai",
      completed_date: new Date().toISOString().split("T")[0],
      hatched_count: menetasCount,
      failed_count: gagalCount,
      fertile_count: menetasCount + fertileCount,
      infertile_count: infertilCount,
      hatch_rate: hatchRate,
    });
    qc.invalidateQueries({ queryKey: ["breedings"] });
    toast.success("✅ Inkubasi telah diselesaikan!");
    onRefresh?.();
  };

  const handleBukaKembali = async () => {
    await base44.entities.Breeding.update(breeding.id, {
      status: "bertelur",
      completed_date: null,
    });
    qc.invalidateQueries({ queryKey: ["breedings"] });
    toast.success("🔓 Inkubasi dibuka kembali — semua telur bisa diedit");
    onRefresh?.();
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
      {/* Summary chips — corret hierarchy: fertile ⊃ menetas, gagal, berkembang */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="px-2 py-1 rounded-full bg-muted text-foreground font-semibold">
          Total: {eggCount} butir
        </span>
        {fertileTotal > 0 && (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">
            🟢 Fertile: {fertileTotal} {fertileTotal > 0 && <span className="opacity-70">→ 🐢{summary.menetas} 💀{summary.gagal} 🥚{berkembang}</span>}
          </span>
        )}
        {summary.infertil > 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">🔴 Infertil: {summary.infertil}</span>}
        {summary.belum_dicek > 0 && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">⬜ Belum Cek: {summary.belum_dicek}</span>}
        {dataMismatch && (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300" title="Total egg_records tidak sama dengan egg_count">
            ⚠️ Data telur perlu dicek ulang
          </span>
        )}
      </div>

      {/* Progress bar — sections sum to 100% without overlap */}
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
        <div className="bg-green-400 transition-all" style={{ width: `${(fertileTotal / eggCount) * 100}%` }} />
        <div className="bg-red-300 transition-all" style={{ width: `${(summary.infertil / eggCount) * 100}%` }} />
        <div className="bg-gray-300 transition-all" style={{ width: `${(summary.belum_dicek / eggCount) * 100}%` }} />
      </div>

      {/* Quick actions — only if not readonly */}
      {!isReadonly && (
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
      )}

      {/* Egg grid — ALL eggs always visible */}
      <div className="flex flex-wrap gap-2">
        {records.map((egg) => (
          <div key={egg.egg_number} className="relative flex flex-col items-center gap-0.5">
            <button
              onClick={() => setActiveEgg(activeEgg === egg.egg_number ? null : egg.egg_number)}
              className={`w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all hover:scale-110 active:scale-95
                ${STATUS_CELL[egg.status] || STATUS_CELL.belum_dicek}
                ${isReadonly ? "opacity-80 cursor-pointer" : ""}
              `}
              title={`Telur #${egg.egg_number} — ${egg.status}${isReadonly ? " (Terkunci)" : ""}`}
            >
              {egg.egg_number}
            </button>
            {/* Badge baby */}
            {egg.status === "menetas" && egg.tortoise_code && (
              <a
                href={`/tortoise?id=${egg.tortoise_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 font-medium whitespace-nowrap cursor-pointer"
                title={`Lihat profil: ${egg.tortoise_code}`}
              >
                {egg.tortoise_code} →
              </a>
            )}
            {egg.status === "menetas" && !egg.tortoise_code && !isReadonly && (
              <button
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 font-medium whitespace-nowrap cursor-pointer"
                onClick={() => handleOpenHatchCreate(egg.egg_number)}
                title="Klik untuk daftarkan data kura"
              >
                🐢 + Data
              </button>
            )}

            {/* Desktop popup — ALL eggs clickable */}
            {!isMobile && activeEgg === egg.egg_number && activeEggData && (
              <EggDetailPopup
                egg={activeEggData}
                breeding={breeding}
                breedingStatus={breeding.status}
                candlingAllowed={candlingAllowed}
                onClose={() => setActiveEgg(null)}
                onUpdateStatus={updateEggStatus}
                onOpenHatchCreate={handleOpenHatchCreate}
              />
            )}
          </div>
        ))}
      </div>

      {/* Daftar baby */}
      {registeredBabies.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-amber-800 mb-1.5">🐢 Baby dari clutch ini:</p>
          <div className="flex flex-wrap gap-1.5">
            {registeredBabies.map(e => (
              <a key={e.egg_number} href={`/tortoise?id=${e.tortoise_id}`} target="_blank" rel="noopener noreferrer"
                className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium hover:bg-amber-200">
                {e.tortoise_code}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hasil inkubasi setelah selesai */}
      {isReadonly && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-bold text-green-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> 📊 Hasil Inkubasi
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div>
              <span className="text-green-700">🟢 Fertile: <strong>{fertileTotal}</strong></span>
              <div className="text-xs text-muted-foreground ml-4">
                🐢 Menetas: <strong>{summary.menetas}</strong>{breeding.hatch_rate > 0 && <span> ({breeding.hatch_rate}%)</span>}<br />
                💀 Gagal: <strong>{summary.gagal}</strong><br />
                🥚 Berkembang: <strong>{berkembang}</strong>
              </div>
            </div>
            <div>
              <div><span className="text-red-600">🔴 Infertil: <strong>{summary.infertil}</strong></span></div>
              <div><span className="text-gray-500">⬜ Belum Cek: <strong>{summary.belum_dicek}</strong></span></div>
              {dataMismatch && <div className="text-yellow-600 text-xs mt-1">⚠️ Periksa ulang</div>}
            </div>
          </div>
          {role === "owner" && (
            <Button size="sm" variant="outline" className="mt-2 gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => setShowBukaKembaliDialog(true)}>
              <LockOpen className="w-3.5 h-3.5" /> Buka Kembali
            </Button>
          )}
        </div>
      )}

      {/* Selesaikan Inkubasi / Buka Kembali buttons (not readonly) */}
      {!isReadonly && (
        <div className="flex flex-col gap-1 mt-3 pt-3 border-t">
          {allChecked ? (
            <Button
              size="sm"
              className="gap-1.5 bg-green-700 hover:bg-green-800"
              onClick={() => setShowSelesaiDialog(true)}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Selesaikan Inkubasi
            </Button>
          ) : (
            <div className="relative group inline-block">
              <Button size="sm" disabled className="gap-1.5" variant="outline">
                <Lock className="w-3.5 h-3.5" /> Selesaikan Inkubasi
              </Button>
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                Masih ada {summary.belum_dicek} telur belum dicek
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {isMobile && activeEgg !== null && activeEggData && (
        <EggBottomSheet
          egg={activeEggData}
          breeding={breeding}
          breedingStatus={breeding.status}
          candlingAllowed={candlingAllowed}
          onClose={() => setActiveEgg(null)}
          onUpdateStatus={updateEggStatus}
          onOpenHatchCreate={handleOpenHatchCreate}
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

      {/* Selesai dialog */}
      {showSelesaiDialog && (
        <SelesaikanDialog
          breeding={breeding}
          eggRecords={records}
          onClose={() => setShowSelesaiDialog(false)}
          onConfirm={handleSelesaikanInkubasi}
        />
      )}

      {/* Buka kembali dialog */}
      {showBukaKembaliDialog && (
        <BukaKembaliDialog
          breeding={breeding}
          onClose={() => setShowBukaKembaliDialog(false)}
          onConfirm={handleBukaKembali}
        />
      )}
    </div>
  );
}