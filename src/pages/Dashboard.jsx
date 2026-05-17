import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shell, Baby, Egg } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import CheckInWidget from "@/components/attendance/CheckInWidget";
import KPISummaryWidget from "@/components/dashboard/KPISummaryWidget";
import { useCurrentUser } from "@/lib/useCurrentUser";
import HealthReminderAlert from "@/components/dashboard/HealthReminderAlert";
import FeedStockAlert from "@/components/dashboard/FeedStockAlert";
import KeeperDashboard from "@/components/dashboard/KeeperDashboard";
import TortoiseMorphSummary from "@/components/dashboard/TortoiseMorphSummary";
import EggHatchChart from "@/components/dashboard/EggHatchChart";
import AttendanceSummary from "@/components/dashboard/AttendanceSummary";
import FinanceSummaryWidget from "@/components/dashboard/FinanceSummaryWidget";
import AttendanceDashboardBanner from "@/components/dashboard/AttendanceDashboardBanner";
import AnnualGoalWidget from "@/components/dashboard/AnnualGoalWidget";
import HatchReminderAlert from "@/components/dashboard/HatchReminderAlert";

export default function Dashboard() {
  const { role } = useCurrentUser();

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 300),
    enabled: role !== "keeper",
  });

  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 200),
    enabled: role !== "keeper",
  });

  // Dashboard khusus Keeper
  if (role === "keeper") {
    return <KeeperDashboard />;
  }

  const activeTortoises = tortoises.filter((t) => t.status === "aktif" || t.status === "baby");
  const totalEggs = breedings.reduce((sum, b) => sum + (b.egg_count || 0), 0);
  const totalHatched = breedings.reduce((sum, b) => sum + (b.hatched_count || 0), 0);

  const stats = [
    { label: "Tortoise Aktif", value: activeTortoises.length, icon: Shell, color: "bg-primary/15 text-primary" },
    { label: "Total Telur",    value: totalEggs,               icon: Egg,   color: "bg-accent/15 text-accent" },
    { label: "Total Menetas",  value: totalHatched,            icon: Baby,  color: "bg-chart-4/15 text-chart-4" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan peternakan sulcata tortoise</p>
      </div>

      {/* Absensi feeder selalu di paling atas */}
      <AttendanceDashboardBanner />

      {role === "manajer" && <CheckInWidget />}
      <HealthReminderAlert />
      <HatchReminderAlert />
      <FeedStockAlert />

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Baris 1: Jenis kura + Telur */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TortoiseMorphSummary tortoises={tortoises} />
        <EggHatchChart breedings={breedings} />
      </div>

      {/* Baris 2: Absensi + Finance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceSummary />
        <FinanceSummaryWidget />
      </div>

      {/* Target Tahunan */}
      <AnnualGoalWidget breedings={breedings} />
    </div>
  );
}