import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { isManagerLevel } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Wrench, Plus, Undo2, Loader2, Clock, PackageX,
} from "lucide-react";
import { safeFormatDate, safeDaysSince } from "@/lib/safeDate";
import LoanForm from "@/components/tools/LoanForm";
import ReturnDialog from "@/components/tools/ReturnDialog";
import RequestForm from "@/components/tools/RequestForm";
import RequestCard from "@/components/tools/RequestCard";

export default function AlatKerjaPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const isKeeper = ["keeper", "kepala_feeder"].includes(role);
  const isMgr = isManagerLevel(role);

  const [showLoan, setShowLoan] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [tab, setTab] = useState("active");

  const { data: activeLoans = [], isLoading: alLoading } = useQuery({
    queryKey: ["tool-loans-active"],
    queryFn: () => base44.entities.ToolLoan.filter({ status: "dipinjam" }, "-loan_date", 200),
    staleTime: 60 * 1000,
  });
  const { data: returnedLoans = [], isLoading: rlLoading } = useQuery({
    queryKey: ["tool-loans-returned"],
    queryFn: () => base44.entities.ToolLoan.filter({ status: "dikembalikan" }, "-return_date", 200),
    staleTime: 60 * 1000,
  });
  const { data: requests = [], isLoading: rqLoading } = useQuery({
    queryKey: ["tool-requests-all"],
    queryFn: () => base44.entities.ToolRequest.list("-request_date", 200),
    staleTime: 60 * 1000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tool-loans-active"] });
    qc.invalidateQueries({ queryKey: ["tool-loans-returned"] });
    qc.invalidateQueries({ queryKey: ["tool-requests-all"] });
    qc.invalidateQueries({ queryKey: ["my-active-loans"] });
  };

  if (!isMgr && !isKeeper) return <AccessDenied />;

  // Keeper view: their own loans + their requests
  const myActive = activeLoans.filter((l) => l.borrower_email === user?.email);
  const myRequests = requests.filter((r) => r.requester_email === user?.email);
  const pendingMgr = requests.filter((r) => r.status === "menunggu");
  const otherRequests = requests.filter((r) => r.status !== "menunggu");

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold font-heading">🔧 Alat Kerja</h1>
            <p className="text-xs text-muted-foreground">
              {isKeeper ? "Pinjam, kembalikan, atau ajukan alat" : "Peminjaman & pengajuan alat"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isKeeper && (
            <>
              <Button size="sm" className="gap-1.5" onClick={() => setShowLoan(true)}>
                <Plus className="w-4 h-4" /> Pinjam
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowReturn(true)}>
                <Undo2 className="w-4 h-4" /> Kembalikan
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowRequest(true)}>
                <PackageX className="w-4 h-4" /> Ajukan
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KEEPER VIEW */}
      {isKeeper && (
        <div className="space-y-4">
          {/* My active loans */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Sedang Saya Pinjam ({myActive.length})
            </p>
            {alLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : myActive.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">Tidak ada alat yang sedang Anda pinjam.</Card>
            ) : (
              <div className="space-y-2">
                {myActive.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} showBorrower={false} />
                ))}
              </div>
            )}
          </div>

          {/* My requests */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Pengajuan Saya ({myRequests.length})
            </p>
            {rqLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : myRequests.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">Belum ada pengajuan.</Card>
            ) : (
              <div className="space-y-2">
                {myRequests.map((req) => (
                  <RequestCard key={req.id} req={req} canApprove={false} approverName={user?.full_name || user?.email} onSaved={invalidate} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANAGER VIEW */}
      {isMgr && (
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-2">
            {[
              ["active", `Sedang Dipinjam (${activeLoans.length})`],
              ["returned", `Riwayat (${returnedLoans.length})`],
              ["requests", `Pengajuan (${pendingMgr.length})`],
            ].map(([val, label]) => (
              <Button
                key={val}
                size="sm"
                variant={tab === val ? "default" : "outline"}
                onClick={() => setTab(val)}
              >
                {label}
              </Button>
            ))}
          </div>

          {tab === "active" && (
            <div className="space-y-2">
              {alLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : activeLoans.length === 0 ? (
                <Card className="p-4 text-center text-sm text-muted-foreground">Tidak ada alat yang sedang dipinjam.</Card>
              ) : (
                activeLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} showBorrower={true} />
                ))
              )}
            </div>
          )}

          {tab === "returned" && (
            <div className="space-y-2">
              {rlLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : returnedLoans.length === 0 ? (
                <Card className="p-4 text-center text-sm text-muted-foreground">Belum ada riwayat pengembalian.</Card>
              ) : (
                returnedLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} showBorrower={true} isReturned />
                ))
              )}
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-2">
              {rqLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : requests.length === 0 ? (
                <Card className="p-4 text-center text-sm text-muted-foreground">Belum ada pengajuan alat.</Card>
              ) : (
                [...pendingMgr, ...otherRequests].map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    canApprove={true}
                    approverName={user?.full_name || user?.email}
                    onSaved={invalidate}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showLoan} onOpenChange={setShowLoan}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Pinjam Alat</DialogTitle></DialogHeader>
          <LoanForm user={user} onClose={() => setShowLoan(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>

      <Dialog open={showReturn} onOpenChange={setShowReturn}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Undo2 className="w-5 h-5 text-primary" /> Kembalikan Alat</DialogTitle></DialogHeader>
          <ReturnDialog user={user} onClose={() => setShowReturn(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>

      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PackageX className="w-5 h-5 text-primary" /> Ajukan Alat Kerja</DialogTitle></DialogHeader>
          <RequestForm user={user} onClose={() => setShowRequest(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoanCard({ loan, showBorrower, isReturned }) {
  const days = safeDaysSince(loan.loan_date);
  const isOverdue14 = !isReturned && days !== null && days > 14;
  const isOverdue7 = !isReturned && days !== null && days > 7 && days <= 14;

  const conditionBadge = {
    baik: "bg-green-100 text-green-700",
    rusak: "bg-orange-100 text-orange-700",
    hilang: "bg-red-100 text-red-700",
  };

  return (
    <Card className={`p-3 ${isOverdue14 ? "border-red-300 bg-red-50/30" : isOverdue7 ? "border-amber-300 bg-amber-50/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{loan.tool_name}</span>
            {!isReturned && days !== null && (
              <Badge variant="outline" className={`text-[10px] ${isOverdue14 ? "bg-red-100 text-red-700" : isOverdue7 ? "bg-amber-100 text-amber-700" : "bg-muted"}`}>
                {days} hari
              </Badge>
            )}
            {isReturned && loan.return_condition && (
              <Badge variant="outline" className={`text-[10px] ${conditionBadge[loan.return_condition] || ""}`}>
                {loan.return_condition}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {showBorrower && `oleh ${loan.borrower_name} · `}
            Pinjam: {safeFormatDate(loan.loan_date, "d MMM yyyy")}
            {isReturned && ` · Kembali: ${safeFormatDate(loan.return_date, "d MMM yyyy")}`}
          </p>
          {loan.purpose && <p className="text-[11px] text-muted-foreground mt-0.5">Keperluan: {loan.purpose}</p>}
          {isReturned && loan.return_notes && (
            <p className="text-[11px] text-muted-foreground mt-0.5">Catatan: {loan.return_notes}</p>
          )}
        </div>
        {isReturned && loan.return_photo_url && (
          <img src={loan.return_photo_url} alt="foto" className="w-10 h-10 rounded-lg object-cover border" />
        )}
      </div>
    </Card>
  );
}