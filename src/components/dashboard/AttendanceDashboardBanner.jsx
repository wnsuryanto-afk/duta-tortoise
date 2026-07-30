import { useQuery } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, Clock, AlertCircle, LogOut } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AttendanceDashboardBanner() {
  const today = format(new Date(), "yyyy-MM-dd");

  // Hanya ambil absensi feeder (role=keeper)
  const { data: attendances = [] } = useQuery({
    queryKey: ["attendance-feeder-today", today],
    queryFn: () => base44.entities.Attendance.filter({ date: today }),
  });

  const { data: users = [] } = useActiveUsers();

  // Filter hanya user dengan role keeper
  const feeders = users.filter(u => u.role === "keeper");
  const feederEmails = new Set(feeders.map(f => f.email));

  // Filter absensi hanya feeder
  const feederAttendances = attendances.filter(a => feederEmails.has(a.employee_email));

  const hadir = feederAttendances.filter(a => a.status === "hadir");
  const izin = feederAttendances.filter(a => a.status === "izin");
  const sakit = feederAttendances.filter(a => a.status === "sakit");

  // Feeder belum absen
  const absenEmails = new Set(feederAttendances.map(a => a.employee_email));
  const belumAbsen = feeders.filter(f => !absenEmails.has(f.email));

  return (
    <Card className="p-4 border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-background">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">Absensi Feeder Hari Ini</h2>
          <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-green-100 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm font-bold text-green-700">{hadir.length}</span>
            <span className="text-xs text-green-600">Hadir</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-100 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-sm font-bold text-blue-700">{izin.length}</span>
            <span className="text-xs text-blue-600">Izin</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-100 px-2.5 py-1 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span className="text-sm font-bold text-red-700">{sakit.length}</span>
            <span className="text-xs text-red-600">Sakit</span>
          </div>
        </div>
      </div>

      {feederAttendances.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {feederAttendances.map((a) => (
            <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background border text-xs">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                a.status === "hadir" ? "bg-green-500" :
                a.status === "izin" ? "bg-blue-500" : "bg-red-500"
              }`} />
              <span className="font-medium">{a.employee_name}</span>
              {a.check_in && <span className="text-muted-foreground">{a.check_in}</span>}
              {a.check_out ? (
                <span className="flex items-center gap-0.5 text-green-600 font-medium">
                  <LogOut className="w-2.5 h-2.5" />{a.check_out}
                </span>
              ) : (
                <span className="text-orange-500 italic">blm checkout</span>
              )}
              {a.overtime_hours > 0 && (
                <Badge className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0 h-4">
                  +{a.overtime_hours}j lembur
                </Badge>
              )}
            </div>
          ))}
          {belumAbsen.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-dashed text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
              <span>{f.full_name || f.email}</span>
              <span className="italic">belum absen</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {feeders.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada feeder terdaftar</p>
          ) : (
            feeders.map((f) => (
              <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-dashed text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                <span>{f.full_name || f.email}</span>
                <span className="italic">belum absen</span>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}