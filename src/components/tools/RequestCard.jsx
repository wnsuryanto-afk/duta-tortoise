import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/safeDate";

const statusConfig = {
  menunggu: { label: "Menunggu", color: "bg-amber-100 text-amber-700 border-amber-200" },
  disetujui: { label: "Disetujui", color: "bg-blue-100 text-blue-700 border-blue-200" },
  dibeli: { label: "Dibeli", color: "bg-green-100 text-green-700 border-green-200" },
  ditolak: { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200" },
};

const reasonLabels = { rusak: "Rusak", hilang: "Hilang", perlu_tambahan: "Perlu tambahan" };

export default function RequestCard({ req, canApprove, approverName, onSaved }) {
  const [processing, setProcessing] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const sc = statusConfig[req.status] || statusConfig.menunggu;

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await base44.entities.ToolRequest.update(req.id, {
        status: "disetujui",
        approved_by: approverName,
        approved_date: new Date().toISOString().split("T")[0],
      });
      toast.success("Pengajuan disetujui");
      onSaved?.();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Isi alasan penolakan"); return; }
    setProcessing(true);
    try {
      await base44.entities.ToolRequest.update(req.id, {
        status: "ditolak",
        approved_by: approverName,
        approved_date: new Date().toISOString().split("T")[0],
        rejection_reason: rejectReason.trim(),
      });
      toast.success("Pengajuan ditolak");
      onSaved?.();
      setShowReject(false);
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setProcessing(false);
  };

  const handleBought = async () => {
    setProcessing(true);
    try {
      await base44.entities.ToolRequest.update(req.id, { status: "dibeli" });
      toast.success("Alat ditandai sudah dibeli");
      onSaved?.();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setProcessing(false);
  };

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        {req.photo_url && (
          <img src={req.photo_url} alt="foto" className="w-14 h-14 rounded-lg object-cover border flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{req.tool_name}</span>
            <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
            <Badge variant="outline" className="text-[10px]">{reasonLabels[req.reason] || req.reason}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {req.quantity} pcs · oleh {req.requester_name} · {safeFormatDate(req.request_date, "d MMM yyyy")}
          </p>
          {req.notes && <p className="text-[11px] text-muted-foreground mt-1">{req.notes}</p>}
          {req.rejection_reason && (
            <p className="text-[11px] text-red-600 mt-1">Alasan tolak: {req.rejection_reason}</p>
          )}
        </div>
      </div>

      {canApprove && req.status === "menunggu" && !showReject && (
        <div className="flex gap-2 mt-2">
          <Button size="sm" className="flex-1 gap-1" onClick={handleApprove} disabled={processing}>
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Setujui
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1 text-red-600 border-red-200" onClick={() => setShowReject(true)} disabled={processing}>
            <XCircle className="w-3.5 h-3.5" /> Tolak
          </Button>
        </div>
      )}

      {showReject && (
        <div className="mt-2 space-y-2">
          <Textarea
            placeholder="Alasan penolakan (wajib)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="h-14 text-xs resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowReject(false)} disabled={processing}>Batal</Button>
            <Button size="sm" variant="destructive" className="flex-1" onClick={handleReject} disabled={processing}>
              {processing && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Tolak
            </Button>
          </div>
        </div>
      )}

      {canApprove && req.status === "disetujui" && (
        <Button size="sm" className="w-full mt-2 gap-1" onClick={handleBought} disabled={processing}>
          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
          Tandai Sudah Dibeli
        </Button>
      )}
    </Card>
  );
}