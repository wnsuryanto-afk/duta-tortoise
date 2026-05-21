import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ProfileSetupModal from "@/components/profile/ProfileSetupModal";

export default function AppLayout() {
  const { user, isLoading } = useCurrentUser();

  // Check apakah profil sudah diisi
  const { data: profiles = [], isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const profileComplete = profiles.length > 0 && profiles[0]?.is_complete === true;
  const showSetup = !isLoading && !profileLoading && user && !profileComplete;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 pt-16 lg:pt-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      {showSetup && <ProfileSetupModal open={true} user={user} />}
    </div>
  );
}