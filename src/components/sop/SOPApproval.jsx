import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, Star, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const statusConfig = {
  submitted: { label: "Menunggu", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Disetujui", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function SOPApproval() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [expanded, setExpanded] = useState({});
  const [approvePoints, setApprovePoints] = useState({});
  const [rejectReason, setRejectReason] = useState({});
  const [processing, setProcessing] = useState({});
  const [filterStatus, setFilterStatus] = useState("submitted");

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["checklists-all", filterStatus],
    queryFn: () =>
      filterStatus === "all"
        ? base44.entities.DailyChecklist.list("-date", 100)
        : base44.entities.DailyChecklist.filter({ status: filterStatus }, "-date", 100),
  });

  const handleApprove = async (checklist) => {
    setProcessing((p) => ({ ...p, [checklist.id]: true }));
    const pts = parseInt(approvePoints[checklist.id] ?? checklist.total_points_claimed);
    await base44.entities.DailyChecklist.update(checklist.id, {
      status: "approved",
      approved_by: user?.full_name || user?.email,
      approved_points: pts,
    });
    // Update/create BonusReward
    const period = checklist.date?.substring(0, 7);
    const existing = await base44.entities.BonusReward.filter({
      employee_email: checklist.employee_email,
      period,
    });
    if (existing.length > 0) {
      await base44.entities.BonusReward.update(existing[0].id, {
        total_points: (existing[0].total_points || 0) + pts,
      });
    } else {
      await base44.entities.BonusReward.create({
        employee_id: checklist.employee_id,
        employee_name: checklist.employee_name,
        employee_email: checklist.employee_email,
        period,
        total_points: pts,
        status: "pending",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["checklists-all"] });
    queryClient.invalidateQueries({ queryKey: ["bonus-rewards"] });
    setProcessing((p) => ({ ...p, [checklist.id]: false }));
  };

  const handleReject = async (checklist) => {
    setProcessing((p) => ({ ...p, [checklist.id]: true }));
    await base44.entities.DailyChecklist.update(checklist.id, {
      status: "rejected",
      approved_by: user?.full_name || user?.email,
      approved_points: 0,
      rejection_reason: rejectReason[checklist.id] || "",
    });
    queryClient.invalidateQueries({ queryKey: ["checklists-all"] });
    setProcessing((p) => ({ ...p, [checklist.id]: false }));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[["submitted", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"], ["all", "Semua"]].map(([val, label]) => (
          <Button
            key={val}
            variant={filterStatus === val ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(val)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : checklists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Tidak ada checklist</div>
      ) : (
        <div className="space-y-3">
          {checklists.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{c.employee_name}</p>
                    <Badge variant="outline" className={`text-[11px] ${statusConfig[c.status]?.color}`}>
                      {statusConfig[c.status]?.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.date ? format(new Date(c.date), "EEEE, d MMMM yyyy", { locale: id }) : "-"}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs font-semibold">{c.total_points_claimed} poin diklaim</span>
                    {c.status === "approved" && (
                      <span className="text-xs text-green-600 ml-2">✓ {c.approved_points} disetujui</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {expanded[c.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {expanded[c.id] && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="space-y-2">
                    {(c.completed_tasks || []).map((t, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">✓ {t.task_title}</span>
                          <span className="text-amber-600 font-medium">{t.points} poin</span>
                        </div>
                        {t.photo_url && (
                          <a href={t.photo_url} target="_blank" rel="noopener noreferrer">
                            <img src={t.photo_url} alt="Bukti" className="h-20 w-32 object-cover rounded border ml-4 hover:opacity-80 transition-opacity cursor-zoom-in" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground italic">Catatan: {c.notes}</p>}

                  {c.status === "submitted" && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground w-24">Poin disetujui:</label>
                        <Input
                          type="number"
                          className="h-8 w-28 text-sm"
                          defaultValue={c.total_points_claimed}
                          onChange={(e) => setApprovePoints((p) => ({ ...p, [c.id]: e.target.value }))}
                        />
                      </div>
                      <Textarea
                        placeholder="Alasan penolakan (jika ditolak)"
                        className="h-16 text-xs resize-none"
                        value={rejectReason[c.id] || ""}
                        onChange={(e) => setRejectReason((p) => ({ ...p, [c.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(c)}
                          disabled={processing[c.id]}
                          className="flex-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(c)}
                          disabled={processing[c.id]}
                          className="flex-1"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Tolak
                        </Button>
                      </div>
                    </div>
                  )}
                  {c.status === "rejected" && c.rejection_reason && (
                    <p className="text-xs text-red-600">Alasan: {c.rejection_reason}</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}