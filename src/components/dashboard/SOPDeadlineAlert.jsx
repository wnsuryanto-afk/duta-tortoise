import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

function getMinutesUntil(timeStr) {
  if (!timeStr) return null;
  const now = new Date();
  const [h, m] = timeStr.split(":").map(Number);
  const deadline = new Date();
  deadline.setHours(h, m, 0, 0);
  return Math.floor((deadline - now) / 60000);
}

export default function SOPDeadlineAlert() {
  const { user } = useCurrentUser();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: tasks = [] } = useQuery({
    queryKey: ["sop-tasks-active"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
  });

  const { data: todayChecklist } = useQuery({
    queryKey: ["checklist-today", user?.email, today],
    queryFn: async () => {
      const all = await base44.entities.DailyChecklist.filter({ employee_email: user.email, date: today });
      return all[0] || null;
    },
    enabled: !!user?.email,
    refetchInterval: 60000, // refresh tiap menit
  });

  // Task yang sudah dikerjakan hari ini
  const completedTaskIds = new Set(
    (todayChecklist?.completed_tasks || []).map((t) => t.task_id)
  );

  // Sudah submit hari ini → tidak perlu tampilkan alert
  if (todayChecklist?.status === "submitted" || todayChecklist?.status === "approved") {
    return null;
  }

  // Filter task harian dengan deadline_time yang belum selesai
  const now = new Date();
  const urgentTasks = tasks
    .filter((t) => t.frequency === "harian" && t.deadline_time && !completedTaskIds.has(t.id))
    .map((t) => ({ ...t, minutesLeft: getMinutesUntil(t.deadline_time) }))
    .filter((t) => t.minutesLeft !== null && t.minutesLeft <= 60 && t.minutesLeft >= -30)
    .sort((a, b) => a.minutesLeft - b.minutesLeft);

  if (urgentTasks.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3 animate-pulse-once">
      <div className="flex items-center gap-2 text-red-700 font-semibold">
        <AlertTriangle className="w-5 h-5 fill-red-200 text-red-600" />
        <span>Pengingat! Task SOP Mendekati Batas Waktu</span>
      </div>
      <div className="space-y-2">
        {urgentTasks.map((task) => {
          const isOverdue = task.minutesLeft < 0;
          const isVeryUrgent = task.minutesLeft >= 0 && task.minutesLeft <= 15;
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                isOverdue
                  ? "bg-red-100 border border-red-300"
                  : isVeryUrgent
                  ? "bg-orange-100 border border-orange-300"
                  : "bg-yellow-50 border border-yellow-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock
                  className={`w-4 h-4 ${
                    isOverdue ? "text-red-600" : isVeryUrgent ? "text-orange-500" : "text-yellow-600"
                  }`}
                />
                <span className={`font-medium ${isOverdue ? "text-red-700" : "text-gray-800"}`}>
                  {task.title}
                </span>
              </div>
              <span
                className={`text-xs font-bold whitespace-nowrap ml-2 ${
                  isOverdue ? "text-red-600" : isVeryUrgent ? "text-orange-600" : "text-yellow-700"
                }`}
              >
                {isOverdue
                  ? `Terlambat ${Math.abs(task.minutesLeft)} mnt`
                  : task.minutesLeft === 0
                  ? "Sekarang!"
                  : `${task.minutesLeft} mnt lagi`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}