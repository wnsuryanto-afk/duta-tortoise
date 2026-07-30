import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Memuat daftar SEMUA user aktif (tanpa role "kicked").
 *
 * Gunakan hook ini di semua tempat yang menampilkan daftar user operasional —
 * dropdown penugasan, daftar karyawan, filter absensi, laporan gaji,
 * dashboard statistik, pilihan penerima, dll. Halaman baru yang memakai
 * hook ini otomatis ikut bersih (tidak perlu filter manual per halaman).
 *
 * Catatan:
 *  - Halaman Manajemen User TETAP memakai `base44.entities.User.list()` langsung
 *    supaya owner bisa melihat & memulihkan akun "kicked".
 *  - Data historis (absensi, checklist, slip gaji) tetap bisa dibuka lewat
 *    riwayat — namanya tidak muncul di daftar pilihan aktif.
 *  - `options.enabled` bisa dilewatkan bila fetch harus bersyarat.
 */
export function useActiveUsers(options = {}) {
  return useQuery({
    queryKey: ["active-users"],
    queryFn: async () => {
      const all = await base44.entities.User.list();
      return (all || []).filter((u) => u.role !== "kicked");
    },
    staleTime: 60 * 1000,
    ...options,
  });
}