import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ProfileSetupModal from "@/components/profile/ProfileSetupModal";
import { useViewAs } from "@/lib/ViewAsContext";
import ViewAsRoleBanner from "@/components/owner/ViewAsRoleBanner";
import ViewAsSelector from "@/components/owner/ViewAsSelector";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppLayout() {
  const { user, isLoading } = useCurrentUser();
  const { viewAsRole, viewAsLabel, resetViewAs } = useViewAs();
  const [showViewAsSelector, setShowViewAsSelector] = useState(false);

  const isOwner = user?.role === "owner";
  const isViewingAs = !!viewAsRole;

  const { data: profiles = [], isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const profileComplete = profiles.length > 0 && profiles[0]?.is_complete === true;
  const showSetup = !isLoading && !profileLoading && user && !profileComplete;

  return (
    <div className="min-h-screen bg-background">
      {/* View-As Banner for owner */}
      {isViewingAs && (
        <ViewAsRoleBanner viewAsLabel={viewAsLabel} onReset={resetViewAs} />
      )}

      <Sidebar viewAsRole={isViewingAs ? viewAsRole : null} />

      <main className={`lg:ml-64 min-h-screen ${isViewingAs ? "mt-10" : ""}`}>
        <div className="p-4 pt-16 lg:pt-6 lg:p-8 max-w-7xl mx-auto">
          {/* Owner "Lihat Sebagai" quick button */}
          {isOwner && !isViewingAs && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => setShowViewAsSelector(true)}
              >
                <Eye className="w-3.5 h-3.5" /> Lihat Sebagai...
              </Button>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {showSetup && <ProfileSetupModal open={true} user={user} />}
      {isOwner && (
        <ViewAsSelector
          open={showViewAsSelector}
          onClose={() => setShowViewAsSelector(false)}
        />
      )}
    </div>
  );
}