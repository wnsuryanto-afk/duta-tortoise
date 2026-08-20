import { useQuery } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  CheckCircle, AlertTriangle, Package, Users, Heart
} from "lucide-react";
import ShoppingListWidget from "@/components/dashboard/ShoppingListWidget";
import LabaRugiWidget from "@/components/dashboard/LabaRugiWidget";
import PettyCashWidget from "@/components/pettycash/PettyCashWidget";
import IncidentalTaskCard from "@/components/dashboard/IncidentalTaskCard";
import RingkasanPagi from "@/components/dashboard/RingkasanPagi";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

function greeting(name) {
  const h = new Date().getHours();
  const salam = h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam";
  return `Halo, ${name || "Admin"}`;
}

function MiniCard({ label, value, icon: Icon, urgent = false, href }) {
  const inner = (
    <div className={`bg-card rounded-xl border p-4 hover:shadow-md transition-shadow ${urgent ? "border-red-300 bg-red-50" : "border-border"}`}>
      <div className={`inline-flex p-2 rounded-lg mb-2 ${urgent ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${urgent ? "text-red-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

export default function AdminDashboard({ user, role = "admin" }) {
  // Manajer & Admin berbagi dashboard ini, tapi fokusnya berbeda:
  // manajer mengawasi tim, admin mengurus stok & administrasi.
  const isManajer = role === "manajer";
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const thisMonthKey = format(now, "yyyy-MM");
  const lastUpdate = format(now, "HH:mm", { locale: idLocale });

  const { data: dailyChecklists = [], refetch: refetchCL } = useQuery({
    queryKey: ["owner-checklists"],
    queryFn: () => base44.entities.DailyChecklist.filter({ date: today }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["ringkasan-attendance", today],
    queryFn: () => base44.entities.Attendance.filter({ date: today }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: allUsers = [] } = useActiveUsers();

  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["owner-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 50),
    staleTime: 5 * 60 * 1000,
  });

  const { data: feedStocks = [] } = useQuery({
    queryKey: ["admin-feedstocks"],
    queryFn: () => base44.entities.FeedStock.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["owner-tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stockMovements = [] } = useQuery({
    queryKey: ["admin-stockmov"],
    queryFn: () => base44.entities.StockMovement.filter({ status: "menunggu_approval" }),
    staleTime: 3 * 60 * 1000,
  });

  const { data: kasbons = [] } = useQuery({
    queryKey: ["admin-kasbons-pending"],
    queryFn: () => base44.entities.Kasbon.filter({ status: "pending" }),
    staleTime: 3 * 60 * 1000,
  });

  const { data: finances = [] } = useQuery({
    queryKey: ["admin-fin", thisMonthKey],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 300),
    staleTime: 5 * 60 * 1000,
  });

  // Auto refresh 5 menit
  useEffect(() => {
    const t = setInterval(() => refetchCL(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── Calcs ──────────────────────────────────────────
  const staffUsers = allUsers.filter(u => ["keeper", "kepala_feeder", "admin"].includes(u.role));
  const totalStaff = staffUsers.length;
  const hadirCount = attendances.filter(a => a.status === "hadir").length;

  const pendingChecklists = dailyChecklists.filter(c => c.status === "submitted");
  const approvedChecklists = dailyChecklists.filter(c => c.status === "approved");
  const submittedCount = dailyChecklists.length;

  const sickTortoises = tortoises.filter(t => t.status === "sakit" || t.is_currently_sick);

  const criticalStocks = warehouseItems.filter(i => i.current_stock < i.minimum_stock && i.is_mandatory);
  const criticalFeed = feedStocks.filter(f => f.current_stock < f.minimum_stock && f.is_mandatory);
  const totalCritical = criticalStocks.length + criticalFeed.length;

  const pendingApprovalCount = pendingChecklists.length + stockMovements.length + kasbons.length;

  const thisMonthFin = finances.filter(f => (f.date || "").startsWith(thisMonthKey));
  const income = thisMonthFin.filter(f => f.type === "pemasukan").reduce((s, f) => s + f.amount, 0);
  const expense = thisMonthFin.filter(f => f.type === "pengeluaran").reduce((s, f) => s + f.amount, 0);
  const net = income - expense;

  const sickThisMonth = healthRecords.filter(h => h.date?.startsWith(thisMonthKey) && h.type === "sakit");
  const followUpToday = healthRecords.filter(h => h.follow_up_date === today);

  const expiredItems = warehouseItems.filter(i => {
    if (!i.expired_date) return false;
    return new Date(i.expired_date) <= now;
  });

  const nearExpired = warehouseItems.filter(i => {
    if (!i.expired_date) return false;
    const diff = Math.ceil((new Date(i.expired_date) - now) / 86400000);
    return diff > 0 && diff <= 30;
  });

  const treatmentTortoises = tortoises.filter(t => t.status === "sakit" || t.is_currently_sick);

  const todayDate = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });

  return (
    <div className="space-y-5 pb-10 animate-fade-in">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground font-heading">{greeting(user?.full_name)}</h1>
          <p className="text-sm text-muted-foreground">{todayDate} · Update: {lastUpdate}</p>
        </div>
      </div>

      {/* ── RINGKASAN PAGI ── */}
      <RingkasanPagi />

      {/* ── SECTION 1: BUTUH TINDAKAN ── */}
      <div className={`rounded-xl border p-4 ${pendingApprovalCount === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-300"}`}>
        {pendingApprovalCount === 0 ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-700">✓ Tidak ada yang perlu diapprove</p>
          </div>
        ) : (
          <>
            <p className="font-semibold text-amber-800 mb-3">
              <AlertTriangle className="w-4 h-4 inline mr-1.5 text-amber-600" />
              {pendingApprovalCount} hal menunggu persetujuanmu
            </p>
            <div className="space-y-2">
              {pendingChecklists.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800">• {pendingChecklists.length} checklist belum diapprove</span>
                  <Link to="/" className="text-xs font-medium text-amber-700 underline">Approve</Link>
                </div>
              )}
              {stockMovements.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800">• {stockMovements.length} stok keluar &gt; Rp 500rb</span>
                  <Link to="/warehouse" className="text-xs font-medium text-amber-700 underline">Review</Link>
                </div>
              )}
              {kasbons.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800">• {kasbons.length} kasbon pending</span>
                  <Link to="/kasbon" className="text-xs font-medium text-amber-700 underline">Review</Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── PANTAU TIM (khusus manajer) ── */}
      {isManajer && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3 text-foreground">Pantau Tim</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/layar-tim"
              className="flex flex-col gap-0.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm font-semibold">Layar Tim</span>
              <span className="text-[11px] text-muted-foreground">
                Urutan kerja, jeda waktu, bukti foto hari ini
              </span>
            </Link>
            <Link
              to="/approval-poin"
              className="flex flex-col gap-0.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm font-semibold">Approval Poin</span>
              <span className="text-[11px] text-muted-foreground">
                Tinjau checklist sebelum poin dihitung
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* ── TUGAS INSIDENTIL ── */}
      <IncidentalTaskCard />

      {/* ── SECTION 2: STATUS HARI INI ── */}
      <div>
        <h2 className="font-semibold text-sm mb-3 text-foreground">Status Hari Ini</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniCard icon={Users} label="Absensi" value={`${hadirCount}/${totalStaff} hadir`} href="/daily-payroll" />
          <MiniCard icon={CheckCircle} label="Checklist"
            value={`${submittedCount} submit`}
            urgent={pendingChecklists.length > 0}
          />
          <MiniCard icon={Heart} label="Kura Sakit"
            value={`${sickTortoises.length} kasus`}
            urgent={sickTortoises.length > 0}
            href="/health"
          />
          <MiniCard icon={Package} label="Stok Kritis"
            value={`${totalCritical} item`}
            urgent={totalCritical > 0}
            href="/dashboard-stok"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PettyCashWidget />
        </div>
      </div>

      {/* ── SECTION 3: STOK & OBAT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Stok Kritis</p>
            <Link to="/dashboard-stok" className="text-xs text-primary hover:underline">Lihat Semua</Link>
          </div>
          {criticalStocks.length === 0 && criticalFeed.length === 0 ? (
            <p className="text-sm text-green-600">✓ Stok semua aman</p>
          ) : (
            <div className="space-y-2">
              {[...criticalStocks, ...criticalFeed.map(f => ({ ...f, unit: f.unit, minimum_stock: f.minimum_stock }))].slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-800">{item.name}</p>
                    <p className="text-xs text-red-600">Sisa: {item.current_stock} {item.unit} (min {item.minimum_stock})</p>
                  </div>
                  <Link to="/warehouse" className="text-xs text-primary font-medium border border-primary/30 px-2 py-0.5 rounded">Beli</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Obat Kadaluarsa</p>
            <Link to="/warehouse" className="text-xs text-primary hover:underline">Lihat Semua</Link>
          </div>
          {expiredItems.length === 0 && nearExpired.length === 0 ? (
            <p className="text-sm text-green-600">✓ Tidak ada yang kadaluarsa</p>
          ) : (
            <div className="space-y-2">
              {[...expiredItems, ...nearExpired].slice(0, 5).map(item => {
                const diff = Math.ceil((new Date(item.expired_date) - now) / 86400000);
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium">{item.name}</p>
                    <div className="text-right">
                      <p className="text-xs text-orange-600">{item.expired_date}</p>
                      <p className="text-xs font-medium text-orange-700">{diff <= 0 ? "Kadaluarsa!" : `${diff} hari lagi`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4: KEUANGAN RINGKAS ── */}
      <LabaRugiWidget />

      {/* ── DAFTAR BELANJA ── */}
      <ShoppingListWidget />

      {/* ── SECTION 5: TREATMENT AKTIF ── */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Treatment Aktif</p>
          <Link to="/health" className="text-xs text-primary hover:underline">Lihat Semua</Link>
        </div>
        <div className="flex gap-4 text-sm mb-3">
          <span><span className="font-bold">{treatmentTortoises.length}</span> kura dalam treatment</span>
          <span><span className="font-bold">{followUpToday.length}</span> follow-up hari ini</span>
        </div>
        {followUpToday.length > 0 && (
          <div className="space-y-1.5">
            {followUpToday.slice(0, 5).map(h => (
              <div key={h.id} className="flex justify-between p-2 bg-amber-50 rounded-lg">
                <p className="text-sm font-medium">{h.tortoise_name}</p>
                <span className="text-xs text-amber-700 font-medium">Follow-up hari ini</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}