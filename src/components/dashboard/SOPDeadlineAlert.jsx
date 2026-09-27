import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { tugasJatuhTempo, lamanya } from "@/lib/kepatuhanSOP";
import { AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

/**
 * SOPDeadlineAlert — tugas yang tenggatnya dekat atau sudah lewat hari ini.
 *
 * Komponen ini pernah punya salinannya sendiri dari hitungan itu, lengkap
 * dengan `getMinutesUntil` yang sama persis dengan dua berkas lain, dan
 * jendela `-30 <= sisa <= 60`. Jendela itu MEMBUANG tugas yang lewat tenggat
 * lebih dari setengah jam — persis tugas yang paling perlu dikejar. Jam empat
 * sore, saat tak satu pun dari tugas pagi akan dikerjakan lagi hari itu,
 * spanduk ini justru paling sunyi.
 *
 * Hitungannya sekarang di lib/kepatuhanSOP.js, satu untuk tiga layar.
 */
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

  // Yang lewat tenggat tidak pernah dibatasi; yang belum, dibatasi satu jam
  // ke depan. Paling banyak lima baris di spanduk — sisanya dihitung.
  const { semua, lewat } = tugasJatuhTempo(tasks, completedTaskIds, today);
  if (semua.length === 0) return null;
  const urgentTasks = semua.slice(0, 5);

  return (
    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3 animate-pulse-once">
      <div className="flex items-center gap-2 text-red-700 font-semibold">
        <AlertTriangle className="w-5 h-5 fill-red-200 text-red-600" />
        <span>
          {lewat.length > 0
            ? `${lewat.length} tugas SOP sudah lewat tenggat`
            : "Task SOP mendekati batas waktu"}
        </span>
      </div>
      <div className="space-y-2">
        {urgentTasks.map((task) => {
          const isOverdue = task.minutesLeft < 0;
          const isVeryUrgent = task.minutesLeft >= 0 && task.minutesLeft <= 15;
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                isOverdue
                  ? "bg-red-100 border border-red-300"
                  : isVeryUrgent
                  ? "bg-orange-100 border border-orange-300"
                  : "bg-yellow-50 border border-yellow-300"
              }`}
            >
              {/* Nama membungkus, sisa waktu tidak menyusut — tanpa min-w-0 di
                  kiri dan flex-shrink-0 di kanan, di layar ponsel yang mengalah
                  adalah sisa waktunya dan ia pecah di tengah frasa. */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Clock
                  className={`w-4 h-4 flex-shrink-0 ${
                    isOverdue ? "text-red-600" : isVeryUrgent ? "text-orange-500" : "text-yellow-600"
                  }`}
                />
                <span className={`font-medium line-clamp-2 break-words ${isOverdue ? "text-red-700" : "text-foreground"}`}>
                  {task.title}
                </span>
              </div>
              <span
                className={`text-xs font-bold whitespace-nowrap ml-2 flex-shrink-0 ${
                  isOverdue ? "text-red-600" : isVeryUrgent ? "text-orange-600" : "text-yellow-700"
                }`}
              >
                {isOverdue
                  ? `Lewat ${lamanya(task.minutesLeft)}`
                  : task.minutesLeft === 0
                  ? "Sekarang!"
                  : `${lamanya(task.minutesLeft)} lagi`}
              </span>
            </div>
          );
        })}
        {semua.length > urgentTasks.length && (
          <p className="text-[11px] text-red-700/80 px-1">
            dan {semua.length - urgentTasks.length} tugas lagi
          </p>
        )}
      </div>
    </div>
  );
}