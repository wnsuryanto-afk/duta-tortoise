/**
 * IncidentalTaskList — tampil di ATAS "Tugas Hari Ini" keeper/kepala_feeder.
 * Tugas "Menunggu Barang" tampil abu-abu & tidak bisa dicentang (dengan keterangan
 * barang yang ditunggu). Tugas "Siap Dikerjakan" tampil normal & bisa diklaim poin.
 * Centang → klaim poin via DailyChecklist (claimIncidentalTask). Anti double-tap.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { claimIncidentalTask } from "@/lib/claimIncidentalTask";
import IncidentalTaskCompleteDialog from "./IncidentalTaskCompleteDialog";

export default function IncidentalTaskList({ user }) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [processingId, setProcessingId] = useState(null);
  const [confirmTask, setConfirmTask] = useState(null);
  const [subStepSaving, setSubStepSaving] = useState(null);

  const handleToggleSubStep = async (task, stepIdx) => {
    const newSteps = (task.sub_steps || []).map((s, i) =>
      i === stepIdx ? { ...s, is_checked: !s.is_checked } : s
    );
    setSubStepSaving(`${task.id}_${stepIdx}`);
    try {
      await base44.entities.IncidentalTask.update(task.id, { sub_steps: newSteps });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-mine"] });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-done-today"] });
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setSubStepSaving(null);
  };

  const { data: tasks = [] } = useQuery({
    queryKey: ["incidental-tasks-mine", user?.email, today],
    queryFn: () => base44.entities.IncidentalTask.filter({ status: "pending" }, "-due_date", 200),
    enabled: !!user?.email,
    staleTime: 30 * 1000,
  });

  // Tugas yang sudah diselesaikan hari ini (tetap tampil, tercoret)
  const { data: doneTasks = [] } = useQuery({
    queryKey: ["incidental-tasks-done-today", user?.email, today],
    queryFn: () => base44.entities.IncidentalTask.filter({ status: "done", done_date: today }, "-done_at", 100),
    enabled: !!user?.email,
    staleTime: 30 * 1000,
  });

  const myDoneTasks = doneTasks.filter(
    (t) => t.is_active !== false && (!t.assigned_to_email || t.assigned_to_email === user.email)
  );

  const myTasks = tasks.filter(
    (t) =>
      t.is_active !== false &&
      t.status === "pending" &&
      (!t.due_date || t.due_date <= today) &&
      (!t.assigned_to_email || t.assigned_to_email === user.email)
  );

  const handleConfirm = async ({ photoUrl, notes, noPhotoReason }) => {
    if (!confirmTask) return;
    setProcessingId(confirmTask.id);
    try {
      await claimIncidentalTask(confirmTask, user, { photoUrl, notes, noPhotoReason });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-mine"] });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-done-today"] });
      qc.invalidateQueries({ queryKey: ["my-checklist-today"] });
      toast.success(`Tugas diklaim: +${confirmTask.points} poin menunggu approval`);
    } catch (e) {
      toast.error("Gagal mengklaim: " + (e.message || e));
      throw e;
    }
    setProcessingId(null);
  };

  if (myTasks.length === 0 && myDoneTasks.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {myDoneTasks.map((task) => (
        <div
          key={task.id}
          className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-3.5 flex items-start gap-3 opacity-80"
        >
          <span className="text-lg flex-shrink-0">✅</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-muted-foreground line-through">{task.title}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-200 text-green-800">
                ✓ Selesai
              </span>
              {task.done_at && <span className="text-[10px] text-muted-foreground">{task.done_at}</span>}
            </div>
            {task.done_notes && <p className="text-xs text-muted-foreground mt-0.5">{task.done_notes}</p>}
            {task.done_photo_url && (
              <img
                src={task.done_photo_url}
                alt="Bukti"
                className="w-16 h-12 rounded-lg object-cover border border-green-200 mt-1.5"
              />
            )}
          </div>
        </div>
      ))}
      {myTasks.map((task) => {
        const isWaiting = task.material_status === "waiting_materials";
        const missingItems = (task.required_items || []).filter((i) => !i.is_available);
        const subSteps = task.sub_steps || [];
        const hasSubSteps = subSteps.length > 0;
        const subChecked = subSteps.filter(s => s.is_checked).length;
        const allSubDone = !hasSubSteps || subChecked === subSteps.length;
        return (
          <div
            key={task.id}
            className={`rounded-2xl border-2 shadow-sm p-3.5 flex items-start gap-3 ${
              isWaiting ? "border-border bg-muted opacity-70" : "border-orange-300 bg-orange-50"
            }`}
          >
            <span className="text-lg flex-shrink-0">{isWaiting ? "⏳" : "📌"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-semibold ${isWaiting ? "text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </p>
                {isWaiting ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-muted-foreground">
                    Menunggu Barang
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-200 text-orange-800">
                    Tugas dari Owner
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  +{task.points} poin
                </span>
              </div>
              {task.notes && <p className="text-xs text-muted-foreground mt-0.5">{task.notes}</p>}
              {hasSubSteps && (
                <div className="mt-1.5 space-y-1">
                  {subSteps.map((step, si) => (
                    <label key={si} className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={step.is_checked}
                        onCheckedChange={() => handleToggleSubStep(task, si)}
                        disabled={subStepSaving === `${task.id}_${si}` || task.status === "done"}
                        className="mt-0.5"
                      />
                      <span className={`text-xs ${step.is_checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {step.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {isWaiting && missingItems.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Menunggu:{" "}
                  {missingItems
                    .map((i) => `${i.item_name} (${i.quantity}${i.unit ? ` ${i.unit}` : ""})`)
                    .join(", ")}
                </p>
              )}
              {task.due_date && (
                <p className={`text-xs mt-0.5 ${isWaiting ? "text-muted-foreground" : "text-orange-600"}`}>
                  Tenggat: {task.due_date}
                </p>
              )}
              {task.photo_url && (
                <img
                  src={task.photo_url}
                  alt="Acuan"
                  className="w-16 h-12 rounded-lg object-cover border border-border mt-1.5"
                />
              )}
            </div>
            {isWaiting ? (
              <div
                className="flex-shrink-0 w-8 h-8 rounded-xl border-2 border-border bg-muted flex items-center justify-center"
                title="Menunggu barang tersedia"
              >
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => setConfirmTask(task)}
                  disabled={processingId === task.id || (hasSubSteps && !allSubDone)}
                  className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center active:scale-95 disabled:opacity-50 transition-transform ${
                    allSubDone ? "border-orange-400 bg-card" : "border-border bg-muted"
                  }`}
                  title={allSubDone ? "Tandai selesai" : `Centang semua langkah dulu (${subChecked}/${subSteps.length})`}
                >
                  {processingId === task.id ? (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className={`w-5 h-5 ${allSubDone ? "text-orange-500" : "text-gray-300"}`} />
                  )}
                </button>
                {hasSubSteps && (
                  <span className={`text-[9px] font-semibold ${allSubDone ? "text-green-600" : "text-muted-foreground"}`}>
                    {subChecked}/{subSteps.length}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      <IncidentalTaskCompleteDialog
        task={confirmTask}
        open={!!confirmTask}
        onClose={() => setConfirmTask(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}