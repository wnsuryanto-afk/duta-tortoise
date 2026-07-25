/**
 * FotoPenyakitVerificationPanel — panel untuk owner memverifikasi foto
 * penyakit yang sudah dikerjakan feeder/keeper.
 *
 * - "Setujui & Masukkan ke Panduan": push foto ke DiagnosisProtocol.images
 *   + approve DailyChecklist (poin cair).
 * - "Tolak": tandai task, foto tidak masuk Panduan.
 * - Anti-duplikat: cek url belum ada di images.
 *
 * Props: protocol (DiagnosisProtocol)
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function FotoPenyakitVerificationPanel({ protocol }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [processingId, setProcessingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: doneTasks = [], isLoading } = useQuery({
    queryKey: ["foto-penyakit-tasks", protocol?.diagnosis_code],
    queryFn: async () => {
      const all = await base44.entities.IncidentalTask.filter({ status: "done" }, "-done_date", 200);
      const marker = `[FOTO_PENYAKIT:${protocol.diagnosis_code}]`;
      return all.filter((t) => t.notes?.includes(marker) && t.done_photo_url);
    },
    enabled: !!protocol?.diagnosis_code,
    staleTime: 30 * 1000,
  });

  const protocolImageUrls = (protocol?.images || []).map((img) => img.url);

  const getTaskStatus = (task) => {
    if (protocolImageUrls.includes(task.done_photo_url)) return "approved";
    if (task.done_notes?.includes("[FOTO DITOLAK")) return "rejected";
    return "pending";
  };

  const handleApprove = async (task) => {
    setProcessingId(task.id);
    try {
      // 1. Push foto ke DiagnosisProtocol.images (anti-duplikat)
      const currentImages = protocol.images || [];
      if (currentImages.some((img) => img.url === task.done_photo_url)) {
        toast.info("Foto sudah ada di Panduan");
      } else {
        const newImages = [...currentImages, { url: task.done_photo_url, caption: task.done_notes || "" }];
        await base44.entities.DiagnosisProtocol.update(protocol.id, { images: newImages });
      }

      // 2. Approve DailyChecklist (cairkan poin) jika masih submitted
      if (task.daily_checklist_id) {
        try {
          const cl = await base44.entities.DailyChecklist.get(task.daily_checklist_id);
          if (cl && cl.status === "submitted") {
            await base44.entities.DailyChecklist.update(cl.id, {
              status: "approved",
              approved_points: cl.total_points_claimed || task.points || 0,
              approved_by: user?.full_name || user?.email,
            });
          }
        } catch {
          // DailyChecklist mungkin tidak ada, abaikan
        }
      }

      qc.invalidateQueries({ queryKey: ["diagnosis-protocol"] });
      qc.invalidateQueries({ queryKey: ["foto-penyakit-tasks"] });
      toast.success("Foto disetujui & dimasukkan ke Panduan Penyakit");
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setProcessingId(null);
  };

  const handleReject = async (task) => {
    if (!rejectReason.trim()) {
      toast.error("Isi alasan penolakan");
      return;
    }
    setProcessingId(task.id);
    try {
      const newNotes = (task.done_notes || "") + ` [FOTO DITOLAK: ${rejectReason.trim()}]`;
      await base44.entities.IncidentalTask.update(task.id, { done_notes: newNotes });
      qc.invalidateQueries({ queryKey: ["foto-penyakit-tasks"] });
      toast.success("Foto ditolak");
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setProcessingId(null);
  };

  if (isLoading || doneTasks.length === 0) return null;

  return (
    <Card className="p-4 border-l-4 border-l-[#1B4332] bg-[#F0F7F2]/40">
      <p className="font-bold text-[#1B4332] flex items-center gap-1.5 mb-1">
        <Camera className="w-4 h-4" /> Verifikasi Foto Penyakit
      </p>
      <p className="text-[11px] text-muted-foreground mb-3">
        Foto dari feeder/keeper yang menunggu verifikasi untuk masuk ke Panduan.
      </p>

      <div className="space-y-3">
        {doneTasks.map((task) => {
          const status = getTaskStatus(task);
          return (
            <div key={task.id} className="bg-white/70 rounded-lg p-3 border border-border">
              <div className="flex gap-3">
                <img
                  src={task.done_photo_url}
                  alt="Foto penyakit"
                  className="w-24 h-24 rounded-lg object-cover border flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1B4332]">{task.title}</p>
                  {task.done_notes && !task.done_notes.includes("[FOTO DITOLAK") && (
                    <p className="text-xs text-muted-foreground mt-0.5">{task.done_notes}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    📸 {task.done_by_name || "Keeper"} · {task.done_date || "—"}
                  </p>
                </div>
              </div>

              {status === "pending" && (
                <div className="mt-3 space-y-2">
                  {rejectingId === task.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Alasan penolakan..."
                        className="w-full text-xs border border-border rounded-lg px-2 py-1.5 resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                        >
                          Batal
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1"
                          disabled={processingId === task.id}
                          onClick={() => handleReject(task)}
                        >
                          {processingId === task.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          Tolak
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
                        disabled={processingId === task.id}
                        onClick={() => handleApprove(task)}
                      >
                        {processingId === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Setujui & Masukkan ke Panduan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50 gap-1"
                        onClick={() => setRejectingId(task.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Tolak
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {status === "approved" && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5 border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Sudah masuk ke Panduan Penyakit
                </div>
              )}

              {status === "rejected" && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-1.5 border border-red-200">
                  ✗ Ditolak. Foto tidak masuk Panduan.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}