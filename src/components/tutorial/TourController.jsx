import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useTour } from "@/lib/tourContext";
import WelcomeScreen from "./WelcomeScreen";
import TourOverlay from "./TourOverlay";

export default function TourController() {
  const { user } = useCurrentUser();
  const { triggerWelcome } = useTour();
  const qc = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const profile = profiles[0];

  useEffect(() => {
    if (isLoading || !user) return;
    const alreadyDone = profile?.tour_completed || profile?.tour_skipped;
    if (!alreadyDone) {
      // Delay slightly so the app renders first
      const t = setTimeout(() => triggerWelcome(), 1500);
      return () => clearTimeout(t);
    }
  }, [isLoading, user, profile]);

  return (
    <>
      <WelcomeScreen user={user} profile={profile} />
      <TourOverlay user={user} profile={profile} />
    </>
  );
}