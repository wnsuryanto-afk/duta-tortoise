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

  /*
    `Array.isArray` lebih dulu, dan itu bukan kerewelan: `= []` hanya berlaku
    ketika `data` UNDEFINED. Ketika cache kunci ["company-settings"] berisi
    null — pernah terjadi karena tiga berkas lain memakai kunci yang sama
    dengan bentuk objek — `settings` bernilai null dan `settings[0]`
    mematikan seluruh layar. Penyebab utamanya sudah dibereskan di ketiga
    berkas itu; pemeriksaan ini lapisan kedua, karena akibatnya layar mati.
  */
  const daftar = Array.isArray(settings) ? settings : [];
  const isTestMode = !!daftar[0]?.test_mode_active;
  const testModeTag = isTestMode ? { is_test_data: true } : {};

  return { isTestMode, testModeTag };
}