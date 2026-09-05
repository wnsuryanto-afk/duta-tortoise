import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, subDays, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { Star, Target, TrendingUp, TrendingDown, Award } from "lucide-react";

/**
 * Tampilan poin keeper.
 *
 * Keputusan pemilik: keeper cukup tahu BERAPA POIN yang mereka kumpulkan.
 * Mereka tidak perlu tahu satu poin bernilai berapa rupiah, dan tidak perlu
 * melihat perkiraan bonus. Karena itu seluruh tampilan rupiah, nilai per poin,
 * dan perhitungan uang dihapus dari komponen ini — yang tersisa hanya poin,
 * target, grafik 7 hari, dan perbandingan dengan bulan lalu.
 */
export default function GuidedPoinSaya({ user }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const currentPeriod = format(new Date(), "yyyy-MM");
  const lastPeriod = format(subMonths(new Date(), 1), "yyyy-MM");

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
  });

  // Hanya target poin bulanan yang dipakai. Nilai per poin SENGAJA TIDAK
  // diambil — agar tidak ada kemungkinan angka uang bocor ke layar keeper.
  const TARGET = settings?.min_poin_bulanan ?? 0;

  // Ambil MaintenanceLog milik user ini (bulan ini + bulan lalu untuk perbandingan)
  const { data: logs = [] } = useQuery({
    queryKey: ["maintenance-my-month", user?.email, currentPeriod, lastPeriod],
    queryFn: async () => {
      // MaintenanceLog sudah lewat 2.000 baris. Menarik SELURUH log milik
      // seorang keeper lalu menyaring di browser berarti cepat atau lambat
      // kena batas ambil dan poin terhitung kurang tanpa tanda apa pun.
      // Karena period_key berformat "yyyy-MM-dd", urutan abjad = urutan
      // waktu, jadi bulan lalu ke atas cukup dengan $gte.
      const all = await base44.entities.MaintenanceLog.filter({
        done_by_email: user.email,
        period_key: { $gte: lastPeriod },
      });
      return all.filter(
        (l) => l.is_done && (l.period_key?.startsWith(currentPeriod) || l.period_key?.startsWith(lastPeriod))
      );
    },
    enabled: !!user?.email,
  });

  const totalPoin = logs
    .filter((l) => l.period_key?.startsWith(currentPeriod))
    .reduce((s, l) => s + (l.poin_earned || 0), 0);
  const lastMonthPoin = logs
    .filter((l) => l.period_key?.startsWith(lastPeriod))
    .reduce((s, l) => s + (l.poin_earned || 0), 0);
  const pct = TARGET > 0 ? Math.min(100, Math.round((totalPoin / TARGET) * 100)) : 0;
  const kurang = Math.max(0, TARGET - totalPoin);
  const targetTercapai = TARGET > 0 && totalPoin >= TARGET;

  // Perbandingan dengan bulan lalu
  const momDiff = totalPoin - lastMonthPoin;
  const momPct = lastMonthPoin > 0 ? Math.round((momDiff / lastMonthPoin) * 100) : null;
  const naikDariBulanLalu = momDiff > 0;

  // Riwayat 7 hari terakhir (aggregate poin per hari)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const dayLogs = logs.filter((l) => l.period_key === d);
    const poin = dayLogs.reduce((s, l) => s + (l.poin_earned || 0), 0);
    return { date: d, poin, count: dayLogs.length };
  });

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-6 text-center">
        <Star className="w-10 h-10 text-amber-400 fill-amber-300 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-foreground">Poin Bulan Ini</h1>
        <p className="text-sm text-muted-foreground capitalize">{format(new Date(), "MMMM yyyy", { locale: id })}</p>
      </div>

      {/* Total poin besar */}
      <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white text-center shadow-lg">
        <p className="text-6xl font-bold">{totalPoin}</p>
        <p className="text-green-100 mt-1">poin terkumpul</p>
        {TARGET > 0 && (
          <div className="mt-4">
            <div className="h-3 bg-green-600/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-sm text-green-100 mt-2">Target: {TARGET} poin ({pct}%)</p>
          </div>
        )}
      </div>

      {/* Status / pencapaian */}
      {targetTercapai ? (
        <div className="rounded-2xl p-4 border bg-green-50 border-green-200 flex items-center gap-3">
          <Award className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800">Target Tercapai! 🎉</p>
            <p className="text-sm text-green-600">Kamu melampaui target bulanan {TARGET} poin</p>
          </div>
        </div>
      ) : TARGET > 0 ? (
        <div className="rounded-2xl p-4 border bg-orange-50 border-orange-200 flex items-center gap-3">
          <Target className="w-8 h-8 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-orange-800">Kurang {kurang} poin lagi</p>
            <p className="text-sm text-orange-600">Terus semangat! Target bulan ini {TARGET} poin</p>
          </div>
        </div>
      ) : null}

      {/* Perbandingan dengan bulan lalu */}
      {lastMonthPoin > 0 && (
        <div
          className={`rounded-2xl p-4 border flex items-center gap-3 ${
            naikDariBulanLalu ? "bg-blue-50 border-blue-200" : "bg-muted border-border"
          }`}
        >
          {naikDariBulanLalu ? (
            <TrendingUp className="w-8 h-8 text-blue-500 flex-shrink-0" />
          ) : (
            <TrendingDown className="w-8 h-8 text-muted-foreground flex-shrink-0" />
          )}
          <div>
            <p className={`font-semibold ${naikDariBulanLalu ? "text-blue-800" : "text-foreground"}`}>
              {naikDariBulanLalu ? "Lebih tinggi" : "Lebih rendah"} {momPct !== null ? `${Math.abs(momPct)}%` : ""} dari bulan lalu
            </p>
            <p className="text-xs text-muted-foreground">
              Bulan lalu: {lastMonthPoin} poin · Bulan ini: {totalPoin} poin
            </p>
          </div>
        </div>
      )}

      {/* Riwayat 7 hari */}
      <div className="bg-card rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="font-semibold text-foreground mb-3">Riwayat 7 Hari Terakhir</p>
        <div className="space-y-2">
          {last7.map((day) => {
            const isToday = day.date === today;
            return (
              <div
                key={day.date}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                  isToday ? "bg-green-50 border border-green-200" : "bg-muted"
                }`}
              >
                <span className={`text-sm ${isToday ? "font-semibold text-green-700" : "text-muted-foreground"}`}>
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
                  {day.count > 0 && <span className="text-xs text-muted-foreground">{day.count} tugas</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}