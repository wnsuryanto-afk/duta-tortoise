import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { profilUntuk } from "@/lib/profilUser";

/**
 * Memuat daftar SEMUA user aktif (tanpa role "kicked").
 *
 * Gunakan hook ini di semua tempat yang menampilkan daftar user operasional —
 * dropdown penugasan, daftar karyawan, filter absensi, laporan gaji,
 * dashboard statistik, pilihan penerima, dll. Halaman baru yang memakai
 * hook ini otomatis ikut bersih (tidak perlu filter manual per halaman).
 *
 * NAMA DIAMBIL DARI PROFIL (15-09-2026).
 *
 * Nama seseorang tersimpan di dua tempat: tabel akun (User.full_name, terisi
 * saat pertama kali mendaftar) dan profilnya (UserProfile.full_name, yang
 * dirawat orangnya sendiri dan dipakai untuk urusan resmi). Keduanya bisa
 * berbeda, dan memang berbeda: akun angsolo98@gmail.com bernama "Angsolo" di
 * tabel akun tapi "Ahmad Ali" di profilnya — nama aslinya, yang sama dengan
 * nama di rekening banknya.
 *
 * Akibatnya satu orang muncul dengan dua nama tergantung layar mana yang
 * dibuka, termasuk antara catatan timbang dan slip gaji. Atas keputusan
 * pemilik 15-09-2026, nama di profil yang menang di seluruh aplikasi.
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
      const [all, profil] = await Promise.all([
        base44.entities.User.list(null, 500),
        // Gagal memuat profil tidak boleh mengosongkan daftar user: tanpa
        // profil, namanya jatuh kembali ke nama akun seperti dulu.
        base44.entities.UserProfile.list(null, 500).catch(() => []),
      ]);
      return (all || [])
        .filter((u) => u.role !== "kicked")
        .map((u) => {
          const p = profilUntuk(profil, { email: u.email, userId: u.id });
          const nama = (p?.full_name || "").trim();
          return nama ? { ...u, full_name: nama, nama_akun: u.full_name } : u;
        });
    },
    staleTime: 60 * 1000,
    ...options,
  });
}
