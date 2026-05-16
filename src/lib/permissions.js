/**
 * Hak Akses per Role
 */

export const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  manajer: "Manajer",
  keeper: "Keeper",
};

export const ROLE_COLORS = {
  owner:   "bg-amber-100 text-amber-800 border-amber-200",
  admin:   "bg-primary/10 text-primary border-primary/20",
  manajer: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  keeper:  "bg-muted text-muted-foreground border-border",
};

export const NAV_ACCESS = {
  owner:   ["dashboard", "tortoise", "breeding", "health", "warehouse", "finance", "users", "sop", "payroll", "reminders", "breeding-report", "feed-stock", "info", "treatment"],
  admin:   ["dashboard", "tortoise", "breeding", "health", "warehouse", "finance", "users", "sop", "payroll", "reminders", "breeding-report", "feed-stock", "info", "treatment"],
  manajer: ["dashboard", "tortoise", "breeding", "health", "warehouse", "finance", "sop", "payroll", "reminders", "breeding-report", "feed-stock", "info", "treatment"],
  keeper:  ["dashboard", "tortoise", "breeding", "health", "sop", "reminders", "feed-stock", "warehouse", "info", "treatment"],
};

export const PAGE_PERMISSIONS = {
  owner: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: true },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: true },
    health:    { canCreate: true,  canEdit: true,  canDelete: true },
    finance:   { canCreate: true,  canEdit: true,  canDelete: true },
    users:     { canCreate: true,  canEdit: true,  canDelete: true },
    feedstock: { canCreate: true,  canEdit: true,  canDelete: true },
    warehouse: { canCreate: true,  canEdit: true,  canDelete: true },
  },
  admin: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: true },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: true },
    health:    { canCreate: true,  canEdit: true,  canDelete: true },
    finance:   { canCreate: true,  canEdit: true,  canDelete: true },
    users:     { canCreate: true,  canEdit: true,  canDelete: true },
    feedstock: { canCreate: true,  canEdit: true,  canDelete: true },
    warehouse: { canCreate: true,  canEdit: true,  canDelete: true },
  },
  manajer: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: true },
    breeding:  { canCreate: true,  canEdit: true,  canDelete: true },
    health:    { canCreate: true,  canEdit: true,  canDelete: true },
    finance:   { canCreate: false, canEdit: false, canDelete: false },
    users:     { canCreate: false, canEdit: false, canDelete: false },
    feedstock: { canCreate: true,  canEdit: true,  canDelete: false },
    warehouse: { canCreate: true,  canEdit: true,  canDelete: false },
  },
  keeper: {
    tortoise:  { canCreate: true,  canEdit: true,  canDelete: false },
    breeding:  { canCreate: false, canEdit: false, canDelete: false },
    health:    { canCreate: true,  canEdit: true,  canDelete: false },
    finance:   { canCreate: false, canEdit: false, canDelete: false },
    users:     { canCreate: false, canEdit: false, canDelete: false },
    feedstock: { canCreate: false, canEdit: true,  canDelete: false },
    warehouse: { canCreate: false, canEdit: true,  canDelete: false },
  },
};

export function canAccess(role, section) {
  return NAV_ACCESS[role]?.includes(section) ?? false;
}

export function getPerms(role, section) {
  return PAGE_PERMISSIONS[role]?.[section] ?? { canCreate: false, canEdit: false, canDelete: false };
}

export function canPerformAction(role, section, action) {
  const perms = getPerms(role, section);
  if (action === "create") return perms.canCreate;
  if (action === "edit")   return perms.canEdit;
  if (action === "delete") return perms.canDelete;
  return false;
}