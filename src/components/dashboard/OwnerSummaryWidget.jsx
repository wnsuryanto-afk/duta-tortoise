import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Shell, Egg, TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign, Clock, Weight } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Link } from "react-router-dom";

function fmtRp(val) {
  if (!val) return "Rp 0";
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
  return `Rp ${val}`;
}

export default function OwnerSummaryWidget() {
  const todayDate = new Date();
  const today = format(todayDate, "yyyy-MM-dd");
  const currentPeriod = format(todayDate, "yyyy-MM");

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

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["health-records-owner-summary"],
    queryFn: () => base44.entities.HealthRecord.filter({ type: "timbang" }),
  });

  const { data: allBreedings = [] } = useQuery({
    queryKey: ["breedings-hatch-alert"],
    queryFn: () => base44.entities.Breeding.filter({ status: "inkubasi" }),
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

  // Alert: obat kadaluarsa dalam 30 hari
  const expiredSoon = warehouseItems.filter(w => {
    if (!w.expired_date) return false;
    const days = differenceInDays(parseISO(w.expired_date), todayDate);
    return days >= 0 && days <= 30;
  });

  // Alert: telur mendekati estimasi menetas dalam 7 hari
  const hatchingSoon = allBreedings.filter(b => {
    if (!b.estimated_hatch_date) return false;
    const days = differenceInDays(parseISO(b.estimated_hatch_date), todayDate);
    return days >= 0 && days <= 7;
  });

  // Alert: tortoise aktif belum ditimbang > 30 hari
  const activeTortList = tortoises.filter(t => t.status === "aktif" || t.status === "baby");
  const notWeighedRecently = activeTortList.filter(t => {
    const lastWeigh = healthRecords
      .filter(h => h.tortoise_id === t.id || h.tortoise_name === t.name)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
    if (!lastWeigh) {
      if (!t.created_date) return false;
      return differenceInDays(todayDate, new Date(t.created_date)) > 30;
    }
    return differenceInDays(todayDate, parseISO(lastWeigh.date)) > 30;
  });

  const totalAlerts = lowFeed.length + lowWarehouse.length + expiredSoon.length + hatchingSoon.length + (notWeighedRecently.length > 0 ? 1 : 0);

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
        <div className="space-y-2">
          {/* Stok menipis */}
          {(lowFeed.length > 0 || lowWarehouse.length > 0) && (
            <Card className="p-4 border-orange-200 bg-orange-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-orange-800">{lowFeed.length + lowWarehouse.length} stok menipis!</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {lowFeed.map((f) => (
                      <span key={f.id} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">🌿 {f.name}: {f.current_stock} {f.unit}</span>
                    ))}
                    {lowWarehouse.map((w) => (
                      <span key={w.id} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">📦 {w.name}: {w.current_stock} {w.unit}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Obat kadaluarsa */}
          {expiredSoon.length > 0 && (
            <Card className="p-4 border-red-300 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-red-800">{expiredSoon.length} obat/vitamin akan kadaluarsa dalam 30 hari!</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {expiredSoon.map((w) => {
                      const days = differenceInDays(parseISO(w.expired_date), todayDate);
                      return (
                        <span key={w.id} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                          💊 {w.name} ({days === 0 ? "hari ini!" : `${days} hari lagi`})
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Telur hampir menetas */}
          {hatchingSoon.length > 0 && (
            <Card className="p-4 border-amber-300 bg-amber-50">
              <div className="flex items-start gap-3">
                <Egg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-amber-800">{hatchingSoon.length} clutch telur mendekati estimasi menetas (≤7 hari)!</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {hatchingSoon.map((b) => {
                      const days = differenceInDays(parseISO(b.estimated_hatch_date), todayDate);
                      return (
                        <span key={b.id} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                          🥚 {b.male_name} × {b.female_name} ({days === 0 ? "hari ini!" : `${days} hari`})
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Belum ditimbang */}
          {notWeighedRecently.length > 0 && (
            <Card className="p-4 border-slate-300 bg-slate-50">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-700">{notWeighedRecently.length} kura-kura belum ditimbang lebih dari 30 hari</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {notWeighedRecently.slice(0, 8).map((t) => (
                      <span key={t.id} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">🐢 {t.name}</span>
                    ))}
                    {notWeighedRecently.length > 8 && (
                      <span className="text-xs text-slate-500">+{notWeighedRecently.length - 8} lainnya</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}