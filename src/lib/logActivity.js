import { base44 } from "@/api/base44Client";

/**
 * Log aktivitas user ke entity ActivityLog
 * @param {Object} params
 * @param {string} params.action - "create" | "update" | "delete" | "login" | "logout"
 * @param {string} params.entity_type - Nama entity (e.g., "Tortoise", "Sale")
 * @param {string} params.entity_id - ID entity
 * @param {string} params.entity_name - Nama entity untuk display
 * @param {Object} [params.changes] - Object before/after untuk update
 * @param {string} [params.notes] - Catatan tambahan
 */
export async function logActivity({ action, entity_type, entity_id, entity_name, changes, notes }) {
  try {
    const user = await base44.auth.me();
    if (!user) return;

    await base44.entities.ActivityLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action,
      entity_type,
      entity_id,
      entity_name: entity_name || "",
      changes: changes || {},
      timestamp: new Date().toISOString(),
      notes: notes || "",
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}