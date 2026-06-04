/**
 * Hook untuk mencegah edit saat "Lihat Sebagai" aktif.
 * 
 * Usage:
 *   const { isPreviewMode, previewProps } = useViewAsGuard();
 *   <Button {...previewProps} onClick={...}>Simpan</Button>
 * 
 * previewProps akan otomatis disable button + set title tooltip.
 */
import { useCurrentUser } from "@/lib/useCurrentUser";

export function useViewAsGuard() {
  const { isPreviewMode } = useCurrentUser();

  const previewProps = isPreviewMode
    ? {
        disabled: true,
        title: "Nonaktifkan 'Lihat Sebagai' untuk melakukan perubahan",
        style: { cursor: "not-allowed", opacity: 0.5 },
      }
    : {};

  return { isPreviewMode, previewProps };
}