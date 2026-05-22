import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Egg, Loader2, Baby, CheckCircle2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

// Format kode breeding dari nama-nama induk dan tanggal
function generateBreedingCode(maleN, femaleN, date) {
  const m = (maleN || "JT").substring(0, 3).toUpperCase().replace(/\s/g, "");
  const f = (femaleN || "BT").substring(0, 3).toUpperCase().replace(/\s/g, "");
  const d = date ? date.replace(/-/g, "").substring(2, 8) : format(new Date(), "yyMMdd");
  return `${m}${f}-${d}`;
}

export default function HatchDialog({ open, onClose, breeding }) {
  const qc = useQueryClient();
  const [step, setStep] = useState("form"); // "form" | "confirm" | "done"
  const [saving, setSaving] = useState(false);
  const [hatched, setHatched] = useState(breeding?.hatched_count || "");
  const [failed, setFailed] = useState("");
  const [hatchDate, setHatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [babyEnclosure, setBabyEnclosure] = useState("");
  const [createdBabies, setCreatedBabies] = useState([]);

  // Generate preview baby names
  const breedingCode = generateBreedingCode(breeding?.male_name, breeding?.female_name, hatchDate);
  const hatchedCount = Number(hatched) || 0;
  const babyNames = Array.from({ length: hatchedCount }, (_, i) =>
    `${breedingCode}-Baby-${String(i + 1).padStart(2, "0")}`
  );

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list(),
  });

  const handleSave = async () => {
    setSaving(true);

    await base44.entities.Breeding.update(breeding.id, {
      hatched_count: hatchedCount,
      failed_count: Number(failed) || 0,
      status: "menetas",
      hatch_date: hatchDate,
    });

    let newBabies = [];
    if (hatchedCount > 0) {
      const babies = babyNames.map((name) => ({
        name,
        source: "hasil_sendiri",
        status: "baby",
        gender: "belum_diketahui",
        birth_date: hatchDate,
        parent_male: breeding.male_id || null,
        parent_female: breeding.female_id || null,
        enclosure: babyEnclosure || undefined,
        notes: `Menetas dari breeding ${breeding.male_name} × ${breeding.female_name} (${hatchDate})`,
      }));
      newBabies = await base44.entities.Tortoise.bulkCreate(babies);
    }

    qc.invalidateQueries({ queryKey: ["breedings"] });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    setSaving(false);
    setCreatedBabies(newBabies || babyNames.map((n) => ({ name: n })));
    setStep("done");
  };

  const handleClose = () => {
    setStep("form");
    setHatched(breeding?.hatched_count || "");
    setFailed("");
    setHatchDate(format(new Date(), "yyyy-MM-dd"));
    setBabyEnclosure("");
    setCreatedBabies([]);
    onClose();
  };

  if (!breeding) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Egg className="w-4 h-4 text-amber-500" />
            {step === "done" ? "Penetasan Berhasil!" : "Catat Hasil Menetas"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Form Input */}
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
                <Input
                  type="number" min={0}
                  value={hatched}
                  onChange={e => setHatched(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Jumlah Gagal ❌</Label>
                <Input
                  type="number" min={0}
                  value={failed}
                  onChange={e => setFailed(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal Menetas</Label>
              <Input
                type="date"
                value={hatchDate}
                onChange={e => setHatchDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kandang Baby (opsional)</Label>
              <Select value={babyEnclosure} onValueChange={setBabyEnclosure}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kandang..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Belum ditentukan</SelectItem>
                  {enclosures.map(e => (
                    <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hatchedCount > 0 && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                <p className="text-xs font-medium text-green-800 mb-1.5">
                  <Baby className="inline w-3.5 h-3.5 mr-1" />
                  Preview nama baby yang akan dibuat:
                </p>
                <div className="flex flex-wrap gap-1">
                  {babyNames.slice(0, 6).map(n => (
                    <span key={n} className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-mono">{n}</span>
                  ))}
                  {babyNames.length > 6 && (
                    <span className="text-[10px] text-green-600">+{babyNames.length - 6} lainnya</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Batal</Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => hatchedCount > 0 ? setStep("confirm") : handleSave()}
                disabled={!hatched}
              >
                <Egg className="w-4 h-4" />
                {hatchedCount > 0 ? "Lanjut Konfirmasi" : "Simpan"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Konfirmasi */}
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
              <p className="text-xs font-medium text-green-800 mb-2">
                Baby yang akan dibuat ({hatchedCount} ekor):
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {babyNames.map(n => (
                  <p key={n} className="text-xs font-mono text-green-700">• {n}</p>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Semua baby akan otomatis masuk ke daftar Tortoise dengan source <strong>hasil_sendiri</strong> dan data induk terisi.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>Kembali</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Egg className="w-4 h-4" />}
                {saving ? "Menyimpan..." : "Konfirmasi & Simpan"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="space-y-4 pt-2 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Penetasan berhasil dicatat!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hatchedCount} baby tortoise telah ditambahkan ke daftar koleksi.
              </p>
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
              <Link to="/tortoise" onClick={handleClose} className="flex-1">
                <Button className="w-full gap-2">
                  <ExternalLink className="w-4 h-4" /> Lihat Koleksi
                </Button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}