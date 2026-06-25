import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Shell, Heart, Baby, DollarSign, Users, Menu, X,
  LogOut, ClipboardList, BarChart2, BookOpen, Stethoscope,
  Wallet, Calculator, PieChart, Bell, Printer, Package, Thermometer,
  FileText, MessageSquare, Library, ListTodo, Activity, Settings,
  Calendar, ChevronDown, ChevronRight, Trophy,
  LayoutGrid, GitBranch, Skull, Home,
  TrendingUp, Zap, AlertTriangle, Truck, ClipboardCheck,
  Star, Clock, BookMarked, ShieldAlert, ArrowLeftRight, Leaf, Salad
} from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, ROLE_LABELS, ROLE_COLORS } from "@/lib/permissions";

// ─────────────────────────────────────────────
// 9 GRUP NAVIGASI UTAMA
// ─────────────────────────────────────────────
const NAV_GROUPS = [
  // ── 1. DASHBOARD ──────────────────────────
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-slate-500",
    items: [
      { path: "/",               section: "dashboard",  label: "Ringkasan & Overview", icon: LayoutDashboard },
      { path: "/dashboard-stok", section: "warehouse",  label: "Dashboard Stok",       icon: LayoutGrid },
    ],
  },

  // ── 2. KURA ───────────────────────────────
  {
    id: "kura",
    label: "Kura",
    icon: Shell,
    color: "text-teal-500",
    items: [
      { path: "/tortoise",    section: "tortoise",   label: "Daftar Kura",        icon: Shell },
      { path: "/health",      section: "health",     label: "Rekam Kesehatan",    icon: Heart },
      { path: "/panduan-penyakit", section: "panduan-penyakit", label: "Panduan Penyakit", icon: BookOpen },
      { path: "/breeding",    section: "breeding",   label: "Breeding & Telur",   icon: Baby },
      { path: "/family-tree", section: "family-tree",label: "Silsilah",           icon: GitBranch },
      { path: "/treatment",   section: "treatment",  label: "Jadwal Treatment",   icon: Stethoscope },
      { path: "/death-records",section:"death-records",label:"Catatan Kematian",  icon: Skull },
    ],
  },

  // ── 3. KANDANG ────────────────────────────
  {
    id: "kandang",
    label: "Kandang",
    icon: Home,
    color: "text-amber-500",
    items: [
      { path: "/enclosure",           section: "enclosure",   label: "Daftar Kandang",       icon: Home },
      { path: "/incubator-readings",  section: "breeding",    label: "Inkubator",            icon: Thermometer },
      { path: "/maintenance-schedule",section: "maintenance", label: "Jadwal Pemeliharaan",  icon: Calendar },
    ],
  },

  // ── 3.5 PANDUAN PAKAN ────────────────────
  {
    id: "panduan",
    label: "Panduan Pakan",
    icon: Leaf,
    color: "text-green-500",
    items: [
      { path: "/panduan-pakan", section: "panduan-pakan",  label: "Panduan Pakan Sulcata", icon: Leaf },
      { path: "/pakan-harian",  section: "pakan-harian",   label: "Pakan Harian",           icon: Salad },
    ],
  },

  // ── 4. STOK & GUDANG ─────────────────────
  {
    id: "stok",
    label: "Stok & Gudang",
    icon: Package,
    color: "text-blue-500",
    items: [
      { path: "/stok-unified",  section: "stock-gudang", label: "Inventaris & Pergerakan", icon: LayoutGrid },
      { path: "/supplier",      section: "supplier",     label: "Pemasok",                icon: Truck },
    ],
  },

  // ── 5. KEUANGAN ───────────────────────────
  {
    id: "keuangan",
    label: "Keuangan",
    icon: TrendingUp,
    color: "text-rose-500",
    items: [
      { path: "/finance",            section: "finance",           label: "Transaksi Keuangan", icon: TrendingUp },
      { path: "/sales",              section: "sales",             label: "Penjualan Kura",     icon: DollarSign },
      { path: "/crm",                section: "crm",               label: "Data Pembeli",       icon: Users },
      { path: "/petty-cash",         section: "petty-cash",        label: "Kas Kecil",          icon: Wallet },
      { path: "/operational-costs",  section: "operational-costs", label: "Biaya Operasional",  icon: Zap },
    ],
  },

  // ── 6. SDM & KARYAWAN ─────────────────────
  {
    id: "sdm",
    label: "SDM & Karyawan",
    icon: Users,
    color: "text-green-500",
    items: [
      { path: "/hr",            section: "hr",           label: "Absensi & SDM",     icon: Users },
      { path: "/sop",           section: "sop",          label: "Checklist Harian",  icon: ClipboardCheck },
      { path: "/approval-poin", section: "approval-poin", label: "Approval Poin",    icon: ShieldAlert },
      { path: "/salary",        section: "salary",       label: "Gaji Bulanan",      icon: Calculator },
      { path: "/salary-slip",   section: "payroll-gaji", label: "Slip Gaji",         icon: FileText },
      { path: "/payroll-gaji",  section: "payroll-gaji", label: "Kasbon",            icon: Wallet },
      { path: "/breeder-ranking",section:"breeding",     label: "Ranking & Bonus Khusus", icon: Trophy },
    ],
  },

  // ── 7. SOP & TUGAS ────────────────────────
  {
    id: "sop",
    label: "SOP & Tugas",
    icon: ClipboardList,
    color: "text-slate-400",
    items: [
      { path: "/sop-library",   section: "sop-library",  label: "Perpustakaan SOP",  icon: Library },
      { path: "/task-template", section: "task-template",label: "Template Tugas",    icon: ListTodo },
    ],
  },

  // ── 8. LAPORAN & LOG ──────────────────────
  {
    id: "laporan",
    label: "Laporan & Log",
    icon: BarChart2,
    color: "text-pink-500",
    items: [
      { path: "/sales-report",    section: "sales-report",    label: "Lap. Penjualan",    icon: PieChart },
      { path: "/breeding-report", section: "breeding-report", label: "Lap. Breeding",     icon: BarChart2 },
      { path: "/stock-prediction",section: "warehouse",       label: "Prediksi Stok",     icon: AlertTriangle },
      { path: "/activity-log",    section: "activity-log",    label: "Activity Log",      icon: Activity },
      { path: "/kritik-saran",    section: "kritik-saran",    label: "Kritik & Saran",    icon: MessageSquare },
    ],
  },

  // ── 9. PENGATURAN ─────────────────────────
  {
    id: "pengaturan",
    label: "Pengaturan",
    icon: Settings,
    color: "text-slate-400",
    items: [
      { path: "/notifications",      section: "notifications",      label: "Notifikasi",          icon: Bell },
      { path: "/vet-contacts",       section: "health",             label: "Kontak Dokter Hewan", icon: Stethoscope },
      { path: "/printer-config",     section: "printer-config",     label: "Printer & Label",     icon: Printer },
      { path: "/users",              section: "users",              label: "Manajemen User",      icon: Users },
      { path: "/users",              section: "users-readonly",     label: "Direktori User",      icon: Users },
      { path: "/system-maintenance", section: "system-maintenance", label: "Pemeliharaan Sistem", icon: Settings },
    ],
  },
];

// ─────────────────────────────────────────────
// Sub-item link
// ─────────────────────────────────────────────
function NavItem({ item, isActive, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 group ml-1",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <item.icon className={cn(
        "w-3.5 h-3.5 flex-shrink-0 transition-all",
        isActive ? "opacity-100" : "opacity-50 group-hover:opacity-75"
      )} />
      <span className="flex-1 leading-tight">{item.label}</span>
      {isActive && <div className="w-1 h-1 rounded-full bg-sidebar-primary-foreground/70 flex-shrink-0" />}
    </Link>
  );
}

// ─────────────────────────────────────────────
// Grup collapsible
// ─────────────────────────────────────────────
function NavGroup({ group, isExpanded, hasActive, onToggle, onNavClick }) {
  const GroupIcon = group.icon;
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150",
          hasActive
            ? "text-sidebar-foreground bg-sidebar-accent/60"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
        )}
      >
        <GroupIcon className={cn("w-4 h-4 flex-shrink-0", group.color)} />
        <span className="flex-1 text-left">{group.label}</span>
        {isExpanded
          ? <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          : <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        }
      </button>
      {isExpanded && (
        <div className="mt-0.5 space-y-0.5 pb-1">
          {group.items.map((item) => (
            <NavItem
              key={item.section + item.path}
              item={item}
              isActive={false /* handled per item below */}
              onClick={onNavClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN SIDEBAR
// ─────────────────────────────────────────────
export default function Sidebar({ viewAsRole = null }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user, role: realRole } = useCurrentUser();
  const role = viewAsRole || realRole;
  const close = () => setOpen(false);

  // Track which groups are expanded
  const [expanded, setExpanded] = useState(() => {
    // Default: expand the group containing the current path
    const initial = {};
    NAV_GROUPS.forEach(g => { initial[g.id] = false; });
    return initial;
  });

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  // Build visible groups: filter items by role, deduplicate paths
  const seenPaths = new Set();
  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!canAccess(role, item.section)) return false;
        if (seenPaths.has(item.path + item.section)) return false;
        seenPaths.add(item.path + item.section);
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  // Auto-expand group containing active path (on mount / navigation)
  // We derive it inline for render
  const activeGroupId = visibleGroups.find(g =>
    g.items.some(i => i.path === location.pathname)
  )?.id;

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

        {/* ── Logo ── */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-sidebar-border">
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
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {visibleGroups.map((group) => {
            const isGrpActive = group.id === activeGroupId;
            const isExp = expanded[group.id] ?? isGrpActive;

            return (
              <div key={group.id}>
                {/* Group header */}
                <button
                  onClick={() => toggle(group.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-all duration-150",
                    isGrpActive
                      ? "text-sidebar-foreground"
                      : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                  )}
                >
                  <group.icon className={cn("w-4 h-4 flex-shrink-0", group.color)} />
                  <span className="flex-1 text-left">{group.label}</span>
                  {isExp
                    ? <ChevronDown className="w-3 h-3 opacity-40" />
                    : <ChevronRight className="w-3 h-3 opacity-30" />
                  }
                </button>

                {/* Sub-items */}
                {isExp && (
                  <div className="mt-0.5 mb-1 space-y-0.5 pl-2">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.section + item.path}
                          to={item.path}
                          onClick={close}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 group",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <item.icon className={cn(
                            "w-3.5 h-3.5 flex-shrink-0",
                            isActive ? "opacity-100" : "opacity-50 group-hover:opacity-75"
                          )} />
                          <span className="flex-1 leading-tight">{item.label}</span>
                          {isActive && <div className="w-1 h-1 rounded-full bg-sidebar-primary-foreground/70 flex-shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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