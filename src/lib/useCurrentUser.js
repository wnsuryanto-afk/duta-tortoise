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

  const { viewAsRole, isViewingAs, testSaveMode } = useViewAs?.() || { viewAsRole: null, isViewingAs: false, testSaveMode: false };

  // effectiveRole: role yang digunakan untuk render UI (termasuk saat View As)
  const realRole = user?.role || "keeper";
  const effectiveRole = (isViewingAs && viewAsRole) ? viewAsRole : realRole;

  // isPreviewMode: true saat owner sedang melihat sebagai role lain (semua edit di-disable)
  // — TIDAK berlaku saat "Mode Uji" (testSaveMode) aktif, karena mode uji memang mengizinkan simpan.
  const isPreviewMode = isViewingAs && !!viewAsRole && realRole === "owner" && !testSaveMode;

  // isOwnerTestSave: owner sedang "Mode Uji" — simpan berfungsi & data ditandai is_test_data
  const isOwnerTestSave = isViewingAs && testSaveMode && realRole === "owner";

  return {
    user,
    isLoading,
    role: effectiveRole,
    realRole,
    isPreviewMode,
    isViewingAs,
    isOwnerTestSave,
  };
}