import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp, Shell } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useCostPerTortoise } from "@/hooks/useCostPerTortoise";
import { format as formatDate } from "date-fns";
import { id } from "date-fns/locale";

const fmt = n => `Rp ${(n || 0).toLocaleString("id-ID")}`;
const PIE_COLORS = ["#4ade80", "#f87171", "#60a5fa", "#fbbf24", "#a78bfa", "#fb923c", "#34d399"];
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: `2026-${String(i + 1).padStart(2, "0")}`,
  label: formatDate(new Date(2026, i, 1), "MMMM yyyy", { locale: id }),
}));

export default function LabaRugiEnhanced({ period }) {
  const { role } = useCurrentUser();
  const isInvestor = role === "investor";
  const canViewSalary = ["owner", "admin", "manajer"].includes(role);

  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [viewMode, setViewMode] = useState("bulanan");
  const [showPemasukan, setShowPemasukan] = useState(true);
  const [showPengeluaran, setShowPengeluaran] = useState(true);

  const costData = useCostPerTortoise(selectedPeriod);

  const { data: finances = [] } = useQuery({
    queryKey: ["labarugi-finances", selectedPeriod],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 1000),
    staleTime: 3 * 60 * 1000,
  });

  const { data: salarySlips = [] } = useQuery({
    queryKey: ["labarugi-salaries", selectedPeriod],
    queryFn: () => base44.entities.SalarySlip.list("-period", 200),
    staleTime: 3 * 60 * 1000,
  });

  const { data: pettyCash = [] } = useQuery({
    queryKey: ["labarugi-pettycash", selectedPeriod],
    queryFn: () => base44.entities.PettyCashRequest.list("-disbursement_date", 200),
    staleTime: 3 * 60 * 1000,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["labarugi-sales", selectedPeriod],
    queryFn: () => base44.entities.Sale.list("-sale_date", 500),
    staleTime: 3 * 60 * 1000,
  });

  // Filter by period
  const periodTx = finances.filter(t => t.date?.startsWith(selectedPeriod) && !t.excluded_from_reports);
  const pemasukan = periodTx.filter(t => t.type === "pemasukan");
  const pengeluaran = periodTx.filter(t => t.type === "pengeluaran");
  const totalPemasukan = pemasukan.reduce((s, t) => s + (t.amount || 0), 0);

  // Pengeluaran from FinanceTransaction
  const totalPengeluaranFinance = pengeluaran.reduce((s, t) => s + (t.amount || 0), 0);

  // Salary slips paid
  const monthSlips = salarySlips.filter(s => s.period === selectedPeriod && s.status === "paid");
  const totalGaji = monthSlips.reduce((s, sl) => s + (sl.net_total || 0), 0);

  // PettyCash disbursed
  const monthPC = pettyCash.filter(p => p.disbursement_date?.startsWith(selectedPeriod) && p.status === "disbursed");
  const totalPC = monthPC.reduce((s, p) => s + (p.amount_requested || 0), 0);

  // Total pengeluaran
  const totalPengeluaran = totalPengeluaranFinance + totalGaji + totalPC;
  const labaRugi = totalPemasukan - totalPengeluaran;
  const marginPct = totalPemasukan > 0 ? ((labaRugi / totalPemasukan) * 100).toFixed(1) : "0.0";

  // Pengeluaran by category
  const expenseByCat = {};
  pengeluaran.forEach(t => {
    const c = t.category || "lainnya";
    expenseByCat[c] = (expenseByCat[c] || 0) + (t.amount || 0);
  });
  if (totalGaji > 0) expenseByCat["gaji_karyawan"] = (expenseByCat["gaji_karyawan"] || 0) + totalGaji;
  if (totalPC > 0) expenseByCat["kas_kecil"] = (expenseByCat["kas_kecil"] || 0) + totalPC;

  // Sales this period
  const periodSales = sales.filter(s => s.sale_date?.startsWith(selectedPeriod) && !s.excluded_from_reports);

  // Chart data
  const barData = [
    { name: "Pemasukan", value: totalPemasukan, fill: "#22c55e" },
    { name: "Pengeluaran", value: totalPengeluaran, fill: "#ef4444" },
  ];

  const pieData = Object.entries(expenseByCat)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => ({
      name: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value,
    }));

  const categoryLabels = {
    gaji_karyawan: "Gaji Karyawan",
    pakan: "Pakan",
    obat_perawatan: "Obat & Perawatan",
    vitamin_suplemen: "Vitamin & Suplemen",
    operasional: "Operasional",
    kas_kecil: "Kas Kecil",
    listrik: "Listrik",
    air: "Air",
    internet: "Internet",
    sewa: "Sewa",
    pembelian_barang: "Pembelian Barang",
    perawatan_kandang: "Perawatan Kandang",
    lainnya: "Lainnya",
  };

  const SectionHeader = ({ label, amount, color, collapsed, onToggle }) => (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        <span className={`font-semibold text-sm ${color}`}>{label}</span>
      </div>
      <span className={`font-bold text-sm ${color}`}>{fmt(amount)}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex bg-muted rounded-lg p-0.5">
          {["bulanan", "triwulan", "tahunan"].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === mode ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {mode === "bulanan" ? "Bulanan" : mode === "triwulan" ? "Triwulan" : "Tahunan"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <Card className="p-5">
        <h2 className="font-semibold text-base mb-4">Ringkasan Laba Rugi</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-green-200">
            <span className="text-sm font-medium text-green-700">TOTAL PEMASUKAN</span>
            <span className="font-bold text-green-700">{fmt(totalPemasukan)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-red-200">
            <span className="text-sm font-medium text-red-600">TOTAL PENGELUARAN</span>
            <span className="font-bold text-red-600">-{fmt(totalPengeluaran)}</span>
          </div>
          <div className={`flex justify-between items-center py-3 px-4 rounded-xl mt-2 ${labaRugi >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <span className={`text-base font-bold ${labaRugi >= 0 ? "text-green-800" : "text-red-800"}`}>
              {labaRugi >= 0 ? "💰 LABA BERSIH" : "📉 RUGI BERSIH"}
            </span>
            <span className={`text-xl font-bold ${labaRugi >= 0 ? "text-green-700" : "text-red-700"}`}>
              {fmt(Math.abs(labaRugi))}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-right">Margin operasional: {marginPct}%</p>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Pemasukan vs Pengeluaran</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}jt`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Breakdown Pengeluaran</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Belum ada data pengeluaran</div>
          )}
        </Card>
      </div>

      {/* PEMASUKAN Detail */}
      <Card className="p-4">
        <SectionHeader
          label="📥 PEMASUKAN" amount={totalPemasukan} color="text-green-700"
          collapsed={!showPemasukan} onToggle={() => setShowPemasukan(!showPemasukan)}
        />
        {showPemasukan && (
          <div className="mt-2 space-y-1">
            {pemasukan.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Belum ada pemasukan</p>
            ) : pemasukan.map(t => (
              <div key={t.id} className="flex justify-between items-center py-1.5 px-2 hover:bg-muted/30 rounded text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground">{t.date || "-"}</span>
                  <span className="truncate">{t.description || "-"}</span>
                  {t.category === "penjualan_tortoise" && <Badge variant="outline" className="text-[10px] bg-green-50">Jual</Badge>}
                </div>
                <span className="font-semibold text-green-600 ml-2 shrink-0">+{fmt(t.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* PENGELUARAN Detail */}
      <Card className="p-4">
        <SectionHeader
          label="📤 PENGELUARAN" amount={totalPengeluaran} color="text-red-600"
          collapsed={!showPengeluaran} onToggle={() => setShowPengeluaran(!showPengeluaran)}
        />
        {showPengeluaran && (
          <div className="mt-2 space-y-3">
            {Object.keys(expenseByCat).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Belum ada pengeluaran</p>
            ) : Object.entries(expenseByCat).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between items-center py-1 px-2 bg-muted/20 rounded">
                  <span className="text-sm font-medium">{categoryLabels[cat] || cat.replace(/_/g, " ")}</span>
                  <span className="text-sm font-semibold text-red-600">-{fmt(amount)}</span>
                </div>
                {/* Salary detail (hidden for investor) */}
                {cat === "gaji_karyawan" && canViewSalary && monthSlips.length > 0 && (
                  <div className="ml-4 space-y-0.5 border-l-2 border-muted pl-3">
                    {monthSlips.map(sl => (
                      <div key={sl.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{sl.employee_name}</span>
                        <span>{fmt(sl.net_total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Sales Per Tortoise */}
      {periodSales.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">🐢 Penjualan per Kura</p>
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
                {periodSales.map(s => {
                  const profit = (s.price || 0) - (s.hpp || 0);
                  const margin = s.price > 0 ? Math.round((profit / s.price) * 100) : 0;
                  return (
                    <tr key={s.id}>
                      <td className="py-2">{s.tortoise_name || "-"}</td>
                      <td className="py-2 text-muted-foreground">{s.buyer_name || "-"}</td>
                      <td className="py-2 text-right font-semibold">{fmt(s.price)}</td>
                      <td className="py-2 text-right text-muted-foreground">{fmt(s.hpp)}</td>
                      <td className={`py-2 text-right font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(profit)}</td>
                      <td className={`py-2 text-right ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-bold">
                  <td colSpan={2} className="py-2">Total</td>
                  <td className="py-2 text-right">{fmt(periodSales.reduce((s, x) => s + (x.price || 0), 0))}</td>
                  <td className="py-2 text-right">{fmt(periodSales.reduce((s, x) => s + (x.hpp || 0), 0))}</td>
                  <td className={`py-2 text-right ${periodSales.reduce((s, x) => s + ((x.price || 0) - (x.hpp || 0)), 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(periodSales.reduce((s, x) => s + ((x.price || 0) - (x.hpp || 0)), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Biaya per Ekor */}
      <Card className="p-4">
        <p className="text-sm font-semibold mb-2">📊 Biaya Perawatan</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Kura Aktif</p>
            <p className="text-lg font-bold">{costData?.activeCount || 0} ekor</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
            <p className="text-lg font-bold">{fmt(costData?.totalPengeluaran || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Biaya per Ekor/Bulan</p>
            <p className="text-lg font-bold text-primary">
              {fmt(costData?.biayaPerEkor || 0)}
              {!costData?.isDataAktual && <Badge className="ml-1 bg-amber-100 text-amber-700 text-[10px]">Estimasi</Badge>}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}