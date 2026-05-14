import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function CheckInWidget() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayAttendance } = useQuery({
    queryKey: ["attendance-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.Attendance.filter({ employee_email: user.email, date: today });
      return res[0] || null;
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const now = () => format(new Date(), "HH:mm");

  const handleCheckIn = async () => {
    if (!user) return;
    setLoading(true);
    await base44.entities.Attendance.create({
      employee_id: user.id,
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      date: today,
      check_in: now(),
      status: "hadir",
    });
    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    setLoading(false);
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;
    setLoading(true);
    await base44.entities.Attendance.update(todayAttendance.id, { check_out: now() });
    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    setLoading(false);
  };

  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Absensi Hari Ini</p>
              <p className="text-xs text-muted-foreground capitalize">
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {hasCheckedIn && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="font-bold text-primary text-sm">{todayAttendance.check_in}</p>
              </div>
            )}
            {hasCheckedOut && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="font-bold text-green-600 text-sm">{todayAttendance.check_out}</p>
              </div>
            )}
            {hasCheckedOut ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
              </Badge>
            ) : hasCheckedIn ? (
              <Button size="sm" variant="outline" onClick={handleCheckOut} disabled={loading} className="border-red-200 text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-1.5" />
                {loading ? "..." : "Check-out"}
              </Button>
            ) : (
              <Button size="sm" onClick={handleCheckIn} disabled={loading}>
                <LogIn className="w-4 h-4 mr-1.5" />
                {loading ? "..." : "Check-in"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}