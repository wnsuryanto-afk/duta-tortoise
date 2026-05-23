import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useViewAs } from "@/lib/ViewAsContext";
import ViewAsRoleBanner from "@/components/owner/ViewAsRoleBanner";
import ViewAsSelector from "@/components/owner/ViewAsSelector";
import { Eye, User, Bell, HelpCircle, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import TourController from "@/components/tutorial/TourController";
import IncompleteProfileBanner from "@/components/profile/IncompleteProfileBanner";

export default function AppLayout() {
  const { user, isLoading } = useCurrentUser();
  const { viewAsRole, viewAsLabel, resetViewAs } = useViewAs();
  const [showViewAsSelector, setShowViewAsSelector] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const isOwner = user?.role === "owner";
  const isViewingAs = !!viewAsRole;

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    if (showUserMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const { data: profiles = [], isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: async () => {
      const data = await base44.entities.UserProfile.filter({ user_email: user.email });
      console.log("UserProfile check:", { email: user.email, count: data.length, hasData: data.length > 0, fields: data[0] });
      return data;
    },
    enabled: !!user?.email,
  });

  // Check if profile needs completion
  const needsProfileCompletion = () => {
    if (!user || !profiles || profiles.length === 0) return true;
    const p = profiles[0];
    const requiredFields = ["full_name", "phone", "join_date", "id_number", "bank_name", "bank_account_number"];
    const missing = requiredFields.some(f => !p[f] || p[f]?.toString().trim() === "");
    console.log("Profile check:", { missing, fields: requiredFields.map(f => ({ [f]: p[f] })) });
    return missing;
  };

  const profileComplete = profiles.length > 0 && profiles[0]?.is_complete === true && !needsProfileCompletion();
  const isProfileLoaded = !isLoading && !profileLoading && !!user;
  const navigate = useNavigate();

  // Non-owner: redirect to profile setup page if profile incomplete
  useEffect(() => {
    if (isProfileLoaded && !isOwner && !profileComplete) {
      console.log("Redirecting to /lengkapi-profil");
      navigate("/lengkapi-profil", { replace: true });
    }
  }, [isProfileLoaded, isOwner, profileComplete, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {isViewingAs && (
        <ViewAsRoleBanner viewAsLabel={viewAsLabel} onReset={resetViewAs} />
      )}

      <Sidebar viewAsRole={isViewingAs ? viewAsRole : null} />

      <main className={`lg:ml-64 min-h-screen ${isViewingAs ? "mt-10" : ""}`}>
        {/* ── Top bar ── */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex justify-between items-center px-4 lg:px-8 py-3 max-w-7xl mx-auto">
            {/* Mobile spacer for hamburger */}
            <div className="w-8 lg:hidden" />

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {isOwner && !isViewingAs && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 hidden sm:flex"
                  onClick={() => setShowViewAsSelector(true)}
                >
                  <Eye className="w-3.5 h-3.5" /> Lihat Sebagai
                </Button>
              )}

              <NotificationBell />

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-primary">
                      {(user?.full_name || user?.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[13px] font-medium hidden sm:block text-foreground/80 max-w-[120px] truncate">
                    {user?.full_name || user?.email}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-modal z-50 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-border bg-muted/40">
                      <p className="text-sm font-semibold text-foreground">{user?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role || "user"}</p>
                    </div>
                    <div className="py-1.5">
                      {[
                        { label: "Edit Profil", icon: User, path: "/edit-profil" },
                        { label: "Notifikasi", icon: Bell, path: "/notifications" },
                        { label: "Bantuan & Tutorial", icon: HelpCircle, path: "/help" },
                      ].map(({ label, icon: Icon, path }) => (
                        <button
                          key={path}
                          onClick={() => { navigate(path); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-muted transition-colors text-foreground/80 hover:text-foreground"
                        >
                          <Icon className="w-4 h-4 text-primary/70" />
                          {label}
                        </button>
                      ))}
                      {isOwner && !isViewingAs && (
                        <button
                          onClick={() => { setShowViewAsSelector(true); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-amber-50 transition-colors text-amber-700"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Sebagai...
                        </button>
                      )}
                    </div>
                    <div className="py-1.5 border-t border-border">
                      <button
                        onClick={() => base44.auth.logout()}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {isOwner && <IncompleteProfileBanner user={user} profile={profiles[0]} />}
          <Outlet />
        </div>
      </main>

      <TourController />
      {isOwner && (
        <ViewAsSelector
          open={showViewAsSelector}
          onClose={() => setShowViewAsSelector(false)}
        />
      )}
    </div>
  );
}