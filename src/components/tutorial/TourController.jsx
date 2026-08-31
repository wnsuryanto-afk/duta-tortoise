import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useTour, isTutorialCompleted } from "@/lib/tourContext";
import WelcomeScreen from "./WelcomeScreen";
import TourOverlay from "./TourOverlay";

export default function TourController() {
  const { user } = useCurrentUser();
  const { triggerWelcome } = useTour();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const profile = profiles[0];

  useEffect(() => {
    if (isLoading || !user?.email) return;

    // Cek localStorage per-user dulu (cepat)
    if (isTutorialCompleted(user.email)) return;

    // Cek DB flag (untuk cross-device sync)
    const dbCompleted = profile?.tour_completed === true || profile?.tour_skipped === true;
    if (dbCompleted) {
      // Sync ke localStorage per-user
      localStorage.setItem(`tour_done_${user.email}`, "true");
      return;
    }

    // Belum selesai tutorial → tampilkan welcome
    const t = setTimeout(() => triggerWelcome(), 1500);
    return () => clearTimeout(t);
  }, [isLoading, user, profile]);

  return (
    <>
      <WelcomeScreen user={user} profile={profile} />
      <TourOverlay user={user} profile={profile} />
    </>
  );
}