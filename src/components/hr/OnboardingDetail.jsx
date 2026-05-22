import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";

const STATUS_COLORS = {
  berjalan: "bg-blue-100 text-blue-800",
  selesai: "bg-green-100 text-green-800",
  terhenti: "bg-red-100 text-red-800",
};

export default function OnboardingDetail({ checklist, currentRole, currentUser, onClose, onUpdate }) {
  const [tasks, setTasks] = useState(checklist.tasks || []);
  const [saving, setSaving] = useState(false);

  const canVerify = ["owner", "admin", "manajer"].includes(currentRole);
  const isOwner = checklist.employee_email === currentUser?.email;

  const toggleComplete = async (idx) => {
    if (!isOwner && !canVerify) return;
    const today = new Date().toISOString().split("T")[0];
    const updated = tasks.map((t, i) => i === idx
      ? { ...t, is_completed: !t.is_completed, completed_date: !t.is_completed ? today : null }
      : t
    );
    setTasks(updated);
    const progress = Math.round((updated.filter(t => t.is_completed).length / updated.length) * 100);
    setSaving(true);
    await base44.entities.OnboardingChecklist.update(checklist.id, {
      tasks: updated,
      overall_progress: progress,
      status: progress === 100 ? "selesai" : "berjalan",
    });
    onUpdate();
    setSaving(false);
  };

  const verifyTask = async (idx) => {
    if (!canVerify) return;
    const updated = tasks.map((t, i) => i === idx
      ? { ...t, verified_by: currentUser?.full_name || currentUser?.email }
      : t
    );
    setTasks(updated);
    setSaving(true);
    await base44.entities.OnboardingChecklist.update(checklist.id, { tasks: updated });
    onUpdate();
    setSaving(false);
  };

  const total = tasks.length;
  const done = tasks.filter(t => t.is_completed).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboarding: {checklist.employee_name}</DialogTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge className={`${STATUS_COLORS[checklist.status] || ""} border-0 text-xs`}>{checklist.status}</Badge>
            <span className="text-xs text-muted-foreground">{checklist.employee_email}</span>
          </div>
        </DialogHeader>

        <div className="space-y-2 mb-2">
          <div className="flex justify-between text-sm">
            <span>Progress Keseluruhan</span>
            <span className="font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
          <p className="text-xs text-muted-foreground">{done} dari {total} task selesai</p>
        </div>

        <div className="space-y-2">
          {tasks.map((task, i) => (
            <div key={i} className={`p-3 rounded-lg border transition-colors ${task.is_completed ? "bg-green-50 border-green-200" : "bg-muted/30"}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleComplete(i)}
                  disabled={!isOwner && !canVerify}
                  className="mt-0.5 shrink-0"
                >
                  {task.is_completed
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : <Circle className="w-5 h-5 text-muted-foreground" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>{task.task_title}</p>
                  {task.completed_date && <p className="text-xs text-muted-foreground">Selesai: {task.completed_date}</p>}
                  {task.verified_by && (
                    <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3" /> Diverifikasi oleh {task.verified_by}
                    </p>
                  )}
                </div>
                {canVerify && task.is_completed && !task.verified_by && (
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => verifyTask(i)} disabled={saving}>
                    Verifikasi
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}