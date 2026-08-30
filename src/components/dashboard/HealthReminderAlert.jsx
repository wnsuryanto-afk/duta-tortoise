import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Pill, Stethoscope, Syringe, Weight, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";

const typeConfig = {
  vitamin:  { icon: Pill,        color: "bg-purple-100 text-purple-700 border-purple-200", label: "Vitamin" },
  checkup:  { icon: Stethoscope, color: "bg-blue-100 text-blue-700 border-blue-200",       label: "Cek Kesehatan" },
  obat:     { icon: Pill,        color: "bg-red-100 text-red-700 border-red-200",           label: "Obat" },
  vaksin:   { icon: Syringe,     color: "bg-green-100 text-green-700 border-green-200",    label: "Vaksin" },
  timbang:  { icon: Weight,      color: "bg-amber-100 text-amber-700 border-amber-200",    label: "Timbang" },
  lainnya:  { icon: Clock,       color: "bg-muted text-muted-foreground border-border",    label: "Lainnya" },
};

function urgencyLevel(daysLeft) {
  if (daysLeft < 0)  return { label: `${Math.abs(daysLeft)} hari terlambat`, cls: "text-red-600 font-bold" };
  if (daysLeft === 0) return { label: "Hari ini!", cls: "text-red-500 font-bold" };
  if (daysLeft <= 3)  return { label: `${daysLeft} hari lagi`, cls: "text-orange-500 font-semibold" };
  return { label: `${daysLeft} hari lagi`, cls: "text-muted-foreground" };
}

export default function HealthReminderAlert() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [expanded, setExpanded] = useState(true);
  const [loadingId, setLoadingId] = useState(null);

  const { data: reminders = [] } = useQuery({
    queryKey: ["health-reminders"],
    queryFn: () => base44.entities.HealthReminder.filter({ is_done: false }),
  });

  // Tampilkan hanya yang jatuh tempo dalam 14 hari ke depan atau sudah terlambat
  const upcoming = reminders
    .filter((r) => {
      const days = differenceInDays(parseISO(r.due_date), parseISO(today));
      return days <= 14;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const handleDone = async (reminder) => {
    setLoadingId(reminder.id);
    const updates = { is_done: true, done_date: today };
    // Jika berulang, buat jadwal berikutnya
    if (reminder.interval_days) {
      const nextDate = new Date(reminder.due_date);
      nextDate.setDate(nextDate.getDate() + reminder.interval_days);
      await base44.entities.HealthReminder.create({
        ...reminder,
        id: undefined,
        due_date: format(nextDate, "yyyy-MM-dd"),
        is_done: false,
        done_date: null,
      });
    }
    await base44.entities.HealthReminder.update(reminder.id, updates);
    queryClient.invalidateQueries({ queryKey: ["health-reminders"] });
    setLoadingId(null);
  };

  if (upcoming.length === 0) return null;

  const overdueCount = upcoming.filter(r => differenceInDays(parseISO(r.due_date), parseISO(today)) < 0).length;
  const todayCount   = upcoming.filter(r => differenceInDays(parseISO(r.due_date), parseISO(today)) === 0).length;

  return (
    <Card className="overflow-hidden border-2 border-blue-200">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-blue-800">
            Pengingat Kesehatan Kura-kura
          </span>
          <div className="flex gap-1.5 ml-1">
            {overdueCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-[11px]">{overdueCount} terlambat</Badge>
            )}
            {todayCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-[11px]">{todayCount} hari ini</Badge>
            )}
            {overdueCount === 0 && todayCount === 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-[11px]">{upcoming.length} mendatang</Badge>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-blue-500" />}
      </button>

      {expanded && (
        <div className="divide-y">
          {upcoming.map((reminder) => {
            const daysLeft = differenceInDays(parseISO(reminder.due_date), parseISO(today));
            const urgency = urgencyLevel(daysLeft);
            const conf = typeConfig[reminder.type] || typeConfig.lainnya;
            const Icon = conf.icon;
            return (
              <div
                key={reminder.id}
                className={`flex items-center gap-3 px-5 py-3 ${daysLeft < 0 ? "bg-red-50" : daysLeft === 0 ? "bg-orange-50" : "bg-card"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${conf.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{reminder.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {reminder.tortoise_name || "Semua Kura-kura"}
                      {reminder.enclosure ? ` · Kandang ${reminder.enclosure}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(reminder.due_date), "d MMM yyyy", { locale: id })}
                    </span>
                    {reminder.interval_days && (
                      <span className="text-[11px] text-muted-foreground">🔄 tiap {reminder.interval_days} hari</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs ${urgency.cls}`}>{urgency.label}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2 text-green-700 border-green-300 hover:bg-green-50"
                    disabled={loadingId === reminder.id}
                    onClick={() => handleDone(reminder)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {loadingId === reminder.id ? "..." : "Selesai"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}