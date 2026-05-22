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
      {/* View-As Banner for owner */}
      {isViewingAs && (
        <ViewAsRoleBanner viewAsLabel={viewAsLabel} onReset={resetViewAs} />
      )}

      <Sidebar viewAsRole={isViewingAs ? viewAsRole : null} />

      <main className={`lg:ml-64 min-h-screen ${isViewingAs ? "mt-10" : ""}`}>
        <div className="p-4 pt-16 lg:pt-6 lg:p-8 max-w-7xl mx-auto">
          {/* Top bar: bell + user menu */}
          <div className="flex justify-end items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5">
              <NotificationBell />
              
              {/* User menu dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sidebar hover:bg-sidebar-accent transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {(user?.full_name || user?.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{user?.full_name || user?.email}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-semibold">{user?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role || "user"}</p>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => { navigate("/edit-profil"); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <User className="w-4 h-4 text-primary" />
                        Edit Profil
                      </button>
                      <button
                        onClick={() => { navigate("/notifications"); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <Bell className="w-4 h-4 text-primary" />
                        Notifikasi
                      </button>
                      <button
                        onClick={() => { navigate("/help"); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-primary" />
                        Bantuan & Tutorial
                      </button>
                      {isOwner && !isViewingAs && (
                        <button
                          onClick={() => { setShowViewAsSelector(true); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors"
                        >
                          <Eye className="w-4 h-4 text-amber-600" />
                          Lihat Sebagai...
                        </button>
                      )}
                    </div>
                    <div className="py-2 border-t">
                      <button
                        onClick={() => base44.auth.logout()}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {isOwner && !isViewingAs && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => setShowViewAsSelector(true)}
              >
                <Eye className="w-3.5 h-3.5" /> Lihat Sebagai...
              </Button>
            )}
          </div>
          {/* Owner gets reminder banner only */}
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