import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
// useState & useEffect diperlukan untuk phase2Ready / phase3Ready
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Package, Shell, Egg, Heart, AlertTriangle, BarChart2, Target, ChevronRight, ChevronDown, ShieldAlert, ListChecks
} from "lucide-react";
import ExcludedDataWidget from "@/components/owner/ExcludedDataWidget";
import ShoppingListWidget from "@/components/dashboard/ShoppingListWidget";
import LabaRugiWidget from "@/components/dashboard/LabaRugiWidget";
import PettyCashWidget from "@/components/pettycash/PettyCashWidget";
import IncidentalTaskCard from "@/components/dashboard/IncidentalTaskCard";
import RingkasanPagi from "@/components/dashboard/RingkasanPagi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isAfter } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ─── Helpers ───────────────────────────────────────
const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0");

function greeting(name) {
  const h = new Date().getHours();
  const salam = h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam";
  return `Selamat ${salam}, ${name || "Boss"}`;
}

function TrendBadge({ value, suffix = "" }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">sama</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{fmt(Math.abs(value))}{suffix} vs bln lalu
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color = "bg-primary/10 text-primary", href }) {
  const inner = (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-0.5 leading-tight">{value}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-4 h-4 text-primary" />}
      <h2 className="font-semibold text-sm text-foreground">{children}</h2>
    </div>
  );
}

const MONTH_NAMES_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
const PIE_COLORS = ["#4ade80", "#f87171", "#60a5fa", "#fbbf24", "#a78bfa"];

export default function OwnerDashboard({ user }) {
  // Panel analitik tertutup default: dashboard jadi ringkas,
  // dan query berat fase-3 baru dijalankan saat panel dibuka.
  const [showDetail, setShowDetail] = useState(false);
  const now = new Date();
  const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const thisMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const thisYear = now.getFullYear();
  const thisMonthKey = format(now, "yyyy-MM");

  // ── Fase 1: data kritis — dimuat segera ──────────
  const { data: finances = [] } = useQuery({
    queryKey: ["owner-finances"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 100), // turun dari 500
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["owner-tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["owner-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 50),
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: companySettings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 15 * 60 * 1000,
    refetchInterval: false,
  });

  // ── Fase 2: data sekunder — ditunda 1.5 detik ──
  const [phase2Ready, setPhase2Ready] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPhase2Ready(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const { data: breedings = [] } = useQuery({
    queryKey: ["owner-breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 50), // turun dari 200
    enabled: phase2Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: feedStocks = [] } = useQuery({
    queryKey: ["owner-feedstocks"],
    queryFn: () => base44.entities.FeedStock.list("-name", 30),
    enabled: phase2Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["owner-sales"],
    queryFn: () => base44.entities.Sale.list("-date", 50), // turun dari 200
    enabled: phase2Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["owner-health"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 50), // turun dari 200
    enabled: phase2Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: buyerProfiles = [] } = useQuery({
    queryKey: ["owner-buyers"],
    queryFn: () => base44.entities.BuyerProfile.list("-updated_date", 30),
    enabled: phase2Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: dailyChecklists = [] } = useQuery({
    queryKey: ["owner-checklists"],
    queryFn: () => base44.entities.DailyChecklist.filter({ date: format(now, "yyyy-MM-dd") }),
    enabled: phase2Ready,
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: pendingApproval = [] } = useQuery({
    queryKey: ["owner-pending-approval"],
    queryFn: () => base44.entities.DailyChecklist.filter({ status: "submitted" }, "-date", 500),
    enabled: phase2Ready,
    staleTime: 60 * 1000,
    refetchInterval: false,
  });

  // ── Fase 3: data tersier — ditunda 3 detik ─────
  const [phase3Ready, setPhase3Ready] = useState(false);
  useEffect(() => {
    if (!showDetail) return;
    const t = setTimeout(() => setPhase3Ready(true), 300);
    return () => clearTimeout(t);
  }, [showDetail]);

  const { data: annualGoals = [] } = useQuery({
    queryKey: ["owner-annual-goals"],
    queryFn: () => base44.entities.AnnualGoal.filter({ year: thisYear }),
    enabled: phase3Ready,
    staleTime: 15 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: deathRecords = [] } = useQuery({
    queryKey: ["owner-deaths"],
    queryFn: () => base44.entities.DeathRecord.list("-death_date", 30), // turun dari 100
    enabled: phase3Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: kasbons = [] } = useQuery({
    queryKey: ["owner-kasbons"],
    queryFn: () => base44.entities.Kasbon.filter({ status: "active" }),
    enabled: phase3Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: warnings = [] } = useQuery({
    queryKey: ["owner-warnings"],
    queryFn: () => base44.entities.WarningLetter.list("-created_date", 20), // turun dari 50
    enabled: phase3Ready,
    staleTime: 15 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: otLogs = [] } = useQuery({
    queryKey: ["owner-ot"],
    queryFn: () => base44.entities.OvertimeLog.list("-date", 30), // turun dari 100
    enabled: phase3Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: measurements = [] } = useQuery({
    queryKey: ["owner-measurements"],
    queryFn: () => base44.entities.MeasurementHistory.list("-date", 50), // turun dari 200
    enabled: phase3Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: enclosures = [] } = useQuery({
    queryKey: ["owner-enclosures"],
    queryFn: () => base44.entities.Enclosure.list(),
    enabled: phase3Ready,
    staleTime: 15 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["owner-suppliers"],
    queryFn: () => base44.entities.Supplier.list("-name", 20),
    enabled: phase3Ready,
    staleTime: 15 * 60 * 1000,
    refetchInterval: false,
  });

  // ── Finance Calcs ─────────────────────────────────
  const activeFinances = finances.filter(f => !f.excluded_from_reports);
  const finThisMonth = activeFinances.filter(f => f.date >= thisMonthStart && f.date <= thisMonthEnd);
  const finLastMonth = activeFinances.filter(f => f.date >= lastMonthStart && f.date <= lastMonthEnd);

  const sumIncome = (arr) => arr.filter(f => f.type === "pemasukan").reduce((s, f) => s + (f.amount || 0), 0);
  const sumExpense = (arr) => arr.filter(f => f.type === "pengeluaran").reduce((s, f) => s + (f.amount || 0), 0);

  const incomeThis = sumIncome(finThisMonth);
  const expenseThis = sumExpense(finThisMonth);
  const incomeLast = sumIncome(finLastMonth);
  const expenseLast = sumExpense(finLastMonth);
  const profit = incomeThis - expenseThis;
  const margin = incomeThis > 0 ? (profit / incomeThis * 100).toFixed(1) : "0.0";

  // ── Stock Calcs ───────────────────────────────────
  const feedValue = feedStocks.reduce((s, f) => s + (f.current_stock || 0) * (f.price_per_unit || 0), 0);
  const warehouseValue = warehouseItems.reduce((s, f) => s + (f.current_stock || 0) * (f.purchase_price || 0), 0);
  const totalStockValue = feedValue + warehouseValue;

  // ── Tortoise Calcs ────────────────────────────────
  // Hanya status "aktif", exclude is_archived (F14, B119 sudah diarsipkan dengan status "mati")
  const activeTortoises = tortoises.filter(t => t.status === "aktif" && !t.is_archived);
  const sickTortoises = tortoises.filter(t => (t.status === "sakit" || t.is_currently_sick) && !t.is_archived);
  const soldThisMonth = tortoises.filter(t => t.status === "terjual" && !t.is_archived && (t.last_status_change || "").startsWith(thisMonthKey));
  const costPerTortoise = activeTortoises.length > 0 ? Math.round(expenseThis / activeTortoises.length) : 0;

  // ── Breeding Calcs ────────────────────────────────
  const activeBreedings = breedings.filter(b => ["bertelur", "inkubasi"].includes(b.status));
  const totalEggs = activeBreedings.reduce((s, b) => s + (b.egg_count || 0), 0);
  const hatchedThisMonth = breedings
    .filter(b => (b.hatch_date || "").startsWith(thisMonthKey))
    .reduce((s, b) => s + (b.hatched_count || 0), 0);
  const eggsThisMonth = breedings
    .filter(b => (b.egg_laying_date || "").startsWith(thisMonthKey))
    .reduce((s, b) => s + (b.egg_count || 0), 0);
  const totalHatched = breedings.reduce((s, b) => s + (b.hatched_count || 0), 0);
  const totalEggsEver = breedings.reduce((s, b) => s + (b.egg_count || 0), 0);
  const successRate = totalEggsEver > 0 ? pct(totalHatched, totalEggsEver) : "0.0";
  // Best pair
  const breedingBySuccess = [...breedings].sort((a, b) =>
    (b.hatched_count || 0) - (a.hatched_count || 0)
  );
  const bestPair = breedingBySuccess[0];

  // ── Annual Goal ───────────────────────────────────
  const goal = annualGoals[0] || {};
  const ytdIncome = finances
    .filter(f => f.date?.startsWith(String(thisYear)) && f.type === "pemasukan")
    .reduce((s, f) => s + (f.amount || 0), 0);
  const ytdEggs = breedings
    .filter(b => (b.egg_laying_date || "").startsWith(String(thisYear)))
    .reduce((s, b) => s + (b.egg_count || 0), 0);

  // ── Health / Death Calcs ──────────────────────────
  const deathsThisMonth = deathRecords.filter(d => (d.death_date || "").startsWith(thisMonthKey));
  const deathsLastMonth = deathRecords.filter(d => (d.death_date || "").startsWith(format(subMonths(now, 1), "yyyy-MM")));
  const sickThisMonth = healthRecords.filter(h => h.date?.startsWith(thisMonthKey) && h.type === "sakit");
  const recoveredThisMonth = healthRecords.filter(h => h.date?.startsWith(thisMonthKey) && h.type === "checkup").length;
  const treatmentTotal = sickThisMonth.length;
  const recoveryRate = treatmentTotal > 0 ? pct(recoveredThisMonth, treatmentTotal) : "100";

  // Enclosure dengan kasus terbanyak
  const enclosureCases = {};
  sickThisMonth.forEach(h => {
    if (h.enclosure_name) enclosureCases[h.enclosure_name] = (enclosureCases[h.enclosure_name] || 0) + 1;
  });
  const problemEnclosure = Object.entries(enclosureCases).sort((a, b) => b[1] - a[1])[0];

  // ── Piutang ───────────────────────────────────────
  const debtors = buyerProfiles.filter(b => (b.remaining_balance || 0) > 0)
    .sort((a, b) => (b.remaining_balance || 0) - (a.remaining_balance || 0));
  const totalDebt = debtors.reduce((s, b) => s + (b.remaining_balance || 0), 0);

  // ── Charts ────────────────────────────────────────
  const activeSales = sales.filter(s => !s.excluded_from_reports);
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    const key = format(d, "yyyy-MM");
    const total = activeSales
      .filter(s => (s.date || s.sale_date || s.created_date || "").startsWith(key))
      .reduce((sum, s) => sum + (s.price || s.amount || 0), 0);
    return { name: MONTH_NAMES_ID[d.getMonth()], value: total };
  });

  const expenseByCategory = [
    { name: "Pakan", value: finThisMonth.filter(f => f.type === "pengeluaran" && f.category === "pakan").reduce((s, f) => s + f.amount, 0) },
    { name: "Obat", value: finThisMonth.filter(f => f.type === "pengeluaran" && f.category === "obat_perawatan").reduce((s, f) => s + f.amount, 0) },
    { name: "Gaji", value: finThisMonth.filter(f => f.type === "pengeluaran" && f.category === "gaji_karyawan").reduce((s, f) => s + f.amount, 0) },
    { name: "Operasional", value: finThisMonth.filter(f => f.type === "pengeluaran" && f.category === "operasional").reduce((s, f) => s + f.amount, 0) },
    { name: "Lainnya", value: finThisMonth.filter(f => f.type === "pengeluaran" && !["pakan","obat_perawatan","gaji_karyawan","operasional"].includes(f.category)).reduce((s, f) => s + f.amount, 0) },
  ].filter(e => e.value > 0);

  // ── Pakan Efficiency ──────────────────────────────
  const feedExpenseThis = finThisMonth.filter(f => f.type === "pengeluaran" && f.category === "pakan").reduce((s, f) => s + f.amount, 0);
  const feedExpenseLast = finLastMonth.filter(f => f.type === "pengeluaran" && f.category === "pakan").reduce((s, f) => s + f.amount, 0);
  const feedPerTortoise = activeTortoises.length > 0 ? Math.round(feedExpenseThis / activeTortoises.length) : 0;

  // ── SDM ───────────────────────────────────────────
  const settings = companySettings[0] || {};
  const nilaiPerPoin = settings.nilai_per_poin || 500;
  const targetPoin = settings.min_poin_bulanan || 300;

  // kasbon outstanding
  const activeKasbons = kasbons.filter(k => k.status === "active" || k.remaining_amount > 0);
  const totalKasbonDebt = activeKasbons.reduce((s, k) => s + (k.remaining_amount || k.amount || 0), 0);

  // SP Aktif + filtered logs
  const activeWarnings = warnings.filter(w => w.status === "aktif" || !w.status);
  const activeOtLogs = otLogs.filter(o => !o.excluded_from_reports);
  const activeMeasurements = measurements.filter(m => !m.excluded_from_reports);

  // Lembur bulan ini
  const otThis = activeOtLogs.filter(o => (o.date || "").startsWith(thisMonthKey));
  const otLast = activeOtLogs.filter(o => (o.date || "").startsWith(format(subMonths(now, 1), "yyyy-MM")));
  const totalOtHoursThis = otThis.reduce((s, o) => s + (o.hours || 0), 0);
  const totalOtHoursLast = otLast.reduce((s, o) => s + (o.hours || 0), 0);
  const totalOtPayThis = otThis.reduce((s, o) => s + (o.total_pay || 0), 0);

  // ── Supplier ──────────────────────────────────────
  const supplierExpenses = finances.filter(f => f.type === "pengeluaran" && f.date?.startsWith(thisMonthKey));
  const totalPurchaseThis = supplierExpenses.reduce((s, f) => s + (f.amount || 0), 0);

  // ── Top Kandang ───────────────────────────────────
  const enclosureStats = enclosures.map(enc => {
    const count = tortoises.filter(t => t.enclosure === enc.name && t.status === "aktif" && !t.is_archived).length;
    const sick = sickThisMonth.filter(h => h.enclosure_name === enc.name || tortoises.find(t => t.id === h.tortoise_id && t.enclosure === enc.name)).length;
    return { name: enc.name, count, sick };
  }).filter(e => e.count > 0).sort((a, b) => b.count - a.count || a.sick - b.sick).slice(0, 5);

  // ── Growth Rate ───────────────────────────────────
  const measThis = activeMeasurements.filter(m => (m.date || "").startsWith(thisMonthKey));
  const measLast = activeMeasurements.filter(m => (m.date || "").startsWith(format(subMonths(now, 1), "yyyy-MM")));
  const avgWeight = (arr) => arr.length ? Math.round(arr.reduce((s, m) => s + (m.weight_grams || 0), 0) / arr.length) : 0;
  const avgLength = (arr) => arr.length ? (arr.reduce((s, m) => s + (m.shell_length_cm || 0), 0) / arr.length).toFixed(1) : 0;
  const wThis = avgWeight(measThis), wLast = avgWeight(measLast);
  const lThis = avgLength(measThis), lLast = avgLength(measLast);

  // ── Alert Kritis ──────────────────────────────────
  const criticalAlerts = [];

  // Tortoises with status "terjual" but no Sale record
  const saleTortoiseIds = new Set(sales.map(s => s.tortoise_id).filter(Boolean));
  const terjualNoSale = tortoises.filter(t => t.status === "terjual" && !saleTortoiseIds.has(t.id));
  if (terjualNoSale.length > 0) {
    criticalAlerts.push({
      type: "red",
      msg: `${terjualNoSale.length} kura berstatus "terjual" tapi belum ada data penjualan`,
      href: "/sales",
      linkLabel: "Lengkapi →",
    });
  }

  sickTortoises.slice(0, 3).forEach(t =>
    criticalAlerts.push({ type: "red", msg: `Kura sakit: ${t.name} — ${t.enclosure || "-"}` })
  );
  warehouseItems.filter(i => i.current_stock <= 0 && i.is_mandatory)
    .forEach(i => criticalAlerts.push({ type: "red", msg: `Stok habis: ${i.name}` }));
  warehouseItems.filter(i => i.current_stock > 0 && i.current_stock < i.minimum_stock)
    .slice(0, 3).forEach(i =>
      criticalAlerts.push({ type: "yellow", msg: `Stok menipis: ${i.name} — sisa ${i.current_stock} ${i.unit}` })
    );
  warehouseItems.filter(i => {
    if (!i.expired_date) return false;
    const diff = Math.ceil((new Date(i.expired_date) - now) / 86400000);
    return diff >= 0 && diff <= 30;
  }).slice(0, 3).forEach(i => {
    const diff = Math.ceil((new Date(i.expired_date) - now) / 86400000);
    criticalAlerts.push({ type: "yellow", msg: `Obat kadaluarsa ${diff} hari: ${i.name}` });
  });
  debtors.filter(b => b.payment_due_date && isAfter(now, new Date(b.payment_due_date))).slice(0, 3)
    .forEach(b => criticalAlerts.push({ type: "yellow", msg: `Piutang jatuh tempo: ${b.buyer_name || b.full_name} — ${fmt(b.remaining_balance)}` }));
  const pendingChecklists = dailyChecklists.filter(c => c.status === "submitted").length;
  if (pendingChecklists > 0) criticalAlerts.push({ type: "yellow", msg: `${pendingChecklists} checklist belum diapprove` });

  const today = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });

  // ── Salary ranking — pakai data fase 3 ────────────
  const { data: salarySlips = [] } = useQuery({
    queryKey: ["owner-salary-slips", thisMonthKey],
    queryFn: () => base44.entities.SalarySlip.filter({ period: thisMonthKey }),
    enabled: phase3Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const employeeRanking = [...salarySlips]
    .sort((a, b) => (b.total_poin || 0) - (a.total_poin || 0))
    .slice(0, 3)
    .map((s, i) => ({
      rank: i + 1,
      name: s.employee_name,
      poin: s.total_poin || 0,
      achieved: (s.total_poin || 0) >= targetPoin,
      diff: targetPoin - (s.total_poin || 0),
    }));

  const rankEmoji = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground font-heading">{greeting(user?.full_name)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>
        <Link to="/finance"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <BarChart2 className="w-4 h-4" /> Lihat Laporan Lengkap
        </Link>
      </div>

      {/* ── RINGKASAN PAGI ── */}
      <RingkasanPagi />

      {/* ── EXCLUDED DATA WIDGET ── */}
      <ExcludedDataWidget />

      {/* ── WIDGET CHECKLIST MENUNGGU APPROVAL ── */}
      {phase2Ready && (
        <Link
          to="/approval-poin"
          className="block bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-amber-800">
                Checklist menunggu approval: {pendingApproval.length}
              </p>
              <p className="text-xs text-amber-700">
                {pendingApproval.length > 0
                  ? "Klik untuk meninjau & menyetujui poin karyawan →"
                  : "✓ Tidak ada checklist menunggu persetujuan"}
              </p>
              <Link
                to="/layar-tim"
                onClick={(e) => e.stopPropagation()}
                className="inline-block mt-1 text-xs font-medium text-amber-900 underline hover:no-underline"
              >
                Periksa dulu di Layar Tim — urutan kerja, jeda waktu & bukti foto →
              </Link>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-700 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* ── TUGAS INSIDENTIL ── */}
      <IncidentalTaskCard />

      {/* ── ROW 1: KESEHATAN FINANSIAL ── */}
      <div>
        <SectionTitle icon={DollarSign}>Kesehatan Finansial Bulan Ini</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={TrendingUp} label="Pemasukan" color="bg-green-100 text-green-700" href="/finance"
            value={fmt(incomeThis)}
            sub={<TrendBadge value={incomeThis - incomeLast} />}
          />
          <KpiCard icon={TrendingDown} label="Pengeluaran" color="bg-red-100 text-red-600" href="/finance"
            value={fmt(expenseThis)}
            sub={<TrendBadge value={expenseThis - expenseLast} />}
          />
          <KpiCard icon={DollarSign} label="Laba/Rugi Bersih" href="/finance"
            color={profit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}
            value={<span className={profit >= 0 ? "text-green-700" : "text-red-600"}>{fmt(profit)}</span>}
          />
          <KpiCard icon={Percent} label="Margin" color="bg-blue-100 text-blue-700" href="/finance"
            value={<span className={Number(margin) >= 0 ? "text-green-700" : "text-red-600"}>{margin}%</span>}
            sub={<span className="text-xs text-muted-foreground">Laba ÷ Pemasukan</span>}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PettyCashWidget />
        </div>
      </div>

      {/* ── ROW 13: ALERT KRITIS ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <SectionTitle icon={AlertTriangle}>Perlu Perhatianmu</SectionTitle>
        {criticalAlerts.length === 0 ? (
          <p className="text-sm text-green-600 font-medium">✓ Semua kondisi normal hari ini</p>
        ) : (
          <div className="space-y-2">
            {criticalAlerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg ${a.type === "red" ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"}`}>
                <span className="text-base mt-0.5">{a.type === "red" ? "🔴" : "🟡"}</span>
                <span className={`text-sm flex-1 ${a.type === "red" ? "text-red-800" : "text-amber-800"}`}>
                  {a.msg}
                  {a.href && (
                    <Link to={a.href} className="ml-2 text-primary font-medium underline hover:no-underline text-xs">
                      {a.linkLabel || "Lihat →"}
                    </Link>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ── DAFTAR BELANJA ── */}
      <ShoppingListWidget />

      {/* == ANALISIS MENDALAM (tertutup secara default) == */}
      <button
        onClick={() => setShowDetail(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart2 className="w-4 h-4 text-primary" />
          Analisis Mendalam
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {showDetail ? "Tutup" : "Modal, breeding, kesehatan, piutang, target, SDM"}
          <ChevronDown className={showDetail ? "w-4 h-4 rotate-180 transition-transform" : "w-4 h-4 transition-transform"} />
        </span>
      </button>

      {showDetail && (
        <div className="space-y-6 animate-fade-in">
      {/* ── WIDGET LABA RUGI REALTIME ── */}
      <LabaRugiWidget />

      {/* ── ROW 2: NILAI & MODAL ── */}
      <div>
        <SectionTitle icon={Package}>Nilai & Modal Bisnis</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard icon={Package} label="Nilai Stok Total" href="/dashboard-stok"
            color="bg-amber-100 text-amber-700"
            value={fmt(totalStockValue)}
            sub={<span className="text-xs text-muted-foreground">Pakan {fmt(feedValue)} + Gudang {fmt(warehouseValue)}</span>}
          />
          <KpiCard icon={Shell} label="Biaya per Ekor/Bulan" href="/tortoise"
            color="bg-primary/10 text-primary"
            value={fmt(costPerTortoise)}
            sub={<span className="text-xs text-muted-foreground">dari {activeTortoises.length} kura aktif</span>}
          />
          <KpiCard icon={Package} label="Nilai Stok Gudang" href="/warehouse"
            color="bg-violet-100 text-violet-700"
            value={fmt(warehouseValue)}
            sub={<span className="text-xs text-muted-foreground">obat, vitamin, alat</span>}
          />
        </div>
      </div>

      {/* ── WIDGET PENJUALAN BULAN INI ── */}
      {phase2Ready && (
        <div className="bg-card rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={DollarSign}>🐢 Penjualan Bulan Ini</SectionTitle>
            <Link to="/sales" className="text-xs text-primary hover:underline flex items-center gap-1">Lihat Semua <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {(() => {
            const salesThisMonth = sales.filter(s => (s.sale_date || "").startsWith(thisMonthKey) && !s.excluded_from_reports);
            const revenueThisMonth = salesThisMonth.reduce((s, x) => s + (x.price || 0), 0);
            const labaThisMonth = salesThisMonth.filter(x => x.hpp > 0).reduce((s, x) => s + ((x.price||0) - (x.hpp||0)), 0);
            const salesWithHpp = salesThisMonth.filter(x => x.hpp > 0 && x.price > 0);
            const avgMargin = salesWithHpp.length > 0
              ? Math.round(salesWithHpp.reduce((s, x) => s + ((x.price - x.hpp) / x.price * 100), 0) / salesWithHpp.length)
              : 0;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Ekor Terjual</p>
                  <p className="text-xl font-bold text-green-700">{salesThisMonth.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Pemasukan</p>
                  <p className="text-base font-bold text-green-700">{fmt(revenueThisMonth)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Laba</p>
                  <p className={`text-base font-bold ${labaThisMonth >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(labaThisMonth)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Margin Rata-rata</p>
                  <p className="text-xl font-bold text-green-700">{avgMargin}%</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── ROW 3: POPULASI & BREEDING ── */}
      <div>
        <SectionTitle icon={Shell}>Populasi & Breeding</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard icon={Shell} label="Total Kura" href="/tortoise"
            color="bg-primary/10 text-primary"
            value={<span>{activeTortoises.length} aktif</span>}
            sub={
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <div>{sickTortoises.length} dalam treatment</div>
                <div>{soldThisMonth.length} terjual bulan ini</div>
              </div>
            }
          />
          <KpiCard icon={Egg} label="Breeding Performance" href="/breeding"
            color="bg-accent/10 text-accent"
            value={`${activeBreedings.length} pasang aktif`}
            sub={
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <div>{totalEggs} total telur inkubasi</div>
                <div>Menetas bln ini: {hatchedThisMonth}/{eggsThisMonth}</div>
                <div>Success rate: {successRate}%</div>
                {bestPair && <div className="font-medium text-foreground">Terbaik: {bestPair.female_name} × {bestPair.male_name}</div>}
              </div>
            }
          />
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Target Telur Tahunan</p>
            <p className="text-xl font-bold">{ytdEggs} <span className="text-sm font-normal text-muted-foreground">/ {goal.egg_production_target || 0}</span></p>
            <div className="w-full h-2 bg-muted rounded-full mt-3">
              <div className="h-2 bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, goal.egg_production_target ? ytdEggs / goal.egg_production_target * 100 : 0)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{goal.egg_production_target ? pct(ytdEggs, goal.egg_production_target) : 0}% dari target</p>
          </div>
        </div>
      </div>

      {/* ── ROW 4: KESEHATAN POPULASI ── */}
      <div>
        <SectionTitle icon={Heart}>Kesehatan Populasi Bulan Ini</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={Heart} label="Kematian Bulan Ini"
            color={deathsThisMonth.length > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}
            href="/death-records"
            value={deathsThisMonth.length}
            sub={<TrendBadge value={deathsThisMonth.length - deathsLastMonth.length} />}
          />
          <KpiCard icon={AlertTriangle} label="Pernah Sakit Bln Ini"
            color="bg-orange-100 text-orange-600"
            value={sickThisMonth.length}
            sub={<span className="text-xs text-muted-foreground">kura dilaporkan sakit</span>}
          />
          <KpiCard icon={TrendingUp} label="Recovery Rate"
            color="bg-green-100 text-green-700"
            value={`${recoveryRate}%`}
            sub={<span className="text-xs text-muted-foreground">selesai ÷ total treatment</span>}
          />
          <KpiCard icon={AlertTriangle} label="Kandang Bermasalah"
            color="bg-amber-100 text-amber-700"
            href="/enclosure"
            value={problemEnclosure ? problemEnclosure[0] : "—"}
            sub={problemEnclosure ? <span className="text-xs text-muted-foreground">{problemEnclosure[1]} kasus</span> : <span className="text-xs text-muted-foreground">Tidak ada</span>}
          />
        </div>
      </div>

      {/* ── ROW 5: PIUTANG ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={DollarSign}>Piutang Belum Lunas</SectionTitle>
          <Link to="/crm" className="text-xs text-primary hover:underline flex items-center gap-1">
            Lihat Semua <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {debtors.length === 0 ? (
          <p className="text-sm text-green-600 font-medium">✓ Tidak ada piutang</p>
        ) : (
          <>
            <p className="text-sm font-semibold mb-3">{fmt(totalDebt)} dari {debtors.length} pembeli</p>
            <div className="space-y-2">
              {debtors.slice(0, 5).map(b => {
                const overdue = b.payment_due_date && isAfter(now, new Date(b.payment_due_date));
                return (
                  <div key={b.id} className={`flex items-center justify-between p-2.5 rounded-lg ${overdue ? "bg-red-50 border border-red-200" : "bg-muted/40"}`}>
                    <div>
                      <p className={`text-sm font-medium ${overdue ? "text-red-700" : ""}`}>{b.buyer_name || b.full_name}</p>
                      {b.payment_due_date && <p className="text-xs text-muted-foreground">Jatuh tempo: {format(new Date(b.payment_due_date), "d MMM yyyy", { locale: idLocale })}</p>}
                    </div>
                    <p className={`text-sm font-semibold ${overdue ? "text-red-600" : ""}`}>{fmt(b.remaining_balance)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── ROW 6: TARGET TAHUNAN ── */}
      {(goal.revenue_target > 0 || goal.egg_production_target > 0) && (
        <div className="bg-card rounded-xl border border-border p-4">
          <SectionTitle icon={Target}>Progress Target {thisYear}</SectionTitle>
          <div className="space-y-4">
            {goal.revenue_target > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Revenue</span>
                  <span className="font-medium">{fmt(ytdIncome)} / {fmt(goal.revenue_target)}</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full">
                  <div className="h-2.5 bg-primary rounded-full" style={{ width: `${Math.min(100, ytdIncome / goal.revenue_target * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct(ytdIncome, goal.revenue_target)}%</p>
              </div>
            )}
            {goal.egg_production_target > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Telur</span>
                  <span className="font-medium">{ytdEggs} / {goal.egg_production_target}</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full">
                  <div className="h-2.5 bg-accent rounded-full" style={{ width: `${Math.min(100, ytdEggs / goal.egg_production_target * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct(ytdEggs, goal.egg_production_target)}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ROW 7: GRAFIK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-3">Penjualan 6 Bulan Terakhir</p>
          {last6Months.some(m => m.value > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={last6Months}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Belum ada data penjualan</div>
          )}
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-3">Pengeluaran per Kategori</p>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Belum ada data pengeluaran</div>
          )}
        </div>
      </div>

      {/* ── ROW 8: EFISIENSI PAKAN ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <SectionTitle icon={Package}>Efisiensi Pakan</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Biaya pakan bulan ini</p>
            <p className="text-lg font-bold">{fmt(feedExpenseThis)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Per ekor per bulan</p>
            <p className="text-lg font-bold">{fmt(feedPerTortoise)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trend vs bln lalu</p>
            <TrendBadge value={feedExpenseThis - feedExpenseLast} />
          </div>
        </div>
      </div>

      {/* ── ROW 9: SDM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ranking Karyawan */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Kinerja Karyawan — {format(now, "MMMM", { locale: idLocale })}</p>
            <Link to="/salary" className="text-xs text-primary hover:underline">Lihat Semua →</Link>
          </div>
          {employeeRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data poin bulan ini</p>
          ) : (
            <div className="space-y-2">
              {employeeRanking.map((e) => (
                <div key={e.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rankEmoji[e.rank - 1]}</span>
                    <span className="text-sm font-medium">{e.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{e.poin} poin</span>
                    {e.achieved
                      ? <span className="text-xs text-green-600 font-medium">✓ Target</span>
                      : <span className="text-xs text-red-500">✗ Kurang {e.diff}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kasbon + Lembur */}
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-semibold mb-2">Kasbon Outstanding</p>
            {activeKasbons.length === 0 ? (
              <p className="text-sm text-green-600">✓ Tidak ada kasbon aktif</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">Total: {fmt(totalKasbonDebt)} dari {activeKasbons.length} karyawan</p>
                <div className="space-y-1.5">
                  {activeKasbons.slice(0, 3).map(k => (
                    <div key={k.id} className="flex justify-between text-xs">
                      <span>{k.employee_name}</span>
                      <span className="font-medium">{fmt(k.remaining_amount || k.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-semibold mb-1">Lembur Bulan Ini</p>
            <p className="text-lg font-bold">{totalOtHoursThis} jam — {fmt(totalOtPayThis)}</p>
            <TrendBadge value={totalOtHoursThis - totalOtHoursLast} suffix=" jam" />
          </div>
        </div>
      </div>

      {/* SP Aktif */}
      <div className="bg-card rounded-xl border border-border p-4">
        <SectionTitle icon={ShieldAlert}>Surat Peringatan Aktif</SectionTitle>
        {activeWarnings.length === 0 ? (
          <p className="text-sm text-green-600">✓ Tidak ada SP aktif</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{activeWarnings.length} karyawan dalam masa SP</p>
            {activeWarnings.slice(0, 5).map(w => (
              <div key={w.id} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-medium text-red-800">{w.employee_name}</p>
                  <p className="text-xs text-red-600">{w.reason || "—"}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-red-700">SP{w.level || w.warning_level}</span>
                  <p className="text-xs text-muted-foreground">{w.date || w.issued_date || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ROW 10: TOP KANDANG ── */}
      {enclosureStats.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={Shell}>Top Kandang</SectionTitle>
            <Link to="/enclosure" className="text-xs text-primary hover:underline">Lihat Semua</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left pb-2 font-medium">Kandang</th>
                  <th className="text-center pb-2 font-medium">Kura</th>
                  <th className="text-center pb-2 font-medium">Sakit/Bln</th>
                  <th className="text-right pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {enclosureStats.map((e, i) => (
                  <tr key={e.name}>
                    <td className="py-2 font-medium">{e.name}</td>
                    <td className="py-2 text-center">{e.count}</td>
                    <td className="py-2 text-center">{e.sick}</td>
                    <td className="py-2 text-right">
                      {i === 0 && e.sick === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">Terbaik</span>
                      ) : e.sick > 2 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-medium">Perlu Perhatian</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ROW 11: GROWTH RATE ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <SectionTitle icon={TrendingUp}>Pertumbuhan Rata-rata Bulan Ini</SectionTitle>
        {measThis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data pengukuran bulan ini</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Berat rata-rata</p>
              <p className="text-lg font-bold">{wThis} gram</p>
              {wLast > 0 && <TrendBadge value={wThis - wLast} suffix=" gram" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Panjang rata-rata</p>
              <p className="text-lg font-bold">{lThis} cm</p>
              {lLast > 0 && <TrendBadge value={Number(lThis) - Number(lLast)} suffix=" cm" />}
            </div>
          </div>
        )}
      </div>

      {/* ── ROW 12: SUPPLIER ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Pembelian dari Pemasok</SectionTitle>
          <Link to="/supplier" className="text-xs text-primary hover:underline flex items-center gap-1">Lihat Daftar <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <p className="text-sm font-semibold mb-2">Total pembelian bulan ini: {fmt(totalPurchaseThis)}</p>
        <div className="space-y-1.5">
          {suppliers.slice(0, 3).map(s => {
            const lastTx = finances.filter(f => f.description?.includes(s.name) || f.reference_id === s.id).sort((a, b) => b.date?.localeCompare(a.date)).shift();
            const dayAgo = lastTx ? Math.floor((now - new Date(lastTx.date)) / 86400000) : null;
            return (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{s.name}</span>
                <span>{dayAgo !== null ? `${dayAgo === 0 ? "Hari ini" : `${dayAgo} hari lalu`}` : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

        </div>
      )}

    </div>
  );
}