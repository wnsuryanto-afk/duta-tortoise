import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hanyaLaporan } from "@/lib/laporan";

/**
 * Hook untuk menghitung trip ambil sayur dari PakanHarian.
 * Aturan:
 * - feed_source "sayur_pasar" atau "campur" = 1 trip
 * - Maks 1 trip per orang per hari (dedup by log_date)
 * - Difilter per periode (YYYY-MM)
 *
 * Returns: { [email]: { trips: number, dates: string[] } }
 */
export function useVegTrips(period, enabled = true) {
  return useQuery({
    queryKey: ["veg-trips", period],
    queryFn: async () => {
      const all = hanyaLaporan(await base44.entities.PakanHarian.list("-log_date", 500));
      const byEmail = {};

      all.forEach((p) => {
        if (p.feed_source !== "sayur_pasar" && p.feed_source !== "campur") return;
        if (!p.recorded_by_email) return;
        if (!p.log_date || p.log_date === "null" || !p.log_date.startsWith(period)) return;

        const email = p.recorded_by_email;
        if (!byEmail[email]) byEmail[email] = { dates: new Set(), trips: 0 };

        if (!byEmail[email].dates.has(p.log_date)) {
          byEmail[email].dates.add(p.log_date);
          byEmail[email].trips++;
        }
      });

      const result = {};
      Object.entries(byEmail).forEach(([email, data]) => {
        result[email] = {
          trips: data.trips,
          dates: [...data.dates].sort(),
        };
      });

      return result;
    },
    enabled: !!period && enabled,
  });
}