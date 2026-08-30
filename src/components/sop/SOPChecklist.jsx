import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Clock, XCircle, Star, Send, AlertTriangle, PackageX } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import PhotoUploadWithWatermark from "./PhotoUploadWithWatermark";
import SOPVideoTask from "./SOPVideoTask";
import { useTestMode } from "@/lib/useTestMode";

const categoryColors = {
  pakan: "bg-green-100 text-green-700",
  kebersihan: "bg-blue-100 text-blue-700",
  pemeriksaan: "bg-amber-100 text-amber-700",
  breeding: "bg-purple-100 text-purple-700",
  administrasi: "bg-muted text-foreground",
  lainnya: "bg-muted text-muted-foreground",
};

export default function SOPChecklist() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { testModeTag } = useTestMode();
  const today = format(new Date(), "yyyy-MM-dd");
  const [checked, setChecked] = useState({});
  const [taskNotes, setTaskNotes] = useState({});
  const [taskPhotos, setTaskPhotos] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [skipped, setSkipped] = useState({});

  const { data: tasks = [] } = useQuery({
    queryKey: ["sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
  });

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["owner-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 200),
    staleTime: 2 * 60 * 1000,
  });

  const skuMap = useMemo(() => {
    const m = {};
    warehouseItems.forEach((w) => { if (w.sku) m[w.sku] = w; });
    return m;
  }, [warehouseItems]);

  // Cek stok untuk task dengan required_skus
  const getStockStatus = (task) => {
    if (!task.required_skus || task.required_skus.length === 0) return null;
    const emptyItems = [];
    task.required_skus.forEach((sku) => {
      const w = skuMap[sku];
      const isUnavailable = !w || (w.current_stock || 0) <= 0 || w.condition === "rusak_berat" || w.condition === "hilang";
      if (isUnavailable) {
        emptyItems.push(w?.name || sku);
      }
    });
    return emptyItems.length > 0 ? { empty: true, items: emptyItems } : { empty: false };
  };

  const { data: todayChecklist } = useQuery({
    queryKey: ["checklist-today", user?.email, today],
    queryFn: async () => {
      const results = await base44.entities.DailyChecklist.filter({
        employee_email: user.email,
        date: today,
      });
      return results[0] || null;
    },
    enabled: !!user?.email,
  });

  // Semua log hari ini (semua karyawan) untuk penguncian task "bersama"
  const { data: allLogsToday = [] } = useQuery({
    queryKey: ["sop-checklist-all-logs", today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ period_key: today }),
    staleTime: 30 * 1000,
  });

  const allDoneMap = useMemo(() => {
    const m = {};
    (allLogsToday || []).forEach(l => {
      if (l.item_id && l.is_done !== false) {
        m[l.item_id] = { done_by: l.done_by, done_at: l.done_at, done_by_email: l.done_by_email };
      }
    });
    return m;
  }, [allLogsToday]);

  const getLockInfo = (task) => {
    if (task.assigned_to_email && task.assigned_to_email !== user?.email) {
      return { type: "assigned", name: task.assigned_to_name || task.assigned_to_email };
    }
    const scope = task.task_scope || "bersama";
    if (scope === "bersama") {
      const done = allDoneMap[`sop_${task.id}`];
      if (done && done.done_by_email !== user?.email) {
        return { type: "done", name: done.done_by || "karyawan lain", time: done.done_at || "" };
      }
    }
    return null;
  };

  // Check if a task's deadline has passed
  const isDeadlinePassed = (task) => {
    if (!task.deadline_time) return false;
    const now = format(new Date(), "HH:mm");
    return now > task.deadline_time;
  };

  const getTaskPoints = (task) => isDeadlinePassed(task) ? 0 : (task.points || 0);

  const totalPoints = useMemo(() => {
    return tasks
      .filter((t) => checked[t.id] && !getLockInfo(t))
      .reduce((sum, t) => sum + getTaskPoints(t), 0);
  }, [tasks, checked, allDoneMap]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const completedTasks = tasks
      .filter((t) => (checked[t.id] || skipped[t.id]) && !getLockInfo(t))
      .map((t) => ({
        task_id: t.id,
        task_title: t.title,
        points: skipped[t.id] ? 0 : getTaskPoints(t),
        notes: taskNotes[t.id] || "",
        photo_url: taskPhotos[t.id] || null,
        deadline_passed: isDeadlinePassed(t),
        status: skipped[t.id] ? "skipped_no_stock" : "completed",
        skip_reason: skipped[t.id] ? "Stok kosong" : null,
      }));

    await base44.entities.DailyChecklist.create({
      date: today,
      employee_id: user.id,
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      completed_tasks: completedTasks,
      total_points_claimed: totalPoints,
      status: "submitted",
      notes: generalNotes,
      ...testModeTag,
    });
    queryClient.invalidateQueries({ queryKey: ["checklist-today"] });
    setSubmitting(false);
  };

  const statusInfo = {
    submitted: { label: "Menunggu Verifikasi", icon: Clock, color: "text-amber-600 bg-amber-50" },
    approved: { label: "Disetujui", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
    rejected: { label: "Ditolak", icon: XCircle, color: "text-red-600 bg-red-50" },
  };

  if (todayChecklist) {
    const s = statusInfo[todayChecklist.status];
    const Icon = s.icon;
    return (
      <div className="max-w-2xl space-y-4">
        <Card className={`p-5 ${s.color}`}>
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6" />
            <div>
              <p className="font-semibold">{s.label}</p>
              <p className="text-sm opacity-80">
                Checklist {format(new Date(today), "d MMMM yyyy", { locale: id })} sudah disubmit
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Task Diselesaikan</h3>
            <div className="flex items-center gap-1 text-amber-600">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold">{todayChecklist.total_points_claimed} poin diklaim</span>
            </div>
          </div>
          {todayChecklist.status === "approved" && (
            <p className="text-sm text-green-700 mb-3">
              ✅ Poin disetujui: <strong>{todayChecklist.approved_points}</strong> poin oleh {todayChecklist.approved_by}
            </p>
          )}
          {todayChecklist.status === "rejected" && todayChecklist.rejection_reason && (
            <p className="text-sm text-red-700 mb-3">
              ❌ Alasan ditolak: {todayChecklist.rejection_reason}
            </p>
          )}
          <ul className="space-y-3">
            {(todayChecklist.completed_tasks || []).map((t, i) => (
              <li key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>✓ {t.task_title}</span>
                  <Badge variant="outline" className="text-amber-600">{t.points} poin</Badge>
                </div>
                {t.photo_url && (
                  <img src={t.photo_url} alt="Bukti" className="h-20 w-32 object-cover rounded border ml-4" />
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
          </p>
          <div className="flex items-center gap-1 text-amber-600">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-bold text-sm">{totalPoints} poin</span>
          </div>
        </div>
      </Card>

      {/* Video wajib tonton harian */}
      <SOPVideoTask />

      {["pakan", "kebersihan", "pemeriksaan", "breeding", "administrasi", "lainnya"].map((cat) => {
        const catTasks = tasks.filter((t) => t.category === cat && t.frequency === "harian");
        if (catTasks.length === 0) return null;
        return (
          <Card key={cat}>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${categoryColors[cat]}`}>{cat}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              {catTasks.map((task) => {
                const lockInfo = getLockInfo(task);
                const isLocked = !!lockInfo;
                return (
                <div key={task.id} className="space-y-1.5">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={task.id}
                      checked={!!checked[task.id]}
                      disabled={isLocked}
                      onCheckedChange={(v) => {
                        if (isLocked) return;
                        setChecked((p) => ({ ...p, [task.id]: v }));
                        if (v) setSkipped((p) => ({ ...p, [task.id]: false }));
                      }}
                      className={`mt-0.5 ${isLocked ? "opacity-40" : ""}`}
                    />
                    <label htmlFor={task.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium">{task.title}</span>
                        <div className="flex items-center gap-1.5">
                          {task.deadline_time && (
                            <span className={`text-[11px] flex items-center gap-0.5 ${isDeadlinePassed(task) ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                              {isDeadlinePassed(task) ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {isDeadlinePassed(task) ? "Terlambat!" : `≤ ${task.deadline_time}`}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[11px] ${isDeadlinePassed(task) ? "text-red-400 line-through" : "text-amber-600"}`}>
                            {isDeadlinePassed(task) ? "0 poin" : `${task.points} poin`}
                          </Badge>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                      {task.deadline_time && isDeadlinePassed(task) && (
                        <p className="text-[11px] text-red-500 mt-0.5">⚠️ Batas waktu {task.deadline_time} sudah lewat — task ini tidak mendapat poin</p>
                      )}
                      {isLocked && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {lockInfo.type === "done"
                            ? `✅ Sudah dikerjakan ${lockInfo.name}${lockInfo.time ? ` · ${lockInfo.time}` : ""}`
                            : `👤 Tugas ${lockInfo.name}`
                          }
                        </p>
                      )}
                      {(() => {
                        const ss = getStockStatus(task);
                        if (!ss || !ss.empty) return null;
                        return (
                          <p className="text-[11px] text-red-600 mt-0.5 flex items-center gap-1 font-medium">
                            <PackageX className="w-3 h-3" /> ⏳ Stok kosong: {ss.items.join(", ")}
                          </p>
                        );
                      })()}
                    </label>
                    {(() => {
                      const ss = getStockStatus(task);
                      if (!ss || !ss.empty) return null;
                      if (skipped[task.id]) {
                        return (
                          <span className="text-[11px] text-orange-600 font-medium flex items-center gap-1">
                            <PackageX className="w-3 h-3" /> ⏭️ Dilewati - stok kosong
                          </span>
                        );
                      }
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7 gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => {
                            setSkipped((p) => ({ ...p, [task.id]: true }));
                            setChecked((p) => ({ ...p, [task.id]: false }));
                          }}
                        >
                          <PackageX className="w-3 h-3" /> Dilewati - stok kosong
                        </Button>
                      );
                    })()}
                  </div>
                  {checked[task.id] && (
                    <div className="ml-7 space-y-2">
                      {(task.points || 0) >= 15 && (
                        <p className="text-[11px] text-amber-600 flex items-center gap-1">
                          📷 Foto bukti disarankan untuk task bernilai tinggi ini
                        </p>
                      )}
                      <Textarea
                        placeholder="Catatan kondisi (opsional, contoh: ada kura lesu di sudut)"
                        className="h-16 text-xs resize-none"
                        maxLength={200}
                        value={taskNotes[task.id] || ""}
                        onChange={(e) => setTaskNotes((p) => ({ ...p, [task.id]: e.target.value }))}
                      />
                      {taskNotes[task.id]?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground text-right">{taskNotes[task.id].length}/200</p>
                      )}
                      <PhotoUploadWithWatermark
                        taskTitle={task.title}
                        employeeName={user?.full_name || user?.email || "Karyawan"}
                        photoUrl={taskPhotos[task.id] || null}
                        onUploaded={(url) => setTaskPhotos((p) => ({ ...p, [task.id]: url }))}
                      />
                    </div>
                  )}
                </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Belum ada task SOP aktif. Admin perlu menambahkan task terlebih dahulu.</p>
        </div>
      )}

      {tasks.length > 0 && (
        <Card className="p-4 space-y-3">
          <Textarea
            placeholder="Catatan umum hari ini (opsional)"
            className="resize-none h-20 text-sm"
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || (Object.values(checked).filter(Boolean).length === 0 && Object.values(skipped).filter(Boolean).length === 0)}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Menyimpan..." : `Submit Checklist (${totalPoints} poin${Object.values(skipped).filter(Boolean).length > 0 ? `, ${Object.values(skipped).filter(Boolean).length} dilewati` : ""})`}
          </Button>
        </Card>
      )}
    </div>
  );
}