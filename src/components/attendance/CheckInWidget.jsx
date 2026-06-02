import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, CheckCircle2, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getCurrentPosition, haversineDistance, calcOvertimeHours } from "./useGPSLocation";
import { useTestMode } from "@/lib/useTestMode";
import { logActivity } from "@/lib/logActivity";

const DEFAULT_RADIUS = 200;

export default function CheckInWidget() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { testModeTag } = useTestMode();
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [locationWarning, setLocationWarning] = useState(null);
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

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
  });

  const { data: salaryConfig } = useQuery({
    queryKey: ["salary-config", user?.role],
    queryFn: async () => {
      const res = await base44.entities.SalaryConfig.filter({ role: user?.role });
      return res[0] || null;
    },
    enabled: !!user?.role,
  });

  const nowStr = () => format(new Date(), "HH:mm");

  const getFarmCoords = () => ({
    lat: settings?.farm_lat || null,
    lng: settings?.farm_lng || null,
    radius: settings?.farm_location_radius || DEFAULT_RADIUS,
  });

  const handleCheckIn = async () => {
    if (!user) return;
    setLoading(true);
    setGpsError(null);
    setLocationWarning(null);

    let lat = null, lng = null, verified = false;

    try {
      const pos = await getCurrentPosition();
      lat = pos.lat;
      lng = pos.lng;

      const farm = getFarmCoords();
      if (farm.lat && farm.lng) {
        const dist = Math.round(haversineDistance(lat, lng, farm.lat, farm.lng));
        if (dist > farm.radius) {
          setLocationWarning(`Anda berada ${dist}m dari lokasi kandang. Check in tetap tercatat tapi ditandai di luar lokasi.`);
          verified = false;
        } else {
          verified = true;
        }
      }
    } catch (err) {
      setGpsError(err.message);
    }

    const checkInTime = nowStr();
    const newRecord = await base44.entities.Attendance.create({
      employee_id: user.id,
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      date: today,
      check_in: checkInTime,
      status: "hadir",
      check_in_lat: lat,
      check_in_lng: lng,
      location_verified: verified,
      shift_start: salaryConfig?.shift_start || "08:00",
      shift_end: salaryConfig?.shift_end || "16:00",
      ...testModeTag,
    });

    await logActivity({
      action: "checkin",
      entity_type: "Attendance",
      entity_id: newRecord?.id,
      entity_name: `${user.full_name || user.email} - ${today}`,
      changes_detail: [
        { field: "check_in", label: "Check In", old_value: "-", new_value: checkInTime },
      ],
      changes_summary: `Check in pukul ${checkInTime}`,
    });

    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    setLoading(false);
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;
    setLoading(true);
    setGpsError(null);
    setLocationWarning(null);

    const farm = getFarmCoords();

    // Jika ada koordinat farm, wajib dalam radius
    if (farm.lat && farm.lng) {
      let pos;
      try {
        pos = await getCurrentPosition();
      } catch (err) {
        setGpsError(err.message);
        setLoading(false);
        return;
      }

      const dist = Math.round(haversineDistance(pos.lat, pos.lng, farm.lat, farm.lng));
      if (dist > farm.radius) {
        setGpsError(`Check out gagal. Anda berada ${dist} meter dari kandang. Silakan menuju lokasi kandang (radius ${farm.radius}m) untuk checkout.`);
        setLoading(false);
        return;
      }

      const checkoutTime = nowStr();
      const shiftEnd = todayAttendance.shift_end || salaryConfig?.shift_end || "16:00";
      const overtimeHours = calcOvertimeHours(checkoutTime, shiftEnd);

      await base44.entities.Attendance.update(todayAttendance.id, {
        check_out: checkoutTime,
        check_out_lat: pos.lat,
        check_out_lng: pos.lng,
        overtime_hours: overtimeHours,
      });

      await logActivity({
        action: "checkout",
        entity_type: "Attendance",
        entity_id: todayAttendance.id,
        entity_name: `${todayAttendance.employee_name} - ${today}`,
        changes_detail: [
          { field: "check_out", label: "Check Out", old_value: "-", new_value: checkoutTime },
        ],
        changes_summary: `Check out pukul ${checkoutTime}${overtimeHours > 0 ? ` · Lembur ${overtimeHours} jam` : ""}`,
      });

      // Buat OvertimeLog otomatis jika ada lembur
      if (overtimeHours > 0) {
        await base44.entities.OvertimeLog.create({
          employee_name: todayAttendance.employee_name,
          employee_email: todayAttendance.employee_email,
          date: today,
          hours: overtimeHours,
          notes: `Lembur otomatis dari checkout ${checkoutTime}`,
          ...testModeTag,
        });
      }
    } else {
      // Tanpa GPS farm → checkout normal
      const checkoutTime = nowStr();
      const shiftEnd = todayAttendance.shift_end || salaryConfig?.shift_end || "16:00";
      const overtimeHours = calcOvertimeHours(checkoutTime, shiftEnd);

      await base44.entities.Attendance.update(todayAttendance.id, {
        check_out: checkoutTime,
        overtime_hours: overtimeHours,
      });

      await logActivity({
        action: "checkout",
        entity_type: "Attendance",
        entity_id: todayAttendance.id,
        entity_name: `${todayAttendance.employee_name} - ${today}`,
        changes_detail: [
          { field: "check_out", label: "Check Out", old_value: "-", new_value: checkoutTime },
        ],
        changes_summary: `Check out pukul ${checkoutTime}${overtimeHours > 0 ? ` · Lembur ${overtimeHours} jam` : ""}`,
      });

      if (overtimeHours > 0) {
        await base44.entities.OvertimeLog.create({
          employee_name: todayAttendance.employee_name,
          employee_email: todayAttendance.employee_email,
          date: today,
          hours: overtimeHours,
          notes: `Lembur otomatis dari checkout ${checkoutTime}`,
          ...testModeTag,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    queryClient.invalidateQueries({ queryKey: ["overtime-logs"] });
    setLoading(false);
  };

  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;
  const overtime = todayAttendance?.overtime_hours || 0;
  const farmConfigured = !!(settings?.farm_lat && settings?.farm_lng);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
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

            {/* Indikator lokasi */}
            {farmConfigured && hasCheckedIn && (
              <Badge variant="outline" className={`text-[11px] gap-1 ${todayAttendance?.location_verified ? "border-green-300 text-green-700" : "border-yellow-300 text-yellow-700"}`}>
                <MapPin className="w-3 h-3" />
                {todayAttendance?.location_verified ? "Lokasi OK" : "Di luar area"}
              </Badge>
            )}

            {hasCheckedOut ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
              </Badge>
            ) : hasCheckedIn ? (
              <Button size="sm" variant="outline" onClick={handleCheckOut} disabled={loading} className="border-red-200 text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-1.5" />
                {loading ? "Memproses..." : "Check-out"}
              </Button>
            ) : (
              <Button size="sm" onClick={handleCheckIn} disabled={loading}>
                <LogIn className="w-4 h-4 mr-1.5" />
                {loading ? "Memproses..." : "Check-in"}
              </Button>
            )}
          </div>
        </div>

        {/* Lembur info */}
        {hasCheckedOut && overtime > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Lembur: <strong>{overtime} jam</strong> — tercatat otomatis</span>
          </div>
        )}

        {/* Warning lokasi */}
        {locationWarning && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{locationWarning}</span>
          </div>
        )}

        {/* GPS Error */}
        {gpsError && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{gpsError}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}