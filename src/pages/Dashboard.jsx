import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shell, Baby, Egg, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/dashboard/StatCard";
import MonthlySalesSummary from "@/components/dashboard/MonthlySalesSummary";
import CheckInWidget from "@/components/attendance/CheckInWidget";
import KPISummaryWidget from "@/components/dashboard/KPISummaryWidget";
import { useCurrentUser } from "@/lib/useCurrentUser";
import HealthReminderAlert from "@/components/dashboard/HealthReminderAlert";
import FeedStockAlert from "@/components/dashboard/FeedStockAlert";
import KeeperDashboard from "@/components/dashboard/KeeperDashboard";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function Dashboard() {
  const { role, user } = useCurrentUser();

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 100),
    enabled: role !== "keeper",
  });

  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 100),
    enabled: role !== "keeper",
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 500),
    enabled: role !== "keeper",
  });

  // Dashboard khusus Keeper — fokus & sederhana
  if (role === "keeper") {
    return <KeeperDashboard />;
  }

  const activeTortoises = tortoises.filter((t) => t.status === "aktif" || t.status === "breeding");
  const totalEggs = breedings.reduce((sum, b) => sum + (b.egg_count || 0), 0);
  const totalHatched = breedings.reduce((sum, b) => sum + (b.hatched_count || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + (s.price || 0), 0);

  const stats = [
    { label: "Tortoise Aktif", value: activeTortoises.length, icon: Shell, color: "bg-primary/15 text-primary" },
    { label: "Total Telur", value: totalEggs, icon: Egg, color: "bg-accent/15 text-accent" },
    { label: "Total Menetas", value: totalHatched, icon: Baby, color: "bg-chart-4/15 text-chart-4" },
    { label: "Total Pendapatan", value: `Rp ${(totalRevenue / 1000000).toFixed(1)}jt`, icon: TrendingUp, color: "bg-chart-5/15 text-chart-5" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan peternakan sulcata tortoise</p>
      </div>

      {role === "manajer" && <CheckInWidget />}
      <HealthReminderAlert />
      <FeedStockAlert />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <MonthlySalesSummary sales={sales} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold text-base mb-3">Pembiakan Terbaru</h2>
          {breedings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Belum ada data pembiakan</p>
          ) : (
            <div className="space-y-2">
              {breedings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{b.male_name} × {b.female_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.egg_count ? `${b.egg_count} telur` : "Belum bertelur"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs">{b.status?.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-base mb-3">Penjualan Terbaru</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Belum ada data penjualan</p>
          ) : (
            <div className="space-y-2">
              {sales.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{s.tortoise_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.buyer_name} · {s.sale_date && format(new Date(s.sale_date), "d MMM yyyy", { locale: id })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">Rp {s.price?.toLocaleString("id-ID")}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}