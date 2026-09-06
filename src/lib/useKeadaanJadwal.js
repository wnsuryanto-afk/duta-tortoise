import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * useKeadaanJadwal — SATU definisi "keadaan hari ini" untuk jadwal perawatan.
 *
 * jadwalBerlaku() di lib/jadwalPerawatan.js butuh objek `keadaan`:
 * musim bertelur sedang aktif atau tidak, dan racikan Duta Repro sedang ada
 * stoknya atau tidak. Sebelumnya hanya GuidedHariIni yang tahu cara
 * menyusunnya — layar lain yang butuh "perawatan hari ini" terpaksa menebak
 * aturannya sendiri, dan satu di antaranya menebak salah:
 *
 *   OperationalToday menyaring TreatmentSchedule dengan `t.next_due === today`.
 *   Kolom next_due TIDAK ADA di TreatmentSchedule — itu milik
 *   MaintenanceSchedule. Jadi hasilnya selalu kosong, dan kartu
 *   "Perawatan hari ini" menunjukkan 0 sejak hari pertama.
 *
 * Yang membuatnya pahit: tepat di bawah baris itu ada komentar panjang yang
 * menjelaskan kenapa kartu tetangganya dihapus — karena angka nol yang tidak
 * pernah berubah membuat orang berhenti membaca seluruh baris kartu. Obatnya
 * sudah ditulis; penyakit yang sama tetap hidup satu baris di atasnya.
 *
 * Sekarang keadaannya disusun di sini, sekali, dan dipakai bersama.
 */
export function useKeadaanJadwal() {
  const { data: settings } = useQuery({
    queryKey: ["company-settings-keadaan"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res?.[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stok racikan Duta Repro (VIT-REP00). Selama racikan ada, jadwal kalsium /
  // asam folat / vitamin E harian mundur — kandungannya sudah di dalam racikan.
  const { data: racikanRepro = 0 } = useQuery({
    queryKey: ["stok-racikan-repro"],
    queryFn: async () => {
      const res = await base44.entities.WarehouseItem.filter({ sku: "VIT-REP00" });
      return Number(res?.[0]?.current_stock || 0);
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    hari: new Date(),
    musimBertelur: settings?.musim_bertelur_aktif === true,
    racikanTersedia: racikanRepro > 0,
  };
}
