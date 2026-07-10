/**
 * IncidentalTaskList — tampil di ATAS "Tugas Hari Ini" keeper/kepala_feeder.
 * Menampilkan tugas insidentil yang ditugaskan kepadanya (atau "siapa saja")
 * dengan badge oranye "📌 Tugas dari Owner". Centang → klaim poin via
 * DailyChecklist (claimIncidentalTask). Anti double-tap.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { claimIncidentalTask } from "@/lib/claimIncidentalTask";

export default function IncidentalTaskList({ user }) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [processingId, setProcessingId] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["incidental-tasks-mine", user?.email, today],
    queryFn: () => base44.entities.IncidentalTask.filter({ status: "pending" }, "-due_date", 200),
    enabled: !!user?.email,
    staleTime: 30 * 1000,
  });

  const myTasks = tasks.filter(
    (t) =>
      t.is_active !== false &&
      t.status === "pending" &&
      (!t.due_date || t.due_date <= today) &&
      (!t.assigned_to_email || t.assigned_to_email === user.email)
  );

  const handleCheck = async (task) => {
    if (processingId) return;
    setProcessingId(task.id);
    try {
      await claimIncidentalTask(task, user);
      qc.invalidateQueries({ queryKey: ["incidental-tasks-mine"] });
      qc.invalidateQueries({ queryKey: ["my-checklist-today"] });
      toast.success(`Tugas diklaim: +${task.points} poin menunggu approval`);
    } catch (e) {
      toast.error("Gagal mengklaim: " + (e.message || e));
    }
    setProcessingId(null);
  };

  if (myTasks.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {myTasks.map((task) => (
        <div
          key={task.id}
          className="rounded-2xl border-2 border-orange-300 bg-orange-50 shadow-sm p-3.5 flex items-start gap-3"
        >
          <span className="text-lg flex-shrink-0">📌</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">{task.title}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-200 text-orange-800">
                Tugas dari Owner
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                +{task.points} poin
              </span>
            </div>
            {task.notes && <p className="text-xs text-gray-600 mt-0.5">{task.notes}</p>}
            {task.due_date && (
              <p className="text-xs text-orange-600 mt-0.5">Tenggat: {task.due_date}</p>
            )}
            {task.photo_url && (
              <img
                src={task.photo_url}
                alt="Acuan"
                className="w-16 h-12 rounded-lg object-cover border border-orange-200 mt-1.5"
              />
            )}
          </div>
          <button
            onClick={() => handleCheck(task)}
            disabled={processingId === task.id}
            className="flex-shrink-0 w-8 h-8 rounded-xl border-2 border-orange-400 bg-white flex items-center justify-center active:scale-95 disabled:opacity-50 transition-transform"
            title="Tandai selesai"
          >
            {processingId === task.id ? (
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-orange-500" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}