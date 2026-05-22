import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";

const PHASE_LABELS = { hari_1: "Hari Pertama", minggu_1: "Minggu Pertama", bulan_1: "Bulan Pertama" };
const STATUS_COLORS = { berjalan: "bg-blue-100 text-blue-800", selesai: "bg-green-100 text-green-800", terhenti: "bg-red-100 text-red-800" };

export default function OnboardingDetail({ checklist, currentRole, currentUser, onClose, onUpdate }) {
  const [tasks, setTasks] = useState(checklist.tasks || []);
  const [saving, setSaving] = useState(false);

  const canVerify = ["owner", "admin", "manajer"].includes(currentRole);
  const isEmployee = currentUser?.email === checklist.employee_email;

  const total = tasks.length;
  const done = tasks.filter(t => t.is_completed).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggleTask = async (idx) => {
    if (!isEmployee && !canVerify) return;
    const updated = tasks.map((t, i) => {
      if (i !== idx) return t;
      if (isEmployee && !t.is_completed) {
        return { ...t, is_completed: true, completed_date: new Date().toISOString().split("T")[0] };
      }
      if (canVerify) {
        return { ...t, verified_by: !t.verified_by ? (currentUser?.full_name || currentUser?.email) : undefined };
      }
      return t;
    });
    setTasks(updated);
    setSaving(true);
    const newProgress = Math.round((updated.filter(t => t.is_completed).length / updated.length) * 100);
    const newStatus = newProgress === 100 ? "selesai" : "berjalan";
    await base44.entities.OnboardingChecklist.update(checklist.id, { tasks: updated, overall_progress: newProgress, status: newStatus });
    setSaving(false);
    onUpdate();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboarding: {checklist.employee_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{checklist.employee_email} · {PHASE_LABELS[checklist.phase]}</div>
            <Badge className={`${STATUS_COLORS[checklist.status] || ""} border-0 text-xs`}>{checklist.status}</Badge>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Progres</span><span className="font-semibold">{progress}%</span></div>
            <Progress value={progress} className="h-3" />
            <div className="text-xs text-muted-foreground mt-1">{done}/{total} task selesai</div>
          </div>

          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${task.is_completed ? "bg-green-50 border-green-200" : "bg-muted/30 border-transparent"}`}>
                <button
                  onClick={() => toggleTask(i)}
                  disabled={saving || (task.is_completed && !canVerify)}
                  className="mt-0.5 shrink-0"
                >
                  {task.is_completed
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>{task.task_title}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {task.completed_date && <span className="text-xs text-muted-foreground">Selesai: {task.completed_date}</span>}
                    {task.verified_by
                      ? <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">✓ Diverifikasi oleh {task.verified_by}</span>
                      : task.is_completed && canVerify
                        ? <button onClick={() => toggleTask(i)} className="text-xs text-blue-600 underline">Verifikasi</button>
                        : null
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isEmployee && <p className="text-xs text-muted-foreground text-center">Centang task yang sudah kamu pelajari/kerjakan.</p>}
          {canVerify && <p className="text-xs text-muted-foreground text-center">Klik ikon centang pada task yang sudah selesai untuk memverifikasi.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}