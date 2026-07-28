/**
 * Hak Akses per Role - Duta Tortoise
 * 
 * LEVEL 1 — OWNER (Full Access)
 * LEVEL 2 — MANAJER & ADMIN (Akses sama, di bawah owner)
 * LEVEL 3 — KEEPER (Field worker, akses terbatas)
 */

export const ROLE_LABELS = {
  owner:          "Owner",
  admin:          "Admin",
  manajer:        "Manajer",
  keeper:         "Keeper",
  kepala_feeder:  "Kepala Feeder",
  investor:       "Investor",
};

export const ROLE_COLORS = {
  owner:          "bg-purple-100 text-purple-800 border-purple-300",
  admin:          "bg-green-100 text-green-800 border-green-300",
  manajer:        "bg-blue-100 text-blue-800 border-blue-300",
  keeper:         "bg-orange-100 text-orange-800 border-orange-300",
  kepala_feeder:  "bg-teal-100 text-teal-800 border-teal-300",
  investor:       "bg-slate-100 text-slate-700 border-slate-300",

  kicked:         "bg-red-100 text-red-600 border-red-300",
};

// Menu yang bisa diakses per role
export const NAV_ACCESS = {
  owner: [
    "dashboard", "tortoise", "breeding", "family-tree", "enclosure",
    "health", "warehouse", "finance", "users", "sop", "sop-library",
    "task-template", "payroll", "payroll-gaji", "salary", "hr",
    "reminders", "breeding-report", "sales-report", "feed-stock",
    "info", "treatment", "feedback", "kasbon", "notifications",
    "breeding-planner", "crm", "sales", "death-records",
    "activity-log", "system-maintenance", "vet-contacts", "maintenance",
    "printer-config", "help", "petty-cash", "supplier", "pellet-recipe",
    "operational-costs", "kritik-saran", "stock-gudang",
    "salary-slip", "stock-prediction", "pakan-harian", "panduan-pakan", "panduan-penyakit",
    "approval-poin", "tugas-insidentil", "daftar-belanja", "kura-diam", "breeding-calendar", "label-telur", "harus-dibeli", "alat-kerja",
    "pengaturan-whatsapp", "log-whatsapp", "temuan-foto",
  ],
  admin: [
    "dashboard", "tortoise", "breeding", "family-tree", "enclosure",
    "health", "warehouse", "finance", "users-readonly", "sop", "sop-library",
    "task-template", "payroll", "payroll-gaji", "salary", "hr",
    "reminders", "breeding-report", "sales-report", "feed-stock",
    "info", "treatment", "feedback", "kasbon", "notifications",
    "breeding-planner", "crm", "sales", "death-records",
    "vet-contacts", "maintenance", "printer-config",
    "activity-log", "help", "supplier", "pellet-recipe", "operational-costs",
    "kritik-saran", "stock-gudang", "salary-slip", "stock-prediction", "pakan-harian", "panduan-pakan", "panduan-penyakit",
    "tugas-insidentil", "daftar-belanja", "kura-diam", "breeding-calendar", "label-telur", "harus-dibeli", "alat-kerja", "temuan-foto",
  ],
  manajer: [
    "dashboard", "tortoise", "breeding", "family-tree", "enclosure",
    "health", "warehouse", "finance", "users", "sop", "sop-library",
    "task-template", "payroll", "payroll-gaji", "salary", "hr",
    "reminders", "breeding-report", "sales-report", "feed-stock",
    "info", "treatment", "feedback", "kasbon", "notifications",
    "breeding-planner", "crm", "sales", "death-records",
    "vet-contacts", "maintenance", "activity-log",
    "help", "petty-cash", "supplier", "pellet-recipe", "operational-costs",
    "kritik-saran", "stock-gudang", "salary-slip", "stock-prediction", "pakan-harian", "panduan-pakan", "panduan-penyakit",
    "tugas-insidentil", "daftar-belanja", "kura-diam", "breeding-calendar", "label-telur", "harus-dibeli", "alat-kerja", "temuan-foto",
  ],
  kepala_feeder: [
    "dashboard", "tortoise", "breeding", "family-tree", "enclosure",
    "health", "sop", "treatment",
    "info", "notifications", "pakan-harian", "panduan-pakan", "kritik-saran",
    "petty-cash", "stock-gudang", "warehouse", "feed-stock", "panduan-penyakit",
    "kasbon", "salary-slip", "alat-kerja",
  ],
  keeper: [
    "dashboard", "tortoise", "breeding", "enclosure",
    "health", "sop", "treatment",
    "info", "notifications", "pakan-harian", "panduan-pakan", "kritik-saran", "panduan-penyakit",
    "kasbon", "salary-slip", "alat-kerja",
  ],
  investor: [
    "dashboard", "tortoise", "breeding", "family-tree",
    "health", "finance", "breeding-report", "sales-report", "info", "breeding-planner",
    "panduan-pakan", "kritik-saran", "sales", "panduan-penyakit",
  ],
};

export const PAGE_PERMISSIONS = {
  owner: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: true,  canViewPrice: true,  canViewSales: true  },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: true,  canViewPrice: true,  canViewSales: true  },
    health:    { canCreate: true,  canEdit: true,  canDelete: true,  canViewPrice: true,  canViewSales: true  },
    finance:   { canCreate: true,  canEdit: true,  canDelete: true,  canViewPrice: true,  canViewSales: true  },
    users:     { canCreate: true,  canEdit: true,  canDelete: true,  canViewPrice: true,  canViewSales: true  },
    feedstock: { canCreate: true,  canEdit: true,  canDelete: true,  canViewPrice: true,  canViewSales: true  },
    warehouse: { canCreate: true,  canEdit: true,  canDelete: true,  canViewPrice: true,  canViewSales: true  },
    sales:     { canCreate: true,  canEdit: true,  canDelete: true,  canViewPrice: true,  canViewSales: true  },
    payroll:   { canCreate: true,  canEdit: true,  canDelete: true,  canViewAll: true },
  },
  admin: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    health:    { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    finance:   { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    users:     { canCreate: false, canEdit: false, canDelete: false, canViewPrice: true,  canViewSales: true  },
    feedstock: { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    warehouse: { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    sales:     { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    payroll:   { canCreate: true,  canEdit: true,  canDelete: false, canViewAll: false },
  },
  manajer: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    health:    { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    finance:   { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    users:     { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    feedstock: { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    warehouse: { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    sales:     { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: true,  canViewSales: true  },
    payroll:   { canCreate: true,  canEdit: true,  canDelete: false, canViewAll: false },
  },
  kepala_feeder: {
    tortoise:  { canCreate: false, canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    health:    { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    finance:   { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    users:     { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    feedstock: { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    warehouse: { canCreate: false, canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    sales:     { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    payroll:   { canCreate: false, canEdit: false, canDelete: false, canViewAll: false },
    petty_cash: { canCreate: true,  canEdit: true,  canDelete: false, canViewAll: true },
    pellet:    { canCreate: true,  canEdit: true,  canDelete: false },
  },
  keeper: {
    tortoise:  { canCreate: false, canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    health:    { canCreate: true,  canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    finance:   { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    users:     { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    feedstock: { canCreate: false, canEdit: true,  canDelete: false, canViewPrice: false, canViewSales: false },
    warehouse: { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    sales:     { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    payroll:   { canCreate: false, canEdit: false, canDelete: false, canViewAll: false },
  },
  investor: {
    tortoise:  { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    breeding:  { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    health:    { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    finance:   { canCreate: false, canEdit: false, canDelete: false, canViewPrice: true,  canViewSales: true  },
    users:     { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    feedstock: { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    warehouse: { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    sales:     { canCreate: false, canEdit: false, canDelete: false, canViewPrice: false, canViewSales: false },
    payroll:   { canCreate: false, canEdit: false, canDelete: false, canViewAll: false },
  },
};

export function canAccess(role, section) {
  return NAV_ACCESS[role]?.includes(section) ?? false;
}

export function getPerms(role, section) {
  return PAGE_PERMISSIONS[role]?.[section] ?? {
    canCreate: false, canEdit: false, canDelete: false,
    canViewPrice: false, canViewSales: false,
  };
}

export function canPerformAction(role, section, action) {
  const perms = getPerms(role, section);
  if (action === "create")     return perms.canCreate;
  if (action === "edit")       return perms.canEdit;
  if (action === "delete")     return perms.canDelete;
  if (action === "viewPrice")  return perms.canViewPrice;
  if (action === "viewSales")  return perms.canViewSales;
  return false;
}

// Helper: apakah role ini owner
export function isOwner(role) {
  return role === "owner";
}

// Helper: apakah role ini manager level (owner, admin, manajer)
export function isManagerLevel(role) {
  return ["owner", "admin", "manajer"].includes(role);
}

// Helper: apakah bisa lihat ActivityLog
export function canViewActivityLog(role) {
  return ["owner", "admin", "manajer", "kepala_feeder", "keeper"].includes(role);
}

// Helper: apakah bisa akses Kas Kecil
export function canAccessPettyCash(role) {
  return ["owner", "admin", "manajer", "kepala_feeder", "investor"].includes(role);
}

// Helper: apakah bisa hapus (hanya owner)
export function canDelete(role) {
  return role === "owner";
}

// Helper: apakah bisa approve (owner, admin, manajer)
export function canApprove(role) {
  return ["owner", "admin", "manajer"].includes(role);
}

// Helper: apakah bisa lihat harga
export function canViewPrice(role) {
  return ["owner", "admin", "manajer"].includes(role);
}

// Helper: apakah bisa pakai View As
export function canViewAs(role) {
  return role === "owner";
}

// Helper: apakah bisa akses halaman user (owner/manajer/admin)
export function canViewUsers(role) {
  return ["owner", "admin", "manajer"].includes(role);
}

// Helper: apakah bisa akses manajemen user (owner full, manajer bisa tambah, admin read-only)
export function canManageUsers(role) {
  return ["owner", "admin", "manajer"].includes(role);
}

// Helper: apakah bisa tambah user baru
export function canInviteUser(role) {
  return ["owner", "manajer"].includes(role);
}

// Helper: apakah bisa edit/ubah role/nonaktifkan user
export function canEditUsers(role) {
  return role === "owner";
}

// Helper: apakah bisa lihat gaji semua karyawan
export function canViewAllPayroll(role) {
  return role === "owner";
}

// Helper: ubah role internal (dengan underscore) jadi label tampilan rapi.
// Nilai DB tetap pakai underscore (kepala_feeder); hanya label yang dirapikan.
export function formatRole(role) {
  if (!role) return "";
  return ROLE_LABELS[role] || role.replace(/_/g, " ");
}