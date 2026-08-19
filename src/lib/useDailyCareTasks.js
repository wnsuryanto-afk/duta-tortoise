import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const STORAGE_KEY = "care_tasks_generated_on";

/**
 * useDailyCareTasks — jalur cadangan pengganti cron.
 *
 * Fungsi backend `generateDailyCareTasks` membuat tugas "Perawatan [kura] — [penyakit]"
 * setiap hari untuk kura yang masih berstatus sakit, dan berhenti sendiri saat kura
 * ditandai sembuh. Fungsi itu sudah lengkap, tetapi TIDAK terjadwal — tidak ada cron
 * yang memanggilnya, sehingga sejak dibuat tidak pernah menghasilkan satu tugas pun.
 *
 * Hook ini memanggilnya saat orang pertama membuka aplikasi pada hari itu.
 * Aman dipanggil berkali-kali: fungsi backend menolak judul tugas yang sudah ada
 * untuk tanggal yang sama, jadi tidak akan ada tugas ganda meski beberapa orang
 * membuka aplikasi bersamaan atau dari beberapa perangkat.
 *
 * Penanda harian disimpan di localStorage per perangkat, semata-mata untuk
 * mengurangi panggilan yang tidak perlu — bukan sebagai pengaman duplikat.
 */
export function useDailyCareTasks(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const today = format(new Date(), "yyyy-MM-dd");
    try {
      if (localStorage.getItem(STORAGE_KEY) === today) return;
    } catch {
      // localStorage diblokir (mode privat) — tetap lanjut, backend yang menyaring duplikat
    }

    // Beri jeda agar tidak bersaing dengan permintaan data layar utama
    const t = setTimeout(() => {
      base44.functions
        .invoke("generateDailyCareTasks", {})
        .then(() => {
          try { localStorage.setItem(STORAGE_KEY, today); } catch { /* abaikan */ }
        })
        .catch(() => {
          // Gagal hari ini bukan masalah besar: percobaan berikutnya terjadi
          // saat ada orang lain membuka aplikasi, karena penanda tidak disimpan.
        });
    }, 4000);

    return () => clearTimeout(t);
  }, [enabled]);
}
