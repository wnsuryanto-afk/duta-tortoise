/**
 * FotoPenyakitRequestButton — tombol untuk owner meminta feeder/keeper
 * memfoto kura dengan gejala penyakit tertentu.
 *
 * UX: klik → dialog konfirmasi (pilih due_date) → anti-duplikat cek →
 * buat IncidentalTask → notifikasi sukses/peringatan/error.
 *
 * Anti-duplikat: cek marker [FOTO_PENYAKIT:kode] di notes + status "pending".
 *
 * Props: protocol (DiagnosisProtocol)
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Camera, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function FotoPenyakitRequestButton({ protocol }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [showConfirm, setShowConfirm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const handleClick = () => {
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setCreating(true);
    try {
      // Anti-duplikat: cek apakah sudah ada tugas pending untuk penyakit ini
      const existing = await base44.entities.IncidentalTask.filter(
        { status: "pending" },
        "-created_date",
        200
      );
      const marker = `[FOTO_PENYAKIT:${protocol.diagnosis_code}]`;
      const duplicate = existing.find(
        (t) => t.notes?.includes(marker) && t.is_active !== false
      );

      if (duplicate) {
        toast.warning(
          "⚠ Sudah ada tugas foto aktif untuk penyakit ini. Cek daftar Tugas."
        );
        setShowConfirm(false);
        setCreating(false);
        return;
      }

      // Buat tugas baru
      await base44.entities.IncidentalTask.create({
        title: `Foto kura dengan gejala ${protocol.diagnosis_name}`,
        notes: `${marker} Foto kura yang menunjukkan gejala ${protocol.diagnosis_name} untuk melengkapi Panduan Penyakit. Diagnosis: ${protocol.diagnosis_code}. WAJIB foto kondisi kura.`,
        points: 10,
        due_date: dueDate,
        status: "pending",
        material_status: "ready",
        is_active: true,
        created_by_email: user?.email,
        created_by_name: user?.full_name || user?.email,
      });

      qc.invalidateQueries({ queryKey: ["incidental-tasks"] });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-mine"] });
      toast.success("✓ Tugas foto berhasil dibuat untuk feeder. Cek di daftar Tugas.");
      setShowConfirm(false);
    } catch (err) {
      toast.error("✗ Gagal membuat tugas, coba lagi.");
    }
    setCreating(false);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={creating}
        className="gap-2 text-white"
        style={{ backgroundColor: "#E76F00" }}
      >
        {creating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
        Minta Foto Penyakit Ini
      </Button>

      <Dialog open={showConfirm} onOpenChange={(v) => !v && !creating && setShowConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1B4332]">
              <Camera className="w-5 h-5" /> Minta Foto Penyakit?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Buat tugas untuk feeder memfoto kura dengan gejala{" "}
              <span className="font-semibold text-foreground">{protocol.diagnosis_name}</span>?
              Tugas bernilai{" "}
              <span className="font-semibold text-[#E76F00]">10 poin</span>.
            </p>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Tenggat (due_date)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDueDate(format(new Date(), "yyyy-MM-dd"))}
                  className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                    dueDate === format(new Date(), "yyyy-MM-dd")
                      ? "border-[#E76F00] bg-orange-50 text-[#E76F00]"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  Hari ini
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(tomorrow)}
                  className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                    dueDate === tomorrow
                      ? "border-[#E76F00] bg-orange-50 text-[#E76F00]"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  Besok
                </button>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-2 w-full text-xs border border-border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Tugas akan muncul di daftar Tugas feeder/keeper. Poin baru cair setelah foto
                diverifikasi owner.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={creating}
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={creating}
              className="gap-1.5 text-white"
              style={{ backgroundColor: "#E76F00" }}
            >
              {creating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              Ya, Buat Tugas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}