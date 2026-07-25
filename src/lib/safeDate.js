import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Safe date formatter — never throws "Invalid time value".
 * Returns "—" for null/undefined/invalid dates.
 */
export function safeFormatDate(date, formatStr = "d MMM yyyy", locale = id) {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return format(d, formatStr, { locale });
  } catch {
    return "—";
  }
}

/**
 * Safe day difference — returns null for invalid dates.
 * Counts whole days from dateStr to today.
 */
export function safeDaysSince(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}