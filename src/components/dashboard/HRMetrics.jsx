import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hanyaLaporan } from "@/lib/laporan";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Clock } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function HRMetrics() {
  const { role } = useCurrentUser();
  const isAdmin = ["owner", "admin", "manajer"].includes(role);

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendances-hr"],
    queryFn: async () => hanyaLaporan(await base44.entities.Attendance.filter({
      date: new Date().toISOString().split('T')[0]
    })),
    enabled: isAdmin,
  });

  const { data: kasbons = [] } = useQuery({
    queryKey: ["kasbons-pending"],
    queryFn: () => base44.entities.Kasbon.filter({ status: 'pending' }),
    enabled: isAdmin,
  });

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  const { data: overtimeLogs = [] } = useQuery({
    queryKey: ["overtime-month"],
    queryFn: async () => hanyaLaporan(await base44.entities.OvertimeLog.list()),
    enabled: isAdmin,
  });
  const monthOvertime = overtimeLogs.filter(o => String(o.date || "").startsWith(currentMonth));
  const totalOvertimeHours = monthOvertime.reduce((sum, o) => sum + (o.hours || 0), 0);

  if (!isAdmin) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hadir Hari Ini</p>
              <p className="text-lg font-bold text-primary">{attendances.filter(a => a.status === 'hadir').length} karyawan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kasbon Pending</p>
              <p className="text-lg font-bold text-orange-500">{kasbons.length} pengajuan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lembur Bulan Ini</p>
              <p className="text-lg font-bold text-blue-500">{totalOvertimeHours} jam</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}