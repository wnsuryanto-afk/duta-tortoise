import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Egg, Loader2, Baby } from "lucide-react";
import { format } from "date-fns";

export default function HatchDialog({ open, onClose, breeding }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [hatched, setHatched] = useState(breeding?.hatched_count || "");
  const [failed, setFailed] = useState("");
  const [autoCreate, setAutoCreate] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    const hatchedCount = Number(hatched) || 0;
    const hatchDate = format(new Date(), "yyyy-MM-dd");

    await base44.entities.Breeding.update(breeding.id, {
      hatched_count: hatchedCount,
      failed_count: Number(failed) || 0,
      status: "menetas",
      hatch_date: hatchDate,
    });

    // Otomatis buat data Tortoise baby hasil menetas
    if (autoCreate && hatchedCount > 0) {
      const prefix = `${breeding.female_name?.substring(0, 3).toUpperCase() || "TT"}-${format(new Date(), "yyMM")}`;
      const babies = [];
      for (let i = 1; i <= hatchedCount; i++) {
        babies.push({
          name: `${prefix}-${String(i).padStart(2, "0")}`,
          source: "hasil_sendiri",
          status: "baby",
          gender: "belum_diketahui",
          birth_date: hatchDate,
          parent_male: breeding.male_id || null,
          parent_female: breeding.female_id || null,
          notes: `Menetas dari breeding ${breeding.male_name} × ${breeding.female_name} (${hatchDate})`,
        });
      }
      await base44.entities.Tortoise.bulkCreate(babies);
    }

    qc.invalidateQueries({ queryKey: ["breedings"] });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    setSaving(false);
    onClose();
  };

  if (!breeding) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Egg className="w-4 h-4 text-amber-500" /> Catat Hasil Menetas
          </DialogTitle>
        </DialogHeader>
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
          <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
            <input
              type="checkbox"
              id="auto_create"
              checked={autoCreate}
              onChange={e => setAutoCreate(e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <label htmlFor="auto_create" className="text-sm text-green-800 cursor-pointer">
              <Baby className="inline w-3.5 h-3.5 mr-1" />
              Buat data Baby Tortoise otomatis dengan source <strong>hasil_sendiri</strong> + data induk
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Status akan diubah ke <strong>Menetas</strong> dan tanggal hari ini dicatat otomatis.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Egg className="w-4 h-4" />}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}