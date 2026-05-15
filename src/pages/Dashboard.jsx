import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shell, Baby, Egg, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/dashboard/StatCard";
import CheckInWidget from "@/components/attendance/CheckInWidget";
import KPISummaryWidget from "@/components/dashboard/KPISummaryWidget";
import { useCurrentUser } from "@/lib/useCurrentUser";
import SOPDeadlineAlert from "@/components/dashboard/SOPDeadlineAlert";
import EnclosureFilterWidget from "@/components/dashboard/EnclosureFilterWidget";
import HealthReminderAlert from "@/components/dashboard/HealthReminderAlert";
import FeedStockAlert from "@/components/dashboard/FeedStockAlert";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function Dashboard() {
  const { role } = useCurrentUser();
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 100),
  });

  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 100),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-created_date", 10),
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["health"],
    queryFn: () => base44.entities.HealthRecord.list("-created_date", 10),
  });

  const activeTortoises = tortoises.filter((t) => t.status === "aktif" || t.status === "breeding");
  const totalEggs = breedings.reduce((sum, b) => sum + (b.egg_count || 0), 0);
  const totalHatched = breedings.reduce((sum, b) => sum + (b.hatched_count || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + (s.price || 0), 0);

  const stats = [
    { label: "Total Tortoise Aktif", value: activeTortoises.length, icon: Shell, color: "bg-primary/15 text-primary" },
    { label: "Total Telur", value: totalEggs, icon: Egg, color: "bg-accent/15 text-accent" },
    { label: "Total Menetas", value: totalHatched, icon: Baby, color: "bg-chart-4/15 text-chart-4" },
    { label: "Pendapatan", value: `Rp ${(totalRevenue / 1000000).toFixed(1)}jt`, icon: TrendingUp, color: "bg-chart-5/15 text-chart-5" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Ringkasan peternakan sulcata tortoise Anda</p>
      </div>

      {(role === "keeper" || role === "manajer") && <CheckInWidget />}
      {role === "keeper" && <SOPDeadlineAlert />}
      <HealthReminderAlert />
      <FeedStockAlert />
      {role === "keeper" && <KPISummaryWidget />}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <EnclosureFilterWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Breeding */}
        <Card className="p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">Pembiakan Terbaru</h2>
          {breedings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data pembiakan</p>
          ) : (
            <div className="space-y-3">
              {breedings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{b.male_name} × {b.female_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.egg_count ? `${b.egg_count} telur` : "Belum bertelur"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {b.status?.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Sales */}
        <Card className="p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">Penjualan Terbaru</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data penjualan</p>
          ) : (
            <div className="space-y-3">
              {sales.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{s.tortoise_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.buyer_name} • {s.sale_date && format(new Date(s.sale_date), "d MMM yyyy", { locale: id })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    Rp {s.price?.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}