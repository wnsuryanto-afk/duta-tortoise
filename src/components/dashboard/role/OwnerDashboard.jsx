import { useQuery } from "@tanstack/react-query";
import MonthlySalesSummary from "@/components/dashboard/MonthlySalesSummary";
import AttendanceChartCard from "@/components/dashboard/AttendanceChartCard";
import AnnualGoalWidget from "@/components/dashboard/AnnualGoalWidget";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
// useState & useEffect diperlukan untuk phase2Ready / phase3Ready
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Package, Shell, Egg, Heart, AlertTriangle, BarChart2, ChevronRight, ChevronDown, ShieldAlert, ListChecks, StickyNote
} from "lucide-react";
import ExcludedDataWidget from "@/components/owner/ExcludedDataWidget";
import ShoppingListWidget from "@/components/dashboard/ShoppingListWidget";
import PettyCashWidget from "@/components/pettycash/PettyCashWidget";
import IncidentalTaskCard from "@/components/dashboard/IncidentalTaskCard";
import DiseaseClusterWarningCard from "@/components/dashboard/DiseaseClusterWarningCard";
import RingkasanPagi from "@/components/dashboard/RingkasanPagi";
import SopTerkunciCard from "@/components/dashboard/SopTerkunciCard";
import KuraPerluDiperiksaCard from "@/components/dashboard/KuraPerluDiperiksaCard";
import PoinBonusTim from "@/components/dashboard/PoinBonusTim";
import KepatuhanSopCard from "@/components/dashboard/KepatuhanSopCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import PageHeader from "@/components/common/PageHeader";
import NoteCard from "@/components/common/NoteCard";
import InfoHint from "@/components/ui/info-hint";
import { Sparkline } from "@/components/ui/sparkline";
import { TortoiseArt } from "@/components/common/Illustration";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ringkasProduksi } from "@/lib/hasilInkubasi";
import { diPeternakan } from "@/lib/populasiKura";
import { cariKandang } from "@/lib/kandang";
import { masukLaporan } from "@/lib/laporan";
import { piutangPerPembeli } from "@/lib/piutang";
import { suratAktif } from "@/lib/suratPeringatan";
import { periksaStok } from "@/lib/stokMenipis";
import GrafikUang from "@/components/ui/grafik-uang";

// ─── Helpers ───────────────────────────────────────
const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0");

function greeting(name) {
  const h = new Date().getHours();
  const salam = h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam";
  return `Selamat ${salam}, ${name || "Boss"}`;
}

/**
 * Selisih terhadap bulan lalu, dalam rupiah.
 * TrendPill bawaan menampilkan persentase; di sini nominal lebih berguna
 * karena owner membandingkan angka rupiah, bukan rasio.
 */
/**
 * TrendBadge — perubahan terhadap bulan lalu.
 *
 * Warnanya dulu ditentukan oleh TANDA angkanya saja: naik hijau, turun merah.
 * Untuk pemasukan dan pertambahan berat itu benar; untuk pengeluaran, biaya
 * pakan, jam lembur, dan KEMATIAN KURA itu terbalik — kematian bertambah tiga
 * ekor ditampilkan hijau dengan panah naik, seolah kabar baik.
 *
 * `naikItuBaik` memisahkan arah dari maknanya. Bawaannya true karena sebagian
 * besar pemakaian memang begitu, dan yang sebaliknya menyebutkannya tegas.
 */
const BATAS_ALERT = 5;

/** Berapa banyak surat peringatan yang ditampilkan sebelum diringkas. */
const BATAS_SP = 5;

/**
 * Alasan sebuah surat peringatan, apa adanya dari skemanya.
 *
 * Skema WarningLetter menyimpan alasan di `reasons` (daftar) dan keterangan
 * tambahan di `description`. Widget ini dulu membaca `w.reason` — tunggal,
 * dan tidak ada di skema — sehingga alasannya selalu tercetak "—".
 */
function alasanSurat(surat) {
  const daftar = Array.isArray(surat?.reasons) ? surat.reasons.filter(Boolean) : [];
  if (daftar.length) return daftar.join(", ");
  return surat?.description || "—";
}

function TrendBadge({ value, suffix = "", naikItuBaik = true }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">sama</span>;
  const naik = value > 0;
  const up = naik === naikItuBaik;
  return (
    // "vs bln lalu" dulu ikut di dalam lencana yang sama, sehingga di kolom
    // sempit lencananya pecah jadi dua baris dengan "vs bln" menggantung
    // sendirian. Keterangannya dipindah ke luar sebagai baris tersendiri.
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${up ? "bg-accent/12 text-accent" : "bg-destructive/12 text-destructive"}`}>
        {/* Ikon mengikuti ARAH angkanya; warna mengikuti BAIK-BURUKNYA. */}
        {naik ? <TrendingUp className="w-3 h-3 flex-shrink-0" /> : <TrendingDown className="w-3 h-3 flex-shrink-0" />}
        {naik ? "+" : "−"}{fmt(Math.abs(value))}{suffix}
      </span>
      <span className="text-[10px] text-muted-foreground">vs bulan lalu</span>
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color = "bg-primary/10 text-primary", href, spark, hint, big = false }) {
  const inner = (
    <div className="surface-raised hover-lift group relative overflow-hidden p-4 h-full flex flex-col cursor-pointer">
      {/* Sapuan warna di sudut — memberi kedalaman tanpa menambah garis */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-[0.13] group-hover:opacity-25 transition-opacity ${color.split(" ").find(c => c.startsWith("bg-")) || "bg-primary"}`} />
      <div className="relative flex items-start justify-between gap-2">
        <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {href && (
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all" />
        )}
      </div>
      <p className="relative mt-3 text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {hint && <InfoHint title={label} size={12}>{hint}</InfoHint>}
      </p>
      <p className={`relative stat-value text-foreground mt-0.5 ${big ? "text-2xl" : "text-xl"}`}>{value}</p>
      <div className="relative flex items-end justify-between gap-2 mt-auto pt-1.5">
        {sub ? <div className="min-w-0">{sub}</div> : <span />}
        {spark}
      </div>
    </div>
  );
  if (href) return <Link to={href} className="block h-full">{inner}</Link>;
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
  const [alertSemua, setAlertSemua] = useState(false);
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
    queryFn: () => base44.entities.WarehouseItem.list("-name", 500),
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
    queryFn: () => base44.entities.FeedStock.list("-name", 300),
    enabled: phase2Ready,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["owner-sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 50), // turun dari 200
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
  const activeFinances = finances.filter(masukLaporan);
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

  // Deret 7 hari terakhir untuk sparkline. Dihitung dari transaksi yang sudah
  // ditarik di layar ini — tidak ada query tambahan ke server.
  const deret7Hari = (() => {
    const hari = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      hari.push(d.toISOString().slice(0, 10));
    }
    const masuk = [], keluar = [], laba = [];
    hari.forEach((tgl) => {
      const hariIni = activeFinances.filter((f) => (f.date || "").slice(0, 10) === tgl);
      const m = hariIni.filter((f) => f.type === "pemasukan").reduce((t, f) => t + (f.amount || 0), 0);
      const k = hariIni.filter((f) => f.type === "pengeluaran").reduce((t, f) => t + (f.amount || 0), 0);
      masuk.push(m);
      keluar.push(k);
      laba.push(m - k);
    });
    return { masuk, keluar, laba };
  })();

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
  // Telur yang MASIH dierami tidak boleh masuk penyebut. Versi lama membagi
  // seluruh tetasan dengan SELURUH telur yang pernah tercatat, sehingga setiap
  // butir yang belum selesai dierami terhitung sebagai gagal — dengan puluhan
  // induk yang bertelur rutin, angka keberhasilan jadi jauh lebih rendah dari
  // kenyataannya, dan makin banyak yang sedang dierami makin buruk kelihatannya.
  const produksi = ringkasProduksi(breedings);
  const totalHatched = produksi.totalMenetas;
  const successRate = produksi.hatchRate.toFixed(1);
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
  const recoveredThisMonth = healthRecords.filter(h => h.date?.startsWith(thisMonthKey) && h.type === "sembuh").length;
  const treatmentTotal = sickThisMonth.length;
  const recoveryRate = treatmentTotal > 0 ? pct(recoveredThisMonth, treatmentTotal) : "100";

  // Enclosure dengan kasus terbanyak
  const enclosureCases = {};
  const kandangKura = new Map(tortoises.map(t => [t.id, t.enclosure]));
  sickThisMonth.forEach(h => {
    const kandang = kandangKura.get(h.tortoise_id);
    if (kandang) enclosureCases[kandang] = (enclosureCases[kandang] || 0) + 1;
  });
  const problemEnclosure = Object.entries(enclosureCases).sort((a, b) => b[1] - a[1])[0];

  // ── Piutang ───────────────────────────────────────
  //
  // Dihitung dari PENJUALAN, bukan dari BuyerProfile. Versi lama membaca
  // `remaining_balance` dari BuyerProfile — field yang tidak ada di sana —
  // sehingga daftar penunggak selalu kosong dan total piutang selalu Rp 0,
  // berapa pun uang yang sebenarnya belum masuk. Tidak ada pesan galat; bagian
  // ini hanya diam.
  const piutang = piutangPerPembeli(sales.filter(masukLaporan));
  const debtors = piutang.daftar;
  const totalDebt = piutang.total;

  // ── Charts ────────────────────────────────────────
  const activeSales = sales.filter(masukLaporan);
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    const key = format(d, "yyyy-MM");
    const total = activeSales
      .filter(s => (s.date || s.sale_date || s.created_date || "").startsWith(key))
      .reduce((sum, s) => sum + (s.price || s.amount || 0), 0);
    return { name: MONTH_NAMES_ID[d.getMonth()], value: total };
  });

  // Deret uang masuk DAN keluar per bulan. Sebelumnya hanya pemasukan yang
  // digambar, jadi grafiknya tidak pernah bisa menjawab pertanyaan yang
  // sebenarnya ditanyakan pemilik: bulan mana yang untung.
  const arusKas6Bulan = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    const key = format(d, "yyyy-MM");
    const bulanIni = activeFinances.filter(f => (f.date || "").startsWith(key));
    return {
      label: MONTH_NAMES_ID[d.getMonth()],
      masuk: bulanIni.filter(f => f.type === "pemasukan").reduce((s, f) => s + (f.amount || 0), 0),
      keluar: bulanIni.filter(f => f.type === "pengeluaran").reduce((s, f) => s + (f.amount || 0), 0),
    };
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
  const nilaiPerPoin = settings.nilai_per_poin || 0;
  const targetPoin = settings.min_poin_bulanan || 300;

  // kasbon outstanding
  const activeKasbons = kasbons.filter(k => k.status === "active" || k.remaining_amount > 0);
  // Skema Kasbon tidak menyimpan remaining_amount — sisa dihitung dari
  // amount dikurangi total_paid, agar cicilan yang sudah berjalan ikut terhitung.
  const sisaKasbon = (k) => Math.max(0, (k.amount || 0) - (k.total_paid || 0));
  const totalKasbonDebt = activeKasbons.reduce((s, k) => s + sisaKasbon(k), 0);

  // SP Aktif + filtered logs.
  // Masa berlakunya dihitung dari tanggal surat lewat suratAktif(), sama
  // persis dengan yang dipakai layar Detail Karyawan.
  const activeWarnings = suratAktif(warnings);
  // Surat yang berlaku bisa lebih banyak daripada orangnya.
  const jumlahKaryawanSP = new Set(
    activeWarnings.map(w => w.employee_email || w.employee_id || w.employee_name)
  ).size;
  const activeOtLogs = otLogs.filter(masukLaporan);
  const activeMeasurements = measurements.filter(masukLaporan);

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
    // Seluruh penghuni, bukan hanya yang berstatus "aktif": kura sakit,
    // breeding, dan karantina tetap menempati kandangnya. Menghitung "aktif"
    // saja membuat kandang yang sudah penuh terlihat lapang — persis saat
    // pemilik memutuskan ke mana kura berikutnya dipindahkan. Pencocokannya
    // lewat nomor kandang, bukan nama, agar tidak lepas saat kandang diganti nama.
    const count = tortoises.filter(
      (t) => diPeternakan(t) && cariKandang(t, enclosures).kandang?.id === enc.id
    ).length;
    const sick = sickThisMonth.filter(h => kandangKura.get(h.tortoise_id) === enc.name).length;
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

  // Kematian tercatat tapi status kura belum "mati" — pernah terjadi pada HF5
  // dan B119: tanggal & penyebab kematian terisi, tapi kura tetap dihitung
  // sebagai populasi aktif dan tetap muncul di daftar sakit.
  const deathMismatch = tortoises.filter(t => t.death_date && t.status !== "mati");
  if (deathMismatch.length > 0) {
    criticalAlerts.push({
      type: "red",
      msg: `${deathMismatch.length} kura punya tanggal kematian tapi statusnya belum "mati" ` +
        `(${deathMismatch.slice(0, 3).map(t => t.name).join(", ")}${deathMismatch.length > 3 ? ", …" : ""}). ` +
        `Mereka masih terhitung populasi aktif.`,
      href: "/death-records",
      linkLabel: "Perbaiki →",
    });
  }

  // Duplikat CompanySettings dengan setting_key "main" berbahaya:
  // kode memakai [0] secara sembarang, sehingga nilai_per_poin dan koordinat
  // kandang bisa berbeda-beda antar sesi tanpa disadari.
  if (companySettings.length > 1) {
    const poinValues = [...new Set(companySettings.map(c => c.nilai_per_poin).filter(v => v != null))];
    criticalAlerts.push({
      type: "red",
      msg: `Ada ${companySettings.length} record Pengaturan Perusahaan berlabel "main"` +
        (poinValues.length > 1 ? ` dengan nilai per poin berbeda (${poinValues.join(" vs ")}). Perhitungan gaji tidak dapat dipercaya sampai ini disatukan.` : ". Satukan agar pengaturan konsisten."),
      href: "/system-maintenance",
      linkLabel: "Perbaiki →",
    });
  }

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
  // Pakan ikut diperiksa di sini. Sebelumnya hanya barang gudang yang masuk
  // daftar peringatan, sehingga pakan yang habis tidak memunculkan apa pun.
  //
  // Bahan yang memang tidak dilacak (is_active=false) sudah disaring di
  // lib/stokMenipis.js, jadi stok pakan yang sengaja dinolkan tidak lagi
  // memunculkan "Stok habis" setiap hari. Penyaringnya memakai penanda yang
  // DISETEL pemilik, bukan tebakan dari riwayat pergerakan: gudang direstok
  // dengan menyunting angkanya langsung tanpa membuat catatan pergerakan, jadi
  // menebak dari riwayat akan membungkam peringatan obat yang benar-benar habis.
  const stokPerlu = periksaStok(warehouseItems, feedStocks, now);
  stokPerlu.habis.forEach(i =>
    criticalAlerts.push({ type: "red", msg: `Stok habis: ${i.name}${i._sumber === "pakan" ? " (pakan)" : ""}` })
  );
  stokPerlu.menipis
    .slice(0, 3).forEach(i =>
      criticalAlerts.push({ type: "yellow", msg: `Stok menipis: ${i.name} — sisa ${i.current_stock} ${i.unit}` })
    );
  stokPerlu.kadaluarsa.slice(0, 3).forEach(i => {
    const diff = Math.ceil((new Date(i.expired_date) - now) / 86400000);
    criticalAlerts.push({ type: "yellow", msg: `Obat kadaluarsa ${diff} hari: ${i.name}` });
  });
  // `payment_due_date` tidak ada di entitas mana pun di seluruh aplikasi, jadi
  // "jatuh tempo" tidak pernah bisa dihitung. Umur piutang bisa — dan itu yang
  // menentukan mana yang perlu ditagih lebih dulu.
  debtors.filter(b => b.terlamaHari >= 30).slice(0, 3)
    .forEach(b => criticalAlerts.push({
      type: "yellow",
      msg: `Piutang ${b.terlamaHari} hari: ${b.nama} — ${fmt(b.sisa)}`,
    }));
  const pendingChecklists = dailyChecklists.filter(c => c.status === "submitted").length;
  if (pendingChecklists > 0) criticalAlerts.push({ type: "yellow", msg: `${pendingChecklists} checklist belum diapprove` });

  // Daftar ini tidak pernah dibatasi: sebelas peringatan berarti sebelas kotak
  // selebar layar, dan di peternakan dengan dua puluh kura sakit bisa menjadi
  // ribuan piksel kotak merah yang harus digulir sebelum sampai ke bagian
  // berikutnya. Yang merah selalu didahulukan dan selalu terlihat; sisanya
  // tinggal satu klik, tidak ada yang disembunyikan.
  const alertUrut = [...criticalAlerts].sort((a, b) =>
    (a.type === "red" ? 0 : 1) - (b.type === "red" ? 0 : 1)
  );
  const alertSisa = alertSemua ? 0 : Math.max(0, alertUrut.length - BATAS_ALERT);
  const alertTampil = alertSemua ? alertUrut : alertUrut.slice(0, BATAS_ALERT);

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

  /**
   * Catatan otomatis — menerjemahkan angka di dashboard menjadi kalimat.
   *
   * Grafik memberi tahu *apa* yang terjadi, tapi tidak *apa artinya*. Tiap
   * catatan hanya muncul bila ambangnya benar-benar terlampaui; kalau semua
   * sehat, panelnya tidak ditampilkan sama sekali daripada memaksakan
   * kalimat kosong yang lama-lama tidak dibaca siapa pun.
   */
  const catatan = [];

  if (incomeThis > 0 && Number(margin) < 15) {
    catatan.push({
      tone: "warning",
      title: `Margin bulan ini tipis — ${margin}%`,
      body: `Dari pemasukan ${fmt(incomeThis)}, laba bersih tinggal ${fmt(profit)}. Periksa pengeluaran terbesar bulan ini sebelum menambah pembelian baru.`,
    });
  } else if (incomeThis > 0 && Number(margin) >= 30) {
    catatan.push({
      tone: "success",
      title: `Margin sehat — ${margin}%`,
      body: `Laba bersih ${fmt(profit)} dari pemasukan ${fmt(incomeThis)}. Pola bulan ini layak dipertahankan.`,
    });
  }

  if (expenseLast > 0 && expenseThis > expenseLast * 1.25) {
    catatan.push({
      tone: "warning",
      title: "Pengeluaran naik tajam",
      body: `Bulan ini ${fmt(expenseThis)}, naik ${Math.round(((expenseThis - expenseLast) / expenseLast) * 100)}% dari ${fmt(expenseLast)} bulan lalu. Buka rincian kategori untuk melihat penyebabnya.`,
    });
  }

  if (sickTortoises.length > 0 && activeTortoises.length > 0) {
    const rasio = Math.round((sickTortoises.length / activeTortoises.length) * 100);
    catatan.push({
      tone: rasio >= 10 ? "warning" : "info",
      title: `${sickTortoises.length} kura sedang sakit (${rasio}% populasi)`,
      body: problemEnclosure
        ? `Kasus terbanyak di kandang ${problemEnclosure[0]} (${problemEnclosure[1]} kasus bulan ini). Periksa kebersihan dan suhu kandang tersebut.`
        : "Pastikan tiap kura sakit punya jadwal perawatan yang berjalan.",
    });
  }

  if (totalDebt > 0) {
    catatan.push({
      tone: "info",
      title: `Piutang belum tertagih ${fmt(totalDebt)}`,
      body: `Tersebar di ${debtors.length} pembeli. Uang ini sudah dihitung sebagai penjualan tapi belum masuk kas.`,
    });
  }

  if (eggsThisMonth > 0) {
    catatan.push({
      tone: "info",
      title: `${eggsThisMonth} telur baru bulan ini`,
      body: `${hatchedThisMonth} sudah menetas. Tingkat keberhasilan sepanjang riwayat: ${successRate}%.`,
    });
  }

  if (costPerTortoise > 0) {
    catatan.push({
      tone: "note",
      title: `Biaya ${fmt(costPerTortoise)} per ekor bulan ini`,
      body: `Total pengeluaran ${fmt(expenseThis)} dibagi ${activeTortoises.length} kura aktif. Pakai angka ini sebagai dasar HPP saat menentukan harga jual.`,
    });
  }


  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* ── HEADER ──
          Angka-angka penting diangkat ke kepala halaman: keadaan peternakan
          terbaca sebelum satu widget pun digulir. */}
      <PageHeader
        title={greeting(user?.full_name)}
        subtitle={today}
        art={<TortoiseArt size="md" />}
        chips={[
          { key: "kura", icon: Shell, label: "Kura aktif", value: activeTortoises.length },
          { key: "sakit", icon: Heart, label: "Sakit", value: sickTortoises.length,
            tone: sickTortoises.length > 0 ? "warn" : "good" },
          { key: "telur", icon: Egg, label: "Telur aktif", value: totalEggs },
          { key: "laba", icon: DollarSign, label: "Laba bulan ini", value: fmt(profit),
            tone: profit >= 0 ? "good" : "bad" },
          { key: "alert", icon: AlertTriangle, label: "Perlu perhatian", value: criticalAlerts.length,
            tone: criticalAlerts.length > 0 ? "warn" : "good" },
        ]}
        actions={
          <Link to="/finance"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover-lift transition-colors">
            <BarChart2 className="w-4 h-4" /> Laporan Lengkap
          </Link>
        }
      />

      {/* ── RINGKASAN PAGI ── */}
      <RingkasanPagi bagian="harian" />

      {/* ── PERINGATAN KLUSTER PENYAKIT ── */}
      <DiseaseClusterWarningCard canDismiss />

      {/* ── YANG MENGHENTIKAN PEKERJAAN ──
          Ditaruh di atas segalanya karena ini satu-satunya yang membuat kerja
          hari ini tidak bisa jalan: bahan habis sehingga SOP terkunci. Ketiga
          kartu di bawah menghilang sendiri saat tidak ada isinya, jadi beranda
          tidak bertambah panjang di hari yang normal. */}
      <SopTerkunciCard />
      <KuraPerluDiperiksaCard />
      <KepatuhanSopCard />
      <PoinBonusTim />

      {/* ── ROW 13: ALERT KRITIS ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <SectionTitle icon={AlertTriangle}>Perlu Perhatianmu</SectionTitle>
        {criticalAlerts.length === 0 ? (
          <div className="flex items-center gap-3 py-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/12 text-accent flex-shrink-0 text-lg">✓</span>
            <div>
              <p className="text-sm font-semibold text-accent">Semua kondisi normal hari ini</p>
              <p className="text-xs text-muted-foreground">
                Tidak ada kura sakit, stok kritis, atau piutang jatuh tempo yang terdeteksi.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 stagger">
            {alertTampil.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg transition-transform hover:translate-x-0.5 ${a.type === "red" ? "bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900" : "bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900"}`}>
                <span className="text-base mt-0.5">{a.type === "red" ? "🔴" : "🟡"}</span>
                <span className={`text-sm flex-1 ${a.type === "red" ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}`}>
                  {a.msg}
                  {a.href && (
                    <Link to={a.href} className="ml-2 text-primary font-medium underline hover:no-underline text-xs">
                      {a.linkLabel || "Lihat →"}
                    </Link>
                  )}
                </span>
              </div>
            ))}
            {alertSisa > 0 && (
              <button
                type="button"
                onClick={() => setAlertSemua(true)}
                className="w-full text-xs text-primary hover:underline py-1.5"
              >
                Tampilkan {alertSisa} peringatan lainnya
              </button>
            )}
            {alertSemua && criticalAlerts.length > BATAS_ALERT && (
              <button
                type="button"
                onClick={() => setAlertSemua(false)}
                className="w-full text-xs text-muted-foreground hover:underline py-1.5"
              >
                Ringkas lagi
              </button>
            )}
          </div>
        )}
      </div>
      {/* ── WIDGET CHECKLIST MENUNGGU APPROVAL ── */}
      {phase2Ready && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-amber-800">
                Checklist menunggu approval: {pendingApproval.length}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <Link to="/layar-tim" className="text-xs font-semibold text-amber-900 underline hover:no-underline">
                  Periksa di Layar Tim →
                </Link>
                <Link to="/approval-poin" className="text-xs font-medium text-amber-800 underline hover:no-underline">
                  {pendingApproval.length > 0 ? "Setujui poin karyawan →" : "Lihat riwayat approval →"}
                </Link>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-700 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* ── TUGAS INSIDENTIL ── */}
      <IncidentalTaskCard />

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
          {showDetail ? "Tutup" : "Keuangan bulan ini, belanja, modal, breeding, kesehatan, piutang, SDM"}
          <ChevronDown className={showDetail ? "w-4 h-4 rotate-180 transition-transform" : "w-4 h-4 transition-transform"} />
        </span>
      </button>

      {showDetail && (
        <div className="space-y-6 animate-fade-in">
      {/* Dipindahkan ke balik Analisis Mendalam.
          Ketiganya menjawab pertanyaan bulanan, bukan pertanyaan pagi ini:
          kesehatan keuangan sebulan, catatan yang dirangkum dari angka yang
          sudah tampil di layar, dan daftar belanja yang jumlahnya sudah
          disebut Ringkasan Pagi. Ketiganya menghabiskan 1.060px dari 3.529px
          bagian yang selalu terlihat — sepertiga layar pertama dipakai untuk
          hal yang tidak dikerjakan pagi ini. Kesehatan keuangan diletakkan
          paling atas di sini karena itu yang paling sering dicari. */}
      {/* ── ROW 1: KESEHATAN FINANSIAL ── */}
      <div>
        <SectionTitle icon={DollarSign}>Kesehatan Finansial Bulan Ini</SectionTitle>
        {/* Lima kartu sejenis, lima kolom. Sebelumnya kartu Kas Kecil berada di
            grid terpisah berkolom tiga dengan satu isi saja, jadi ia jatuh ke
            baris sendiri dan meninggalkan dua pertiga baris kosong — padahal
            bentuk dan bobotnya sama dengan empat kartu di atasnya. */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={TrendingUp} label="Pemasukan" color="bg-green-100 text-green-700" href="/finance"
            value={fmt(incomeThis)}
            sub={<TrendBadge value={incomeThis - incomeLast} />}
            spark={<Sparkline data={deret7Hari.masuk} positiveIsGood />}
          />
          <KpiCard icon={TrendingDown} label="Pengeluaran" color="bg-red-100 text-red-600" href="/finance"
            value={fmt(expenseThis)}
            sub={<TrendBadge value={expenseThis - expenseLast} naikItuBaik={false} />}
            spark={<Sparkline data={deret7Hari.keluar} positiveIsGood={false} />}
          />
          <KpiCard icon={DollarSign} label="Laba/Rugi Bersih" href="/finance"
            color={profit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}
            value={<span className={profit >= 0 ? "text-green-700" : "text-red-600"}>{fmt(profit)}</span>}
            sub={<span className="text-xs text-muted-foreground">7 hari terakhir</span>}
            spark={<Sparkline data={deret7Hari.laba} positiveIsGood />}
          />
          <KpiCard icon={Percent} label="Margin" color="bg-blue-100 text-blue-700" href="/finance"
            value={<span className={Number(margin) >= 0 ? "text-green-700" : "text-red-600"}>{margin}%</span>}
            sub={<span className="text-xs text-muted-foreground">Laba ÷ Pemasukan</span>}
          />
          <PettyCashWidget />
        </div>

        {/* Enam bulan uang masuk dan keluar berdampingan. Angka-angka di kartu
            atas hanya menyebutkan bulan ini; yang menentukan keputusan adalah
            arahnya, dan itu cuma terbaca dari bentuknya. */}
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-sm font-semibold">Arus Uang 6 Bulan</p>
            <Link to="/finance" className="text-xs text-primary hover:underline flex-shrink-0">
              Laporan Keuangan
            </Link>
          </div>
          <GrafikUang data={arusKas6Bulan} tinggi={230} />
        </div>
      </div>


      {/* Lapis telaah dari Ringkasan Pagi: tren delapan minggu, hitungan
          operasional harian, dan perkiraan menetas dua minggu ke depan.
          Ketiganya peringatan dini atau angka pantauan — berguna, tapi tidak
          menuntut tindakan sebelum sarapan, jadi tempatnya bukan di layar
          pertama. Dirender oleh komponen yang sama dengan queryKey yang sama,
          jadi React Query menyatukannya: tidak ada pengambilan data ganda.
          Beranda admin tetap menampilkan semuanya di tempat semula karena
          tidak punya tombol seperti ini. */}
      <RingkasanPagi bagian="telaah" />

      {/* ── CATATAN OTOMATIS ── */}
      {catatan.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <SectionTitle icon={StickyNote}>
            Catatan dari Data Hari Ini
          </SectionTitle>
          <p className="text-xs text-muted-foreground -mt-2 mb-3">
            Dibuat otomatis dari angka di dashboard ini — bukan masukan manual.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 stagger">
            {catatan.map((c, i) => (
              <NoteCard key={i} tone={c.tone} title={c.title}>{c.body}</NoteCard>
            ))}
          </div>
        </div>
      )}


      {/* ── DAFTAR BELANJA ── */}
      <ShoppingListWidget />


      {/* ── EXCLUDED DATA WIDGET ── */}
      <ExcludedDataWidget />

      {/* Widget Laba Rugi dihapus dari sini: seluruh isinya sudah tampil di
          "Kesehatan Finansial Bulan Ini" satu layar di atas — pemasukan,
          pengeluaran, dan labanya persis angka yang sama — sedangkan "biaya per
          ekor/bulan" punya kartunya sendiri di "Nilai & Modal Bisnis" beberapa
          baris di bawah. Menampilkan angka yang sama tiga kali dalam satu
          halaman membuat pembacanya ragu apakah ketiganya benar-benar sama.
          Widgetnya masih dipakai beranda investor dan admin, yang tidak punya
          baris kartu itu. */}

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
            const salesThisMonth = sales.filter(s => (s.sale_date || "").startsWith(thisMonthKey) && masukLaporan(s));
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
                {/* Dulu ditulis "{hatchedThisMonth}/{eggsThisMonth}", terbaca
                    sebagai pecahan padahal keduanya kohort yang berbeda: telur
                    yang MENETAS bulan ini berasal dari clutch yang bertelur
                    80–105 hari lalu, bukan dari telur yang baru diletakkan
                    bulan ini. Dipisah jadi dua fakta. */}
                <div>Menetas bln ini: {hatchedThisMonth} · telur baru: {eggsThisMonth}</div>
                <div>Success rate: {successRate}% <span className="opacity-70">({produksi.telurAdaHasil} telur selesai)</span></div>
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
            sub={<TrendBadge value={deathsThisMonth.length - deathsLastMonth.length} naikItuBaik={false} />}
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
                const lama = b.terlamaHari >= 30;
                return (
                  <div key={b.kunci} className={`flex items-center justify-between p-2.5 rounded-lg ${lama ? "bg-red-50 border border-red-200" : "bg-muted/40"}`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${lama ? "text-red-700" : ""}`}>{b.nama}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.jumlahNota} nota · tertua {b.terlamaHari} hari
                      </p>
                    </div>
                    <p className={`text-sm font-semibold flex-shrink-0 ${lama ? "text-red-600" : ""}`}>{fmt(b.sisa)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── ROW 6: TARGET TAHUNAN ──
          Dulu blok ini hanya MENAMPILKAN target, dan seluruhnya disembunyikan
          bila belum ada target — padahal tidak ada satu layar pun di aplikasi
          yang bisa menetapkannya. Editornya sudah lama ada di AnnualGoalWidget,
          hanya tidak pernah dipasang di mana-mana. Dipasang di sini, sekaligus
          menghapus salinan read-only-nya. */}
      <AnnualGoalWidget breedings={breedings} />

      {/* ── GRAFIK PENJUALAN & KEHADIRAN (widget yang sebelumnya menganggur) ── */}
      <MonthlySalesSummary sales={sales} />
      <AttendanceChartCard />

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
            <TrendBadge value={feedExpenseThis - feedExpenseLast} naikItuBaik={false} />
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
                      <span className="font-medium">{fmt(sisaKasbon(k))}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-semibold mb-1">Lembur Bulan Ini</p>
            <p className="text-lg font-bold">{totalOtHoursThis} jam — {fmt(totalOtPayThis)}</p>
            <TrendBadge value={totalOtHoursThis - totalOtHoursLast} suffix=" jam" naikItuBaik={false} />
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
            {/* Yang dihitung orangnya, bukan suratnya: satu karyawan yang naik
                dari SP1 ke SP2 punya dua surat berlaku, tapi tetap satu orang. */}
            <p className="text-sm text-muted-foreground">{jumlahKaryawanSP} karyawan dalam masa SP</p>
            {activeWarnings.slice(0, BATAS_SP).map(w => (
              <div key={w.id} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-medium text-red-800">{w.employee_name}</p>
                  <p className="text-xs text-red-600">{alasanSurat(w)}</p>
                </div>
                <div className="text-right">
                  {/* `level` sudah berisi "SP1"/"SP2"/"SP3" — mengawalinya
                      dengan "SP" lagi membuatnya tercetak "SPSP2". */}
                  <span className="text-xs font-bold text-red-700">{w.level || "SP"}</span>
                  <p className="text-xs text-muted-foreground">{w.date || "—"}</p>
                </div>
              </div>
            ))}
            {activeWarnings.length > BATAS_SP && (
              <p className="text-xs text-muted-foreground">
                +{activeWarnings.length - BATAS_SP} surat lainnya
              </p>
            )}
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