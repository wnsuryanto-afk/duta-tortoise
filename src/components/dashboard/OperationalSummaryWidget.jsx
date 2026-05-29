import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Pill, Wallet, Activity, Star, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const TODAY = new Date();
const MONTH_START = format(startOfMonth(TODAY), "yyyy-MM-dd");
const MONTH_END = format(endOfMonth(TODAY), "yyyy-MM-dd");
const THIS_MONTH = format(TODAY, "yyyy-MM");

export default function OperationalSummaryWidget() {
  const { data: transactions = [] } = useQuery({
    queryKey: ["finance-transactions"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 1000),
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["health-records-all"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 500),
  });

  const { data: bonusRewards = [] } = useQuery({
    queryKey: ["bonus-rewards"],
    queryFn: () => base44.entities.BonusReward.list("-period", 50),
  });

  const { data: dailyChecklists = [] } = useQuery({
    queryKey: ["daily-checklists-month", THIS_MONTH],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 500),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => base44.entities.User.list(),
  });

  // ── Keuangan bulan ini ──
  const monthTx = transactions.filter(t => t.date >= MONTH_START && t.date <= MONTH_END);
  const pemasukan = monthTx.filter(t => t.type === "pemasukan").reduce((s, t) => s + (t.amount || 0), 0);
  const pengeluaran = monthTx.filter(t => t.type === "pengeluaran").reduce((s, t) => s + (t.amount || 0), 0);
  const laba = pemasukan - pengeluaran;
  const biayaObat = monthTx.filter(t => t.type === "pengeluaran" && t.category === "obat_perawatan").reduce((s, t) => s + (t.amount || 0), 0);
  const totalGaji = monthTx.filter(t => t.type === "pengeluaran" && t.category === "gaji_karyawan").reduce((s, t) => s + (t.amount || 0), 0);

  // ── Kura treatment aktif ──
  const todayStr = format(TODAY, "yyyy-MM-dd");
  const activeTreatment = healthRecords.filter(r =>
    r.type === "sakit" && r.follow_up_date && r.follow_up_date >= todayStr
  ).length;

  // ── Poin tertinggi bulan ini ──
  const thisMonthChecklists = dailyChecklists.filter(c => c.date >= MONTH_START && c.date <= MONTH_END);
  const poinPerKaryawan = {};
  thisMonthChecklists.forEach(c => {
    if (!poinPerKaryawan[c.employee_email]) poinPerKaryawan[c.employee_email] = 0;
    poinPerKaryawan[c.employee_email] += c.approved_points || c.total_points_claimed || 0;
  });
  bonusRewards.filter(b => b.period === THIS_MONTH).forEach(b => {
    if (!poinPerKaryawan[b.employee_email]) poinPerKaryawan[b.employee_email] = 0;
    poinPerKaryawan[b.employee_email] += b.total_points || 0;
  });
  const poinTertinggi = Math.max(...Object.values(poinPerKaryawan), 0);
  const topEmail = Object.entries(poinPerKaryawan).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topUser = users.find(u => u.email === topEmail);
  const topName = topUser?.full_name || topEmail || "-";

  const financeCards = [
    {
      icon: TrendingUp,
      label: "Total Pemasukan",
      value: fmt(pemasukan),
      color: "bg-green-50",
      iconColor: "text-green-600",
      textColor: "text-green-700",
    },
    {
      icon: TrendingDown,
      label: "Total Pengeluaran",
      value: fmt(pengeluaran),
      color: "bg-red-50",
      iconColor: "text-red-600",
      textColor: "text-red-700",
    },
    {
      icon: DollarSign,
      label: "Laba / Rugi Bersih",
      value: fmt(Math.abs(laba)),
      sub: laba >= 0 ? "Laba" : "Rugi",
      color: laba >= 0 ? "bg-primary/5" : "bg-orange-50",
      iconColor: laba >= 0 ? "text-primary" : "text-orange-600",
      textColor: laba >= 0 ? "text-primary" : "text-orange-700",
    },
    {
      icon: Pill,
      label: "Biaya Obat",
      value: fmt(biayaObat),
      color: "bg-orange-50",
      iconColor: "text-orange-600",
      textColor: "text-orange-700",
    },
    {
      icon: Wallet,
      label: "Total Gaji",
      value: fmt(totalGaji),
      color: "bg-blue-50",
      iconColor: "text-blue-600",
      textColor: "text-blue-700",
    },
    {
      icon: Activity,
      label: "Kura Treatment Aktif",
      value: `${activeTreatment} ekor`,
      color: activeTreatment > 0 ? "bg-red-50" : "bg-green-50",
      iconColor: activeTreatment > 0 ? "text-red-600" : "text-green-600",
      textColor: activeTreatment > 0 ? "text-red-700" : "text-green-700",
    },
    {
      icon: Star,
      label: "Poin Tertinggi",
      value: `${poinTertinggi} poin`,
      sub: topName,
      color: "bg-amber-50",
      iconColor: "text-amber-600",
      textColor: "text-amber-700",
    },
  ];

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3 capitalize">
        {format(TODAY, "MMMM yyyy", { locale: id })}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {financeCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={`p-4 ${item.color}`}>
              <Icon className={`w-5 h-5 mb-2 ${item.iconColor}`} />
              <p className={`text-base font-bold leading-tight ${item.textColor}`}>{item.value}</p>
              {item.sub && <p className="text-[11px] text-muted-foreground">{item.sub}</p>}
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.label}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}