import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { Star, TrendingUp, CheckCircle2, Target } from "lucide-react";

function formatRp(val) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}

export default function GuidedPoinSaya({ user }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const currentPeriod = format(new Date(), "yyyy-MM");

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
  });

  // Ambil MaintenanceLog bulan ini milik user ini
  const { data: logs = [] } = useQuery({
    queryKey: ["maintenance-my-month", user?.email, currentPeriod],
    queryFn: async () => {
      const all = await base44.entities.MaintenanceLog.filter({ done_by_email: user.email });
      return all.filter(l => l.period_key?.startsWith(currentPeriod) && l.is_done);
    },
    enabled: !!user?.email,
  });

  const TARGET = settings?.min_poin_bulanan ?? 0;
  const nilaiPerPoin = settings?.nilai_per_poin ?? 0;
  const settingsSiap = TARGET > 0 && nilaiPerPoin > 0;

  const totalPoin = logs.reduce((s, l) => s + (l.poin_earned || 0), 0);
  const pct = TARGET > 0 ? Math.min(100, Math.round((totalPoin / TARGET) * 100)) : 0;
  const kurang = Math.max(0, TARGET - totalPoin);
  const estBonus = settingsSiap && totalPoin >= TARGET ? (totalPoin - TARGET) * nilaiPerPoin : 0;

  // Riwayat 7 hari terakhir (aggregate poin per hari)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const dayLogs = logs.filter(l => l.period_key === d);
    const poin = dayLogs.reduce((s, l) => s + (l.poin_earned || 0), 0);
    return { date: d, poin, count: dayLogs.length };
  });

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-6 text-center">
        <Star className="w-10 h-10 text-amber-400 fill-amber-300 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-gray-800">Poin Bulan Ini</h1>
        <p className="text-sm text-gray-500 capitalize">{format(new Date(), "MMMM yyyy", { locale: id })}</p>
      </div>

      {/* Total poin besar */}
      <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white text-center shadow-lg">
        <p className="text-6xl font-bold">{totalPoin}</p>
        <p className="text-green-100 mt-1">poin terkumpul</p>
        <div className="mt-4">
          <div className="h-3 bg-green-600/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-green-100 mt-2">Target: {TARGET} poin ({pct}%)</p>
        </div>
      </div>

      {/* Status */}
      <div className={`rounded-2xl p-4 border flex items-center gap-3 ${kurang === 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
        {kurang === 0 ? (
          <>
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800">Target Tercapai! 🎉</p>
              <p className="text-sm text-green-600">Kamu melampaui target bulanan</p>
            </div>
          </>
        ) : (
          <>
            <Target className="w-8 h-8 text-orange-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-orange-800">Kurang {kurang} poin lagi</p>
              <p className="text-sm text-orange-600">Terus semangat! Target bulan ini {TARGET} poin</p>
            </div>
          </>
        )}
      </div>

      {/* Estimasi bonus */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
        <TrendingUp className="w-8 h-8 text-amber-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-amber-800">Estimasi Bonus</p>
          <p className="text-xl font-bold text-amber-700">{formatRp(estBonus)}</p>
          <p className="text-xs text-amber-600">{nilaiPerPoin.toLocaleString("id-ID")} rupiah per poin di atas target</p>
        </div>
      </div>

      {/* Riwayat 7 hari */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="font-semibold text-gray-700 mb-3">Riwayat 7 Hari Terakhir</p>
        <div className="space-y-2">
          {last7.map(day => {
            const isToday = day.date === today;
            return (
              <div key={day.date} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${isToday ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                <span className={`text-sm ${isToday ? "font-semibold text-green-700" : "text-gray-600"}`}>
                  {isToday ? "Hari ini" : format(new Date(day.date + "T00:00:00"), "EEE, d MMM", { locale: id })}
                </span>
                <div className="flex items-center gap-2">
                  {day.poin > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                      +{day.poin} poin
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                  {day.count > 0 && (
                    <span className="text-xs text-gray-400">{day.count} tugas</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}