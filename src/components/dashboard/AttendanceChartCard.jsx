import { useQuery } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function AttendanceChartCard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendance-chart", sevenDaysAgo],
    queryFn: () => base44.entities.Attendance.filter({}),
    select: (data) => data.filter(a => a.date >= sevenDaysAgo && a.date <= today),
  });

  const { data: users = [] } = useActiveUsers();

  const todayAttendances = attendances.filter(a => a.date === today);
  const hadir = todayAttendances.filter(a => a.status === "hadir");
  const izin = todayAttendances.filter(a => a.status === "izin");
  const sakit = todayAttendances.filter(a => a.status === "sakit");

  // Grafik 7 hari terakhir
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const label = format(subDays(new Date(), 6 - i), "EEE", { locale: id });
    const dayAttend = attendances.filter(a => a.date === d);
    return {
      name: label,
      Hadir: dayAttend.filter(a => a.status === "hadir").length,
      Izin:  dayAttend.filter(a => a.status === "izin").length,
      Sakit: dayAttend.filter(a => a.status === "sakit").length,
    };
  });

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-base">Absensi Karyawan</h2>
        <span className="ml-auto text-xs text-muted-foreground">{format(new Date(), "d MMM yyyy")}</span>
      </div>

      {/* Ringkasan hari ini */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-xl bg-green-50 text-center">
          <p className="text-lg font-bold text-green-600">{hadir.length}</p>
          <p className="text-[11px] text-green-700">Hadir</p>
        </div>
        <div className="p-2 rounded-xl bg-blue-50 text-center">
          <p className="text-lg font-bold text-blue-600">{izin.length}</p>
          <p className="text-[11px] text-blue-700">Izin</p>
        </div>
        <div className="p-2 rounded-xl bg-red-50 text-center">
          <p className="text-lg font-bold text-red-600">{sakit.length}</p>
          <p className="text-[11px] text-red-700">Sakit</p>
        </div>
      </div>

      {/* Grafik 7 hari */}
      <p className="text-xs text-muted-foreground mb-2">7 Hari Terakhir</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={days} barSize={10} barGap={2}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Hadir" fill="#22c55e" radius={[3,3,0,0]} />
          <Bar dataKey="Izin"  fill="#3b82f6" radius={[3,3,0,0]} />
          <Bar dataKey="Sakit" fill="#ef4444" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Daftar hadir hari ini */}
      {todayAttendances.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {todayAttendances.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {(a.employee_name || "?")[0].toUpperCase()}
                </div>
                <p className="text-xs font-medium">{a.employee_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{a.check_in && `Masuk ${a.check_in}`}</span>
                {a.check_out && <span className="text-[11px] text-muted-foreground">· Keluar {a.check_out}</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  a.status === "hadir" ? "bg-green-100 text-green-700" :
                  a.status === "izin"  ? "bg-blue-100 text-blue-700"  :
                                         "bg-red-100 text-red-700"
                }`}>{a.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}