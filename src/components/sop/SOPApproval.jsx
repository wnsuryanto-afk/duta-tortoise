import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Star, ChevronDown, ChevronUp, AlertTriangle, UserCheck } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const statusConfig = {
  submitted: { label: "Menunggu", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved:  { label: "Disetujui", color: "bg-green-100 text-green-700 border-green-200" },
  rejected:  { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200" },
};

function isEnclosureTask(task) {
  const title = (task.task_title || task.task_id || "").toLowerCase();
  return (
    title.includes("bersih") ||
    title.includes("kandang") ||
    title.includes("enclosure") ||
    title.includes("maintenance") ||
    title.includes("kebersihan") ||
    (task.task_id || "").startsWith("enc_") ||
    (task.source === "maintenance_log")
  );
}

function TaskSection({ title, tasks, badgeColor }) {
  const [open, setOpen] = useState(true);
  const total = tasks.reduce((s, t) => s + (t.points || 0), 0);
  if (tasks.length === 0) return null;
  return (
    <div className="border rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold">{title}</span>
          <Badge variant="outline" className={`text-[10px] ${badgeColor}`}>{tasks.length} task</Badge>
        </div>
        <span className="text-xs font-bold text-amber-600">{total} poin</span>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-1.5">
          {tasks.map((t, i) => (
            <div key={i} className="flex items-start justify-between text-xs gap-2">
              <span className="text-muted-foreground flex-1">✓ {t.task_title || t.task_id}</span>
              <span className="text-amber-600 font-medium flex-shrink-0">{t.points || 0} poin</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SOPApproval() {
  const queryClient = useQueryClient();
  const { user, role } = useCurrentUser();
  const [expanded, setExpanded] = useState({});
  // approveGroups[id] = { utama: bool, kandang: bool }
  const [approveGroups, setApproveGroups] = useState({});
  const [rejectReason, setRejectReason] = useState({});
  const [processing, setProcessing] = useState({});
  const [filterStatus, setFilterStatus] = useState("submitted");

  const canApprove = ["owner", "admin", "manajer", "kepala_feeder"].includes(role);

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["checklists-all", filterStatus],
    queryFn: () =>
      filterStatus === "all"
        ? base44.entities.DailyChecklist.list("-date", 100)
        : base44.entities.DailyChecklist.filter({ status: filterStatus }, "-date", 100),
  });

  const getGroups = (c) => {
    const id = c.id;
    const tasks = c.completed_tasks || [];
    const utamaTasks = tasks.filter(t => !isEnclosureTask(t));
    const kandangTasks = tasks.filter(t => isEnclosureTask(t));
    const poinUtama = utamaTasks.reduce((s, t) => s + (t.points || 0), 0);
    const poinKandang = kandangTasks.reduce((s, t) => s + (t.points || 0), 0);

    // Default: both groups approved
    const grp = approveGroups[id] ?? { utama: true, kandang: true };
    const willApprove =
      (grp.utama ? poinUtama : 0) +
      (grp.kandang ? poinKandang : 0);

    return { utamaTasks, kandangTasks, poinUtama, poinKandang, grp, willApprove };
  };

  const toggleGroup = (cId, group) => {
    setApproveGroups(prev => {
      const cur = prev[cId] ?? { utama: true, kandang: true };
      return { ...prev, [cId]: { ...cur, [group]: !cur[group] } };
    });
  };

  const handleApprove = async (checklist) => {
    if (checklist.employee_email === user?.email) {
      alert("Anda tidak bisa menyetujui checklist milik sendiri.");
      return;
    }
    setProcessing(p => ({ ...p, [checklist.id]: true }));
    const { willApprove } = getGroups(checklist);

    await base44.entities.DailyChecklist.update(checklist.id, {
      status: "approved",
      approved_by: user?.full_name || user?.email,
      approved_points: willApprove,
    });

    await logActivity({
      action: "approve",
      entity_type: "DailyChecklist",
      entity_id: checklist.id,
      entity_name: `${checklist.employee_name} - ${checklist.date}`,
      changes_detail: [
        { field: "status", label: "Status", old_value: "submitted", new_value: "approved" },
        { field: "approved_points", label: "Poin Disetujui", old_value: "-", new_value: String(willApprove) },
      ],
      changes_summary: `Checklist disetujui: ${willApprove} poin`,
    });

    const period = checklist.date?.substring(0, 7);
    const existing = await base44.entities.BonusReward.filter({
      employee_email: checklist.employee_email,
      period,
    });
    if (existing.length > 0) {
      await base44.entities.BonusReward.update(existing[0].id, {
        total_points: (existing[0].total_points || 0) + willApprove,
      });
    } else {
      await base44.entities.BonusReward.create({
        employee_id: checklist.employee_id,
        employee_name: checklist.employee_name,
        employee_email: checklist.employee_email,
        period,
        total_points: willApprove,
        status: "pending",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["checklists-all"] });
    queryClient.invalidateQueries({ queryKey: ["bonus-rewards"] });
    setProcessing(p => ({ ...p, [checklist.id]: false }));
  };

  const handleReject = async (checklist) => {
    if (checklist.employee_email === user?.email) {
      alert("Anda tidak bisa menolak checklist milik sendiri.");
      return;
    }
    setProcessing(p => ({ ...p, [checklist.id]: true }));
    await base44.entities.DailyChecklist.update(checklist.id, {
      status: "rejected",
      approved_by: user?.full_name || user?.email,
      approved_points: 0,
      rejection_reason: rejectReason[checklist.id] || "",
    });

    await logActivity({
      action: "reject",
      entity_type: "DailyChecklist",
      entity_id: checklist.id,
      entity_name: `${checklist.employee_name} - ${checklist.date}`,
      changes_detail: [
        { field: "status", label: "Status", old_value: "submitted", new_value: "rejected" },
        { field: "approved_points", label: "Poin Disetujui", old_value: "-", new_value: "0" },
      ],
      changes_summary: "Checklist ditolak",
    });

    queryClient.invalidateQueries({ queryKey: ["checklists-all"] });
    setProcessing(p => ({ ...p, [checklist.id]: false }));
  };

  return (
    <div className="space-y-4">
      {!canApprove && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Hanya kepala feeder, manajer, dan admin yang dapat menyetujui checklist.
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[["submitted", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"], ["all", "Semua"]].map(([val, label]) => (
          <Button key={val} variant={filterStatus === val ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(val)}>
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
          {checklists.map((c) => {
            const { utamaTasks, kandangTasks, poinUtama, poinKandang, grp, willApprove } = getGroups(c);
            const totalClaimed = c.total_points_claimed || (poinUtama + poinKandang);
            const isSelf = c.employee_email === user?.email;

            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{c.employee_name}</p>
                      <Badge variant="outline" className={`text-[11px] ${statusConfig[c.status]?.color}`}>
                        {statusConfig[c.status]?.label}
                      </Badge>
                      {isSelf && canApprove && (
                        <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">
                          ⚠ Milik Anda — tidak bisa di-approve sendiri
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.date ? format(new Date(c.date), "EEEE, d MMMM yyyy", { locale: id }) : "-"}
                    </p>

                    {/* Ringkasan poin */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Star className="w-3 h-3 text-amber-500 fill-current" />
                        <span>Task Utama: <strong className="text-amber-700">{poinUtama} poin</strong></span>
                      </div>
                      {poinKandang > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">Kebersihan Kandang: <strong className="text-amber-700">{poinKandang} poin</strong></span>
                        </>
                      )}
                      <span className="text-muted-foreground">·</span>
                      <span className="font-bold text-amber-800">Total: {totalClaimed} poin</span>
                      {c.status === "approved" && (
                        <span className="text-green-600 font-bold ml-auto">✓ Disetujui: {c.approved_points} poin</span>
                      )}
                    </div>

                    {c.status === "approved" && c.approved_by && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Disetujui oleh: {c.approved_by}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setExpanded(p => ({ ...p, [c.id]: !p[c.id] }))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {expanded[c.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expanded[c.id] && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <TaskSection title="Task Utama" tasks={utamaTasks} badgeColor="bg-primary/10 text-primary border-primary/20" />
                    <TaskSection title="Task Kebersihan Kandang" tasks={kandangTasks} badgeColor="bg-blue-100 text-blue-700 border-blue-200" />
                    {(c.completed_tasks || []).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Tidak ada detail task tersimpan</p>
                    )}
                    {c.notes && <p className="text-xs text-muted-foreground italic">Catatan: {c.notes}</p>}

                    {c.status === "submitted" && canApprove && (
                      <div className="space-y-3 pt-2 border-t">
                        {isSelf ? (
                          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            Anda tidak bisa menyetujui checklist milik sendiri. Minta kepala feeder atau manajer.
                          </div>
                        ) : (
                          <>
                            {/* Grup pilih approval */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">Pilih kelompok yang disetujui:</p>
                              {poinUtama > 0 && (
                                <label className="flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer hover:bg-muted/40">
                                  <Checkbox
                                    checked={grp.utama}
                                    onCheckedChange={() => toggleGroup(c.id, "utama")}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium">Task Utama</span>
                                    <span className="text-xs text-muted-foreground ml-2">({utamaTasks.length} task)</span>
                                  </div>
                                  <span className="text-sm font-bold text-amber-600">{poinUtama} poin</span>
                                </label>
                              )}
                              {poinKandang > 0 && (
                                <label className="flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer hover:bg-muted/40">
                                  <Checkbox
                                    checked={grp.kandang}
                                    onCheckedChange={() => toggleGroup(c.id, "kandang")}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium">Kebersihan Kandang</span>
                                    <span className="text-xs text-muted-foreground ml-2">({kandangTasks.length} task)</span>
                                  </div>
                                  <span className="text-sm font-bold text-amber-600">{poinKandang} poin</span>
                                </label>
                              )}
                            </div>

                            {/* Ringkasan */}
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total diklaim:</span>
                                <span className="font-semibold">{totalClaimed} poin</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Akan disetujui:</span>
                                <span className="font-bold text-green-700 text-sm">{willApprove} poin</span>
                              </div>
                            </div>

                            <Textarea
                              placeholder="Alasan penolakan (jika ditolak)"
                              className="h-14 text-xs resize-none"
                              value={rejectReason[c.id] || ""}
                              onChange={e => setRejectReason(p => ({ ...p, [c.id]: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(c)}
                                disabled={processing[c.id] || willApprove === 0}
                                className="flex-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                {processing[c.id] ? "..." : `Setujui ${willApprove} poin`}
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
                          </>
                        )}
                      </div>
                    )}
                    {c.status === "rejected" && c.rejection_reason && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Alasan: {c.rejection_reason}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}