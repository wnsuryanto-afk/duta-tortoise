/**
 * severity.js — SUMBER TUNGGAL tingkat keparahan kura sakit.
 *
 * Daftar yang sama sebelumnya disalin di empat berkas (GuidedHariIni,
 * SakitFormDialog, SakitFromTemuanDialog, SickModal). Menambah satu tingkat
 * baru berarti mengubah empat tempat, dan satu yang terlewat membuat form
 * yang berbeda menawarkan pilihan yang berbeda untuk data yang sama.
 */

/** Tingkat keparahan, urut dari paling ringan. */
export const SEVERITIES = [
  { value: "ringan", label: "🟡 Ringan" },
  { value: "sedang", label: "🟠 Sedang" },
  { value: "berat",  label: "🔴 Berat" },
  { value: "kritis", label: "🚨 Kritis" },
];

/** Keparahan yang cukup serius untuk memicu pemberitahuan ke manajer. */
export const TRIGGER_SEVERITIES = ["sedang", "berat", "kritis"];
