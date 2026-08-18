/**
 * IncidentalTaskUsulanReview — dialog tinjau usulan tugas untuk owner/manajer/admin.
 * Tiga aksi: Setujui (apa adanya), Setujui dengan perubahan (edit judul/bobot/poin
 * lalu setujui), atau Tolak dengan alasan (alasan tampil ke keeper).
 *
 * - Setujui: status → "pending" (tugas resmi, poin berlaku, muncul di Tugas Hari Ini keeper).
 * - Tolak: status → "cancelled" + rejection_reason, is_active false.
 * - Notifikasi dikirim ke keeper yang mengusulkan (created_by_email).
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { BOBOT_OPTIONS, pointsForBobot } from "@/lib/incidentalBobot";

export default function IncidentalTaskUsulanReview({ task, open, onClose, onResolved }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const [title, setTitle] = useState(task?.title || "");
  const [bobot, setBobot] = useState(task?.bobot || "ringan");
  const [points, setPoints] = useState(task?.points ?? 10);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(null); // "approve" | "reject" | null

  // Sync state saat task berganti
  const [lastId, setLastId] = useState(null);
  if (task && task.id !== lastId) {
    setLastId(task.id);
    setTitle(task.title || "");
    setBobot(task.bobot || "ringan");
    setPoints(task.points ?? 10);
    setRejectReason("");
    setSaving(null);
  }

  const notifyKeeper = async (t, statusLabel, extra = "") => {
    if (!t.created_by_email) return;
    try {
      await base44.entities.Notification.create({
        recipient_email: t.created_by_email,
        recipient_role: "keeper",
        title: `Usulan Tugas ${statusLabel}`,
        message: `"${t.title}" — ${statusLabel}${
          statusLabel === "Ditolak" && rejectReason ? `: ${rejectReason}` : ""
        }${statusLabel === "Disetujui" ? ` (${t.points} poin). Tugas kini muncul di daftar Anda.` : ""}`,
        type: statusLabel === "Disetujui" ? "success" : "warning",
        priority: "sedang",
        category: "sistem",
        action_label: "Lihat Tugas",
        action_url: "/tugas-insidentil",
        related_entity_id: t.id,
        related_entity_type: "IncidentalTask",
        is_read: false,
        is_dismissed: false,
        created_at: new Date().toISOString(),
      });
    } catch {
      // best-effort
    }
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["incidental-tasks-all"] });
    qc.invalidateQueries({ queryKey: ["incidental-tasks-mine"] });
  };

  const handleApprove = async () => {
    setSaving("approve");
    try {
      const updated = await base44.entities.IncidentalTask.update(task.id, {
        status: "pending",
        is_active: true,
        title: title.trim() || task.title,
        bobot,
        points: Number(points) || 0,
        rejection_reason: "",
        reviewed_by_name: user?.full_name || user?.email || "",
        reviewed_at: new Date().toISOString(),
      });
      await notifyKeeper({ ...task, title: title.trim() || task.title, points: Number(points) || 0 }, "Disetujui");
      toast.success("Usulan disetujui — tugas kini resmi & poin berlaku.");
      invalidateAll();
      onResolved?.();
      onClose();
    } catch (e) {
      toast.error("Gagal menyetujui: " + (e.message || e));
    }
    setSaving(null);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Isi alasan penolakan agar keeper belajar");
      return;
    }
    setSaving("reject");
    try {
      await base44.entities.IncidentalTask.update(task.id, {
        status: "cancelled",
        is_active: false,
        rejection_reason: rejectReason.trim(),
        reviewed_by_name: user?.full_name || user?.email || "",
        reviewed_at: new Date().toISOString(),
      });
      await notifyKeeper(task, "Ditolak");
      toast.success("Usulan ditolak. Alasan dikirim ke keeper.");
      invalidateAll();
      onResolved?.();
      onClose();
    } catch (e) {
      toast.error("Gagal menolak: " + (e.message || e));
    }
    setSaving(null);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tinjau Usulan Tugas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info pengusul */}
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs">
            <p className="text-yellow-700">
              Diusulkan oleh: <strong>{task.created_by_name || task.created_by_email || "Keeper"}</strong>
            </p>
            {task.created_date && (
              <p className="text-yellow-600/80 mt-0.5">
                {new Date(task.created_date).toLocaleString("id-ID")}
              </p>
            )}
          </div>

          {/* Judul (editable) */}
          <div className="space-y-1.5">
            <Label htmlFor="r-title">Judul</Label>
            <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Keterangan keeper (read-only) */}
          {task.notes && (
            <div className="space-y-1.5">
              <Label>Keterangan dari Keeper</Label>
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2 border">{task.notes}</p>
            </div>
          )}

          {/* Foto kondisi */}
          {task.photo_url && (
            <div className="space-y-1.5">
              <Label>Foto Kondisi</Label>
              <img src={task.photo_url} alt="Kondisi" className="w-full max-h-48 object-cover rounded-lg border" />
            </div>
          )}

          {/* Bobot (editable) */}
          <div className="space-y-1.5">
            <Label>Bobot / Perkiraan Waktu</Label>
            <div className="grid grid-cols-3 gap-2">
              {BOBOT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setBobot(o.value);
                    setPoints(o.points);
                  }}
                  className={`rounded-lg border-2 px-2 py-2 text-center transition-all ${
                    bobot === o.value
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                  }`}
                >
                  <p className="text-xs font-semibold">{o.label}</p>
                  <p className="text-[10px] opacity-80">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Poin (editable) */}
          <div className="space-y-1.5">
            <Label htmlFor="r-points">Poin (boleh diubah)</Label>
            <Input
              id="r-points"
              type="number"
              min="0"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Poin ini yang akan berlaku & masuk perhitungan gaji setelah disetujui.
            </p>
          </div>

          {/* Alasan tolak */}
          <div className="space-y-1.5 border-t pt-3">
            <Label htmlFor="r-reject">Alasan Penolakan (wajib bila menolak)</Label>
            <Textarea
              id="r-reject"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="cth: Pekerjaan sudah ada di jadwal pemeliharaan minggu ini."
              className="resize-none h-14 text-sm"
              maxLength={300}
            />
            <p className="text-[11px] text-muted-foreground">Alasan ini tampil ke keeper supaya mereka belajar.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={!!saving}>
            Tutup
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!!saving}
            className="gap-1.5"
          >
            {saving === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            Tolak
          </Button>
          <Button onClick={handleApprove} disabled={!!saving} className="gap-1.5">
            {saving === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}