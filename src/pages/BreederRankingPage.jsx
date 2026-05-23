import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, TrendingUp, Egg, Award, ChevronDown, X } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";

const currentYear = new Date().getFullYear();

function HatchRateBadge({ rate }) {
  if (rate >= 80) return <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">{rate.toFixed(1)}%</span>;
  if (rate >= 60) return <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">{rate.toFixed(1)}%</span>;
  return <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">{rate.toFixed(1)}%</span>;
}

function ScoreBar({ score }) {
  const color = score >= 70 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{Math.round(score)}</span>
    </div>
  );
}

function PairDetailModal({ pair, history, onClose }) {
  if (!pair) return null;
  const clutches = history.filter(b =>
    b.male_name === pair.maleName && b.female_name === pair.femaleName
  ).sort((a, b) => new Date(b.egg_laying_date) - new Date(a.egg_laying_date));

  return (
    <Dialog open={!!pair} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Egg className="w-5 h-5 text-primary" />
            {pair.maleName} × {pair.femaleName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Total Clutch", value: pair.totalClutch },
              { label: "Total Telur", value: pair.totalEggs },
              { label: "Total Menetas", value: pair.totalHatched },
            ].map(s => (
              <div key={s.label} className="bg-muted/50 rounded-xl p-3">
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Hatch Rate:</span>
            <HatchRateBadge rate={pair.hatchRate} />
            <span className="text-muted-foreground ml-auto">Skor:</span>
            <span className="font-bold text-primary">{Math.round(pair.score)}</span>
          </div>
          <div>
            <p className="font-semibold text-sm mb-2">Riwayat Clutch ({clutches.length})</p>
            {clutches.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada riwayat</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clutches.map((c, i) => {
                  const hr = c.egg_count > 0 ? ((c.hatched_count || 0) / c.egg_count) * 100 : 0;
                  return (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-xs">
                      <div>
                        <span className="font-medium">Clutch {clutches.length - i}</span>
                        <span className="text-muted-foreground ml-2">{c.egg_laying_date ? new Date(c.egg_laying_date).toLocaleDateString("id-ID") : "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{c.egg_count} telur</span>
                        {c.status === "menetas" && <HatchRateBadge rate={hr} />}
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RankingList({ pairs, breedings, label }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-3">
      {pairs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada data cukup untuk ranking</p>
        </div>
      )}
      {pairs.map((p, i) => (
        <div
          key={`${p.maleName}-${p.femaleName}`}
          className="bg-card border border-border rounded-xl p-4 hover:shadow-card-hover transition-all cursor-pointer"
          onClick={() => setSelected(p)}
        >
          <div className="flex items-start gap-3">
            {/* Rank */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
              i === 0 ? "bg-amber-100 text-amber-700 border-2 border-amber-300" :
              i === 1 ? "bg-slate-100 text-slate-600 border-2 border-slate-300" :
              i === 2 ? "bg-orange-100 text-orange-700 border-2 border-orange-300" :
              "bg-muted text-muted-foreground border border-border"
            }`}>
              {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">{p.maleName} × {p.femaleName}</h3>
                {i < 3 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
                    🏆 Top {i+1}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span>🥚 {p.totalEggs} telur</span>
                <span>🐢 {p.totalHatched} menetas</span>
                <span>📦 {p.totalClutch} clutch</span>
                <span>📅 {p.clutchesThisYear} clutch tahun ini</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <HatchRateBadge rate={p.hatchRate} />
                <div className="flex-1">
                  <ScoreBar score={p.score} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <PairDetailModal pair={selected} history={breedings} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function BreederRankingPage() {
  const { role } = useCurrentUser();
  const [yearFilter, setYearFilter] = useState("semua");

  const { data: breedings = [], isLoading } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-egg_laying_date", 500),
  });

  const yearOptions = useMemo(() => {
    const years = [...new Set(breedings.map(b => b.season_year).filter(Boolean))].sort((a,b)=>b-a);
    return years;
  }, [breedings]);

  const filtered = useMemo(() => {
    if (yearFilter === "semua") return breedings;
    return breedings.filter(b => String(b.season_year) === yearFilter || b.egg_laying_date?.startsWith(yearFilter));
  }, [breedings, yearFilter]);

  const computePairs = (data) => {
    const map = {};
    data.forEach(b => {
      const key = `${b.male_name}||${b.female_name}`;
      if (!map[key]) {
        map[key] = { maleName: b.male_name, femaleName: b.female_name, clutches: [] };
      }
      map[key].clutches.push(b);
    });

    return Object.values(map).map(p => {
      const allTime = breedings.filter(b => b.male_name === p.maleName && b.female_name === p.femaleName);
      const completed = p.clutches.filter(c => c.status === "menetas");
      const totalEggs = p.clutches.reduce((s, c) => s + (c.egg_count || 0), 0);
      const totalHatched = completed.reduce((s, c) => s + (c.hatched_count || 0), 0);
      const totalEggsForHatch = completed.reduce((s, c) => s + (c.egg_count || 0), 0);
      const hatchRate = totalEggsForHatch > 0 ? (totalHatched / totalEggsForHatch) * 100 : 0;
      const clutchesThisYear = p.clutches.filter(c => c.season_year === currentYear || c.egg_laying_date?.startsWith(String(currentYear))).length;
      const clutchPerYear = allTime.length > 0 ? allTime.length / Math.max(1, yearOptions.length) : 0;

      // Normalize for scoring
      const maxEggs = 50; // assume 50 eggs max per season for normalization
      const normalizedEggs = Math.min(100, (totalEggs / maxEggs) * 100);
      const normalizedClutch = Math.min(100, (clutchPerYear / 3) * 100);

      const score = (hatchRate * 0.4) + (normalizedEggs * 0.3) + (normalizedClutch * 0.3);

      return {
        maleName: p.maleName,
        femaleName: p.femaleName,
        totalClutch: p.clutches.length,
        totalEggs,
        totalHatched,
        hatchRate,
        clutchesThisYear,
        score,
      };
    }).sort((a, b) => b.score - a.score);
  };

  const allPairs = computePairs(filtered);
  const malePairs = useMemo(() => {
    const maleMap = {};
    filtered.forEach(b => {
      if (!maleMap[b.male_name]) maleMap[b.male_name] = [];
      maleMap[b.male_name].push(b);
    });
    return Object.entries(maleMap).map(([name, clutches]) => {
      const completed = clutches.filter(c => c.status === "menetas");
      const totalEggs = clutches.reduce((s,c) => s+(c.egg_count||0),0);
      const totalHatched = completed.reduce((s,c) => s+(c.hatched_count||0),0);
      const totalEggsForHatch = completed.reduce((s,c) => s+(c.egg_count||0),0);
      const hatchRate = totalEggsForHatch > 0 ? (totalHatched/totalEggsForHatch)*100 : 0;
      const clutchPerYear = clutches.length / Math.max(1, yearOptions.length);
      const normalizedEggs = Math.min(100, (totalEggs/50)*100);
      const normalizedClutch = Math.min(100, (clutchPerYear/3)*100);
      const score = (hatchRate*0.4)+(normalizedEggs*0.3)+(normalizedClutch*0.3);
      return { maleName: name, femaleName: "—", totalClutch: clutches.length, totalEggs, totalHatched, hatchRate, clutchesThisYear: 0, score };
    }).sort((a,b)=>b.score-a.score);
  }, [filtered]);

  const femalePairs = useMemo(() => {
    const femaleMap = {};
    filtered.forEach(b => {
      if (!femaleMap[b.female_name]) femaleMap[b.female_name] = [];
      femaleMap[b.female_name].push(b);
    });
    return Object.entries(femaleMap).map(([name, clutches]) => {
      const completed = clutches.filter(c => c.status === "menetas");
      const totalEggs = clutches.reduce((s,c) => s+(c.egg_count||0),0);
      const totalHatched = completed.reduce((s,c) => s+(c.hatched_count||0),0);
      const totalEggsForHatch = completed.reduce((s,c) => s+(c.egg_count||0),0);
      const hatchRate = totalEggsForHatch > 0 ? (totalHatched/totalEggsForHatch)*100 : 0;
      const clutchPerYear = clutches.length / Math.max(1, yearOptions.length);
      const normalizedEggs = Math.min(100, (totalEggs/50)*100);
      const normalizedClutch = Math.min(100, (clutchPerYear/3)*100);
      const score = (hatchRate*0.4)+(normalizedEggs*0.3)+(normalizedClutch*0.3);
      return { maleName: "—", femaleName: name, totalClutch: clutches.length, totalEggs, totalHatched, hatchRate, clutchesThisYear: 0, score };
    }).sort((a,b)=>b.score-a.score);
  }, [filtered]);

  if (!canAccess(role, "breeding")) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Ranking Indukan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Performa produktivitas pasangan induk breeding</p>
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter Tahun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Waktu</SelectItem>
            {yearOptions.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Formula info */}
      <div className="bg-muted/50 border border-border rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
        <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
        <span>
          <strong className="text-foreground">Formula Skor:</strong> Hatch Rate × 40% + Total Telur × 30% + Clutch/Tahun × 30% · Skor maks 100
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <Tabs defaultValue="pasangan">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pasangan">Pasangan Terbaik</TabsTrigger>
            <TabsTrigger value="jantan">Induk Jantan</TabsTrigger>
            <TabsTrigger value="betina">Induk Betina</TabsTrigger>
          </TabsList>
          <TabsContent value="pasangan" className="mt-4">
            <RankingList pairs={allPairs} breedings={breedings} label="pasangan" />
          </TabsContent>
          <TabsContent value="jantan" className="mt-4">
            <RankingList pairs={malePairs} breedings={breedings} label="jantan" />
          </TabsContent>
          <TabsContent value="betina" className="mt-4">
            <RankingList pairs={femalePairs} breedings={breedings} label="betina" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}