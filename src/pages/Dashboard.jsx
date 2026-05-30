import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shell, Baby, Egg, AlertTriangle, ClipboardList, Users, Package, Target } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import CheckInWidget from "@/components/attendance/CheckInWidget";
import KPISummaryWidget from "@/components/dashboard/KPISummaryWidget";
import { useCurrentUser } from "@/lib/useCurrentUser";
import HealthReminderAlert from "@/components/dashboard/HealthReminderAlert";
import FeedStockAlert from "@/components/dashboard/FeedStockAlert";
import KeeperDashboard from "@/components/dashboard/KeeperDashboard";
import TortoiseMorphSummary from "@/components/dashboard/TortoiseMorphSummary";
import EggHatchChart from "@/components/dashboard/EggHatchChart";
import AttendanceChartCard from "@/components/dashboard/AttendanceChartCard";
import AttendanceDashboardBanner from "@/components/dashboard/AttendanceDashboardBanner";
import AnnualGoalWidget from "@/components/dashboard/AnnualGoalWidget";
import HatchReminderAlert from "@/components/dashboard/HatchReminderAlert";
import OwnerSummaryWidget from "@/components/dashboard/OwnerSummaryWidget";
import ExpiredItemAlert from "@/components/dashboard/ExpiredItemAlert";
import IncompleteDataWidget from "@/components/dashboard/IncompleteDataWidget";
import GettingStartedChecklist from "@/components/tutorial/GettingStartedChecklist";
import PageTooltip from "@/components/tutorial/PageTooltip";
import QuickActionsBar from "@/components/dashboard/QuickActionsBar";
import GreetingAndSummary from "@/components/dashboard/GreetingAndSummary";
import UrgentAlerts from "@/components/dashboard/UrgentAlerts";
import OperationalToday from "@/components/dashboard/OperationalToday";
import DashboardSection from "@/components/dashboard/DashboardSection";
import HRMetrics from "@/components/dashboard/HRMetrics";
import OperationalSummaryWidget from "@/components/dashboard/OperationalSummaryWidget";

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

  // Keeper/Kepala Feeder sudah ditangani oleh GuidedLayout di AppLayout
  // Jika sampai sini berarti user memilih mode normal

  const activeTortoises = tortoises.filter((t) => t.status === "aktif" || t.status === "baby");
  // KALKULASI TELUR DARI BREEDING AKTIF (bertelur + inkubasi) - SUMBER KEBENARAN TUNGGAL
  const totalEggs = breedings
    .filter(b => b.status === "bertelur" || b.status === "inkubasi")
    .reduce((sum, b) => sum + (b.egg_count || 0), 0);
  const totalHatched = breedings.reduce((sum, b) => sum + (b.hatched_count || 0), 0);

  const stats = [
    { label: "Tortoise Aktif", value: activeTortoises.length, icon: Shell, color: "bg-primary/15 text-primary" },
    { label: "Total Telur",    value: totalEggs,               icon: Egg,   color: "bg-accent/15 text-accent" },
    { label: "Total Menetas",  value: totalHatched,            icon: Baby,  color: "bg-chart-4/15 text-chart-4" },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Quick Actions Bar */}
      <QuickActionsBar />

      {/* Greeting & Summary */}
      <GreetingAndSummary />

      {/* Getting Started Checklist - hilang otomatis jika selesai */}
      <GettingStartedChecklist />

      {/* SECTION 1: Alert Urgent (selalu di atas, tidak bisa collapse jika ada alert) */}
      <UrgentAlerts />

      {/* SECTION 2: Operasional Hari Ini */}
      <DashboardSection title="Operasional Hari Ini" icon={ClipboardList}>
        <OperationalToday />
      </DashboardSection>

      {/* SECTION 3: Statistik Kura-kura */}
      <DashboardSection title="Statistik Kura-kura" icon={Shell}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <TortoiseMorphSummary tortoises={tortoises} />
          <EggHatchChart breedings={breedings} />
        </div>
      </DashboardSection>

      {/* SECTION 4: Breeding & Telur */}
      <DashboardSection title="Breeding & Telur" icon={Egg}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            label="Telur Inkubasi" 
            value={breedings.filter(b => b.status === 'inkubasi').reduce((sum, b) => sum + (b.egg_count || 0), 0)} 
            icon={Egg}
            color="bg-accent/15 text-accent"
          />
          <StatCard 
            label="Breeding Aktif" 
            value={breedings.filter(b => b.status === 'bertelur' || b.status === 'inkubasi').length} 
            icon={Shell}
            color="bg-primary/15 text-primary"
          />
          <StatCard 
            label="Total Menetas" 
            value={totalHatched} 
            icon={Baby}
            color="bg-chart-4/15 text-chart-4"
          />
        </div>
      </DashboardSection>

      {/* SECTION 5: Ringkasan Bulan Ini - keuangan + KPI */}
      <DashboardSection title="Ringkasan Bulan Ini" icon={Target}>
        <OperationalSummaryWidget />
      </DashboardSection>

      {/* SECTION 7: Tim & SDM */}
      <DashboardSection title="Tim & SDM" icon={Users}>
        <HRMetrics />
      </DashboardSection>

      {/* SECTION 8: Stok & Gudang */}
      <DashboardSection title="Stok & Gudang" icon={Package}>
        <div className="space-y-4">
          <FeedStockAlert />
          <ExpiredItemAlert />
        </div>
      </DashboardSection>

      {/* SECTION 9: Data Tidak Lengkap (oranye, tidak urgent) */}
      <IncompleteDataWidget />

      {/* Health & Hatch reminders */}
      <HealthReminderAlert />
      <HatchReminderAlert />
    </div>
  );
}