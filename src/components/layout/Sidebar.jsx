import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Shell, Heart, Baby, DollarSign, Users, Menu, X,
  LogOut, ClipboardList, FileSpreadsheet, BarChart2, Wheat,
  Warehouse, TrendingUp, BookOpen, Stethoscope, Wallet, GitBranch, Calculator,
  PieChart, Bell, Printer, Package, Zap, Thermometer, FileText,
  CalendarHeart, Library, ListTodo, AlertTriangle, HelpCircle, Skull,
  Activity, Settings, Clock, Calendar, ChevronRight, Trophy, FlaskConical
} from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, ROLE_LABELS, ROLE_COLORS, canViewAs } from "@/lib/permissions";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { path: "/",         section: "dashboard",       label: "Dashboard",       icon: LayoutDashboard },
    ],
  },
  {
    label: "Kura-kura & Kandang",
    items: [
      { path: "/tortoise",        section: "tortoise",        label: "Kura-kura & Kandang", icon: Shell },
      { path: "/breeding",           section: "breeding",        label: "Breeding & Telur",    icon: Baby },
      { path: "/breeder-ranking",   section: "breeding",        label: "Ranking Indukan",     icon: Trophy },
      { path: "/incubator-readings",section: "breeding",        label: "Monitor Inkubator",   icon: Thermometer },
      { path: "/family-tree",       section: "family-tree",     label: "Silsilah",            icon: GitBranch },
      { path: "/death-records",     section: "death-records",   label: "Catatan Kematian",    icon: Skull },
    ],
  },
  {
    label: "Kesehatan",
    items: [
      { path: "/health",          section: "health",          label: "Rekam Medis",         icon: Heart },
      { path: "/vet-contacts",    section: "health",          label: "Dokter Hewan",        icon: Users },
      { path: "/treatment",       section: "treatment",       label: "Jadwal Treatment",    icon: Stethoscope },
    ],
  },
  {
    label: "Perawatan",
    items: [
      { path: "/maintenance-schedule", section: "maintenance", label: "Jadwal Perawatan Kandang", icon: Calendar },
      { path: "/feed-stock",      section: "feed-stock",      label: "Stok Pakan",          icon: Wheat },
    ],
  },
  {
    label: "Gudang & Penjualan",
    items: [
      { path: "/stock-prediction", section: "warehouse",       label: "Prediksi Stok",       icon: BarChart2 },
      { path: "/warehouse",       section: "warehouse",       label: "Gudang",              icon: Warehouse },
      { path: "/sales",           section: "sales",           label: "Penjualan",           icon: DollarSign },
      { path: "/crm",             section: "crm",             label: "CRM Pembeli",         icon: Users },
    ],
  },
  {
    label: "SDM",
    items: [
      { path: "/hr",              section: "hr",              label: "Manajemen SDM",       icon: Users },
      { path: "/payroll-gaji",    section: "payroll-gaji",    label: "Gaji & Kasbon",       icon: Wallet },
      { path: "/salary",          section: "salary",          label: "Gaji Bulanan",        icon: Calculator },
      { path: "/salary-slip",     section: "payroll-gaji",    label: "Riwayat Slip Gaji",   icon: FileText },
    ],
  },
  {
    label: "SOP & Tugas",
    items: [
      { path: "/sop",             section: "sop",             label: "SOP & Tugas Harian",  icon: ClipboardList },
      { path: "/sop-library",     section: "sop-library",     label: "Perpustakaan SOP",    icon: Library },
      { path: "/task-template",   section: "task-template",   label: "Template Task",       icon: ListTodo },
    ],
  },
  {
    label: "Laporan",
    items: [
      { path: "/finance",            section: "finance",            label: "Laporan Keuangan",    icon: TrendingUp },
      { path: "/operational-costs", section: "operational-costs", label: "Biaya Operasional",   icon: Zap },
      { path: "/sales-report",      section: "sales-report",      label: "Lap. Penjualan",      icon: PieChart },
      { path: "/breeding-report",   section: "breeding-report",   label: "Lap. Breeding",       icon: BarChart2 },
    ],
  },
  {
    label: "Gudang Lanjutan",
    items: [
      { path: "/petty-cash",    section: "petty-cash",    label: "Kas Kecil",       icon: Wallet },
      { path: "/supplier",      section: "supplier",      label: "Supplier",         icon: Package },
      { path: "/pellet-recipe", section: "pellet-recipe", label: "Resep Pelet",      icon: FlaskConical },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { path: "/notifications",      section: "notifications",      label: "Notifikasi",           icon: Bell },
      { path: "/activity-log",       section: "activity-log",       label: "Riwayat Aktivitas",    icon: Activity },
      { path: "/system-maintenance", section: "system-maintenance", label: "Pemeliharaan Sistem",  icon: Settings },
      { path: "/users",              section: "users",              label: "Manajemen User",       icon: Users },
      { path: "/users",              section: "users-readonly",     label: "Direktori User",       icon: Users },
      { path: "/printer-config",     section: "printer-config",     label: "Konfigurasi Printer",  icon: Printer },
    ],
  },
  {
    label: null,
    items: [
      { path: "/help", section: "dashboard", label: "Bantuan", icon: HelpCircle },
    ],
  },
];

function NavItem({ item, isActive, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <item.icon className={cn(
        "w-4 h-4 flex-shrink-0 transition-all",
        isActive ? "opacity-100" : "opacity-55 group-hover:opacity-80"
      )} />
      <span className="flex-1 leading-none">{item.label}</span>
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground/70 flex-shrink-0" />}
    </Link>
  );
}

export default function Sidebar({ viewAsRole = null }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user, role: realRole } = useCurrentUser();
  const role = viewAsRole || realRole;
  const close = () => setOpen(false);

  // Filter + deduplicate by path
  const seenPaths = new Set();
  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!canAccess(role, item.section)) return false;
        if (seenPaths.has(item.path)) return false;
        seenPaths.add(item.path);
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-sidebar text-sidebar-foreground shadow-lg border border-sidebar-border"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.15)]",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>

        {/* ── Logo area ── */}
        <div className="px-4 py-5 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center flex-shrink-0">
              <Shell className="w-[18px] h-[18px] text-sidebar-primary" />
            </div>
            <div>
              <p className="font-heading text-[15px] font-bold leading-tight text-sidebar-foreground">Duta Tortoise</p>
              <p className="text-[10px] text-sidebar-foreground/40 leading-tight tracking-wide uppercase">Farm Manager</p>
            </div>
          </div>
          <button
            onClick={close}
            className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {visibleGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/30 px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.section + item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                    onClick={close}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
          {user && (
            <div className="px-3 py-2.5 rounded-xl bg-sidebar-accent/70 border border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sidebar-primary/25 flex items-center justify-center flex-shrink-0 border border-sidebar-primary/30">
                  <span className="text-[11px] font-bold text-sidebar-primary">
                    {(user.full_name || user.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold truncate leading-tight text-sidebar-foreground">
                    {user.full_name || user.email}
                  </p>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full border font-semibold inline-block mt-0.5",
                    ROLE_COLORS[role]
                  )}>
                    {ROLE_LABELS[role] || role}
                  </span>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-sidebar-foreground/45 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar dari Akun
          </button>
        </div>
      </aside>
    </>
  );
}