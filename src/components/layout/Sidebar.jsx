import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Shell, Menu, X, LogOut, Search, ChevronRight } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, ROLE_LABELS, ROLE_COLORS } from "@/lib/permissions";
import { NAV_SECTIONS } from "@/lib/navigation";

/**
 * Sidebar — 6 tautan datar, tanpa accordion.
 *
 * Sebelumnya: 9 grup berisi 49 item yang harus dibuka-tutup satu per satu.
 * Sekarang: Beranda + 5 area. Isi tiap area ada di halaman hub,
 * dan setiap halaman tetap bisa dijangkau langsung lewat Ctrl+K.
 */
export default function Sidebar({ viewAsRole = null, onOpenSearch }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user, role: realRole } = useCurrentUser();
  const role = viewAsRole || realRole;
  const close = () => setOpen(false);

  // Area disembunyikan bila tidak ada satu pun halaman yang boleh diakses role ini
  const visibleSections = NAV_SECTIONS.filter((s) =>
    s.items.some((i) => canAccess(role, i.section))
  );

  const isActive = (section) =>
    location.pathname === section.hub ||
    section.items.some((i) => i.path === location.pathname);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-sidebar text-sidebar-foreground shadow-lg border border-sidebar-border active:scale-95 transition-transform"
        aria-label="Buka menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={close} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.15)]",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="relative px-4 py-4 flex items-center justify-between border-b border-sidebar-border overflow-hidden">
          {/* Cahaya samar di belakang logo — memberi kedalaman pada panel gelap */}
          <div className="absolute -top-12 -left-8 w-40 h-40 rounded-full bg-sidebar-primary/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sidebar-primary/35 to-sidebar-primary/10 border border-sidebar-primary/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Shell className="w-[18px] h-[18px] text-sidebar-primary" />
            </div>
            <div>
              <p className="font-heading text-[15px] font-bold leading-tight text-sidebar-foreground">Duta Tortoise</p>
              <p className="text-[10px] text-sidebar-foreground/40 leading-tight tracking-wide uppercase">Farm Manager</p>
            </div>
          </div>
          <button
            onClick={close}
            className="relative lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigasi */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <Link
            to="/"
            onClick={close}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
              location.pathname === "/"
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5"
            )}
          >
            {/* Batang penanda halaman aktif — lebih cepat dipindai daripada warna latar saja */}
            {location.pathname === "/" && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-sidebar-primary-foreground/80" />
            )}
            <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:scale-110" />
            <span className="flex-1">Beranda</span>
          </Link>

          {visibleSections.map((s) => {
            const active = isActive(s);
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                to={s.hub}
                onClick={close}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-sidebar-primary-foreground/80" />
                )}
                <Icon className={cn("w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:scale-110", !active && s.color)} />
                <span className="flex-1">{s.label}</span>
                <ChevronRight className={cn(
                  "w-3.5 h-3.5 flex-shrink-0 transition-all",
                  active ? "opacity-70" : "opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0"
                )} />
              </Link>
            );
          })}

          {onOpenSearch && (
            <button
              onClick={() => { close(); onOpenSearch(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all mt-2"
            >
              <Search className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="flex-1 text-left">Cari halaman…</span>
              <kbd className="hidden lg:inline text-[9px] font-mono px-1.5 py-0.5 rounded border border-sidebar-border">⌘K</kbd>
            </button>
          )}
        </nav>

        {/* Footer user */}
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
