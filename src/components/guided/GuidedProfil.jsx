import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { LogOut, User, Calendar, CheckCircle2, XCircle, Clock, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABELS = {
  keeper: "Keeper",
  kepala_feeder: "Kepala Feeder",
};

function formatRp(val) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}

export default function GuidedProfil({ user, onSwitchToNormal }) {
  const currentPeriod = format(new Date(), "yyyy-MM");

  const { data: slip } = useQuery({
    queryKey: ["salary-slip-current", user?.email, currentPeriod],
    queryFn: async () => {
      const res = await base44.entities.SalarySlip.filter({ employee_email: user.email, period: currentPeriod });
      return res[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendance-month", user?.email, currentPeriod],
    queryFn: async () => {
      const all = await base44.entities.Attendance.filter({ employee_email: user.email });
      return all.filter(a => a.date?.startsWith(currentPeriod));
    },
    enabled: !!user?.email,
  });

  const hadir = attendances.filter(a => a.status === "hadir").length;
  const izin  = attendances.filter(a => a.status === "izin").length;
  const sakit = attendances.filter(a => a.status === "sakit").length;
  const initials = (user?.full_name || user?.email || "?")[0].toUpperCase();

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Header profil */}
      <div className="pt-6 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-300 flex items-center justify-center mb-3">
          <span className="text-3xl font-bold text-green-700">{initials}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-800">{user?.full_name || user?.email}</h1>
        <span className="mt-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
          {ROLE_LABELS[user?.role] || user?.role}
        </span>
        <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
      </div>

      {/* Slip gaji bulan ini */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          💰 Gaji {format(new Date(), "MMMM yyyy", { locale: id })}
        </p>
        {slip ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Gaji Pokok</span>
              <span className="font-semibold text-gray-800">{formatRp(slip.base_salary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Bonus Poin</span>
              <span className="font-semibold text-green-700">+{formatRp(slip.poin_bonus)}</span>
            </div>
            {slip.absent_deduction > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Potongan Absen</span>
                <span className="font-semibold text-red-600">-{formatRp(slip.absent_deduction)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between">
              <span className="font-bold text-gray-700">Take Home Pay</span>
              <span className="font-bold text-lg text-green-700">{formatRp(slip.net_total)}</span>
            </div>
            <div className="flex justify-center mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                slip.status === "paid" ? "bg-green-100 text-green-700" :
                slip.status === "approved" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {slip.status === "paid" ? "✓ Sudah dibayar" : slip.status === "approved" ? "Disetujui" : "Draft"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">Slip gaji belum dibuat bulan ini</p>
        )}
      </div>

      {/* Absensi bulan ini */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          Absensi Bulan Ini
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{hadir}</p>
            <p className="text-xs text-green-600">Hadir</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{izin}</p>
            <p className="text-xs text-blue-600">Izin</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <XCircle className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-700">{sakit}</p>
            <p className="text-xs text-orange-600">Sakit</p>
          </div>
        </div>
      </div>

      {/* Switch ke tampilan normal */}
      <button
        onClick={onSwitchToNormal}
        className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <ToggleRight className="w-5 h-5 text-blue-500" />
        <div className="text-left flex-1">
          <p className="font-semibold text-gray-700">Tampilan Normal</p>
          <p className="text-xs text-gray-400">Beralih ke menu lengkap</p>
        </div>
        <span className="text-xs text-blue-500 font-medium">Aktifkan →</span>
      </button>

      {/* Logout */}
      <button
        onClick={() => base44.auth.logout()}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 font-semibold hover:bg-red-100 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Keluar dari Akun
      </button>
    </div>
  );
}