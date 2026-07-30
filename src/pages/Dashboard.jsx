import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useViewAs } from "@/lib/ViewAsContext";
import { useQuery } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, AlertTriangle } from "lucide-react";
import KeeperDashboard from "@/components/dashboard/KeeperDashboard";
import OwnerDashboard from "@/components/dashboard/role/OwnerDashboard";
import AdminDashboard from "@/components/dashboard/role/AdminDashboard";
import KepalaFeederDashboard from "@/components/dashboard/role/KepalaFeederDashboard";
import InvestorDashboard from "@/components/dashboard/role/InvestorDashboard";

// Fallback: dashboard lama untuk role yang belum punya tampilan khusus
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

// Banner saat view-as role yang tidak punya user terdaftar
function NoUserPreviewBanner({ role }) {
  const navigate = useNavigate();
  const ROLE_LABELS_LOCAL = {
    keeper: "Keeper", kepala_feeder: "Kepala Feeder",
    admin: "Admin", manajer: "Manajer",
  };
  return (
    <div className="flex items-start gap-3 px-4 py-3 mb-4 bg-amber-50 border border-amber-300 rounded-xl">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">
          ⚠️ Preview Mode — Belum ada user dengan role "{ROLE_LABELS_LOCAL[role] || role}" terdaftar
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Dashboard ditampilkan dengan data yang ada. Daftarkan user baru agar tampilan lebih akurat.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-400 text-amber-800 hover:bg-amber-100 whitespace-nowrap flex-shrink-0"
        onClick={() => navigate("/users")}
      >
        <UserPlus className="w-3.5 h-3.5 mr-1" /> Daftarkan User
      </Button>
    </div>
  );
}

export default function Dashboard() {
  const { user, role: realRole } = useCurrentUser();
  const { viewAsRole, viewAsUserEmail, isViewingAs } = useViewAs();

  // Role yang digunakan untuk render
  const effectiveRole = isViewingAs && viewAsRole ? viewAsRole : realRole;

  // Cek apakah ada user dengan role ini
  const { data: users = [] } = useActiveUsers({ enabled: isViewingAs && !!viewAsRole });

  const hasUserForRole = !isViewingAs || users.some(u => u.role === effectiveRole);
  const showNoUserBanner = isViewingAs && viewAsRole && !hasUserForRole;

  // Notif checklist reminder — hanya 1x per sesi
  useEffect(() => {
    if (!realRole) return;
    if (realRole !== "keeper" && realRole !== "kepala_feeder") return;
    const sessionKey = `checklist_reminder_checked_${new Date().toDateString()}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
    const t = setTimeout(() => {
      base44.functions.invoke("checkChecklistReminder", {}).catch(() => {});
    }, 5000);
    return () => clearTimeout(t);
  }, [realRole]);

  if (!user) return null;

  // Saat "Lihat Sebagai" null atau owner: tampilkan normal
  if (isViewingAs && viewAsRole === null) {
    return <OwnerDashboard user={user} />;
  }

  const renderDashboard = () => {
    if (effectiveRole === "owner" || effectiveRole === "manajer") return <OwnerDashboard user={user} />;
    if (effectiveRole === "admin") return <AdminDashboard user={user} />;
    if (effectiveRole === "kepala_feeder") return <KepalaFeederDashboard user={user} />;
    if (effectiveRole === "keeper") return <KeeperDashboard viewAsEmail={isViewingAs ? viewAsUserEmail : undefined} />;
    if (effectiveRole === "investor") return <InvestorDashboard user={user} />;
    return <FallbackDashboard />;
  };

  return (
    <div>
      {showNoUserBanner && <NoUserPreviewBanner role={effectiveRole} />}
      {renderDashboard()}
    </div>
  );
}