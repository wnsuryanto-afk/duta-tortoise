import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Egg, Download, BarChart2 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import html2canvas from "html2canvas";

const MORPH_COLORS = [
  "#2D5016","#6B9B37","#8B5E3C","#C19A6B","#4A7C23","#A0522D",
  "#228B22","#D2691E","#556B2F","#CD853F","#6B8E23","#8B4513",
];

export default function BreedingStatsSection({ breedings = [] }) {
  const [range, setRange] = useState("12");
  const chartRef = useRef(null);

  const currentYear = new Date().getFullYear();

  // Fetch actual baby tortoises for accurate "Total Menetas" count
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-stats"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 2000),
    staleTime: 5 * 60 * 1000,
  });

  // Monthly production data
  const monthlyData = useMemo(() => {
    const months = parseInt(range);
    const now = new Date();
    return Array.from({ length: months }, (_, i) => {
      const date = subMonths(now, months - 1 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const inMonth = breedings.filter(b => {
        if (!b.egg_laying_date) return false;
        try {
          const d = parseISO(b.egg_laying_date);
          return isWithinInterval(d, { start, end });
        } catch { return false; }
      });
      const totalEggs = inMonth.reduce((s, b) => s + (b.egg_count || 0), 0);
      // Hatch rate per bulan: menetas / telur dicek (pakai egg_records)
      let monthChecked = 0, monthHatched = 0;
      inMonth.forEach(b => {
        const records = b.egg_records || [];
        records.forEach(e => {
          if (e.status !== "belum_dicek") {
            monthChecked++;
            if (e.status === "menetas") monthHatched++;
          }
        });
      });
      const hatchRate = monthChecked > 0 ? Math.round((monthHatched / monthChecked) * 100) : 0;
      return {
        month: format(date, "MMM yy", { locale: id }),
        telur: totalEggs,
        menetas: monthHatched,
        hatchRate,
      };
    });
  }, [breedings, range]);

  // Stats for current year
  const yearStats = useMemo(() => {
    const thisYear = breedings.filter(b => b.egg_laying_date?.startsWith(String(currentYear)));
    const totalEggs = thisYear.reduce((s, b) => s + (b.egg_count || 0), 0);

    // Total menetas dari baby Tortoise aktual (source="hasil_sendiri" tahun ini)
    const actualBabiesThisYear = tortoises.filter(t =>
      t.source === "hasil_sendiri" && t.birth_date?.startsWith(String(currentYear))
    ).length;

    // Hatch rate overall: total menetas / total telur yang SUDAH DICEK (bukan belum_dicek)
    let totalChecked = 0;
    let totalHatchedFromRecords = 0;
    breedings.forEach(b => {
      const records = b.egg_records || [];
      if (records.length === 0 && b.egg_count > 0) {
        // No per-egg records → all are "belum_dicek" → jangan masuk pembagi
        return;
      }
      records.forEach(e => {
        if (e.status !== "belum_dicek") {
          totalChecked++;
          if (e.status === "menetas") totalHatchedFromRecords++;
        }
      });
    });
    // Fallback: if no per-egg records, use aggregated hatched_count from completed breedings
    if (totalChecked === 0) {
      const completed = thisYear.filter(b => b.status === "menetas" || b.status === "selesai");
      totalChecked = completed.reduce((s, b) => s + (b.egg_count || 0), 0);
      totalHatchedFromRecords = completed.reduce((s, b) => s + (b.hatched_count || 0), 0);
    }
    const hatchRateOverall = totalChecked > 0 ? ((totalHatchedFromRecords / totalChecked) * 100).toFixed(1) : "0";

    return { totalEggs, totalHatched: actualBabiesThisYear, totalHatchedFromRecords, totalChecked, hatchRateOverall };
  }, [breedings, tortoises, currentYear]);

  // Morph distribution from hatched tortoises this year
  const morphData = useMemo(() => {
    const completedThisYear = breedings.filter(b =>
      b.status === "menetas" &&
      (b.hatch_date?.startsWith(String(currentYear)) || b.egg_laying_date?.startsWith(String(currentYear)))
    );
    const morphMap = {};
    completedThisYear.forEach(b => {
      const morph = b.morph_anakan || "normal";
      morphMap[morph] = (morphMap[morph] || 0) + (b.hatched_count || 0);
    });
    return Object.entries(morphMap)
      .map(([name, value]) => ({ name, value }))
      .filter(m => m.value > 0)
      .sort((a,b) => b.value - a.value)
      .slice(0, 8);
  }, [breedings, currentYear]);

  const handleExport = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `breeding-stats-${format(new Date(), "yyyy-MM")}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-5" ref={chartRef}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" /> Statistik Produksi
        </h2>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 Bulan</SelectItem>
              <SelectItem value="12">1 Tahun</SelectItem>
              <SelectItem value="24">2 Tahun</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: `Total Telur ${currentYear}`, value: yearStats.totalEggs, unit: "butir", icon: "🥚" },
          { label: `Total Menetas ${currentYear}`, value: yearStats.totalHatched, unit: "ekor", icon: "🐢", sub: `(${yearStats.totalHatchedFromRecords} dari egg_records)` },
          { label: "Hatch Rate Overall", value: `${yearStats.hatchRateOverall}%`, unit: "", icon: "📊", sub: `${yearStats.totalHatchedFromRecords}/${yearStats.totalChecked} telur dicek` },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl">{s.icon}</p>
            <p className="text-2xl font-bold text-primary mt-1">{s.value}<span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            {s.sub && <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>}
          </Card>
        ))}
      </div>

      {/* Line chart: egg production */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Egg className="w-4 h-4 text-amber-500" /> Produksi Telur per Bulan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="telur" stroke="#C19A6B" strokeWidth={2} dot={{ r: 3 }} name="Telur" />
              <Line type="monotone" dataKey="menetas" stroke="#2D5016" strokeWidth={2} dot={{ r: 3 }} name="Menetas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar chart: hatch rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Hatch Rate per Bulan (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [`${v}%`, "Hatch Rate"]}
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
              />
              <Bar dataKey="hatchRate" name="Hatch Rate" radius={[4,4,0,0]}>
                {monthlyData.map((entry, i) => (
                  <Cell key={i} fill={entry.hatchRate >= 80 ? "#6B9B37" : entry.hatchRate >= 60 ? "#C19A6B" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie chart: morph distribution */}
      {morphData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🧬 Distribusi Morph Anakan Tahun Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={morphData} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {morphData.map((_, i) => (
                      <Cell key={i} fill={MORPH_COLORS[i % MORPH_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:w-40">
                {morphData.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: MORPH_COLORS[i % MORPH_COLORS.length] }} />
                    <span className="capitalize">{m.name}: {m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}