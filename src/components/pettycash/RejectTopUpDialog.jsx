import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

function formatRp(n) {
  return "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");
}

export default function RejectTopUpDialog({ request, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) { toast.error("Alasan penolakan wajib diisi"); return; }
    setSaving(true);
    try {
      await base44.functions.invoke('processTopUpRequest', {
        action: 'reject',
        request_id: request.id,
        rejection_reason: reason.trim(),
      });
      toast.success("Request ditolak. Admin akan diberi tahu.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.data?.error || err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <p className="text-xs text-muted-foreground">Request dari</p>
        <p className="font-semibold">{request.requester_name}</p>
        <p className="text-lg font-bold text-primary mt-1">{formatRp(request.amount_requested)}</p>
      </div>
      <div>
        <Label className="text-xs">Alasan Penolakan *</Label>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="cth: sedang menunggu transfer masuk, coba lagi minggu depan" className="mt-1 resize-none h-20" autoFocus />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button variant="destructive" className="flex-1 gap-1.5" onClick={handleReject} disabled={saving || !reason.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          {saving ? "Menolak..." : "Tolak Request"}
        </Button>
      </div>
    </div>
  );
}