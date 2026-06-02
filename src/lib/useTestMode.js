/**
 * useTestMode — hook untuk mengecek status test mode dari CompanySettings.
 * Gunakan ini di form create untuk otomatis inject is_test_data: true.
 *
 * Usage:
 *   const { isTestMode, testModeTag } = useTestMode();
 *   await base44.entities.Sale.create({ ...data, ...testModeTag });
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useTestMode() {
  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 30 * 1000,
  });

  const isTestMode = !!settings[0]?.test_mode_active;
  const testModeTag = isTestMode ? { is_test_data: true } : {};

  return { isTestMode, testModeTag };
}