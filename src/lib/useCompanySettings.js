import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Selalu return record CompanySettings yang valid (setting_key = "main").
 * Jangan pernah ambil record pertama tanpa filter — record lain adalah
 * sampah (duplicate / archived / ZZZ_HAPUS) yang bisa salah ditampilkan
 * di KOP surat, footer, tanda tangan, dan nilai_per_poin.
 */
export function useCompanySettings() {
  const { data } = useQuery({
    queryKey: ["company-settings-main"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || {};
    },
    staleTime: 30 * 1000,
  });
  return data || {};
}

export default useCompanySettings;