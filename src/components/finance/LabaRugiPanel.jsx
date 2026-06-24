import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Pill, FlaskConical, Wallet, MoreHorizontal, Fuel, Flame } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#FF8042", "#0088FE", "#00C49F", "#FFBB28", "#8884D8", "#FF6B6B"];

const MONTHS_ARR = Array.from({length:12}, (_,i)=>i);
const MONTH_LABEL = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
const YEARS = [2024,2025,2026,2027,2028];

function fmt(n) { return (n || 0).toLocaleString("id-ID"); }

export default function LabaRugiPanel() {
  const { role } = useCurrentUser();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const period = `${year}-${String(month+1).padStart(2,"0")}`;
  const showGajiDetail = ["owner","admin","manajer"].includes(role);

  // Data fetching
  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["finance-transactions-lr"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 2000),
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["sales-lr"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 500),
  });

  const { data: salarySlips = [], isLoading: loadingSlips } = useQuery({
    queryKey: ["salary-slips-lr"],
    queryFn: () => base44.entities.SalarySlip.filter({}, "-period", 1000),
  });

  const { data: pettyCash = [], isLoading: loadingPetty } = useQuery({
    queryKey: ["petty-cash-lr"],
    queryFn: () => base44.entities.PettyCashRequest.filter({}, "-disbursement_date", 500),
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-lr"],
    queryFn: () => base44.entities.Tortoise.list("-name", 2000),
  });

  const { data: settingsArr = [] } = useQuery({
    queryKey: ["company-settings-lr"],
    queryFn: () => base44.entities.CompanySettings.filter({setting_key:"main"}, "", 1),
  });

  const isLoading = loadingTx || loadingSales || loadingSlips || loadingPetty;

  const computed = useMemo(() => {
    // Filter by period
    const monthTx = transactions.filter(t => t.date?.startsWith(period) && !t.excluded_from_reports);
    const pemasukanTx = monthTx.filter(t => t.type === "pemasukan");
    const pengeluaranTx = monthTx.filter(t => t.type === "pengeluaran");
    const totalPemasukan = pemasukanTx.reduce((s,t)=>s+(t.amount||0),0);

    // Pengeluaran by category from FinanceTransaction
    const expByCat = {};
    pengeluaranTx.forEach(t => {
      const cat = t.category || "lainnya";
      expByCat[cat] = (expByCat[cat]||0) + (t.amount||0);
    });

    // Salary slips this period
    const monthSlips = salarySlips.filter(s => s.period === period && s.status === "paid");
    const totalGaji = monthSlips.reduce((s,sl)=>s+(sl.net_total||0),0);

    // Petty cash this period
    const monthPetty = pettyCash.filter(p => p.disbursement_date?.startsWith(period) && p.status === "disbursed");
    const totalKasKecil = monthPetty.reduce((s,p)=>s+(p.amount_requested||0),0);

    // Sales per tortoise
    const monthSales = sales.filter(s => s.sale_date?.startsWith(period));

    const pengeluaranBreakdown = {
      gaji_karyawan: totalGaji,
      pakan: expByCat["pakan"] || 0,
      obat_perawatan: expByCat["obat_perawatan"] || 0,
      vitamin_suplemen: expByCat["vitamin_suplemen"] || 0,
      operasional: expByCat["operasional"] || 0,
      solar_bbm: expByCat["solar_bbm"] || 0,
      rokok: expByCat["rokok"] || 0,
      kas_kecil: totalKasKecil,
      lainnya: expByCat["lainnya"] || 0,
    };
    const totalPengeluaran = Object.values(pengeluaranBreakdown).reduce((s,v)=>s+v,0);
    const labaRugi = totalPemasukan - totalPengeluaran;

    // Biaya per ekor
    const activeCount = tortoises.filter(t => t.status==="aktif" || t.status==="baby" || t.status==="breeding").length;
    const settings = settingsArr[0] || {};
    const fallback = settings.hpp_fallback_per_ekor || 100000;
    const biayaPerEkor = totalPengeluaran > 0 && activeCount > 0
      ? Math.round(totalPengeluaran / activeCount)
      : fallback;

    return {
      pemasukanTx, totalPemasukan, pengeluaranBreakdown, totalPengeluaran,
      labaRugi, biayaPerEkor, isDataAktual: totalPengeluaran > 0,
      fallback, activeCount, monthSales, monthSlips, monthPetty,
    };
  }, [transactions, sales, salarySlips, pettyCash, tortoises, settingsArr, period]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const pieData = Object.entries(computed.pengeluaranBreakdown)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v }));

  const barChartData = MONTHS_ARR.map(m => {
    const p = `${year}-${String(m+1).padStart(2,"0")}`;
    const tx = transactions.filter(t => t.date?.startsWith(p) && !t.excluded_from_reports);
    const inAmt = tx.filter(t => t.type==="pemasukan").reduce((s,t)=>s+(t.amount||0),0);
    const outAmt = tx.filter(t => t.type==="pengeluaran").reduce((s,t)=>s+(t.amount||0),0);
    // Add salary
    const slips = salarySlips.filter(s => s.period===p && s.status==="paid");
    const salary = slips.reduce((s,sl)=>s+(sl.net_total||0),0);
    // Add petty
    const petty = pettyCash.filter(pp => pp.disbursement_date?.startsWith(p) && pp.status==="disbursed");
    const pettyAmt = petty.reduce((s,pp)=>s+(pp.amount_requested||0),0);
    return { name: MONTH_LABEL[m], Pemasukan: inAmt, Pengeluaran: outAmt + salary + pettyAmt };
  });

  const totSalesRevenue = computed.monthSales.reduce((s,sa) => s+(sa.price||0), 0);
  const totSalesProfit = computed.monthSales.reduce((s,sa) => s+(sa.profit||0), 0);

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_LABEL.map((l,i) => <SelectItem key={i} value={String(i)}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-sm font-mono">{period}</Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pemasukan</p>
            <p className="text-lg font-bold text-green-700">Rp {fmt(computed.totalPemasukan)}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100"><TrendingDown className="w-5 h-5 text-red-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
            <p className="text-lg font-bold text-red-700">Rp {fmt(computed.totalPengeluaran)}</p>
          </div>
        </div>
      </Card>
      <Card className={`p-4 ${computed.labaRugi>=0 ? "bg-primary/5 border-primary/20" : "bg-orange-50 border-orange-200"}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${computed.labaRugi>=0 ? "bg-primary/10" : "bg-orange-100"}`}>
            <DollarSign className={`w-5 h-5 ${computed.labaRugi>=0 ? "text-primary" : "text-orange-600"}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{computed.labaRugi>=0 ? "LABA BERSIH" : "RUGI BERSIH"}</p>
            <p className={`text-lg font-bold ${computed.labaRugi>=0 ? "text-primary" : "text-orange-700"}`}>
              Rp {fmt(Math.abs(computed.labaRugi))}
            </p>
          </div>
        </div>
      </Card>
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100"><Package className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Biaya per Ekor/Bulan</p>
            <p className="text-lg font-bold text-blue-700">Rp {fmt(computed.biayaPerEkor)}</p>
            <p className="text-[10px] text-muted-foreground">
              {computed.isDataAktual ? `Data aktual (${computed.activeCount} ekor)` : `Estimasi default`}
            </p>
          </div>
        </div>
      </Card>
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Pemasukan vs Pengeluaran per Bulan ({year})</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{fontSize:11}} />
            <YAxis tick={{fontSize:11}} tickFormatter={v => `${(v/1000000).toFixed(0)}jt`} />
            <Tooltip formatter={v => `Rp ${fmt(v)}`} />
            <Bar dataKey="Pemasukan" fill="#22c55e" radius={[4,4,0,0]} />
            <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      {pieData.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Breakdown Pengeluaran</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({name,value}) => `${name} (${((value/computed.totalPengeluaran)*100).toFixed(0)}%)`} labelLine={false}>
                {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `Rp ${fmt(v)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>

    {/* Laba Rugi Ringkasan */}
    <Card className="p-5">
      <h2 className="font-semibold text-base mb-4">Laba Rugi Detail — {period}</h2>

      {/* Pemasukan */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Pemasukan
        </h3>
        {computed.pemasukanTx.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Belum ada pemasukan</p>
        ) : (
          <div className="space-y-1.5">
            {computed.pemasukanTx.map(tx => (
              <div key={tx.id} className="flex justify-between items-center py-1.5 border-b border-border/50 text-sm">
                <span className="text-muted-foreground">{tx.description || tx.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{tx.date}</span>
                  <span className="font-semibold text-green-700">Rp {fmt(tx.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center pt-3 pb-1 font-bold text-green-700">
          <span>Total Pemasukan</span>
          <span>Rp {fmt(computed.totalPemasukan)}</span>
        </div>
      </div>

      {/* Pengeluaran */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" /> Pengeluaran
        </h3>
        <div className="space-y-1.5">
          {Object.entries({
            "Gaji Karyawan": { icon: Users, value: computed.pengeluaranBreakdown.gaji_karyawan, detail: computed.monthSlips },
            "Pakan": { icon: Package, value: computed.pengeluaranBreakdown.pakan },
            "Obat & Perawatan": { icon: Pill, value: computed.pengeluaranBreakdown.obat_perawatan },
            "Vitamin & Suplemen": { icon: FlaskConical, value: computed.pengeluaranBreakdown.vitamin_suplemen },
            "Solar / BBM": { icon: Fuel, value: computed.pengeluaranBreakdown.solar_bbm },
            "Rokok": { icon: Flame, value: computed.pengeluaranBreakdown.rokok },
            "Kas Kecil": { icon: Wallet, value: computed.pengeluaranBreakdown.kas_kecil, detail: computed.monthPetty },
            "Lainnya": { icon: MoreHorizontal, value: computed.pengeluaranBreakdown.lainnya + computed.pengeluaranBreakdown.operasional },
          }).map(([label, info]) => {
            if (info.value === 0 && (!info.detail || info.detail.length===0)) return null;
            const Icon = info.icon;
            return (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/50 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="w-3.5 h-3.5" /> {label}
                  {info.detail && info.detail.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">{info.detail.length} slip</Badge>
                  )}
                </span>
                <span className="font-semibold text-red-600">Rp {fmt(info.value)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center pt-3 pb-1 font-bold text-red-700">
          <span>Total Pengeluaran</span>
          <span>Rp {fmt(computed.totalPengeluaran)}</span>
        </div>
      </div>

      {/* Laba Rugi */}
      <div className={`rounded-xl p-4 ${computed.labaRugi>=0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className="flex justify-between items-center">
          <span className={`text-lg font-bold ${computed.labaRugi>=0 ? "text-green-800" : "text-red-800"}`}>
            {computed.labaRugi>=0 ? "💰 LABA BERSIH" : "📉 RUGI BERSIH"}
          </span>
          <span className={`text-2xl font-bold ${computed.labaRugi>=0 ? "text-green-700" : "text-red-700"}`}>
            Rp {fmt(Math.abs(computed.labaRugi))}
          </span>
        </div>
        {computed.totalPemasukan > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Margin Operasional: {((computed.labaRugi / computed.totalPemasukan) * 100).toFixed(1)}%
          </p>
        )}
      </div>
    </Card>

    {/* Tabel Laba per Kura */}
    {computed.monthSales.length > 0 && (
      <Card className="p-5">
        <h2 className="font-semibold text-base mb-4">Laba per Kura Terjual</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-2">Kura</th>
                <th className="text-left pb-2">Pembeli</th>
                <th className="text-right pb-2">Harga Jual</th>
                <th className="text-right pb-2">HPP</th>
                <th className="text-right pb-2">Laba</th>
                <th className="text-right pb-2">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {computed.monthSales.map(s => (
                <tr key={s.id}>
                  <td className="py-2 font-medium">{s.tortoise_code || s.tortoise_name || "-"}</td>
                  <td className="py-2">{s.buyer_name || "-"}</td>
                  <td className="py-2 text-right">Rp {fmt(s.price)}</td>
                  <td className="py-2 text-right text-muted-foreground">Rp {fmt(s.hpp)}</td>
                  <td className={`py-2 text-right font-semibold ${(s.profit||0)>=0 ? "text-green-600" : "text-red-600"}`}>
                    Rp {fmt(s.profit)}
                  </td>
                  <td className={`py-2 text-right ${(s.profit||0)>=0 ? "text-green-600" : "text-red-600"}`}>
                    {s.margin_percent || 0}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-bold">
                <td className="py-2" colSpan={2}>Total ({computed.monthSales.length} ekor)</td>
                <td className="py-2 text-right">Rp {fmt(totSalesRevenue)}</td>
                <td className="py-2 text-right">-</td>
                <td className={`py-2 text-right ${totSalesProfit>=0 ? "text-green-700" : "text-red-700"}`}>
                  Rp {fmt(totSalesProfit)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    )}
  </div>
  );
}