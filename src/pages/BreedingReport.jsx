import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Egg, Baby, TrendingUp, FlaskConical, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export default function BreedingReport() {
  const [year, setYear] = useState(String(currentYear));

  const { data: breedings = [], isLoading } = useQuery({
    queryKey: ["breedings-report"],
    queryFn: () => base44.entities.Breeding.list("-egg_laying_date", 500),
  });

  // Filter data berdasarkan tahun terpilih (gunakan egg_laying_date)
  const filtered = useMemo(() =>
    breedings.filter((b) => b.egg_laying_date?.startsWith(year)),
    [breedings, year]
  );

  // Statistik ringkasan
  const summary = useMemo(() => {
    let totalEggs = 0, totalFertile = 0, totalHatched = 0, totalMating = 0;
    filtered.forEach((b) => {
      totalMating++;
      totalEggs    += b.egg_count     || 0;
      totalFertile += b.fertile_count || 0;
      totalHatched += b.hatched_count || 0;
    });
    const hatchRate = totalEggs > 0 ? ((totalHatched / totalEggs) * 100).toFixed(1) : 0;
    return { totalMating, totalEggs, totalFertile, totalHatched, hatchRate };
  }, [filtered]);

  // Data per bulan untuk grafik
  const monthlyData = useMemo(() => {
    const map = {};
    MONTH_NAMES.forEach((m, i) => { map[i + 1] = { bulan: m, telur: 0, menetas: 0 }; });
    filtered.forEach((b) => {
      const month = new Date(b.egg_laying_date).getMonth() + 1;
      map[month].telur   += b.egg_count     || 0;
      map[month].menetas += b.hatched_count || 0;
    });
    return Object.values(map);
  }, [filtered]);

  // Tabel per pasangan induk
  const byPair = useMemo(() => {
    const map = {};
    filtered.forEach((b) => {
      const key = `${b.male_name} × ${b.female_name}`;
      if (!map[key]) map[key] = { pair: key, sessions: 0, eggs: 0, hatched: 0, records: [] };
      map[key].sessions++;
      map[key].eggs    += b.egg_count     || 0;
      map[key].hatched += b.hatched_count || 0;
      map[key].records.push(b);
    });
    return Object.values(map).sort((a, b) => b.eggs - a.eggs);
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-primary" /> Laporan Breeding
          </h1>
          <p className="text-muted-foreground mt-1">Ringkasan telur & penetasan dalam satu tahun</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sesi Kawin</p>
                  <p className="text-2xl font-bold">{summary.totalMating}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                  <Egg className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Telur</p>
                  <p className="text-2xl font-bold">{summary.totalEggs}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Baby className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Berhasil Menetas</p>
                  <p className="text-2xl font-bold">{summary.totalHatched}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tingkat Penetasan</p>
                  <p className="text-2xl font-bold">{summary.hatchRate}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Grafik Bulanan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Telur & Penetasan per Bulan — {year}</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.totalEggs === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Egg className="w-10 h-10 opacity-20 mb-2" />
                  <p>Tidak ada data telur untuk tahun {year}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="telur"   name="Total Telur"      fill="hsl(var(--chart-3))" radius={[4,4,0,0]} />
                    <Bar dataKey="menetas" name="Berhasil Menetas" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tabel Per Pasangan */}
          {byPair.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ringkasan per Pasangan Induk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left py-2 pr-4 font-medium">Pasangan</th>
                        <th className="text-center py-2 px-2 font-medium">Sesi</th>
                        <th className="text-center py-2 px-2 font-medium">Total Telur</th>
                        <th className="text-center py-2 px-2 font-medium">Menetas</th>
                        <th className="text-center py-2 px-2 font-medium">Tingkat Penetasan</th>
                        <th className="text-left py-2 pl-4 font-medium">Tgl Bertelur Terakhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {byPair.map((p) => {
                        const rate = p.eggs > 0 ? ((p.hatched / p.eggs) * 100).toFixed(0) : 0;
                        const lastRecord = p.records.sort((a,b) => b.egg_laying_date?.localeCompare(a.egg_laying_date))[0];
                        return (
                          <tr key={p.pair} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pr-4 font-medium">{p.pair}</td>
                            <td className="text-center py-2.5 px-2">{p.sessions}</td>
                            <td className="text-center py-2.5 px-2">{p.eggs}</td>
                            <td className="text-center py-2.5 px-2">{p.hatched}</td>
                            <td className="text-center py-2.5 px-2">
                              <Badge variant="outline" className={
                                Number(rate) >= 70 ? "bg-green-100 text-green-700 border-green-200" :
                                Number(rate) >= 40 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                "bg-red-100 text-red-700 border-red-200"
                              }>
                                {rate}%
                              </Badge>
                            </td>
                            <td className="py-2.5 pl-4 text-muted-foreground text-xs">
                              {lastRecord?.egg_laying_date
                                ? format(new Date(lastRecord.egg_laying_date), "d MMM yyyy", { locale: id })
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}