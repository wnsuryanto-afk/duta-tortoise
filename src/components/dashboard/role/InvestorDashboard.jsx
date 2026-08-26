import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Eye, TrendingUp, DollarSign, Shell, Egg, Heart, Skull, ShoppingCart, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import LabaRugiWidget from "@/components/dashboard/LabaRugiWidget";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import NoteCard from "@/components/common/NoteCard";
import ProgressRing from "@/components/ui/progress-ring";
import Illustration, { ChartArt } from "@/components/common/Illustration";
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

  // Tingkat penetasan sepanjang riwayat — satu-satunya ukuran produktivitas
  // breeding yang bisa dibandingkan antar bulan.
  const totalEggsEver = breedings.reduce((s, b) => s + (b.egg_count || 0), 0);
  const totalHatched = breedings.reduce((s, b) => s + (b.hatched_count || 0), 0);
  const hatchRate = totalEggsEver > 0 ? Math.round((totalHatched / totalEggsEver) * 100) : 0;
  const eggsInProgress = activeBreedings.reduce((s, b) => s + (b.egg_count || 0), 0);

  const adaDataTren = last6.some(m => m.pemasukan > 0 || m.pengeluaran > 0);

  return (
    <div className="space-y-5 pb-10 animate-fade-in">
      {/* ── HEADER ── */}
      <PageHeader
        title={`Halo, ${user?.full_name || "Investor"}`}
        subtitle={todayLabel}
        art={<ChartArt size="md" />}
        chips={[
          { key: "laba", icon: DollarSign, label: "Laba bulan ini", value: fmt(profit),
            tone: profit >= 0 ? "good" : "bad" },
          { key: "margin", icon: TrendingUp, label: "Margin", value: `${margin}%`,
            tone: Number(margin) >= 15 ? "good" : "warn" },
          { key: "kura", icon: Shell, label: "Populasi aktif", value: activeTortoises.length },
          { key: "telur", icon: Egg, label: "Telur diinkubasi", value: eggsInProgress },
        ]}
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Mode Investor — Hanya Lihat</span>
          </div>
        }
      />

      {/* Ringkasan keuangan */}
      <LabaRugiWidget />

      {/* ── POPULASI ── */}
      <div>
        <h2 className="font-heading font-semibold text-[15px] mb-3 flex items-center gap-2">
          <Shell className="w-4 h-4 text-primary" /> Populasi Kura-kura
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          <StatCard label="Aktif" value={activeTortoises.length} icon={Shell}
            color="bg-accent/15 text-accent"
            sub="termasuk baby yang belum dijual"
            hint="Kura berstatus aktif atau baby. Yang sudah terjual, mati, atau diarsipkan tidak dihitung." />
          <StatCard label="Terjual" value={terjualCount} icon={ShoppingCart}
            color="bg-blue-100 text-blue-700"
            sub={`${salesThisMonth.length} ekor bulan ini`} />
          <StatCard label="Sakit" value={sickTortoises.length} icon={Heart}
            color="bg-orange-100 text-orange-700"
            sub={sickTortoises.length > 0 ? "sedang dalam perawatan" : "tidak ada yang sakit"} />
          <StatCard label="Mati" value={matiCount} icon={Skull}
            color="bg-red-100 text-red-700"
            sub="sepanjang riwayat"
            hint="Angka kumulatif sejak pencatatan dimulai, bukan hanya bulan ini." />
        </div>
      </div>

      {/* ── PRODUKTIVITAS BREEDING ── */}
      {phase2 && (
        <div className="surface-raised p-5">
          <h2 className="font-heading font-semibold text-[15px] mb-4 flex items-center gap-2">
            <Egg className="w-4 h-4 text-accent" /> Produktivitas Breeding
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="flex items-center gap-4 flex-shrink-0">
              <ProgressRing value={hatchRate} size={84} sublabel="menetas" />
              <div>
                <p className="text-xs text-muted-foreground">Dari {totalEggsEver} telur tercatat</p>
                <p className="stat-value text-xl text-accent mt-0.5">{totalHatched} menetas</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {eggsInProgress} butir sedang diinkubasi
                </p>
              </div>
            </div>

            <div className="flex-1 w-full min-w-0">
              {breedingWithCountdown.length > 0 ? (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {breedingWithCountdown.slice(0, 5).map(b => {
                    const mendesak = b.daysLeft !== null && b.daysLeft <= 7;
                    const dekat = b.daysLeft !== null && b.daysLeft <= 30;
                    return (
                      <div key={b.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-transform hover:translate-x-0.5 ${
                        mendesak ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
                        : dekat ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
                        : "bg-muted/40 border-border"}`}>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate">{b.female_name} × {b.male_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {b.egg_count} telur · {b.incubator_name || "inkubator belum diisi"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {b.daysLeft !== null ? (
                            <>
                              <p className={`stat-value text-lg ${mendesak ? "text-red-600" : dekat ? "text-amber-600" : "text-muted-foreground"}`}>
                                {b.daysLeft}
                              </p>
                              <p className="text-[10px] text-muted-foreground">hari lagi</p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">tanggal belum diisi</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-4">
                  <Illustration name="breeding" size="sm" className="animate-float flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">Tidak ada batch breeding yang sedang berjalan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TREN 6 BULAN ── */}
      <div className="surface-raised p-5">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h2 className="font-heading font-semibold text-[15px] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Tren 6 Bulan
          </h2>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-accent" /> Pemasukan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-destructive/70" /> Pengeluaran
            </span>
          </div>
        </div>
        {adaDataTren ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last6} barGap={3} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
              <Tooltip
                formatter={v => fmt(v)}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                contentStyle={{
                  fontSize: 12, borderRadius: 10,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                }}
              />
              <Bar dataKey="pemasukan" fill="hsl(var(--accent))" radius={[4,4,0,0]} name="Pemasukan" animationDuration={700} />
              <Bar dataKey="pengeluaran" fill="hsl(var(--destructive) / 0.7)" radius={[4,4,0,0]} name="Pengeluaran" animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center gap-2">
            <Illustration name="report" size="sm" className="animate-float" />
            <p className="text-sm text-muted-foreground">Belum ada transaksi untuk digambarkan</p>
          </div>
        )}

        {/* Catatan yang menerjemahkan grafik di atas */}
        {adaDataTren && (
          <div className="mt-4 space-y-2">
            {incomeLast > 0 && (
              <NoteCard
                tone={incomeThis >= incomeLast ? "success" : "warning"}
                compact
                title={incomeThis >= incomeLast ? "Pemasukan naik dari bulan lalu" : "Pemasukan turun dari bulan lalu"}
              >
                {fmt(incomeThis)} bulan ini vs {fmt(incomeLast)} bulan lalu
                {" "}({Math.abs(Math.round(((incomeThis - incomeLast) / incomeLast) * 100))}%
                {incomeThis >= incomeLast ? " lebih tinggi" : " lebih rendah"}).
              </NoteCard>
            )}
            {salesThisMonth.length > 0 && (
              <NoteCard tone="info" compact title={`${salesThisMonth.length} ekor terjual bulan ini`}>
                Omzet {fmt(salesRevenue)}
                {salesLaba > 0 && <> · laba kotor {fmt(salesLaba)} dari penjualan yang HPP-nya sudah diisi</>}.
              </NoteCard>
            )}
          </div>
        )}
      </div>

      {/* Note investor */}
      <NoteCard tone="note" icon={Eye} title="Mode Investor">
        Semua data di halaman ini bersifat baca-saja. Nominal gaji per karyawan
        sengaja disembunyikan dari tampilan investor.
      </NoteCard>
    </div>
  );
}