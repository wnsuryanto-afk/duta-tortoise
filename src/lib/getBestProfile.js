/**
 * Utility: pilih UserProfile terbaik dari array profiles.
 * Prioritas:
 * 1. is_complete=true DAN bukan duplikat
 * 2. Yang paling baru (updated_date)
 * 3. Abaikan yang full_name = "[DUPLIKAT-HAPUS]"
 */
export function getBestProfile(profiles) {
  if (!profiles || profiles.length === 0) return null;

  const validProfiles = profiles.filter(p =>
    p.full_name !== "[DUPLIKAT-HAPUS]"
  );

  if (validProfiles.length === 0) {
    // Semua adalah duplikat — fallback ke profiles[0] tapi log warning
    return profiles[0];
  }

  // Cari yang is_complete=true
  const complete = validProfiles.filter(p => p.is_complete === true);
  if (complete.length > 0) {
    // Ambil yang paling baru di-update
    return complete.sort((a, b) =>
      new Date(b.updated_date || 0) - new Date(a.updated_date || 0)
    )[0];
  }

  // Tidak ada yang complete — ambil yang paling baru di-update
  return validProfiles.sort((a, b) =>
    new Date(b.updated_date || 0) - new Date(a.updated_date || 0)
  )[0];
}

/**
 * Cek apakah ada profil yang sudah complete
 */
export function hasCompleteProfile(profiles) {
  return !!getBestProfile(profiles)?.is_complete;
}