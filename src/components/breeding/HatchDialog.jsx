import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { tulisInduk } from "@/lib/silsilah";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Egg, Loader2, Baby, CheckCircle2, ExternalLink, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Link } from "react-router-dom";

function generateBreedingCode(maleN, femaleN, date) {
  const m = (maleN || "JT").substring(0, 3).toUpperCase().replace(/\s/g, "");
  const f = (femaleN || "BT").substring(0, 3).toUpperCase().replace(/\s/g, "");
  const d = date ? date.replace(/-/g, "").substring(2, 8) : format(new Date(), "yyMMdd");
  return `${m}${f}-${d}`;
}

// Generate baby name dengan format: Baby-YYMMDD-NN
function generateBabyName(hatchDate, index) {
  const dateStr = hatchDate ? hatchDate.replace(/-/g, "").substring(2, 8) : format(new Date(), "yyMMdd");
  return `Baby-${dateStr}-${String(index + 1).padStart(2, "0")}`;
}

const SHELL_TYPES = [
  { value: "normal", label: "Normal" },
  { value: "less_scute", label: "Less Scute (kekurangan scute)" },
  { value: "over_scute", label: "Over Scute (kelebihan scute)" },
  { value: "pyramiding", label: "Pyramiding" },
  { value: "smooth", label: "Smooth" },
  { value: "wavy", label: "Wavy" },
  { value: "irregular", label: "Irregular" },
];

const GENDER_OPTIONS = [
  { value: "belum_diketahui", label: "Belum Diketahui" },
  { value: "jantan", label: "Jantan ♂" },
  { value: "betina", label: "Betina ♀" },
];

function BabyForm({ baby, onChange, index, total }) {
  const [uploading, setUploading] = useState(false);

  const handlePhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange({ ...baby, photo_url: file_url });
    setUploading(false);
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-green-50/30">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Nama Baby</Label>
          <Input
            value={baby.name}
            onChange={e => onChange({ ...baby, name: e.target.value })}
            className="mt-0.5 h-8 text-sm font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Shell Type</Label>
          <Select value={baby.shell_type} onValueChange={v => onChange({ ...baby, shell_type: v })}>
            <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHELL_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Gender</Label>
          <Select value={baby.gender} onValueChange={v => onChange({ ...baby, gender: v })}>
            <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Berat (gram)</Label>
          <Input type="number" min={0} value={baby.weight_grams || ""} onChange={e => onChange({ ...baby, weight_grams: e.target.value })} placeholder="0" className="mt-0.5 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Panjang Tempurung (cm)</Label>
          <Input type="number" min={0} step="0.1" value={baby.shell_length_cm || ""} onChange={e => onChange({ ...baby, shell_length_cm: e.target.value })} placeholder="0.0" className="mt-0.5 h-8 text-sm" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Foto Baby (opsional)</Label>
        <div className="mt-0.5 flex items-center gap-2">
          {baby.photo_url ? (
            <img src={baby.photo_url} alt="baby" className="w-12 h-12 rounded-lg object-cover border" />
          ) : null}
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : "📷 Upload Foto"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e.target.files?.[0])} disabled={uploading} />
          </label>
          {baby.photo_url && <button className="text-xs text-destructive" onClick={() => onChange({ ...baby, photo_url: "" })}>Hapus</button>}
        </div>
      </div>

      <div>
        <Label className="text-xs">Catatan (opsional)</Label>
        <Textarea value={baby.notes || ""} onChange={e => onChange({ ...baby, notes: e.target.value })} className="mt-0.5 h-14 resize-none text-xs" placeholder="Kondisi khusus, warna, dll..." />
      </div>
    </div>
  );
}

export default function HatchDialog({ open, onClose, breeding }) {
  const qc = useQueryClient();
  const [step, setStep] = useState("form"); // "form" | "baby-data" | "confirm" | "done"
  const [saving, setSaving] = useState(false);
  const [hatched, setHatched] = useState(breeding?.hatched_count || "");
  const [failed, setFailed] = useState("");
  const [hatchDate, setHatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [babyEnclosure, setBabyEnclosure] = useState("");
  const [createdBabies, setCreatedBabies] = useState([]);
  const [babies, setBabies] = useState([]);
  const [fillMode, setFillMode] = useState("all"); // "all" | "one"
  const [currentBabyIdx, setCurrentBabyIdx] = useState(0);

  const breedingCode = generateBreedingCode(breeding?.male_name, breeding?.female_name, hatchDate);
  const hatchedCount = Number(hatched) || 0;

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list("-created_date", 200),
  });

  // Filter hanya kandang baby (indoor + nama mengandung "baby")
  const babyEnclosures = useMemo(() =>
    enclosures.filter(e =>
      e.type === "indoor" && e.name.toLowerCase().includes("baby") && e.is_active !== false
    ),
    [enclosures]
  );

  const allBabyFull = babyEnclosures.length > 0 && babyEnclosures.every(e =>
    e.current_count >= e.max_capacity
  );

  const selectedEnclosure = babyEnclosures.find(e => e.name === babyEnclosure);

  const initBabies = async (count, encName) => {
    // Generate nama baby dengan format Baby-YYMMDD-NN
    // Cek juga baby yang sudah menetas di tanggal yang sama untuk nomor urut
    const dateStr = hatchDate.replace(/-/g, "").substring(2, 8);
    const existingBabies = await base44.entities.Tortoise.filter({
      birth_date: hatchDate,
    }, "-created_date", 200);
    const startIdx = existingBabies.length;
    
    return Array.from({ length: count }, (_, i) => {
      const babyNum = startIdx + i + 1;
      const autoName = generateBabyName(hatchDate, babyNum - 1);
      return {
        name: autoName,
        shell_type: "normal",
        gender: "belum_diketahui",
        weight_grams: "",
        shell_length_cm: "",
        photo_url: "",
        notes: `Anak dari ${breeding.male_name} × ${breeding.female_name}. Menetas pada ${format(new Date(hatchDate), "d MMMM yyyy", { locale: id })}`,
        enclosure: encName,
        enclosure_id: selectedEnclosure?.id || "",
      };
    });
  };

  const handleNextToBabyData = async () => {
    if (hatchedCount <= 0) return;
    const newBabies = await initBabies(hatchedCount, babyEnclosure);
    setBabies(newBabies);
    setCurrentBabyIdx(0);
    setStep("baby-data");
  };

  const updateBaby = (idx, updated) => {
    setBabies(prev => prev.map((b, i) => i === idx ? updated : b));
  };

  const handleSave = async () => {
    setSaving(true);

    // Hatch rate ikut disimpan. Sebelumnya hanya tombol "Selesaikan Inkubasi"
    // yang mengisinya, jadi clutch yang ditutup dari sini tidak pernah
    // menampilkan angka keberhasilannya di kartu mana pun.
    const jumlahTelur = Number(breeding.egg_count) || 0;
    await base44.entities.Breeding.update(breeding.id, {
      hatched_count: hatchedCount,
      failed_count: Number(failed) || 0,
      status: "menetas",
      hatch_date: hatchDate,
      hatch_rate: jumlahTelur > 0 ? Math.round((hatchedCount / jumlahTelur) * 100) : 0,
    });

    let newBabies = [];
    if (hatchedCount > 0) {
      const babyData = babies.map(b => ({
        name: b.name,
        source: "hasil_sendiri",
        status: "baby",
        gender: b.gender || "belum_diketahui",
        birth_date: hatchDate,
        // `breeding.male_id || null` menghapus tautannya sama sekali bila
        // induknya belum terdaftar sebagai kura. Namanya dipakai sebagai jalan
        // terakhir supaya silsilahnya tidak hilang begitu saja.
        parent_male: tulisInduk(breeding.male_id, breeding.male_name),
        parent_female: tulisInduk(breeding.female_id, breeding.female_name),
        // Tautan langsung ke clutch-nya. Tanpa ini, satu-satunya cara
        // menemukan bayi ini sebagai keturunan clutch-nya adalah menebak dari
        // pasangan induknya — dan itu keliru begitu pasangan yang sama
        // bertelur lebih dari sekali.
        last_breeding_id: breeding.id,
        enclosure: b.enclosure || undefined,
        shell_type: b.shell_type || "normal",
        weight_grams: b.weight_grams ? Number(b.weight_grams) : undefined,
        shell_length_cm: b.shell_length_cm ? Number(b.shell_length_cm) : undefined,
        photo_url: b.photo_url || undefined,
        notes: b.notes || `Menetas dari breeding ${breeding.male_name} × ${breeding.female_name} (${hatchDate})`,
      }));
      newBabies = await base44.entities.Tortoise.bulkCreate(babyData);

      // Update current_count kandang baby
      if (babyEnclosure && selectedEnclosure) {
        const newCount = (selectedEnclosure.current_count || 0) + hatchedCount;
        await base44.entities.Enclosure.update(selectedEnclosure.id, { current_count: newCount });
      }
    }

    // TIDAK PERLU UPDATE current_eggs lagi - dihitung otomatis dari Breeding
    // Status breeding berubah jadi "menetas" akan otomatis mengurangi telur inkubator

    qc.invalidateQueries({ queryKey: ["breedings"] });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    qc.invalidateQueries({ queryKey: ["enclosures"] });
    setSaving(false);
    setCreatedBabies(newBabies || babies);
    setStep("done");
  };

  const handleClose = () => {
    setStep("form");
    setHatched(breeding?.hatched_count || "");
    setFailed("");
    setHatchDate(format(new Date(), "yyyy-MM-dd"));
    setBabyEnclosure("");
    setCreatedBabies([]);
    setBabies([]);
    setCurrentBabyIdx(0);
    onClose();
  };

  if (!breeding) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Egg className="w-4 h-4 text-amber-500" />
            {step === "done" ? "Penetasan Berhasil! 🎉" :
             step === "baby-data" ? `Data Baby (${hatchedCount} ekor)` :
             "Catat Hasil Menetas"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Form dasar ── */}
        {step === "form" && (
          <div className="space-y-4 pt-2">
            <div className="bg-muted/40 rounded-xl p-3 text-sm">
              <p className="font-medium">{breeding.male_name} × {breeding.female_name}</p>
              {breeding.egg_count > 0 && (
                <p className="text-muted-foreground mt-0.5">Total telur: {breeding.egg_count} butir</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Jumlah Menetas 🐢</Label>
                <Input type="number" min={0} value={hatched} onChange={e => setHatched(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Jumlah Gagal ❌</Label>
                <Input type="number" min={0} value={failed} onChange={e => setFailed(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal Menetas</Label>
              <Input type="date" value={hatchDate} onChange={e => setHatchDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kandang Baby 🏠</Label>
              {allBabyFull ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Semua kandang baby sudah penuh. Pindahkan baby ke kandang lain terlebih dahulu.
                </div>
              ) : (
                <Select value={babyEnclosure} onValueChange={setBabyEnclosure}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kandang baby..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Belum ditentukan</SelectItem>
                    {babyEnclosures.map(e => {
                      const isFull = e.current_count >= e.max_capacity;
                      return (
                        <SelectItem key={e.id} value={e.name} disabled={isFull}>
                          {e.name} (isi: {e.current_count}/{e.max_capacity}){isFull ? " — PENUH" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {babyEnclosures.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada kandang baby. Tambahkan kandang indoor dengan nama "Baby X" terlebih dahulu.</p>
              )}
            </div>

            {hatchedCount > 0 && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                <p className="text-xs font-medium text-green-800 mb-1.5">
                  <Baby className="inline w-3.5 h-3.5 mr-1" />
                  {hatchedCount} baby akan dibuat. Langkah berikutnya: isi data tiap baby.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Batal</Button>
              <Button
                className="flex-1 gap-2"
                onClick={hatchedCount > 0 ? handleNextToBabyData : handleSave}
                disabled={!hatched || saving}
              >
                <Egg className="w-4 h-4" />
                {hatchedCount > 0 ? "Isi Data Baby →" : "Simpan"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Form data baby ── */}
        {step === "baby-data" && (
          <div className="space-y-4 pt-2">
            {/* Toggle mode */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {[["all","Isi Sekaligus"],["one","Satu per Satu"]].map(([m,l]) => (
                  <button key={m} onClick={() => { setFillMode(m); setCurrentBabyIdx(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${fillMode === m ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                    {l}
                  </button>
                ))}
              </div>
              {fillMode === "one" && (
                <p className="text-xs text-muted-foreground">Baby {currentBabyIdx + 1} dari {babies.length}</p>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${fillMode === "one" ? ((currentBabyIdx + 1) / babies.length) * 100 : 100}%` }} />
            </div>

            {/* Kandang info */}
            {babyEnclosure && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800">
                <Baby className="w-3.5 h-3.5" /> Semua baby → kandang <strong>{babyEnclosure}</strong>
              </div>
            )}

            {/* Forms */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {fillMode === "all" ? (
                babies.map((b, i) => (
                  <BabyForm key={i} baby={b} index={i} total={babies.length} onChange={updated => updateBaby(i, updated)} />
                ))
              ) : (
                <BabyForm baby={babies[currentBabyIdx]} index={currentBabyIdx} total={babies.length} onChange={updated => updateBaby(currentBabyIdx, updated)} />
              )}
            </div>

            {/* Navigation for one-by-one */}
            {fillMode === "one" && babies.length > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentBabyIdx(i => Math.max(0, i - 1))} disabled={currentBabyIdx === 0} className="gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                </Button>
                <Button size="sm" onClick={() => setCurrentBabyIdx(i => Math.min(babies.length - 1, i + 1))} disabled={currentBabyIdx === babies.length - 1} className="gap-1 flex-1">
                  Berikutnya <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>← Kembali</Button>
              <Button className="flex-1 gap-2 bg-primary hover:bg-primary/90" onClick={() => setStep("confirm")}>
                Konfirmasi & Simpan →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Konfirmasi ── */}
        {step === "confirm" && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-900 mb-2">Konfirmasi Penetasan</p>
              <div className="space-y-1 text-sm text-amber-800">
                <p>🥚 Induk: <strong>{breeding.male_name} × {breeding.female_name}</strong></p>
                <p>🐢 Menetas: <strong>{hatchedCount} ekor</strong></p>
                <p>❌ Gagal: <strong>{Number(failed) || 0} butir</strong></p>
                <p>📅 Tanggal: <strong>{hatchDate}</strong></p>
                {babyEnclosure && <p>🏠 Kandang: <strong>{babyEnclosure}</strong></p>}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-xs font-medium text-green-800 mb-2">Baby yang akan dibuat ({hatchedCount} ekor):</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {babies.map((b, i) => (
                  <p key={i} className="text-xs font-mono text-green-700">• {b.name} — {b.shell_type}, {b.gender}{b.weight_grams ? `, ${b.weight_grams}g` : ""}</p>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Semua baby otomatis masuk ke daftar Tortoise dengan source <strong>hasil_sendiri</strong>, data induk, dan kandang yang dipilih.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("baby-data")}>Kembali Edit</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Egg className="w-4 h-4" />}
                {saving ? "Menyimpan..." : "Simpan Semua"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === "done" && (
          <div className="space-y-4 pt-2 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">🐢 {hatchedCount} baby tortoise berhasil didaftarkan!</p>
              <p className="text-sm text-muted-foreground mt-1">Semua baby sudah masuk ke daftar koleksi.</p>
            </div>

            {createdBabies.length > 0 && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-left">
                <p className="text-xs font-medium text-green-800 mb-1.5">Baby yang dibuat:</p>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {createdBabies.map((b, i) => (
                    <p key={i} className="text-xs font-mono text-green-700">✓ {b.name}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Tutup</Button>
              <Link to="/tortoise?status=baby" onClick={handleClose} className="flex-1">
                <Button className="w-full gap-2">
                  <ExternalLink className="w-4 h-4" /> Lihat Data Baby
                </Button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}