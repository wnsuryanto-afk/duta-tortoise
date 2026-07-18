import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Memuat daftar karyawan (keeper, kepala_feeder, admin) via backend function
 * service-role. Bypass RLS bawaan User sehingga admin & manajer bisa membaca
 * daftar karyawan read-only. Role "kicked" otomatis dikecualikan di backend.
 */
export function useEmployeeUsers() {
  return useQuery({
    queryKey: ["daily-employees"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getDailyEmployees", {});
      return res.employees || [];
    },
    staleTime: 60 * 1000,
  });
}