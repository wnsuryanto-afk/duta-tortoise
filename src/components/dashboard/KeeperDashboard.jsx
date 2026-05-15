import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogIn, LogOut, CheckCircle2, Clock, Bell,
  ClipboardList, AlertTriangle, Star, ChevronRight
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";
import { Link } from "react-router-dom";

function getMinutesUntil(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const deadline = new Date();
  deadline.setHours(h, m, 0, 0);
  return Math.floor((deadline - new Date()) / 60000);
}

export default function KeeperDashboard() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const today = format(new Date(), "yyyy-MM-dd");
  const currentPeriod = format(new Date(), "yyyy-MM");
  const [checkLoading, setCheckLoading] = useState(false);

  // ── Absensi ──
  const { data: todayAttendance } = useQuery({
    queryKey: ["attendance-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.Attendance.filter({ employee_email: user.email, date: today });
      return res[0] || null;
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  // ── SOP tasks & checklist ──
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
    refetchInterval: 60000,
  });

  // ── KPI bulan ini ──
  const { data: checklists = [] } = useQuery({
    queryKey: ["checklist-my-month", user?.email, currentPeriod],
    queryFn: async () => {
      const all = await base44.entities.DailyChecklist.filter({ employee_email: user.email });
      return all.filter((c) => c.date?.startsWith(currentPeriod));
    },
    enabled: !!user?.email,
  });

  // ── Pengingat kesehatan ──
  const { data: reminders = [] } = useQuery({
    queryKey: ["health-reminders"],
    queryFn: () => base44.entities.HealthReminder.filter({ is_done: false }),
  });

  // ── Handlers check-in / out ──
  const now = () => format(new Date(), "HH:mm");
  const handleCheckIn = async () => {
    if (!user) return;
    setCheckLoading(true);
    await base44.entities.Attendance.create({
      employee_id: user.id,
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      date: today,
      check_in: now(),
      status: "hadir",
    });
    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    setCheckLoading(false);
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;
    setCheckLoading(true);
    await base44.entities.Attendance.update(todayAttendance.id, { check_out: now() });
    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    setCheckLoading(false);
  };

  // ── Derived ──
  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  const completedTaskIds = new Set((todayChecklist?.completed_tasks || []).map((t) => t.task_id));
  const totalDailyTasks = tasks.filter((t) => t.frequency === "harian" && t.is_active).length;
  const doneCount = tasks.filter((t) => t.frequency === "harian" && completedTaskIds.has(t.id)).length;
  const sopSubmitted = todayChecklist?.status === "submitted" || todayChecklist?.status === "approved";

  const urgentSOP = tasks
    .filter((t) => t.frequency === "harian" && t.deadline_time && !completedTaskIds.has(t.id))
    .map((t) => ({ ...t, minutesLeft: getMinutesUntil(t.deadline_time) }))
    .filter((t) => t.minutesLeft !== null && t.minutesLeft <= 60 && t.minutesLeft >= -30)
    .sort((a, b) => a.minutesLeft - b.minutesLeft);

  const upcomingReminders = reminders
    .filter((r) => {
      const days = differenceInDays(parseISO(r.due_date), parseISO(today));
      return days <= 7;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 3);

  const approvedPoints = checklists
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + (c.approved_points || 0), 0);

  const approvedDays = checklists.filter((c) => c.status === "approved").length;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-heading font-bold">
          Halo, {user?.full_name?.split(" ")[0] || "Keeper"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5 capitalize">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
        </p>
      </div>

      {/* ── 1. CHECK-IN ── */}
      <Card className={`p-5 border-2 ${hasCheckedOut ? "border-green-200 bg-green-50" : hasCheckedIn ? "border-primary/30 bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${hasCheckedOut ? "bg-green-100" : "bg-primary/15"}`}>
              <Clock className={`w-5 h-5 ${hasCheckedOut ? "text-green-600" : "text-primary"}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">Absensi Hari Ini</p>
              {hasCheckedIn ? (
                <p className="text-xs text-muted-foreground">
                  Masuk: <span className="font-medium text-primary">{todayAttendance.check_in}</span>
                  {hasCheckedOut && <> · Keluar: <span className="font-medium text-green-600">{todayAttendance.check_out}</span></>}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Belum absen hari ini</p>
              )}
            </div>
          </div>
          {hasCheckedOut ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
            </Badge>
          ) : hasCheckedIn ? (
            <Button size="sm" variant="outline" onClick={handleCheckOut} disabled={checkLoading}
              className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5">
              <LogOut className="w-4 h-4" />
              {checkLoading ? "..." : "Check-out"}
            </Button>
          ) : (
            <Button size="sm" onClick={handleCheckIn} disabled={checkLoading} className="gap-1.5">
              <LogIn className="w-4 h-4" />
              {checkLoading ? "..." : "Check-in"}
            </Button>
          )}
        </div>
      </Card>

      {/* ── 2. TARGET SOP HARI INI ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base">Target SOP Hari Ini</h2>
          </div>
          <Link to="/sop">
            <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 px-2">
              Lihat semua <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{doneCount} dari {totalDailyTasks} task selesai</span>
            <span className="font-medium">{totalDailyTasks > 0 ? Math.round((doneCount / totalDailyTasks) * 100) : 0}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalDailyTasks > 0 ? (doneCount / totalDailyTasks) * 100 : 0}%` }}
            />
          </div>
        </div>

        {sopSubmitted ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm font-medium text-green-700">
              {todayChecklist?.status === "approved" ? "Checklist disetujui ✓" : "Checklist sudah dikirim, menunggu persetujuan"}
            </p>
          </div>
        ) : urgentSOP.length > 0 ? (
          <div className="space-y-2">
            {urgentSOP.map((task) => {
              const isOverdue = task.minutesLeft < 0;
              return (
                <div key={task.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${isOverdue ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-orange-500"}`} />
                    <span className="font-medium">{task.title}</span>
                  </div>
                  <span className={`text-xs font-bold ${isOverdue ? "text-red-600" : "text-orange-600"}`}>
                    {isOverdue ? `Terlambat ${Math.abs(task.minutesLeft)}m` : `${task.minutesLeft}m lagi`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : totalDailyTasks === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Belum ada task SOP aktif</p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">Tidak ada task mendesak saat ini</p>
        )}
      </Card>

      {/* ── 3. PENGINGAT ── */}
      {upcomingReminders.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-base">Pengingat</h2>
            </div>
            <Link to="/reminders">
              <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 px-2">
                Lihat semua <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingReminders.map((r) => {
              const days = differenceInDays(parseISO(r.due_date), parseISO(today));
              const isOverdue = days < 0;
              const isToday = days === 0;
              return (
                <div key={r.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${isOverdue ? "bg-red-50 border-red-200" : isToday ? "bg-orange-50 border-orange-200" : "bg-muted/40 border-transparent"}`}>
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.tortoise_name || "Semua Kura-kura"}</p>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ml-2 ${isOverdue ? "text-red-600" : isToday ? "text-orange-600" : "text-muted-foreground"}`}>
                    {isOverdue ? `${Math.abs(days)}h terlambat` : isToday ? "Hari ini!" : `${days} hari lagi`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── 4. KPI RINGKAS ── */}
      <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-amber-500 fill-current" />
          <h2 className="font-semibold text-base text-amber-800">
            KPI Bulan Ini — {format(new Date(), "MMMM", { locale: id })}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-heading font-bold text-amber-700">{approvedPoints}</p>
            <p className="text-xs text-amber-600 mt-0.5">Poin Terkumpul</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-heading font-bold text-amber-700">{approvedDays}</p>
            <p className="text-xs text-amber-600 mt-0.5">Hari Disetujui</p>
          </div>
        </div>
      </Card>
    </div>
  );
}