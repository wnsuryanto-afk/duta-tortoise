import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Shell, Heart, Baby, DollarSign, Users, Menu, X, LogOut, ClipboardList, FileSpreadsheet, Bell, BarChart2, Wheat } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, ROLE_LABELS, ROLE_COLORS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";

const ALL_NAV_ITEMS = [
  { path: "/",         section: "dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { path: "/tortoise", section: "tortoise",  label: "Tortoise",   icon: Shell },
  { path: "/breeding",        section: "breeding",        label: "Pembiakan",        icon: Baby },
  { path: "/breeding-report", section: "breeding-report", label: "Lap. Breeding",    icon: BarChart2 },
  { path: "/health",   section: "health",    label: "Kesehatan",  icon: Heart },
  { path: "/sales",    section: "sales",     label: "Penjualan",  icon: DollarSign },
  { path: "/sop",      section: "sop",       label: "SOP & KPI",  icon: ClipboardList },
  { path: "/payroll",   section: "payroll",   label: "Laporan KPI",   icon: FileSpreadsheet },
  { path: "/reminders",  section: "reminders",  label: "Pengingat",    icon: Bell },
  { path: "/feed-stock", section: "feed-stock", label: "Stok Pakan",   icon: Wheat },
  { path: "/users",      section: "users",      label: "Users",        icon: Users },
];

export default function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user, role } = useCurrentUser();

  const navItems = ALL_NAV_ITEMS.filter((item) => canAccess(role, item.section));

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
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
              <Shell className="w-5 h-5 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold tracking-tight">Sulcata</h1>
              <p className="text-xs text-sidebar-foreground/50">Farm Manager</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          {user && (
            <div className="px-2 py-2 rounded-xl bg-sidebar-accent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-sidebar-primary">
                    {(user.full_name || user.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{user.full_name || user.email}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium mt-0.5 inline-block", ROLE_COLORS[role])}>
                    {ROLE_LABELS[role] || role}
                  </span>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}