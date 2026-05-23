import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Shell, Heart, Baby, DollarSign, Users, Menu, X,
  LogOut, ClipboardList, FileSpreadsheet, BarChart2, Wheat,
  Warehouse, TrendingUp, BookOpen, Stethoscope, Wallet, GitBranch, Calculator,
  PieChart, Bell,
  CalendarHeart, Library, ListTodo, AlertTriangle, HelpCircle, Skull,
  Activity, Settings, Clock, Calendar
} from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, ROLE_LABELS, ROLE_COLORS, canViewAs } from "@/lib/permissions";

// Navigasi dikelompokkan
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
      { path: "/breeding",        section: "breeding",        label: "Breeding & Telur",    icon: Baby },
      { path: "/family-tree",     section: "family-tree",     label: "Silsilah",            icon: GitBranch },
      { path: "/death-records",   section: "death-records",   label: "Catatan Kematian",    icon: Skull },
    ],
  },
  {
    label: "Kesehatan",
    items: [
      { path: "/health",          section: "health",          label: "Rekam Medis",    icon: Heart },
      { path: "/vet-contacts",    section: "health",          label: "Dokter Hewan",     icon: Users },
      { path: "/treatment",       section: "treatment",       label: "Jadwal Treatment", icon: Stethoscope },
    ],
  },
  {
    label: "Perawatan",
    items: [
      { path: "/maintenance-schedule", section: "maintenance", label: "Jadwal Perawatan Kandang", icon: Calendar },
      { path: "/feed-stock",      section: "feed-stock",      label: "Stok Pakan",      icon: Wheat },
    ],
  },
  {
    label: "Gudang & Penjualan",
    items: [
      { path: "/warehouse",       section: "warehouse",       label: "Gudang",           icon: Warehouse },
      { path: "/sales",           section: "sales",           label: "Penjualan",        icon: DollarSign },
      { path: "/crm",             section: "crm",             label: "CRM Pembeli",      icon: Users },
    ],
  },
  {
    label: "SDM",
    items: [
      { path: "/hr",              section: "hr",              label: "Manajemen SDM",    icon: Users },
      { path: "/payroll-gaji",    section: "payroll-gaji",    label: "Gaji & Kasbon", icon: Wallet },
      { path: "/salary",          section: "salary",          label: "Gaji Bulanan",     icon: Calculator },
    ],
  },
  {
    label: "SOP & Tugas",
    items: [
      { path: "/sop",             section: "sop",             label: "SOP & Tugas Harian",        icon: ClipboardList },
      { path: "/sop-library",     section: "sop-library",     label: "Perpustakaan SOP", icon: Library },
      { path: "/task-template",   section: "task-template",   label: "Template Task",    icon: ListTodo },
    ],
  },
  {
    label: "Laporan",
    items: [
      { path: "/finance",         section: "finance",         label: "Laporan Keuangan", icon: TrendingUp },
      { path: "/sales-report",    section: "sales-report",    label: "Lap. Penjualan",   icon: PieChart },
      { path: "/breeding-report", section: "breeding-report", label: "Lap. Breeding",    icon: BarChart2 },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { path: "/notifications",      section: "notifications",    label: "Notifikasi",           icon: Bell },
      { path: "/activity-log",       section: "activity-log",     label: "Riwayat Aktivitas",    icon: Activity },
      { path: "/system-maintenance", section: "system-maintenance", label: "Pemeliharaan Sistem", icon: Settings },
      { path: "/users",              section: "users",            label: "Manajemen User",       icon: Users },
      { path: "/users",              section: "users-readonly",   label: "Direktori User",        icon: Users },
    ],
  },
  {
    label: null,
    items: [
      { path: "/help",            section: "dashboard",       label: "Bantuan", icon: HelpCircle },
    ],
  },
];

function NavItem({ item, isActive, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <item.icon className="w-[17px] h-[17px] flex-shrink-0" />
      {item.label}
    </Link>
  );
}

export default function Sidebar({ viewAsRole = null }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user, role: realRole } = useCurrentUser();

  // If viewAs is active, use that role for nav rendering
  const role = viewAsRole || realRole;

  const close = () => setOpen(false);

  // Filter items per group berdasarkan akses, deduplicate by path
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
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-sidebar text-sidebar-foreground shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={close} />}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-60 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="px-4 py-5 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
              <Shell className="w-4 h-4 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="font-heading text-base font-semibold leading-tight">Sulcata Farm</h1>
              <p className="text-[11px] text-sidebar-foreground/45 leading-tight">Manager</p>
            </div>
          </div>
          <button onClick={close} className="lg:hidden p-1 rounded-lg hover:bg-sidebar-accent">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {visibleGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 px-3 mb-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                    onClick={close}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          {user && (
            <div className="px-3 py-2.5 rounded-xl bg-sidebar-accent">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-sidebar-primary">
                    {(user.full_name || user.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate leading-tight">{user.full_name || user.email}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium inline-block mt-0.5", ROLE_COLORS[role])}>
                    {ROLE_LABELS[role] || role}
                  </span>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}