import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Memuat daftar karyawan (keeper, kepala_feeder, admin) via backend function
 * service-role. Bypass RLS bawaan User sehingga admin & manajer bisa membaca
 * daftar karyawan read-only. Role "kicked" otomatis dikecualikan di backend.
 */
/**
 * `aktif` ADA karena fungsinya menolak peran selain owner/manajer/admin.
 *
 * getDailyEmployees sengaja membalas 403 untuk peran lain — ia membaca entity
 * User penuh dengan izin server, jadi memang tidak boleh dipanggil kiper.
 * Tetapi Slip Gaji memanggilnya tanpa syarat, dan kiper membuka layar itu
 * tiap bulan: 20 Nov 2026 diukur di peramban sebagai Pak Sholeh, halaman
 * "Gaji Saya" mengirim permintaan yang DIPASTIKAN gagal dan dua galat 403
 * tercetak di konsolnya.
 *
 * Akibatnya bukan sekadar berisik: daftar namanya kosong, jadi nama di slip
 * jatuh ke cadangan. Memanggil pintu yang sudah pasti terkunci lalu
 * memakai hasil kosongnya sebagai data adalah cara membuat layar salah
 * tanpa satu pun galat yang terlihat orang.
 */
export function useEmployeeUsers(aktif = true) {
  return useQuery({
    queryKey: ["daily-employees"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getDailyEmployees", {});
      return res.employees || [];
    },
    enabled: !!aktif,
    staleTime: 60 * 1000,
  });
}