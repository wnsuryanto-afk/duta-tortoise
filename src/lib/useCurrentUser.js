import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useViewAs } from "@/lib/ViewAsContext";

export function useCurrentUser() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { viewAsRole, isViewingAs } = useViewAs?.() || { viewAsRole: null, isViewingAs: false };

  // effectiveRole: role yang digunakan untuk render UI (termasuk saat View As)
  const realRole = user?.role || "keeper";
  const effectiveRole = (isViewingAs && viewAsRole) ? viewAsRole : realRole;

  // isPreviewMode: true saat owner sedang melihat sebagai role lain (semua edit di-disable)
  const isPreviewMode = isViewingAs && !!viewAsRole && realRole === "owner";

  return {
    user,
    isLoading,
    role: effectiveRole,
    realRole,
    isPreviewMode,
    isViewingAs,
  };
}