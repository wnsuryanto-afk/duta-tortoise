/**
 * Konstanta Term & Condition SOP — dipakai bersama oleh:
 * - Tabel master (TermConditionSOPPage, owner-only)
 * - Form edit SOP task (SOPTaskManager)
 * Satu sumber definisi agar nilainya konsisten di kedua bentuk.
 */
export const JENIS_CARRYOVER_OPTIONS = [
  { value: "1hari", label: "1 Hari" },
  { value: "tertunggak", label: "Tertunggak" },
  { value: "hangus", label: "Hangus" },
];

export const WAJIB_ROLE_OPTIONS = [
  { value: "semua", label: "Semua Role" },
  { value: "keeper", label: "Keeper" },
  { value: "kepala_feeder", label: "Kepala Feeder" },
  { value: "admin", label: "Admin" },
  { value: "manajer", label: "Manajer" },
  { value: "owner", label: "Owner" },
];

export const JENIS_CARRYOVER_LABEL = JENIS_CARRYOVER_OPTIONS.reduce((m, o) => {
  m[o.value] = o.label;
  return m;
}, {});