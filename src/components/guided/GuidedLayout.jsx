/**
 * GuidedLayout — Shell mobile-first untuk role keeper & kepala_feeder.
 *
 * Navigasi SELALU terbuka (tidak terkunci status checklist). Route-based:
 * - "/" → GuidedHariIni (Beranda / Tugas Hari Ini)
 * - route lain → <Outlet /> (Pakan Harian, Panduan Penyakit, Slip Gaji, Kasbon)
 *
 * Bottom nav: 6 menu (Beranda, Pakan Harian, Lapor Sakit, Panduan, Slip Gaji, Kasbon).
 * FAB "+": 3 aksi cepat (Lapor Sakit, Catat Pakan, Tugas Hari Ini).
 * Profil/Poin/Keluar: via top-bar avatar.
 */
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Salad, HeartPulse, BookOpen, FileText, Wallet, X, Star, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import GuidedHariIni from "./GuidedHariIni";
import GuidedPoinSaya from "./GuidedPoinSaya";
import GuidedProfil from "./GuidedProfil";
import SakitFormDialog from "./SakitFormDialog";
import QuickActionFAB from "./QuickActionFAB";

const NAV_ITEMS = [
  { id: "beranda", label: "Beranda",   icon: Home,       to: "/" },
  { id: "pakan",   label: "Pakan",     icon: Salad,      to: "/pakan-harian" },
  { id: "sakit",   label: "Lapor",     icon: HeartPulse, action: "sakit" },
  { id: "panduan", label: "Panduan",   icon: BookOpen,   to: "/panduan-penyakit" },
  { id: "slip",    label: "Slip Gaji", icon: FileText,   to: "/salary-slip" },
  { id: "kasbon",  label: "Kasbon",    icon: Wallet,     to: "/kasbon" },
];

import { useDailyCareTasks } from "@/lib/useDailyCareTasks";

export default function GuidedLayout({ user, onSwitchToNormal }) {
  // Keeper biasanya orang pertama membuka aplikasi tiap pagi —
  // pemicu di sini yang paling mungkin berjalan lebih dulu.
  useDailyCareTasks(!!user);
  const location = useLocation();
  const navigate = useNavigate();
  const [sakitOpen, setSakitOpen] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [overlay, setOverlay] = useState(null); // "poin" | "profil" | null

  if (!user?.email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  const isHome = location.pathname === "/";
  const activeId = NAV_ITEMS.find(n => n.to === location.pathname)?.id;

  const handleNav = (item) => {
    if (item.action === "sakit") { setSakitOpen(true); return; }
    if (item.to) navigate(item.to);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      {/* ── Slim top bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">🐢</span>
          <span className="font-bold text-sm text-gray-800">Duta Tortoise</span>
        </div>
        <button
          onClick={() => setProfileMenu(true)}
          className="w-8 h-8 rounded-full bg-green-100 border border-green-300 flex items-center justify-center text-xs font-bold text-green-700 active:scale-95"
          aria-label="Profil"
        >
          {(user.full_name || user.email || "?")[0].toUpperCase()}
        </button>
      </div>

      {/* ── Profile menu sheet ── */}
      {profileMenu && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setProfileMenu(false)}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-4 space-y-1 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="font-bold text-gray-800 text-sm">{user.full_name || user.email}</p>
              <button onClick={() => setProfileMenu(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <button onClick={() => { setOverlay("poin"); setProfileMenu(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="font-medium text-gray-700 text-sm">Poin Saya</span>
            </button>
            <button onClick={() => { setOverlay("profil"); setProfileMenu(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
              <User className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700 text-sm">Profil & Pengaturan</span>
            </button>
            <button onClick={() => base44.auth.logout()} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 active:scale-95 transition-all">
              <LogOut className="w-5 h-5" />
              <span className="font-medium text-sm">Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Full-screen overlay (Poin / Profil) ── */}
      {overlay && (
        <div className="fixed inset-0 z-[70] bg-gray-50 max-w-lg mx-auto overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="font-bold text-gray-800">{overlay === "poin" ? "⭐ Poin Saya" : "👤 Profil"}</p>
            <button onClick={() => setOverlay(null)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="p-4">
            {overlay === "poin" && <GuidedPoinSaya user={user} />}
            {overlay === "profil" && <GuidedProfil user={user} onSwitchToNormal={onSwitchToNormal} />}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto pb-28">
        {isHome ? <GuidedHariIni user={user} /> : <Outlet />}
      </div>

      {/* ── Quick Action FAB ── */}
      <QuickActionFAB
        onLaporSakit={() => setSakitOpen(true)}
        onCatatPakan={() => navigate("/pakan-harian")}
        onTugasHariIni={() => navigate("/")}
      />

      {/* ── Sakit form dialog ── */}
      <SakitFormDialog open={sakitOpen} onClose={() => setSakitOpen(false)} user={user} />

      {/* ── Bottom navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 z-40 shadow-[0_-2px_16px_rgba(0,0,0,0.08)]">
        <div className="flex">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            const isSakit = item.action === "sakit";
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors active:scale-95",
                  isSakit ? "text-red-600" : isActive ? "text-green-700" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon className={cn("w-[18px] h-[18px]", isSakit && "fill-red-50")} />
                <span className={cn(
                  "text-[9px] font-semibold leading-none",
                  isSakit ? "text-red-600" : isActive ? "text-green-700" : "text-gray-400"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}