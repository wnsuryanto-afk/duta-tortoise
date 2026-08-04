import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2, XCircle, Star, ChevronDown, ChevronUp,
  AlertTriangle, UserCheck, Loader2, ListChecks, Sparkles, Clock, Search, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { logActivity } from "@/lib/logActivity";
import { reverifySinglePhoto } from "@/lib/photoVerification";
import PhotoPreviewModal from "./PhotoPreviewModal";

const statusConfig = {
  submitted: { label: "Menunggu", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved:  { label: "Disetujui", color: "bg-green-100 text-green-700 border-green-200" },
  rejected:  { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200" },
};

const norm = (s) => (s || "").trim().toLowerCase();

// Deteksi "dicentang beruntun": 3+ kandang dicentang dalam rentang <5 menit (penanda untuk ditinjau, bukan tuduhan)
function parseHHmmToMin(t) {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function checkBeruntun(tasks) {
  const times = (tasks || [])
    .filter(t => /^kebersihan\s+\S/i.test(t.task_title || ""))
    .map(t => parseHHmmToMin(t.recorded_at || t.photo_taken_at))
    .filter(x => x != null)
    .sort((a, b) => a - b);
  if (times.length < 3) return false;
  for (let i = 0; i + 2 < times.length; i++) {
    if (times[i + 2] - times[i] < 5) return true;
  }
  return false;
}

export default function SOPApproval() {
  const qc = useQueryClient();
  const { user, role } = useCurrentUser();
  const isOwner = role === "owner";
  const [expanded, setExpanded] = useState({});
  const [taskChecked, setTaskChecked] = useState({});
  const [manualPoin, setManualPoin] = useState({});
  const [rejectReason, setRejectReason] = useState({});
  const [processing, setProcessing] = useState({});
  const [filterStatus, setFilterStatus] = useState("submitted");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [filterNeedsReview, setFilterNeedsReview] = useState(false);
  const [reverifyLoading, setReverifyLoading] = useState({});
  const [bulkReverifyLoading, setBulkReverifyLoading] = useState(false);

  const taskNeedsReview = (t) => {
    if (t.ai_verified === false) return true;
    if (t.ai_confidence != null && t.ai_confidence < 70) return true;
    if (t.photo_age_warning) return true;
    if (t.photo_time_warning) return true;
    return false;
  };

  const getAIBadge = (t) => {
    if (t.ai_verified === undefined || t.ai_verified === null) return null;
    if (t.ai_verified === true) {
      return { icon: "✅", text: `Sesuai (keyakinan ${t.ai_confidence || 0}%)`, color: "bg-green-100 text-green-700 border-green-200" };
    }
    const reasonText = t.ai_temuan_penting || t.ai_reason || "";
    if (t.ai_confidence != null && t.ai_confidence >= 50) {
      return { icon: "⚠️", text: `Meragukan — ${reasonText}`, color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    }
    return { icon: "❌", text: `Tidak sesuai — ${reasonText}`, color: "bg-red-100 text-red-700 border-red-200" };
  };

  const aiStatusConfig = {
    belum_diperiksa: { label: "⏳ Belum diperiksa", color: "bg-gray-100 text-gray-500 border-gray-200" },
    sedang_diproses: { label: "🔄 Sedang diproses", color: "bg-blue-100 text-blue-600 border-blue-200" },
    selesai: { label: "✅ Diperiksa", color: "bg-green-100 text-green-700 border-green-200" },
    gagal: { label: "❌ Gagal", color: "bg-red-100 text-red-600 border-red-200" },
  };

  const getAIStatus = (t) => {
    if (t.ai_status) return t.ai_status;
    if (t.ai_verified === true || t.ai_verified === false) return "selesai";
    if (t.photo_url && taskRequiresPhoto(t.task_title)) return "belum_diperiksa";
    return null;
  };

  const getAiCheckPoints = (taskTitle) => sopTaskByTitle[norm(taskTitle)]?.ai_check_points || "";

  const handleReverify = async (c, taskIdx, t) => {
    const key = `${c.id}_${taskIdx}`;
    setReverifyLoading(p => ({ ...p, [key]: true }));
    try {
      const { success, error } = await reverifySinglePhoto({
        photoUrl: t.photo_url,
        taskTitle: t.task_title,
        taskDescription: "",
        aiCheckPoints: getAiCheckPoints(t.task_title),
        employeeEmail: c.employee_email,
        date: c.date,
        enclosure: t.notes || "",
      });
      if (success) toast.success("Foto berhasil diperiksa AI");
      else toast.error("Gagal: " + (error || "tidak diketahui"));
      qc.invalidateQueries({ queryKey: ["checklists-all"] });
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setReverifyLoading(p => ({ ...p, [key]: false }));
  };

  const handleReverifyAllPending = async () => {
    const pending = [];
    checklists.forEach(c => {
      (c.completed_tasks || []).forEach((t, i) => {
        if (t.photo_url && taskRequiresPhoto(t.task_title) && getAIStatus(t) !== "selesai" && getAIStatus(t) !== "sedang_diproses") {
          pending.push({ c, t, i });
        }
      });
    });
    if (pending.length === 0) { toast.info("Tidak ada foto tertunda"); return; }
    setBulkReverifyLoading(true);
    let ok = 0, fail = 0;
    for (const { c, t, i } of pending) {
      try {
        const res = await reverifySinglePhoto({
          photoUrl: t.photo_url,
          taskTitle: t.task_title,
          taskDescription: "",
          aiCheckPoints: getAiCheckPoints(t.task_title),
          employeeEmail: c.employee_email,
          date: c.date,
          enclosure: t.notes || "",
        });
        if (res.success) ok++; else fail++;
      } catch { fail++; }
    }
    setBulkReverifyLoading(false);
    qc.invalidateQueries({ queryKey: ["checklists-all"] });
    if (fail === 0) toast.success(`${ok} foto berhasil diperiksa`);
    else toast.warning(`${ok} berhasil, ${fail} gagal`);
  };

  const handleSaveOwnerNote = async (c, taskIdx, note) => {
    try {
      const tasks = (c.completed_tasks || []).slice();
      tasks[taskIdx] = { ...tasks[taskIdx], owner_note: note };
      await base44.entities.DailyChecklist.update(c.id, { completed_tasks: tasks });
      toast.success("Catatan untuk keeper tersimpan");
      qc.invalidateQueries({ queryKey: ["checklists-all"] });
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
  };

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["checklists-all", filterStatus],
    queryFn: () =>
      filterStatus === "all"
        ? base44.entities.DailyChecklist.list("-date", 200)
        : base44.entities.DailyChecklist.filter({ status: filterStatus }, "-date", 200),
  });

  const { data: pendingList = [] } = useQuery({
    queryKey: ["checklists-pending-count"],
    queryFn: () => base44.entities.DailyChecklist.filter({ status: "submitted" }, "-date", 500),
    staleTime: 30 * 1000,
  });
  const pendingCount = pendingList.length;

  const { data: sopTasksAll = [] } = useQuery({
    queryKey: ["sop-tasks-require-photo"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const requirePhotoTitles = useMemo(() => {
    const s = new Set();
    let kebersihanWajib = false;
    sopTasksAll.forEach(t => {
      if (t.require_photo) {
        s.add(norm(t.title));
        if (t.category === "kebersihan") kebersihanWajib = true;
      }
    });
    return { titles: s, kebersihanWajib };
  }, [sopTasksAll]);

  const sopTaskByTitle = useMemo(() => {
    const m = {};
    sopTasksAll.forEach(t => { m[norm(t.title)] = t; });
    return m;
  }, [sopTasksAll]);

  const taskRequiresPhoto = (taskTitle) => {
    const nt = norm(taskTitle);
    if (requirePhotoTitles.titles.has(nt)) return true;
    if (requirePhotoTitles.kebersihanWajib && nt.startsWith("kebersihan ")) return true;
    return false;
  };

  const getCheckedMap = (c) => {
    const stored = taskChecked[c.id] || {};
    const m = {};
    (c.completed_tasks || []).forEach((_, i) => {
      m[i] = stored[i] === undefined ? true : stored[i];
    });
    return m;
  };

  const getDupSet = (c) => {
    const tasks = c.completed_tasks || [];
    const counts = {};
    tasks.forEach((t) => { const k = norm(t.task_title); if (k) counts[k] = (counts[k] || 0) + 1; });
    const dups = new Set();
    Object.entries(counts).forEach(([k, n]) => { if (n > 1) dups.add(k); });
    return dups;
  };

  const getWillApprove = (c) => {
    const manual = manualPoin[c.id];
    if (manual !== undefined && manual !== "" && !isNaN(Number(manual))) return Number(manual);
    const tasks = c.completed_tasks || [];
    const cm = getCheckedMap(c);
    return tasks.reduce((s, t, i) => s + (cm[i] ? (t.points || 0) : 0), 0);
  };

  const toggleTask = (cId, idx) => {
    setTaskChecked((p) => {
      const cur = p[cId] || {};
      const curVal = cur[idx] === undefined ? true : cur[idx];
      return { ...p, [cId]: { ...cur, [idx]: !curVal } };
    });
  };

  const handleApprove = async (c) => {
    const willApprove = getWillApprove(c);
    setProcessing((p) => ({ ...p, [c.id]: true }));
    try {
      await base44.entities.DailyChecklist.update(c.id, {
        status: "approved",
        approved_by: user?.full_name || user?.email,
        approved_points: willApprove,
      });
      await logActivity({
        action: "approve",
        entity_type: "DailyChecklist",
        entity_id: c.id,
        entity_name: `${c.employee_name} — ${c.date}`,
        changes_summary: `Menyetujui poin checklist ${c.employee_name} (${c.date}): ${willApprove} poin`,
      });
      toast.success(`Checklist ${c.employee_name} disetujui — ${willApprove} poin`);
      setExpanded((p) => ({ ...p, [c.id]: false }));
      qc.invalidateQueries({ queryKey: ["checklists-all"] });
      qc.invalidateQueries({ queryKey: ["checklists-pending-count"] });
      qc.invalidateQueries({ queryKey: ["owner-pending-approval"] });
      qc.invalidateQueries({ queryKey: ["my-checklist-today"] });
      qc.invalidateQueries({ queryKey: ["checklist-today"] });
    } catch (e) {
      toast.error("Gagal menyetujui: " + (e.message || e));
    }
    setProcessing((p) => ({ ...p, [c.id]: false }));
  };

  const handleReject = async (c) => {
    const reason = (rejectReason[c.id] || "").trim();
    if (!reason) { toast.error("Wajib isi alasan penolakan"); return; }
    setProcessing((p) => ({ ...p, [c.id]: true }));
    try {
      await base44.entities.DailyChecklist.update(c.id, {
        status: "rejected",
        approved_by: user?.full_name || user?.email,
        approved_points: 0,
        rejection_reason: reason,
      });
      await logActivity({
        action: "reject",
        entity_type: "DailyChecklist",
        entity_id: c.id,
        entity_name: `${c.employee_name} — ${c.date}`,
        changes_summary: `Menolak poin checklist ${c.employee_name} (${c.date}): ${reason}`,
      });
      toast.success("Checklist ditolak");
      setExpanded((p) => ({ ...p, [c.id]: false }));
      qc.invalidateQueries({ queryKey: ["checklists-all"] });
      qc.invalidateQueries({ queryKey: ["checklists-pending-count"] });
      qc.invalidateQueries({ queryKey: ["my-checklist-today"] });
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setProcessing((p) => ({ ...p, [c.id]: false }));
  };

  // Ringkasan beban per karyawan dari checklist yang tampil
  const employeeStats = useMemo(() => {
    const stats = {};
    checklists.forEach(c => {
      const key = c.employee_email || c.employee_name;
      if (!stats[key]) {
        stats[key] = { name: c.employee_name, email: c.employee_email, tasks: 0, points: 0 };
      }
      stats[key].tasks += (c.completed_tasks || []).length;
      stats[key].points += c.status === "approved" ? (c.approved_points || 0) : (c.total_points_claimed || 0);
    });
    const arr = Object.values(stats);
    const totalPoints = arr.reduce((s, e) => s + e.points, 0);
    return arr.map(e => ({ ...e, percentage: totalPoints > 0 ? Math.round((e.points / totalPoints) * 100) : 0 }));
  }, [checklists]);

  const pendingAIPhotos = checklists.reduce((n, c) =>
    n + (c.completed_tasks || []).filter(t =>
      t.photo_url && taskRequiresPhoto(t.task_title) && getAIStatus(t) !== "selesai" && getAIStatus(t) !== "sedang_diproses"
    ).length, 0);

  const maxPoints = Math.max(...employeeStats.map(e => e.points), 0);
  const hasImbalance = employeeStats.length > 1 && maxPoints > 0 &&
    employeeStats.some(e => e.points > 0 && e.points < maxPoints * 0.7);

  const filters = [["submitted", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"], ["all", "Semua"]];

  return (
    <div className="space-y-4">
      {/* Header + badge menunggu */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold">Persetujuan Checklist Poin</h2>
        </div>
        {pendingCount > 0 ? (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
            {pendingCount} menunggu
          </Badge>
        ) : (
          <Badge className="bg-green-100 text-green-700 border border-green-200">
            ✓ Tidak ada antrian
          </Badge>
        )}
      </div>

      {!isOwner && (
        <div className="flex items-center gap-2 p-3 bg-muted/40 border border-border rounded-xl text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
          Mode lihat saja. Hanya <strong className="text-foreground">Owner</strong> yang dapat meninjau, mengoreksi, dan menyetujui poin checklist.
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap items-center">
        {filters.map(([val, label]) => (
          <Button
            key={val}
            variant={filterStatus === val ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(val)}
          >
            {label}
          </Button>
        ))}
        <Button
          variant={filterNeedsReview ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterNeedsReview(v => !v)}
          className="gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {filterNeedsReview ? "✓ Hanya perlu diperiksa" : "Hanya perlu diperiksa"}
        </Button>
        {isOwner && pendingAIPhotos > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReverifyAllPending}
            disabled={bulkReverifyLoading}
            className="gap-1.5 ml-auto"
          >
            {bulkReverifyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Periksa semua tertunda ({pendingAIPhotos})
          </Button>
        )}
      </div>

      {/* Ringkasan beban per karyawan */}
      {employeeStats.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-2 ${hasImbalance ? "bg-yellow-50 border-yellow-300" : "bg-muted/30 border-border"}`}>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <ListChecks className="w-3 h-3" /> Ringkasan Beban Periode Berjalan
            {hasImbalance && <span className="text-yellow-700 ml-1">⚠ Selisih &gt;30%</span>}
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(employeeStats.length, 3)}, minmax(0, 1fr))` }}>
            {employeeStats.map(e => {
              const isImbalanced = hasImbalance && e.points > 0 && e.points < maxPoints * 0.7;
              return (
                <div key={e.email || e.name} className={`rounded-lg border p-2.5 text-center ${isImbalanced ? "bg-yellow-100 border-yellow-400" : "bg-background border-border"}`}>
                  <p className="text-xs font-semibold truncate">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{e.tasks} task · {e.points} poin · {e.percentage}%</p>
                  {isImbalanced && <p className="text-[10px] text-yellow-700 mt-0.5">⚠ Beban rendah</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
      ) : checklists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Tidak ada checklist</p>
        </div>
      ) : (
        <div className="space-y-3">
          {checklists.map((c) => {
            const tasks = c.completed_tasks || [];
            const totalClaimed = c.total_points_claimed || tasks.reduce((s, t) => s + (t.points || 0), 0);
            const isHighClaim = totalClaimed > 250;
            const topSources = isHighClaim ? Object.entries(
              tasks.reduce((m, t) => {
                const k = t.task_title || "?";
                m[k] = (m[k] || 0) + (t.points || 0);
                return m;
              }, {})
            ).sort((a, b) => b[1] - a[1]).slice(0, 3) : [];
            const dupSet = getDupSet(c);
            const beruntun = checkBeruntun(tasks);
            const isOpen = !!expanded[c.id];
            const willApprove = getWillApprove(c);
            const cm = getCheckedMap(c);

            return (
              <Card key={c.id} className="p-4">
                <button
                  className="w-full flex items-start justify-between gap-4 text-left"
                  onClick={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{c.employee_name}</p>
                      <Badge variant="outline" className={`text-[11px] ${statusConfig[c.status]?.color}`}>
                        {statusConfig[c.status]?.label}
                      </Badge>
                      {c.approved_by && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <UserCheck className="w-3 h-3" /> {c.approved_by}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.date ? format(new Date(c.date), "EEEE, d MMMM yyyy", { locale: id }) : "-"}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1 text-amber-700">
                        <Star className="w-3 h-3 fill-current" />
                        <strong>{totalClaimed} poin diklaim</strong>
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{tasks.length} task selesai</span>
                      {c.status === "approved" && (
                        <span className="text-green-600 font-bold ml-auto">✓ Disetujui: {c.approved_points} poin</span>
                      )}
                    </div>
                    {beruntun && (
                      <div className="mt-2 p-2 rounded-lg bg-orange-50 border border-orange-300">
                        <p className="text-xs font-bold text-orange-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Dicentang beruntun — periksa
                        </p>
                        <p className="text-[10px] text-orange-600 mt-0.5">3 kandang atau lebih dicentang dalam rentang kurang dari 5 menit.</p>
                      </div>
                    )}
                    {isHighClaim && (
                      <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Klaim harian tinggi — periksa kembali
                        </p>
                        <div className="mt-1 space-y-0.5">
                          {topSources.map(([title, points]) => (
                            <p key={title} className="text-[10px] text-red-600">{title}: {points} poin</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-muted-foreground mt-1">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Tidak ada detail task tersimpan</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Daftar task yang diklaim:</p>
                        {tasks.map((t, i) => {
                          if (filterNeedsReview && !taskNeedsReview(t)) return null;
                          const isDup = dupSet.has(norm(t.task_title));
                          const checked = cm[i];
                          const isSkipped = t.status === "skipped_no_stock";
                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                                isSkipped ? "bg-orange-50 border-orange-300" : isDup ? "bg-amber-50 border-amber-300" : "bg-muted/30 border-border"
                              }`}
                            >
                              {c.status === "submitted" && isOwner ? (
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleTask(c.id, i)}
                                  className="mt-0.5"
                                />
                              ) : (
                                <span className="mt-0.5 text-green-600">
                                  {c.status === "approved" ? <CheckCircle2 className="w-4 h-4" /> : "•"}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{t.task_title || t.task_id}</span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(t.recorded_at || t.photo_taken_at) && (
                                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{t.recorded_at || t.photo_taken_at} WIB</span>
                                    )}
                                    <Badge variant="outline" className="text-amber-600 text-[11px]">+{t.points || 0} poin</Badge>
                                    {isSkipped && (
                                      <Badge className="bg-orange-100 text-orange-700 text-[10px]">⏭️ Dilewati - stok kosong</Badge>
                                    )}
                                  </div>
                                </div>
                                {isDup && (
                                  <p className="text-[11px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Duplikat? — task ini muncul lebih dari sekali
                                  </p>
                                )}
                                {t.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{t.notes}</p>}
                                {t.photo_notes && (
                                  <p className="text-[11px] text-blue-700 mt-0.5 bg-blue-50 rounded px-1.5 py-0.5 border border-blue-100">📝 {t.photo_notes}</p>
                                )}
                                {t.photo_url ? (
                                  <div className="mt-1.5 space-y-1">
                                    <button onClick={() => setPhotoPreview({ url: t.photo_url, takenAt: t.photo_taken_at, title: t.task_title })} className="block">
                                      <img src={t.photo_url} alt="Bukti" className="h-16 w-24 object-cover rounded border hover:opacity-80 transition-opacity" />
                                      {t.photo_taken_at && <span className="text-[10px] text-muted-foreground block mt-0.5">🕐 {t.photo_taken_at}</span>}
                                    </button>
                                    <div className="flex flex-wrap gap-1">
                                      {t.ai_verified === true && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-green-100 text-green-700 border-green-200">✅ Sesuai (keyakinan {t.ai_confidence || 0}%)</span>
                                      )}
                                      {t.ai_verified === false && t.ai_confidence != null && t.ai_confidence >= 50 && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-yellow-100 text-yellow-700 border-yellow-200">⚠️ Meragukan — {t.ai_temuan_penting || t.ai_reason || ""}</span>
                                      )}
                                      {t.ai_verified === false && (t.ai_confidence == null || t.ai_confidence < 50) && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">❌ Tidak sesuai — {t.ai_temuan_penting || t.ai_reason || ""}</span>
                                      )}
                                      {(() => {
                                        const status = getAIStatus(t);
                                        const sc = status ? aiStatusConfig[status] : null;
                                        return sc ? (
                                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                                        ) : null;
                                      })()}
                                      {t.ai_error && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-100 text-red-600 border-red-200" title={t.ai_error}>⚠ {t.ai_error}</span>
                                      )}
                                      {isOwner && t.photo_url && taskRequiresPhoto(t.task_title) && getAIStatus(t) !== "sedang_diproses" && (
                                        <button
                                          onClick={() => handleReverify(c, i, t)}
                                          disabled={!!reverifyLoading[`${c.id}_${i}`]}
                                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 disabled:opacity-50 flex items-center gap-0.5"
                                        >
                                          {reverifyLoading[`${c.id}_${i}`] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Search className="w-2.5 h-2.5" />}
                                          Periksa sekarang
                                        </button>
                                      )}
                                      {t.photo_age_warning && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-200 flex items-center gap-0.5">
                                          <Clock className="w-2.5 h-2.5" /> {t.photo_age_warning}
                                        </span>
                                      )}
                                      {t.photo_time_warning && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-200">{t.photo_time_warning}</span>
                                      )}
                                    </div>
                                    {t.ai_temuan_penting && (
                                      <p className="text-[10px] text-red-700 bg-red-50 rounded px-1.5 py-0.5 border border-red-100">🔎 Temuan: {t.ai_temuan_penting}</p>
                                    )}
                                    {(t.ai_apresiasi || t.ai_saran) && (
                                      <div className="rounded bg-blue-50 px-1.5 py-1 border border-blue-100 space-y-0.5">
                                        <p className="text-[10px] font-bold text-blue-600">💬 Dikirim ke keeper:</p>
                                        {t.ai_apresiasi && <p className="text-[10px] text-blue-800">{t.ai_apresiasi}</p>}
                                        {t.ai_saran && <p className="text-[10px] text-blue-700 italic">{t.ai_saran}</p>}
                                      </div>
                                    )}
                                    {t.owner_note && (
                                      <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">📣 Owner: {t.owner_note}</p>
                                    )}
                                    {c.status === "submitted" && isOwner && (
                                      <input
                                        type="text"
                                        placeholder="Tulis catatan untuk keeper..."
                                        defaultValue={t.owner_note || ""}
                                        onBlur={(e) => {
                                          const val = e.target.value.trim();
                                          if (val !== (t.owner_note || "").trim()) handleSaveOwnerNote(c, i, val);
                                        }}
                                        className="w-full h-7 text-xs rounded border border-amber-200 px-2 bg-amber-50/50 focus:bg-white focus:border-amber-400 outline-none"
                                      />
                                    )}
                                  </div>
                                ) : taskRequiresPhoto(t.task_title) ? (
                                  <p className="mt-1.5 text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> ⚠️ tanpa foto
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {c.notes && <p className="text-xs text-muted-foreground italic">Catatan keeper: {c.notes}</p>}

                    {/* Approval actions — owner only, only for submitted */}
                    {c.status === "submitted" && isOwner && (
                      <div className="space-y-3 pt-2 border-t">
                        <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Penilaian AI bisa keliru, gunakan sebagai bantuan.
                        </p>
                        {/* Ringkasan koreksi */}
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Poin diklaim:</span>
                            <span className="font-semibold">{totalClaimed} poin</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Poin disetujui:</span>
                            <span className="font-bold text-green-700 text-sm">{willApprove} poin</span>
                          </div>
                          {willApprove < totalClaimed && (
                            <p className="text-[11px] text-amber-600">
                              ⚠ Dikoreksi turun {totalClaimed - willApprove} poin (uncheck task atau input manual)
                            </p>
                          )}
                        </div>

                        {/* Input poin manual */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Koreksi poin final manual (opsional — kosongkan untuk hitung dari task dicentang)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder={`Otomatis: ${tasks.reduce((s, t, i) => s + (cm[i] ? (t.points || 0) : 0), 0)} poin`}
                            value={manualPoin[c.id] ?? ""}
                            onChange={(e) => setManualPoin((p) => ({ ...p, [c.id]: e.target.value }))}
                            className="mt-1 h-9"
                          />
                        </div>

                        <Textarea
                          placeholder="Alasan penolakan (wajib jika menolak)"
                          className="h-14 text-xs resize-none"
                          value={rejectReason[c.id] || ""}
                          onChange={(e) => setRejectReason((p) => ({ ...p, [c.id]: e.target.value }))}
                        />

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(c)}
                            disabled={processing[c.id] || willApprove === 0}
                            className="flex-1"
                          >
                            {processing[c.id] ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                            Setujui {willApprove} poin
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(c)}
                            disabled={processing[c.id]}
                            className="flex-1"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Tolak
                          </Button>
                        </div>
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

      {photoPreview && (
        <PhotoPreviewModal
          open={!!photoPreview}
          onClose={() => setPhotoPreview(null)}
          photoUrl={photoPreview.url}
          takenAt={photoPreview.takenAt}
          taskTitle={photoPreview.title}
        />
      )}
    </div>
  );
}