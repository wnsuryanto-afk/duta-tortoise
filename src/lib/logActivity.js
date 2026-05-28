import { base44 } from "@/api/base44Client";

const SKIP_FIELDS = ["updated_date", "created_date", "created_by_id", "id"];

/**
 * Buat changes_summary string dari before/after object
 * Format: "field1: [lama] → [baru] | field2: [lama] → [baru]"
 */
export function buildChangesSummary(before, after) {
  if (!before || !after) return "";
  const parts = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const key of allKeys) {
    if (SKIP_FIELDS.includes(key)) continue;
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const fmt = (v) => {
        if (v === null || v === undefined) return "—";
        if (typeof v === "object") return JSON.stringify(v).slice(0, 40);
        return String(v);
      };
      parts.push(`${key}: ${fmt(oldVal)} → ${fmt(newVal)}`);
    }
  }
  return parts.join(" | ");
}

/**
 * Log aktivitas user ke entity ActivityLog
 */
export async function logActivity({ action, entity_type, entity_id, entity_name, changes, before, after, notes }) {
  try {
    const user = await base44.auth.me();
    if (!user) return;

    const changes_summary = action === "update" && before && after
      ? buildChangesSummary(before, after)
      : "";

    await base44.entities.ActivityLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action,
      entity_type,
      entity_id,
      entity_name: entity_name || "",
      changes: changes || {},
      changes_summary,
      timestamp: new Date().toISOString(),
      notes: notes || "",
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}