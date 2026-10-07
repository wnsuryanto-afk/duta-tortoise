/**
 * poinKeChecklist.js — poin Inisiatif yang dinilai sampai ke tempat yang dibayar.
 *
 * ── Cacat yang ditemukan 7 Oktober 2026 ─────────────────────────────────────
 *
 * Setiap MaintenanceLog ditulis ulang oleh `onMaintenanceDone` menjadi satu
 * baris di `DailyChecklist.completed_tasks`, dengan:
 *
 *     points: log.poin_earned ?? 0
 *
 * Inisiatif dibuat dengan `poin_earned: 0`, jadi barisnya masuk bernilai NOL.
 * Dan karena `onMaintenanceDone` hanya MENAMBAH baris yang belum ada
 * (`if (!alreadyExists) push`), penilaian yang datang kemudian tidak pernah
 * mengubah angka itu. Jadi menilai Inisiatif 10 poin hanya mengubah
 * `MaintenanceLog.poin_earned` — yang dibaca satu layar, "Poin Saya" milik
 * kiper — sementara slip gaji dan bonus bulanan menghitung dari
 * `DailyChecklist`, dan di sana angkanya tetap nol.
 *
 * ── Ini regresi, bukan kebijakan ────────────────────────────────────────────
 *
 * Sampai 12 Juli 2026 baris itu berbunyi:
 *
 *     const poinEarned = log.poin_earned || 5;   // default 5 poin per task
 *
 * `0 || 5` adalah 5, jadi setiap Inisiatif masuk bernilai 5 poin dan DIBAYAR
 * lewat `total_points_claimed`. Pada 28 Juli `||` diganti `??` — perbaikan yang
 * benar, karena `||` membuat nol yang DIPUTUSKAN ikut tertimpa 5. Tetapi tidak
 * ada yang menggantikan 5 itu dengan penilaian sungguhan, karena tombol
 * penilaiannya ada tetapi tidak pernah dipakai. Sejak hari itu pekerjaan
 * Inisiatif dibayar nol.
 *
 * ── Apa yang berkas ini lakukan, dan apa yang TIDAK ─────────────────────────
 *
 * Sesudah penilai menyimpan, poinnya dituliskan ke baris checklist tanggal itu
 * dan `total_points_claimed` dihitung ulang dari seluruh barisnya — sama persis
 * dengan cara `onMaintenanceDone` menjaganya tetap konsisten.
 *
 * Yang TIDAK dilakukan: menyentuh `approved_points` pada checklist yang SUDAH
 * disetujui. Itu angka yang sudah dibayar, dan mengubahnya diam-diam adalah
 * kesalahan yang sama dengan memotong poin tanpa alasan — justru hal yang
 * dijaga `lib/persetujuanPoin.js`. Untuk hari yang sudah disetujui, barisnya
 * tetap diperbarui supaya catatannya jujur, dan status `"sudah-disetujui"`
 * dikembalikan supaya layar bisa MENGATAKANNYA: poinnya baru ikut dihitung
 * bila pemilik menyetujui ulang checklist hari itu.
 */
import { base44 } from "@/api/base44Client";
import { STATUS, terapkanPoin } from "@/lib/poinBarisChecklist";

/**
 * Tuliskan poin Inisiatif yang baru dinilai ke checklist tanggal itu.
 *
 * Tidak pernah melempar: penilaiannya sendiri sudah tersimpan di
 * MaintenanceLog, dan kegagalan menuliskannya ke checklist tidak boleh
 * membatalkannya.
 */
export async function tulisPoinInisiatif({ email, tanggal, judul, kandang, poin }) {
  const dasar = { tanggal, poin };
  if (!email || !tanggal) return { ...dasar, status: STATUS.TANPA_CHECKLIST };
  try {
    const daftar = await base44.entities.DailyChecklist.filter({ employee_email: email, date: tanggal });
    const checklist = (daftar || [])[0];
    if (!checklist) return { ...dasar, status: STATUS.TANPA_CHECKLIST };

    const { tugas, ketemu, berubah, totalBaru } = terapkanPoin(checklist.completed_tasks, { judul, kandang, poin });
    if (!ketemu) return { ...dasar, status: STATUS.TANPA_BARIS };
    if (!berubah) return { ...dasar, status: STATUS.SAMA };

    if (checklist.status === "approved") {
      // Barisnya tetap dibetulkan supaya catatannya jujur; totalnya tidak,
      // karena `approved_points` adalah angka yang sudah dibayar.
      await base44.entities.DailyChecklist.update(checklist.id, { completed_tasks: tugas });
      return { ...dasar, status: STATUS.SUDAH_DISETUJUI };
    }

    await base44.entities.DailyChecklist.update(checklist.id, {
      completed_tasks: tugas,
      total_points_claimed: totalBaru,
    });
    return { ...dasar, status: STATUS.TERSIMPAN, totalBaru };
  } catch {
    return { ...dasar, status: STATUS.GAGAL };
  }
}

export default tulisPoinInisiatif;

export { STATUS, pesanStatus, poinJudulHari, terapkanPoin, totalPoinTugas } from "@/lib/poinBarisChecklist";
