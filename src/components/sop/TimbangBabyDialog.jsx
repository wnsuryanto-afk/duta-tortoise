import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, CheckCircle2, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { compressImage } from "@/lib/useImageCompression";
import { toast } from "sonner";

/**
 * TimbangBabyDialog — alur timbang massal untuk task "Timbang, ukur & foto SEMUA baby (2 minggu sekali)".
 * Memakai mekanisme timbang yang sudah ada: setiap simpan baby → create MeasurementHistory
 * (trigger onMeasurementSaved auto-update profil Tortoise + dorong foto ke galeri).
 * Task di-centang via onDone() → membuat MaintenanceLog seperti alur checklist biasa.
 */
export default function TimbangBabyDialog({ open, onClose, onDone, user, today, task, babies = [], saving, isTestData = false }) {
  const [selected, setSelected] = useState(null);
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [savingBaby, setSavingBaby] = useState(false);
  const [doneIds, setDoneIds] = useState(new Set());

  // Seed: baby yang sudah ditimbang hari ini (MeasurementHistory tanggal hari ini)
  const { data: todayMeasurements = [], refetch } = useQuery({
    queryKey: ["measurements-today", today],
    queryFn: () => base44.entities.MeasurementHistory.filter({ date: today }),
    enabled: open,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (open && todayMeasurements.length > 0) {
      setDoneIds(new Set(todayMeasurements.map(m => m.tortoise_id).filter(Boolean)));
    }
  }, [open, todayMeasurements]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setWeight("");
      setLength("");
      setPhotoFile(null);
      setPreview("");
      setDoneIds(new Set());
    }
  }, [open]);

  // Auto-pilih baby pertama yang belum ditimbang
  useEffect(() => {
    if (open && !selected && babies.length > 0) {
      const next = babies.find(b => !doneIds.has(b.id));
      if (next) setSelected(next);
    }
  }, [open, selected, babies, doneIds]);

  const handlePhoto = (file) => {
    if (!file) return;
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setWeight("");
    setLength("");
    setPhotoFile(null);
    setPreview("");
  };

  const handleSaveBaby = async () => {
    if (!selected || savingBaby) return;
    const w = Number(weight);
    const l = Number(length);
    if (!w || w <= 0 || !l || l <= 0) {
      toast.error("Berat dan panjang wajib diisi (angka > 0)");
      return;
    }
    setSavingBaby(true);
    try {
      let photo_url = "";
      if (photoFile) {
        const compressed = await compressImage(photoFile);
        if (compressed) {
          const res = await base44.integrations.Core.UploadFile({ file: compressed.file });
          photo_url = res.file_url;
        }
      }
      // 1. Simpan MeasurementHistory → trigger onMeasurementSaved update Tortoise + dorong foto ke galeri
      await base44.entities.MeasurementHistory.create({
        tortoise_id: selected.id,
        tortoise_name: selected.name || selected.code,
        date: today,
        weight_grams: w,
        shell_length_cm: l,
        measured_by: user?.full_name || user?.email,
        notes: "Timbang baby massal 2 mingguan",
        photo_url,
        ...(isTestData ? { is_test_data: true } : {}),
      });
      const newDone = new Set(doneIds);
      newDone.add(selected.id);
      setDoneIds(newDone);
      toast.success(`✓ ${selected.name || selected.code} tersimpan`);
      resetForm();
      const next = babies.find(b => !newDone.has(b.id));
      setSelected(next || null);
      refetch();
      if (!next) toast.success("Semua baby sudah ditimbang! 🎉");
    } catch {
      toast.error("Gagal menyimpan. Coba lagi.");
    } finally {
      setSavingBaby(false);
    }
  };

  const total = babies.length;
  const done = doneIds.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done >= total;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            ⚖️ Timbang, Ukur & Foto Semua Baby
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-gray-700">{done} dari {total} baby selesai</span>
            <span className="text-gray-400">{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: allDone ? "#16a34a" : "linear-gradient(90deg,#f9a8d4,#db2777)" }} />
          </div>
        </div>

        {allDone && (
          <p className="text-center text-sm font-bold text-green-700 bg-green-50 rounded-lg py-2">🎉 Semua baby sudah ditimbang!</p>
        )}

        {selected ? (
          <div className="space-y-3 border-2 border-pink-200 rounded-xl p-3 bg-pink-50/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">{selected.name || selected.code}</p>
                <p className="text-xs text-gray-400">{selected.code} {selected.enclosure ? `· 📍 ${selected.enclosure}` : ""}</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); resetForm(); }} className="text-xs text-blue-600 font-medium hover:underline">
                Ganti baby
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Berat (gram) *</Label>
                <Input type="number" min="1" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Panjang (cm) *</Label>
                <Input type="number" min="0.1" step="0.01" value={length} onChange={(e) => setLength(e.target.value)} placeholder="0" className="mt-1 h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Foto</Label>
              <label className="mt-1 flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-pink-300 cursor-pointer hover:bg-pink-50 overflow-hidden">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400"><Camera className="w-4 h-4" /> Ambil / pilih foto</span>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) handlePhoto(e.target.files[0]); e.target.value = ""; }} />
              </label>
            </div>
            <Button type="button" onClick={handleSaveBaby} disabled={savingBaby} className="w-full bg-pink-600 hover:bg-pink-700">
              {savingBaby ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <>Simpan & Lanjut <ChevronRight className="w-4 h-4" /></>}
            </Button>
          </div>
        ) : !allDone && total > 0 ? (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <p className="text-xs text-gray-400 px-1 mb-1">Pilih baby untuk ditimbang:</p>
            {babies.map((b) => {
              const isDone = doneIds.has(b.id);
              return (
                <button key={b.id} type="button" onClick={() => setSelected(b)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left ${isDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200 hover:border-pink-300"}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.name || b.code}</p>
                    <p className="text-xs text-gray-400">{b.code} {b.enclosure ? `· 📍 ${b.enclosure}` : ""}</p>
                  </div>
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <span className="text-xs text-pink-600 font-medium">Timbang</span>}
                </button>
              );
            })}
          </div>
        ) : null}

        {total === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">Tidak ada baby terdaftar saat ini.</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving || savingBaby}>Batal</Button>
          <Button type="button" size="sm" onClick={onDone} disabled={saving || savingBaby}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : done > 0 ? "Selesai & Centang Task" : "Centang Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}