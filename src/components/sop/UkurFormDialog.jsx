import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

/**
 * UkurFormDialog — form wajib isi berat + panjang saat mencentang task rotasi ukur.
 * Tanpa angka, centang ditolak. Submit → simpan MeasurementHistory + centang task.
 */
export default function UkurFormDialog({ open, onClose, onSubmit, tortoise, saving }) {
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [error, setError] = useState("");

  // Reset state saat dialog ditutup
  useEffect(() => {
    if (!open) {
      setWeight("");
      setLength("");
      setError("");
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const w = Number(weight);
    const l = Number(length);
    if (!w || w <= 0 || !l || l <= 0) {
      setError("Berat dan panjang wajib diisi (angka > 0)");
      return;
    }
    setError("");
    onSubmit({ weight_grams: w, length_cm: l });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            ⚖️ Timbang & Ukur {tortoise?.code || ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {tortoise?.enclosure && (
            <p className="text-xs text-muted-foreground">🏠 Kandang: {tortoise.enclosure}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Berat (gram) *</Label>
              <Input type="number" min={1} step="0.1" value={weight}
                onChange={(e) => setWeight(e.target.value)} placeholder="0" autoFocus
                className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Panjang (cm) *</Label>
              <Input type="number" min={0.1} step="0.01" value={length}
                onChange={(e) => setLength(e.target.value)} placeholder="0"
                className="mt-1 h-9 text-sm" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <p className="text-[11px] text-muted-foreground">
            Isi kedua angka untuk menyimpan & mencentang task.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>Batal</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : "Simpan & Centang"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}