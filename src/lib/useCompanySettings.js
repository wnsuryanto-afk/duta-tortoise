import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { KUNCI_UTAMA } from "@/lib/kunciSetelan";

/**
 * Selalu return record CompanySettings yang valid (setting_key = "main").
 * Jangan pernah ambil record pertama tanpa filter — record lain adalah
 * sampah (duplicate / archived / ZZZ_HAPUS) yang bisa salah ditampilkan
 * di KOP surat, footer, tanda tangan, dan nilai_per_poin.
 */
export function useCompanySettings() {
  const { data } = useQuery({
    // Kuncinya diambil dari kunciSetelan.js, tempat daftar SEMUA kunci
    // CompanySettings disimpan. Menulisnya sebagai teks di sini berarti kunci
    // ini bisa berubah tanpa ikut berubah di daftar yang menyegarkannya.
    queryKey: [KUNCI_UTAMA],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || {};
    },
    staleTime: 30 * 1000,
  });
  return data || {};
}

export default useCompanySettings;