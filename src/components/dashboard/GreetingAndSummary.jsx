import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, ClipboardCheck, Bell, Syringe } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { formatDateIndonesian } from "@/lib/formatIndonesian";

export default function GreetingAndSummary() {
  const { user } = useCurrentUser();

  // Greeting berdasarkan waktu
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat pagi";
    if (hour < 15) return "Selamat siang";
    if (hour < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);

  // Hitung tugas hari ini
  const { data: todayChecklists = [] } = useQuery({
    queryKey: ["today-checklists"],
    queryFn: () => base44.entities.DailyChecklist.filter({
      date: new Date().toISOString().split('T')[0]
    }),
  });

  // Hitung treatment hari ini
  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments"],
    queryFn: () => base44.entities.TreatmentSchedule.list(),
  });
  const todayTreatments = treatments.filter(t => {
    if (!t.next_due) return false;
    return t.next_due === new Date().toISOString().split('T')[0];
  });

  // Hitung notifikasi belum dibaca
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => base44.entities.Notification.filter({
      recipient_email: user?.email,
      is_read: false
    }),
  });

  const today = formatDateIndonesian(new Date());

  return (
    <div className="mb-6">
      <div className="mb-4">
        <h1 className="text-3xl font-heading font-bold text-foreground">
          {greeting}, {user?.full_name || user?.email?.split('@')[0]}! 🐢
        </h1>
        <div className="flex items-center gap-2 text-muted-foreground mt-1">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Hari ini: {today}</span>
        </div>
      </div>

      {/* Card Ringkasan Hari Ini */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Tugas</p>
              <p className="font-semibold text-primary">
                {todayChecklists.filter(c => c.status === 'submitted' || c.status === 'approved').length} dari {todayChecklists.length} selesai
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Treatment</p>
              <p className="font-semibold text-accent">{todayTreatments.length} jadwal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Notifikasi</p>
              <p className="font-semibold text-orange-500">{notifications.length} belum dibaca</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}