import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Clock, XCircle, Star, Send } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const categoryColors = {
  pakan: "bg-green-100 text-green-700",
  kebersihan: "bg-blue-100 text-blue-700",
  pemeriksaan: "bg-amber-100 text-amber-700",
  breeding: "bg-purple-100 text-purple-700",
  administrasi: "bg-gray-100 text-gray-700",
  lainnya: "bg-muted text-muted-foreground",
};

export default function SOPChecklist() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const today = format(new Date(), "yyyy-MM-dd");
  const [checked, setChecked] = useState({});
  const [taskNotes, setTaskNotes] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
  });

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

  const totalPoints = useMemo(() => {
    return tasks
      .filter((t) => checked[t.id])
      .reduce((sum, t) => sum + (t.points || 0), 0);
  }, [tasks, checked]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const completedTasks = tasks
      .filter((t) => checked[t.id])
      .map((t) => ({
        task_id: t.id,
        task_title: t.title,
        points: t.points,
        notes: taskNotes[t.id] || "",
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
          <ul className="space-y-2">
            {(todayChecklist.completed_tasks || []).map((t, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>✓ {t.task_title}</span>
                <Badge variant="outline" className="text-amber-600">{t.points} poin</Badge>
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
              {catTasks.map((task) => (
                <div key={task.id} className="space-y-1.5">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={task.id}
                      checked={!!checked[task.id]}
                      onCheckedChange={(v) => setChecked((p) => ({ ...p, [task.id]: v }))}
                      className="mt-0.5"
                    />
                    <label htmlFor={task.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{task.title}</span>
                        <Badge variant="outline" className="text-amber-600 text-[11px]">{task.points} poin</Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                    </label>
                  </div>
                  {checked[task.id] && (
                    <Textarea
                      placeholder="Catatan (opsional)"
                      className="ml-7 h-16 text-xs resize-none"
                      value={taskNotes[task.id] || ""}
                      onChange={(e) => setTaskNotes((p) => ({ ...p, [task.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
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
            disabled={submitting || Object.values(checked).filter(Boolean).length === 0}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Menyimpan..." : `Submit Checklist (${totalPoints} poin)`}
          </Button>
        </Card>
      )}
    </div>
  );
}