import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import KeeperDashboard from "@/components/dashboard/KeeperDashboard";
import OwnerDashboard from "@/components/dashboard/role/OwnerDashboard";
import AdminDashboard from "@/components/dashboard/role/AdminDashboard";
import KepalaFeederDashboard from "@/components/dashboard/role/KepalaFeederDashboard";

// Fallback: dashboard lama untuk role yang belum punya tampilan khusus
import { useQuery } from "@tanstack/react-query";
import { Shell, Baby, Egg, ClipboardList, Users, Package, Target } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import KPISummaryWidget from "@/components/dashboard/KPISummaryWidget";
import HealthReminderAlert from "@/components/dashboard/HealthReminderAlert";
import FeedStockAlert from "@/components/dashboard/FeedStockAlert";
import TortoiseMorphSummary from "@/components/dashboard/TortoiseMorphSummary";
import EggHatchChart from "@/components/dashboard/EggHatchChart";
import AttendanceDashboardBanner from "@/components/dashboard/AttendanceDashboardBanner";
import AnnualGoalWidget from "@/components/dashboard/AnnualGoalWidget";
import HatchReminderAlert from "@/components/dashboard/HatchReminderAlert";
import OwnerSummaryWidget from "@/components/dashboard/OwnerSummaryWidget";
import ExpiredItemAlert from "@/components/dashboard/ExpiredItemAlert";
import IncompleteDataWidget from "@/components/dashboard/IncompleteDataWidget";
import GettingStartedChecklist from "@/components/tutorial/GettingStartedChecklist";
import QuickActionsBar from "@/components/dashboard/QuickActionsBar";
import UrgentAlerts from "@/components/dashboard/UrgentAlerts";
import OperationalToday from "@/components/dashboard/OperationalToday";
import DashboardSection from "@/components/dashboard/DashboardSection";
import HRMetrics from "@/components/dashboard/HRMetrics";
import OperationalSummaryWidget from "@/components/dashboard/OperationalSummaryWidget";

function FallbackDashboard() {
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 50), // turun dari 300
    staleTime: 10 * 60 * 1000,
  });
  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 30), // turun dari 200
    staleTime: 10 * 60 * 1000,
  });
  const activeTortoises = tortoises.filter((t) => t.status === "aktif" || t.status === "baby");
  const totalEggs = breedings.filter(b => b.status === "bertelur" || b.status === "inkubasi").reduce((sum, b) => sum + (b.egg_count || 0), 0);
  const totalHatched = breedings.reduce((sum, b) => sum + (b.hatched_count || 0), 0);
  const stats = [
    { label: "Tortoise Aktif", value: activeTortoises.length, icon: Shell, color: "bg-primary/15 text-primary" },
    { label: "Total Telur", value: totalEggs, icon: Egg, color: "bg-accent/15 text-accent" },
    { label: "Total Menetas", value: totalHatched, icon: Baby, color: "bg-chart-4/15 text-chart-4" },
  ];
  return (
    <div className="space-y-8 pb-8">
      <QuickActionsBar />
      <GettingStartedChecklist />
      <UrgentAlerts />
      <DashboardSection title="Operasional Hari Ini" icon={ClipboardList}><OperationalToday /></DashboardSection>
      <DashboardSection title="Statistik Kura-kura" icon={Shell}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <TortoiseMorphSummary tortoises={tortoises} />
          <EggHatchChart breedings={breedings} />
        </div>
      </DashboardSection>
      <DashboardSection title="Stok & Gudang" icon={Package}>
        <div className="space-y-4"><FeedStockAlert /><ExpiredItemAlert /></div>
      </DashboardSection>
      <IncompleteDataWidget />
      <HealthReminderAlert />
      <HatchReminderAlert />
    </div>
  );
}

export default function Dashboard() {
  const { user, role } = useCurrentUser();

  // Notif checklist reminder — hanya 1x per sesi (bukan tiap buka halaman)
  useEffect(() => {
    if (!role) return;
    if (role !== "keeper" && role !== "kepala_feeder") return;
    const sessionKey = `checklist_reminder_checked_${new Date().toDateString()}`;
    if (sessionStorage.getItem(sessionKey)) return; // sudah dicek hari ini di sesi ini
    sessionStorage.setItem(sessionKey, "1");
    // Tunda 5 detik agar tidak menambah beban saat load awal
    const t = setTimeout(() => {
      base44.functions.invoke("checkChecklistReminder", {}).catch(() => {});
    }, 5000);
    return () => clearTimeout(t);
  }, [role]);

  if (!user) return null;

  if (role === "owner" || role === "manajer") return <OwnerDashboard user={user} />;
  if (role === "admin") return <AdminDashboard user={user} />;
  if (role === "kepala_feeder") return <KepalaFeederDashboard user={user} />;
  if (role === "keeper") return <KeeperDashboard />;

  // investor / lainnya
  return <FallbackDashboard />;
}