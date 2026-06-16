import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Eye, TrendingUp, TrendingDown, DollarSign, Shell, Egg, Heart } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

export default function InvestorDashboard({ user }) {
  const now = new Date();
  const thisMonthKey = format(now, "yyyy-MM");
  const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const thisMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const todayLabel = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });

  const { data: finances = [] } = useQuery({
    queryKey: ["investor-finances"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 200),
    staleTime: 10 * 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["investor-tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 100),
    staleTime: 10 * 60 * 1000,
  });

  const [phase2, setPhase2] = useState(false);
  useEffect(() => { const t = setTimeout(() => setPhase2(true), 1500); return () => clearTimeout(t); }, []);

  const { data: breedings = [] } = useQuery({
    queryKey: ["investor-breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 50),
    enabled: phase2,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["investor-sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 100),
    enabled: phase2,
    staleTime: 10 * 60 * 1000,
  });

  // Finance calcs
  const activeFin = finances.filter(f => !f.excluded_from_reports);
  const finThis = activeFin.filter(f => f.date >= thisMonthStart && f.date <= thisMonthEnd);
  const finLast = activeFin.filter(f => f.date >= lastMonthStart && f.date <= lastMonthEnd);
  const incomeThis = finThis.filter(f => f.type === "pemasukan").reduce((s, f) => s + (f.amount || 0), 0);
  const expenseThis = finThis.filter(f => f.type === "pengeluaran").reduce((s, f) => s + (f.amount || 0), 0);
  const incomeLast = finLast.filter(f => f.type === "pemasukan").reduce((s, f) => s + (f.amount || 0), 0);
  const profit = incomeThis - expenseThis;
  const margin = incomeThis > 0 ? (profit / incomeThis * 100).toFixed(1) : "0.0";

  // Tortoise calcs
  const activeTortoises = tortoises.filter(t => ["aktif","baby"].includes(t.status));
  const sickTortoises = tortoises.filter(t => t.status === "sakit" || t.is_currently_sick);
  const terjualCount = tortoises.filter(t => t.status === "terjual").length;
  const matiCount = tortoises.filter(t => t.status === "mati").length;

  // Breeding calcs
  const activeBreedings = breedings.filter(b => ["bertelur","inkubasi"].includes(b.status));
  const now2 = new Date();
  const breedingWithCountdown = activeBreedings.map(b => {
    const hatchEnd = b.estimated_hatch_end ? new Date(b.estimated_hatch_end) : null;
    const daysLeft = hatchEnd ? Math.ceil((hatchEnd - now2) / 86400000) : null;
    return { ...b, daysLeft };
  }).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  // Sales this month
  const salesThisMonth = sales.filter(s => (s.sale_date || "").startsWith(thisMonthKey) && !s.excluded_from_reports);
  const salesRevenue = salesThisMonth.reduce((s, x) => s + (x.price || 0), 0);
  const salesLaba = salesThisMonth.filter(x => x.hpp > 0).reduce((s, x) => s + ((x.price||0) - (x.hpp||0)), 0);

  // 6 bulan chart
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const key = format(d, "yyyy-MM");
    const inc = activeFin.filter(f => (f.date || "").startsWith(key) && f.type === "pemasukan").reduce((s, f) => s + (f.amount || 0), 0);
    const exp = activeFin.filter(f => (f.date || "").startsWith(key) && f.type === "pengeluaran").reduce((s, f) => s + (f.amount || 0), 0);
    return { name: MONTH_NAMES[d.getMonth()], pemasukan: inc, pengeluaran: exp };
  });

  return (
    <div className="space-y-5 pb-10 animate-fade-in">
      {/* Header + Investor badge */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold font-heading">Halo, {user?.full_name || "Investor"}</h1>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300">
          <Eye className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-xs font-semibold text-slate-700">👁 Mode Investor — Hanya Lihat</span>
        </div>
      </div>

      {/* Ringkasan keuangan */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-semibold text-sm mb-3">💰 Ringkasan Bulan Ini</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Ekor Terjual</p>
            <p className="text-xl font-bold text-green-700">{salesThisMonth.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Pemasukan</p>
            <p className="text-base font-bold text-green-700">{fmt(incomeThis)}</p>
            {incomeLast > 0 && <p className="text-[10px] text-muted-foreground">{incomeThis > incomeLast ? "↑" : "↓"} vs bln lalu</p>}
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Pengeluaran</p>
            <p className="text-base font-bold text-blue-700">{fmt(expenseThis)}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${profit >= 0 ? "bg-primary/5" : "bg-red-50"}`}>
            <p className="text-xs text-muted-foreground">Laba Bersih</p>
            <p className={`text-base font-bold ${profit >= 0 ? "text-primary" : "text-red-600"}`}>{fmt(profit)}</p>
            <p className="text-[10px] text-muted-foreground">{margin}% margin</p>
          </div>
        </div>
      </div>

      {/* Populasi */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-semibold text-sm mb-3">🐢 Populasi</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Aktif", val: activeTortoises.length, color: "bg-green-50 text-green-700" },
            { label: "Terjual", val: terjualCount, color: "bg-blue-50 text-blue-700" },
            { label: "Sakit", val: sickTortoises.length, color: "bg-orange-50 text-orange-700" },
            { label: "Mati", val: matiCount, color: "bg-red-50 text-red-700" },
          ].map(item => (
            <div key={item.label} className={`${item.color} rounded-lg p-3 text-center`}>
              <p className="text-2xl font-bold">{item.val}</p>
              <p className="text-xs mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Breeding countdown */}
      {phase2 && breedingWithCountdown.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-semibold text-sm mb-3">🥚 Breeding Aktif</h2>
          <div className="space-y-2">
            {breedingWithCountdown.slice(0, 5).map(b => {
              const color = b.daysLeft === null ? "text-muted-foreground" :
                b.daysLeft > 30 ? "text-green-600" : b.daysLeft > 7 ? "text-orange-500" : "text-red-600";
              const bg = b.daysLeft === null ? "bg-muted/40" :
                b.daysLeft > 30 ? "bg-green-50 border-green-200" : b.daysLeft > 7 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200";
              return (
                <div key={b.id} className={`flex items-center justify-between p-3 rounded-lg border ${bg}`}>
                  <div>
                    <p className="text-sm font-semibold">{b.female_name} × {b.male_name}</p>
                    <p className="text-xs text-muted-foreground">{b.egg_count} telur · {b.incubator_name || "—"}</p>
                  </div>
                  <div className="text-right">
                    {b.daysLeft !== null ? (
                      <>
                        <p className={`text-xl font-bold ${color}`}>{b.daysLeft}</p>
                        <p className={`text-[10px] ${color}`}>hari lagi</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tren 6 bulan */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="font-semibold text-sm mb-3">📊 Tren 6 Bulan</h2>
        {last6.some(m => m.pemasukan > 0 || m.pengeluaran > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last6} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000000).toFixed(0)}jt`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="pemasukan" fill="#4ade80" radius={[3,3,0,0]} name="Pemasukan" />
              <Bar dataKey="pengeluaran" fill="#f87171" radius={[3,3,0,0]} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Belum ada data</div>
        )}
      </div>

      {/* Note investor */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
        <Eye className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <p className="text-xs text-slate-600">Mode Investor: semua data bersifat read-only. Nominal gaji individual disembunyikan dari tampilan ini.</p>
      </div>
    </div>
  );
}