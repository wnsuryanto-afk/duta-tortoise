import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

const STATUS_CONFIG = {
  pending:  { label: "Menunggu",  color: "bg-amber-100 text-amber-700" },
  approved: { label: "Disetujui", color: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak",   color: "bg-red-100 text-red-700" },
};

function formatRp(n) {
  return "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");
}

export default function TopUpRequestCard({ req, isOwner, onApprove, onReject }) {
  const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{req.requester_name}</span>
            <Badge className={sc.color}>{sc.label}</Badge>
          </div>
          <p className="text-lg font-bold text-primary">{formatRp(req.amount_requested)}</p>
          <p className="text-sm text-muted-foreground mt-1">{req.reason}</p>
          {req.status === "approved" && req.transfer_proof_url && (
            <div className="mt-2">
              <img src={req.transfer_proof_url} alt="bukti transfer" className="w-16 h-16 rounded-lg object-cover border" />
            </div>
          )}
          {req.status === "approved" && req.approved_by && (
            <p className="text-xs text-muted-foreground mt-1">Disetujui oleh {req.approved_by}{req.transfer_date ? ` · ${req.transfer_date}` : ""}</p>
          )}
          {req.status === "rejected" && req.rejection_reason && (
            <p className="text-xs text-red-500 mt-1">Alasan: {req.rejection_reason}</p>
          )}
        </div>
        {isOwner && req.status === "pending" && (
          <div className="flex flex-col gap-1.5">
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => onApprove(req)}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Setujui & Transfer
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200" onClick={() => onReject(req)}>
              <XCircle className="w-3.5 h-3.5" /> Tolak
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}