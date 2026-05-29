/**
 * Utility: upsert UserProfile — selalu cari dulu sebelum create.
 * Gunakan ini di semua tempat yang menyentuh UserProfile.
 */
import { base44 } from "@/api/base44Client";

const IS_COMPLETE_FIELDS = ["full_name", "phone", "join_date", "bank_name", "bank_account_number"];

/**
 * Simpan profil user dengan pola upsert:
 * - Cari UserProfile dengan user_email yang sama
 * - Jika ada → UPDATE record pertama yang ditemukan
 * - Jika tidak ada → CREATE 1 record baru
 * @param {object} user  - objek user dari base44.auth.me()
 * @param {object} data  - data yang ingin disimpan
 * @returns {object} record UserProfile yang disimpan
 */
export async function upsertUserProfile(user, data) {
  const isComplete = IS_COMPLETE_FIELDS.every(
    (f) => data[f] && data[f].toString().trim() !== ""
  );

  const dataToSave = { ...data, is_complete: isComplete };

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