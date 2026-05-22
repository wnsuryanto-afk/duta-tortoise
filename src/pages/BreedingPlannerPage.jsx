import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Calendar, AlertTriangle, Trophy, Egg, Baby, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { id } from "date-fns/locale";

const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function calcGrade(rate) {
  if (rate >= 0.8) return { label: "Sangat Baik", color: "bg-green-100 text-green-800" };
  if (rate >= 0.6) return { label: "Baik", color: "bg-blue-100 text-blue-800" };
  if (rate >= 0.4) return { label: "Cukup", color: "bg-yellow-100 text-yellow-800" };
  return { label: "Rendah", color: "bg-red-100 text-red-800" };
}

export default function BreedingPlannerPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const { data: breedings = [] } = useQuery({ queryKey: ["breedings-planner"], queryFn: () => base44.entities.Breeding.list() });
  const { data: tortoises = [] } = useQuery({ queryKey: ["tortoises-planner"], queryFn: () => base44.entities.Tortoise.list() });

  // === PARTNER RANKINGS ===
  const partnerStats = useMemo(() => {
    const map = {};
    breedings.forEach(b => {
      const key = `${b.male_name}|${b.female_name}`;
      if (!map[key]) map[key] = { male: b.male_name, female: b.female_name, clutches: 0, totalEggs: 0, totalHatched: 0 };
      map[key].clutches++;
      map[key].totalEggs += b.egg_count || 0;
      map[key].totalHatched += b.hatched_count || 0;
    });
    return Object.values(map).map(s => ({
      ...s,
      hatchRate: s.totalEggs > 0 ? s.totalHatched / s.totalEggs : 0,
      avgEggsPerClutch: s.clutches > 0 ? s.totalEggs / s.clutches : 0,
      score: (s.totalEggs > 0 ? (s.totalHatched / s.totalEggs) * 60 : 0) + (s.clutches * 5) + (s.totalEggs / Math.max(s.clutches, 1)) * 1,
    })).sort((a, b) => b.score - a.score);
  }, [breedings]);

  // === OVERDUE FEMALES (not mated > 90 days) ===
  const overdueAlerts = useMemo(() => {
    const femaleMap = {};
    tortoises.filter(t => t.gender === "betina" && t.status === "aktif").forEach(t => { femaleMap[t.name] = t; });
    const lastMatings = {};
    breedings.forEach(b => {
      if (b.mating_date) {
        if (!lastMatings[b.female_name] || b.mating_date > lastMatings[b.female_name]) {
          lastMatings[b.female_name] = b.mating_date;
        }
      }
    });
    return Object.keys(femaleMap).filter(name => {
      const last = lastMatings[name];
      if (!last) return true;
      return differenceInDays(today, parseISO(last)) > 90;
    }).map(name => ({ name, lastMating: lastMatings[name] || null }));
  }, [tortoises, breedings]);

  // === CALENDAR EVENTS ===
  const calendarEvents = useMemo(() => {
    const events = {};
    const addEvent = (dateStr, ev) => {
      if (!dateStr) return;
      const key = dateStr.substring(0, 10);
      if (!events[key]) events[key] = [];
      events[key].push(ev);
    };
    breedings.forEach(b => {
      if (b.mating_date) addEvent(b.mating_date, { type: "kawin", label: `${b.male_name} × ${b.female_name}`, color: "bg-pink-400" });
      if (b.egg_laying_date) addEvent(b.egg_laying_date, { type: "telur", label: `Telur: ${b.female_name}`, color: "bg-yellow-400" });
      if (b.estimated_hatch_date) addEvent(b.estimated_hatch_date, { type: "hatch_est", label: `Est. Menetas: ${b.female_name}`, color: "bg-orange-300" });
      if (b.hatch_date) addEvent(b.hatch_date, { type: "hatch", label: `Menetas: ${b.female_name}`, color: "bg-green-400" });
    });
    return events;
  }, [breedings]);

  const firstDay = startOfMonth(new Date(viewYear, viewMonth, 1));
  const lastDay = endOfMonth(firstDay);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startPad = getDay(firstDay);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-100 rounded-xl"><Heart className="w-6 h-6 text-pink-600" /></div>
        <div>
          <h1 className="text-2xl font-bold">Breeding Planner</h1>
          <p className="text-sm text-muted-foreground">Kalender jadwal kawin & rekomendasi pasangan terbaik</p>
        </div>
      </div>

      {/* Overdue Alerts */}
      {overdueAlerts.length > 0 && (
        <div className="space-y-2">
          {overdueAlerts.map(a => (
            <div key={a.name} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>{a.name}</strong> belum kawin sejak {a.lastMating ? `${differenceInDays(today, parseISO(a.lastMating))} hari lalu` : "belum pernah"} — musim kawin mungkin terlewat.</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <div className="flex items-center gap-2">
                  <Select value={String(viewMonth)} onValueChange={v => setViewMonth(Number(v))}>
                    <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS_ID.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={String(viewYear)} onValueChange={v => setViewYear(Number(v))}>
                    <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map(day => {
                  const key = format(day, "yyyy-MM-dd");
                  const evs = calendarEvents[key] || [];
                  const isToday = format(today, "yyyy-MM-dd") === key;
                  return (
                    <div key={key} className={`min-h-[60px] p-1 rounded-lg border text-xs ${isToday ? "border-primary bg-primary/5" : "border-transparent hover:border-muted-foreground/20"}`}>
                      <div className={`font-semibold mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
                      <div className="space-y-0.5">
                        {evs.slice(0, 2).map((ev, i) => (
                          <div key={i} className={`${ev.color} text-white rounded px-1 py-0.5 truncate text-[10px]`}>{ev.label}</div>
                        ))}
                        {evs.length > 2 && <div className="text-muted-foreground text-[10px]">+{evs.length - 2} lagi</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {[{ color: "bg-pink-400", label: "Kawin" }, { color: "bg-yellow-400", label: "Bertelur" }, { color: "bg-orange-300", label: "Est. Menetas" }, { color: "bg-green-400", label: "Menetas" }].map(l => (
                  <div key={l.label} className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${l.color}`} />{l.label}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partner Rankings */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500" /> Ranking Pasangan Terbaik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {partnerStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada data breeding</p>}
              {partnerStats.slice(0, 8).map((p, i) => {
                const grade = calcGrade(p.hatchRate);
                return (
                  <div key={i} className="p-3 bg-muted/40 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-1">
                          {i < 3 && <span>{["🥇","🥈","🥉"][i]}</span>}
                          {p.male} × {p.female}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.clutches} clutch · {p.totalEggs} telur · {p.totalHatched} menetas
                        </div>
                      </div>
                      <Badge className={`${grade.color} text-[10px] px-1.5 py-0.5 border-0 shrink-0`}>{grade.label}</Badge>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1"><span>Hatch rate</span><span>{(p.hatchRate * 100).toFixed(0)}%</span></div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.hatchRate * 100}%` }} />
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Rata-rata {p.avgEggsPerClutch.toFixed(1)} telur/clutch</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Events Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" /> Jadwal Mendatang (30 hari ke depan)</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const upcoming = [];
            breedings.forEach(b => {
              [
                { date: b.mating_date, type: "Kawin", icon: "💕", color: "text-pink-600" },
                { date: b.egg_laying_date, type: "Bertelur", icon: "🥚", color: "text-yellow-600" },
                { date: b.estimated_hatch_date, type: "Est. Menetas", icon: "🐣", color: "text-orange-600" },
                { date: b.hatch_date, type: "Menetas", icon: "🐢", color: "text-green-600" },
              ].forEach(ev => {
                if (!ev.date) return;
                const d = parseISO(ev.date);
                const diff = differenceInDays(d, today);
                if (diff >= 0 && diff <= 30) {
                  upcoming.push({ ...ev, diff, pair: `${b.male_name} × ${b.female_name}`, dateStr: ev.date });
                }
              });
            });
            upcoming.sort((a, b) => a.diff - b.diff);
            if (upcoming.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jadwal dalam 30 hari ke depan</p>;
            return (
              <div className="divide-y">
                {upcoming.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <span className="text-xl">{ev.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ev.pair}</div>
                      <div className={`text-xs ${ev.color}`}>{ev.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{format(parseISO(ev.dateStr), "dd MMM yyyy")}</div>
                      <div className="text-xs text-muted-foreground">{ev.diff === 0 ? "Hari ini" : `${ev.diff} hari lagi`}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}