/**
 * FotoPenyakitRequestButton — tombol untuk owner meminta feeder/keeper
 * memfoto kura dengan gejala penyakit tertentu. Membuat IncidentalTask
 * dengan diagnosis_code tertanam di notes untuk routing foto.
 *
 * Props: protocol (DiagnosisProtocol)
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function FotoPenyakitRequestButton({ protocol }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [creating, setCreating] = useState(false);

  const handleClick = async () => {
    setCreating(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      await base44.entities.IncidentalTask.create({
        title: `Foto kura dengan gejala ${protocol.diagnosis_name}`,
        notes: `[FOTO_PENYAKIT:${protocol.diagnosis_code}] Foto kura yang menunjukkan gejala ${protocol.diagnosis_name} untuk melengkapi Panduan Penyakit. Diagnosis: ${protocol.diagnosis_code}. WAJIB foto kondisi kura.`,
        points: 10,
        due_date: today,
        status: "pending",
        material_status: "ready",
        is_active: true,
        created_by_email: user?.email,
        created_by_name: user?.full_name || user?.email,
      });
      qc.invalidateQueries({ queryKey: ["incidental-tasks"] });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-mine"] });
      toast.success("Tugas foto penyakit dibuat untuk feeder/keeper");
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setCreating(false);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={creating}
      className="gap-2 text-white"
      style={{ backgroundColor: "#E76F00" }}
    >
      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
      Minta Foto Penyakit Ini
    </Button>
  );
}