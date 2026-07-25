import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import TopUpRequestCard from "./TopUpRequestCard";
import ApproveTopUpDialog from "./ApproveTopUpDialog";
import RejectTopUpDialog from "./RejectTopUpDialog";

export default function TopUpRequestList({ isOwner }) {
  const qc = useQueryClient();
  const [approveReq, setApproveReq] = useState(null);
  const [rejectReq, setRejectReq] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["petty-cash-topup-requests"],
    queryFn: () => base44.entities.PettyCashTopUpRequest.list("-request_date", 200),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["petty-cash-topup-requests"] });
    qc.invalidateQueries({ queryKey: ["petty-cash-ledger"] });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Memuat...</div>;

  const activeRequests = requests.filter(r => r.status === "pending");
  const historyRequests = requests.filter(r => r.status !== "pending");

  if (requests.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Belum ada request top-up</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeRequests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Menunggu ({activeRequests.length})</p>
          {activeRequests.map(req => (
            <TopUpRequestCard key={req.id} req={req} isOwner={isOwner} onApprove={setApproveReq} onReject={setRejectReq} />
          ))}
        </div>
      )}
      {historyRequests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Riwayat</p>
          {historyRequests.map(req => (
            <TopUpRequestCard key={req.id} req={req} isOwner={isOwner} onApprove={setApproveReq} onReject={setRejectReq} />
          ))}
        </div>
      )}

      <Dialog open={!!approveReq} onOpenChange={(v) => !v && setApproveReq(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> Setujui & Transfer Top-up</DialogTitle>
          </DialogHeader>
          {approveReq && <ApproveTopUpDialog request={approveReq} onClose={() => setApproveReq(null)} onSaved={invalidate} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectReq} onOpenChange={(v) => !v && setRejectReq(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><XCircle className="w-5 h-5" /> Tolak Request Top-up</DialogTitle>
          </DialogHeader>
          {rejectReq && <RejectTopUpDialog request={rejectReq} onClose={() => setRejectReq(null)} onSaved={invalidate} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}