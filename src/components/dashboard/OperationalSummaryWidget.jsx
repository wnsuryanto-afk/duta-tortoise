import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Pill, Wallet, Activity, Star } from "lucide-react";
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

  // Biaya obat bulan ini
  const monthTx = transactions.filter(t => t.date >= MONTH_START && t.date <= MONTH_END);
  const biayaObat = monthTx
    .filter(t => t.type === "pengeluaran" && t.category === "obat_perawatan")
    .reduce((s, t) => s + (t.amount || 0), 0);

  const totalGaji = monthTx
    .filter(t => t.type === "pengeluaran" && t.category === "gaji_karyawan")
    .reduce((s, t) => s + (t.amount || 0), 0);

  // Kura treatment aktif (sakit tanpa follow_up selesai)
  const activeTreatment = healthRecords.filter(r =>
    (r.type === "sakit" || r.type === "obat") &&
    r.date >= MONTH_START &&
    !r.follow_up_date
  ).length;

  // Poin tertinggi bulan ini
  const thisMonthChecklists = dailyChecklists.filter(c => c.date >= MONTH_START && c.date <= MONTH_END);
  const poinPerKaryawan = {};
  thisMonthChecklists.forEach(c => {
    if (!poinPerKaryawan[c.employee_email]) poinPerKaryawan[c.employee_email] = 0;
    poinPerKaryawan[c.employee_email] += c.approved_points || c.total_points_claimed || 0;
  });
  // also include bonusRewards
  bonusRewards.filter(b => b.period === THIS_MONTH).forEach(b => {
    if (!poinPerKaryawan[b.employee_email]) poinPerKaryawan[b.employee_email] = 0;
    poinPerKaryawan[b.employee_email] += b.total_points || 0;
  });
  const poinTertinggi = Math.max(...Object.values(poinPerKaryawan), 0);

  const items = [
    {
      icon: Pill,
      label: "Biaya Obat Bulan Ini",
      value: fmt(biayaObat),
      color: "bg-orange-100 text-orange-700",
      iconColor: "text-orange-600",
    },
    {
      icon: Wallet,
      label: "Total Gaji Bulan Ini",
      value: fmt(totalGaji),
      color: "bg-blue-100 text-blue-700",
      iconColor: "text-blue-600",
    },
    {
      icon: Activity,
      label: "Kura Treatment Aktif",
      value: activeTreatment + " ekor",
      color: activeTreatment > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700",
      iconColor: activeTreatment > 0 ? "text-red-600" : "text-green-600",
    },
    {
      icon: Star,
      label: "Poin Tertinggi Karyawan",
      value: poinTertinggi + " poin",
      color: "bg-amber-100 text-amber-700",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
              <Icon className={`w-4 h-4 ${item.iconColor}`} />
            </div>
            <p className="text-base font-bold leading-tight">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.label}</p>
          </Card>
        );
      })}
    </div>
  );
}