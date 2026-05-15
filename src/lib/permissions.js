/**
 * Hak Akses per Role:
 * owner   - akses penuh ke semua fitur + manajemen user
 * admin   - akses penuh ke semua fitur + manajemen user
 * manajer - lihat & kelola tortoise, kesehatan, pembiakan, LIHAT penjualan (tidak bisa tambah/edit/hapus)
 * keeper  - kelola tortoise & kesehatan, LIHAT pembiakan, TIDAK bisa akses penjualan & user
 */

export const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  manajer: "Manajer",
  keeper: "Keeper",
};

export const ROLE_COLORS = {
  owner: "bg-amber-100 text-amber-800 border-amber-200",
  admin: "bg-primary/10 text-primary border-primary/20",
  manajer: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  keeper: "bg-muted text-muted-foreground border-border",
};

// Navigasi yang boleh dilihat
export const NAV_ACCESS = {
  owner:   ["dashboard", "tortoise", "breeding", "health", "sales", "users", "sop", "payroll", "reminders", "breeding-report"],
  admin:   ["dashboard", "tortoise", "breeding", "health", "sales", "users", "sop", "payroll", "reminders", "breeding-report"],
  manajer: ["dashboard", "tortoise", "breeding", "health", "sales", "sop", "payroll", "reminders", "breeding-report"],
  keeper:  ["dashboard", "tortoise", "breeding", "health", "sop", "reminders"],
};

// Aksi per halaman: canCreate, canEdit, canDelete
export const PAGE_PERMISSIONS = {
  owner: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: true },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: true },
    health:    { canCreate: true,  canEdit: true,  canDelete: true },
    sales:     { canCreate: true,  canEdit: true,  canDelete: true },
    users:     { canCreate: true,  canEdit: true,  canDelete: true },
  },
  admin: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: true },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: true },
    health:    { canCreate: true,  canEdit: true,  canDelete: true },
    sales:     { canCreate: true,  canEdit: true,  canDelete: true },
    users:     { canCreate: true,  canEdit: true,  canDelete: true },
  },
  manajer: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: true },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: true },
    health:    { canCreate: true,  canEdit: true,  canDelete: true },
    sales:     { canCreate: false, canEdit: false, canDelete: false },
    users:     { canCreate: false, canEdit: false, canDelete: false },
  },
  keeper: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: false },
    breeding:  { canCreate: false, canEdit: false, canDelete: false },
    health:    { canCreate: true,  canEdit: true,  canDelete: false },
    sales:     { canCreate: false, canEdit: false, canDelete: false },
    users:     { canCreate: false, canEdit: false, canDelete: false },
  },
};

export function canAccess(role, section) {
  return NAV_ACCESS[role]?.includes(section) ?? false;
}

export function getPerms(role, section) {
  return PAGE_PERMISSIONS[role]?.[section] ?? { canCreate: false, canEdit: false, canDelete: false };
}