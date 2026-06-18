/**
 * Utility: upsert UserProfile — selalu cari dulu sebelum create.
 * Gunakan ini di semua tempat yang menyentuh UserProfile.
 */
import { base44 } from "@/api/base44Client";

/**
 * Simpan profil user dengan pola upsert:
 * - Cari UserProfile dengan user_email yang sama
 * - Jika ada → UPDATE record pertama yang ditemukan
 * - Jika tidak ada → CREATE 1 record baru
 * - Jika data sudah mengandung is_complete, hormati nilainya (jangan kalkulasi ulang)
 * @param {object} user  - objek user dari base44.auth.me()
 * @param {object} data  - data yang ingin disimpan
 * @returns {object} record UserProfile yang disimpan
 */
export async function upsertUserProfile(user, data) {
  // Hormati is_complete yang sudah di-set oleh caller (jangan kalkulasi ulang)
  const dataToSave = { ...data };

  // Cari profile yang sudah ada berdasarkan email
  const existing = await base44.entities.UserProfile.filter({ user_email: user.email });

  if (existing && existing.length > 0) {
    // UPDATE record pertama (yang paling lengkap / terbaru)
    const best = existing.find((p) => p.is_complete) || existing[0];
    return await base44.entities.UserProfile.update(best.id, dataToSave);
  } else {
    // CREATE baru hanya jika belum ada sama sekali
    return await base44.entities.UserProfile.create({
      ...dataToSave,
      user_id: user.id,
      user_email: user.email,
    });
  }
}