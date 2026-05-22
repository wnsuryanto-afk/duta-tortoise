import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Shell, Egg, TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

function fmtRp(val) {
  if (!val) return "Rp 0";
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
  return `Rp ${val}`;
}

export default function OwnerSummaryWidget() {
  const today = format(new Date(), "yyyy-MM-dd");
  const currentPeriod = format(new Date(), "yyyy-MM");

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-owner-summary"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
  });

  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings-owner-summary"],
    queryFn: () => base44.entities.Breeding.filter({ status: "inkubasi" }),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["finance-owner-summary"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 500),
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendance-today-summary"],
    queryFn: () => base44.entities.Attendance.filter({ date: today }),
  });

  const { data: feedStocks = [] } = useQuery({
    queryKey: ["feedstocks-owner-summary"],
    queryFn: () => base44.entities.FeedStock.list("-created_date", 100),
  });

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-owner-summary"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", 100),
  });

  const activeTortoises = tortoises.filter((t) => t.status === "aktif" || t.status === "baby").length;
  const incubatingEggs = breedings.reduce((s, b) => s + (b.egg_count || 0), 0);
  const periodTx = transactions.filter((t) => t.date?.startsWith(currentPeriod));
  const omzet = periodTx.filter((t) => t.type === "pemasukan").reduce((s, t) => s + (t.amount || 0), 0);
  const pengeluaran = periodTx.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + (t.amount || 0), 0);
  const profit = omzet - pengeluaran;
  const hadirHariIni = attendances.filter((a) => a.status === "hadir").length;

  const lowFeed = feedStocks.filter((f) => (f.current_stock || 0) <= (f.minimum_stock || 1));
  const lowWarehouse = warehouseItems.filter((w) => (w.current_stock || 0) <= (w.minimum_stock || 1));
  const totalAlerts = lowFeed.length + lowWarehouse.length;

  const stats = [
    {
      label: "Tortoise Aktif",
      value: activeTortoises,
      icon: Shell,
      color: "text-primary",
      bg: "bg-primary/10",
      link: "/tortoise",
    },
    {
      label: "Telur Inkubasi",
      value: incubatingEggs,
      icon: Egg,
      color: "text-amber-600",
      bg: "bg-amber-100",
      link: "/breeding",
    },
    {
      label: "Omzet Bulan Ini",
      value: fmtRp(omzet),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-100",
      link: "/finance",
    },
    {
      label: "Pengeluaran",
      value: fmtRp(pengeluaran),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-100",
      link: "/finance",
    },
    {
      label: profit >= 0 ? "Profit" : "Rugi",
      value: fmtRp(Math.abs(profit)),
      icon: DollarSign,
      color: profit >= 0 ? "text-primary" : "text-orange-600",
      bg: profit >= 0 ? "bg-primary/10" : "bg-orange-100",
      link: "/finance",
    },
    {
      label: "Hadir Hari Ini",
      value: `${hadirHariIni} orang`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
      link: "/daily-payroll",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <Link to={s.link} key={s.label}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {totalAlerts > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-orange-800">
                {totalAlerts} item stok menipis!
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {lowFeed.map((f) => (
                  <span key={f.id} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                    🌿 {f.name}: {f.current_stock} {f.unit}
                  </span>
                ))}
                {lowWarehouse.map((w) => (
                  <span key={w.id} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                    📦 {w.name}: {w.current_stock} {w.unit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}