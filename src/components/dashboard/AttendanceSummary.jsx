import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { format } from "date-fns";

export default function AttendanceSummary() {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendance-today", today],
    queryFn: () => base44.entities.Attendance.filter({ date: today }),
  });

  const hadir = attendances.filter((a) => a.status === "hadir");
  const izin  = attendances.filter((a) => a.status === "izin");
  const sakit = attendances.filter((a) => a.status === "sakit");

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-base">Absensi Hari Ini</h2>
        <span className="ml-auto text-xs text-muted-foreground">{format(new Date(), "d MMM yyyy")}</span>
      </div>

      {attendances.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Belum ada absensi hari ini</p>
      ) : (
        <>
          {/* Ringkasan */}
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

          {/* Daftar karyawan hadir */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {attendances.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {(a.employee_name || "?")[0].toUpperCase()}
                  </div>
                  <p className="text-xs font-medium">{a.employee_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{a.check_in && `Masuk ${a.check_in}`}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    a.status === "hadir" ? "bg-green-100 text-green-700" :
                    a.status === "izin"  ? "bg-blue-100 text-blue-700"  :
                                           "bg-red-100 text-red-700"
                  }`}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}