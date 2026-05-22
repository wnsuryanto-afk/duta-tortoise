/**
 * Hak Akses per Role
 */

export const ROLE_LABELS = {
  owner:    "Owner",
  admin:    "Admin",
  manajer:  "Manajer",
  keeper:   "Keeper",
  investor: "Investor",
};

export const ROLE_COLORS = {
  owner:    "bg-amber-100 text-amber-800 border-amber-200",
  admin:    "bg-primary/10 text-primary border-primary/20",
  manajer:  "bg-chart-4/10 text-chart-4 border-chart-4/20",
  keeper:   "bg-muted text-muted-foreground border-border",
  investor: "bg-blue-100 text-blue-800 border-blue-200",
};

export const NAV_ACCESS = {
  owner:    ["dashboard", "tortoise", "breeding", "family-tree", "health", "warehouse", "finance", "users", "sop", "payroll", "payroll-gaji", "salary", "reminders", "breeding-report", "feed-stock", "info", "treatment", "tutorial", "feedback", "kasbon"],
  admin:    ["dashboard", "tortoise", "breeding", "family-tree", "health", "warehouse", "finance", "users", "sop", "payroll", "payroll-gaji", "salary", "reminders", "breeding-report", "feed-stock", "info", "treatment", "tutorial", "feedback", "kasbon"],
  manajer:  ["dashboard", "tortoise", "breeding", "family-tree", "health", "warehouse", "finance", "sop", "payroll", "payroll-gaji", "salary", "reminders", "breeding-report", "feed-stock", "info", "treatment", "tutorial", "feedback", "kasbon"],
  keeper:   ["dashboard", "tortoise", "breeding", "family-tree", "health", "sop", "reminders", "feed-stock", "warehouse", "info", "treatment", "tutorial", "feedback", "kasbon"],
  investor: ["dashboard", "tortoise", "breeding", "family-tree", "health", "finance", "breeding-report", "info"],
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
    tortoise:  { canCreate: false, canEdit: false, canDelete: false },
    breeding:  { canCreate: false, canEdit: false, canDelete: false },
    health:    { canCreate: true,  canEdit: true,  canDelete: false },
    finance:   { canCreate: false, canEdit: false, canDelete: false },
    users:     { canCreate: false, canEdit: false, canDelete: false },
    feedstock: { canCreate: false, canEdit: true,  canDelete: false },
    warehouse: { canCreate: false, canEdit: true,  canDelete: false },
  },
  investor: {
    tortoise:  { canCreate: false, canEdit: false, canDelete: false },
    breeding:  { canCreate: false, canEdit: false, canDelete: false },
    health:    { canCreate: false, canEdit: false, canDelete: false },
    finance:   { canCreate: false, canEdit: false, canDelete: false },
    users:     { canCreate: false, canEdit: false, canDelete: false },
    feedstock: { canCreate: false, canEdit: false, canDelete: false },
    warehouse: { canCreate: false, canEdit: false, canDelete: false },
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