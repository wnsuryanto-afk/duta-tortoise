import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, DollarSign, Package, Users } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
const COLORS = ["#2d6a4f","#74c69d","#d4a017","#e07b39","#6b7280","#7c3aed","#0891b2","#be185d"];

const fmt = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}jt` : n >= 1000 ? `${(n/1000).toFixed(0)}rb` : String(n);

export default function SalesReportPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState("all");

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date"),
  });

  const filtered = useMemo(() => sales.filter(s => {
    if (!s.sale_date) return false;
    const d = new Date(s.sale_date);
    const matchYear = d.getFullYear() === parseInt(year);
    const matchMonth = month === "all" || d.getMonth() === parseInt(month);
    return matchYear && matchMonth;
  }), [sales, year, month]);

  // Omzet per bulan
  const monthlyData = useMemo(() => MONTHS.map((m, i) => {
    const items = sales.filter(s => {
      if (!s.sale_date) return false;
      const d = new Date(s.sale_date);
      return d.getFullYear() === parseInt(year) && d.getMonth() === i;
    });
    return {
      name: m,
      omzet: items.reduce((s, i) => s + (i.price || 0), 0),
      profit: items.reduce((s, i) => s + ((i.price||0) - (i.hpp||0)), 0),
      count: items.length,
    };
  }), [sales, year]);

  // Per platform
  const platformData = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const p = s.platform || "Tidak diketahui";
      if (!map[p]) map[p] = { name: p, count: 0, total: 0 };
      map[p].count++;
      map[p].total += s.price || 0;
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [filtered]);

  // Top morph
  const morphData = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const m = s.morph || "unknown";
      if (!map[m]) map[m] = { name: m, count: 0, total: 0 };
      map[m].count++;
      map[m].total += s.price || 0;
    });
    return Object.values(map).sort((a,b) => b.count - a.count).slice(0,5);
  }, [filtered]);

  const totalOmzet = filtered.reduce((s,i) => s + (i.price||0), 0);
  const totalProfit = filtered.reduce((s,i) => s + ((i.price||0)-(i.hpp||0)), 0);
  const totalHPP = filtered.reduce((s,i) => s + (i.hpp||0), 0);
  const totalOngkir = filtered.reduce((s,i) => s + (i.shipping_cost||0), 0);

  const years = Array.from({length:5},(_,i)=>String(currentYear-i));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Laporan Penjualan</h1>
          <p className="text-sm text-muted-foreground">Analitik & statistik penjualan</p>
        </div>
        <div className="flex gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {MONTHS.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Penjualan", val: filtered.length, icon: Package, color: "text-primary", sub: "transaksi" },
          { label: "Total Omzet", val: `Rp ${fmt(totalOmzet)}`, icon: DollarSign, color: "text-primary" },
          { label: "Total HPP+Ongkir", val: `Rp ${fmt(totalHPP)}`, icon: TrendingUp, color: "text-amber-600" },
          { label: "Ongkir", val: `Rp ${fmt(totalOngkir)}`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Margin Bersih", val: `Rp ${fmt(totalProfit)}`, icon: TrendingUp, color: totalProfit>=0?"text-green-600":"text-red-600" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
              <p className={`text-xl font-bold ${item.color}`}>{item.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Omzet Bulanan */}
      <Card>
        <CardHeader><CardTitle className="text-base">Omzet Bulanan {year}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} tickFormatter={v=>fmt(v)} />
              <Tooltip formatter={(v)=>`Rp ${v.toLocaleString("id-ID")}`} />
              <Bar dataKey="omzet" name="Omzet" fill="#2d6a4f" radius={[4,4,0,0]} />
              <Bar dataKey="profit" name="Profit" fill="#74c69d" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Platform */}
        <Card>
          <CardHeader><CardTitle className="text-base">Breakdown per Platform</CardTitle></CardHeader>
          <CardContent>
            {platformData.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Belum ada data platform</p>
            ) : (
              <div className="space-y-2">
                {platformData.map((p,i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor: COLORS[i%COLORS.length]}} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-muted-foreground ml-2">{p.count}x</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full mt-1">
                        <div className="h-1.5 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length],width:`${(p.total/totalOmzet*100)||0}%`}} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">Rp {fmt(p.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Morph */}
        <Card>
          <CardHeader><CardTitle className="text-base">Morph Terlaris</CardTitle></CardHeader>
          <CardContent>
            {morphData.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Belum ada data</p>
            ) : (
              <div className="space-y-3">
                {morphData.map((m,i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-5">#{i+1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize">{m.name}</p>
                      <p className="text-xs text-muted-foreground">Rp {m.total.toLocaleString("id-ID")}</p>
                    </div>
                    <Badge variant="secondary">{m.count}x</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabel detail */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detail Transaksi ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 pr-3">Tanggal</th>
                <th className="text-left py-2 pr-3">Tortoise</th>
                <th className="text-left py-2 pr-3">Pembeli</th>
                <th className="text-left py-2 pr-3">Platform</th>
                <th className="text-right py-2 pr-3">Harga Jual</th>
                <th className="text-right py-2 pr-3">Ongkir</th>
                <th className="text-right py-2 pr-3">HPP</th>
                <th className="text-right py-2">Margin Bersih</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const margin = (s.price||0) - (s.hpp||0);
                return (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-3 whitespace-nowrap">{s.sale_date ? format(new Date(s.sale_date),"d MMM yy",{locale:id}) : "-"}</td>
                  <td className="py-2 pr-3 font-medium">{s.tortoise_name}</td>
                  <td className="py-2 pr-3">{s.buyer_name}</td>
                  <td className="py-2 pr-3"><Badge variant="outline" className="text-xs">{s.platform||"-"}</Badge></td>
                  <td className="py-2 pr-3 text-right">Rp {(s.price||0).toLocaleString("id-ID")}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">{s.shipping_cost ? `Rp ${(s.shipping_cost).toLocaleString("id-ID")}` : "-"}</td>
                  <td className="py-2 pr-3 text-right text-amber-700">{s.hpp ? `Rp ${(s.hpp).toLocaleString("id-ID")}` : "-"}</td>
                  <td className={`py-2 text-right font-medium ${margin>=0?"text-green-600":"text-red-600"}`}>
                    Rp {margin.toLocaleString("id-ID")}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada transaksi</p>}
        </CardContent>
      </Card>
    </div>
  );
}