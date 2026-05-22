import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useViewAs } from "@/lib/ViewAsContext";
import ViewAsRoleBanner from "@/components/owner/ViewAsRoleBanner";
import ViewAsSelector from "@/components/owner/ViewAsSelector";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import TourController from "@/components/tutorial/TourController";
import IncompleteProfileBanner from "@/components/profile/IncompleteProfileBanner";

export default function AppLayout() {
  const { user, isLoading } = useCurrentUser();
  const { viewAsRole, viewAsLabel, resetViewAs } = useViewAs();
  const [showViewAsSelector, setShowViewAsSelector] = useState(false);

  const isOwner = user?.role === "owner";
  const isViewingAs = !!viewAsRole;

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
          {/* Top bar: bell + owner view-as button */}
          <div className="flex justify-end items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 bg-sidebar rounded-xl px-2 py-1 shadow-sm">
              <NotificationBell />
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