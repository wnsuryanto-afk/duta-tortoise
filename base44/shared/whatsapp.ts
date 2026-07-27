/**
 * Shared WhatsApp (Fonnte) integration module.
 * Imported by backend functions that need to send WhatsApp notifications.
 * All API calls happen server-side — the token is never exposed to the browser.
 */

const FONNTE_API_URL = "https://api.fonnte.com/send";

const TOGGLE_MAP = {
  daily_approval: "notif_daily_approval",
  sick_report: "notif_sick_report",
  low_stock: "notif_low_stock",
  salary_paid: "notif_salary_paid",
  incidental_task: "notif_incidental_task",
  tool_request: "notif_tool_request",
  // test_send is always allowed
};

/**
 * Normalize a phone number to 62xxx format.
 * Returns "" if invalid.
 */
export function normalizePhone(raw) {
  if (!raw) return "";
  let cleaned = String(raw).replace(/[\s\-().]/g, "");
  cleaned = cleaned.replace(/^\+/, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  const digitsOnly = /^\d+$/.test(cleaned);
  const validLength = cleaned.length >= 10 && cleaned.length <= 15;
  return digitsOnly && validLength ? cleaned : "";
}

/**
 * Get the single WhatsAppSettings record (setting_key = "main").
 */
export async function getSettings(base44) {
  const list = await base44.asServiceRole.entities.WhatsAppSettings.filter({
    setting_key: "main",
  });
  return list[0] || null;
}

/**
 * Get normalized phone numbers for a list of roles.
 */
export async function getPhoneNumbersForRoles(base44, roles) {
  const settings = await getSettings(base44);
  if (!settings) return [];
  const rolePhoneMap = {
    owner: settings.phone_owner,
    manajer: settings.phone_manajer,
    admin: settings.phone_admin,
  };
  const phones = [];
  for (const role of roles) {
    const normalized = normalizePhone(rolePhoneMap[role]);
    if (normalized) phones.push(normalized);
  }
  return [...new Set(phones)];
}

/**
 * Get a single employee's phone by email.
 */
export async function getEmployeePhone(base44, email) {
  const settings = await getSettings(base44);
  if (!settings || !Array.isArray(settings.employee_phones)) return "";
  const entry = settings.employee_phones.find((e) => e.email === email);
  return entry ? normalizePhone(entry.phone) : "";
}

/**
 * Write a WhatsAppLog entry. Never throws.
 */
async function logEntry(base44, data) {
  try {
    await base44.asServiceRole.entities.WhatsAppLog.create(data);
  } catch {
    // logging failure must not break the main flow
  }
}

/**
 * Core: send a WhatsApp notification via Fonnte.
 *
 * params:
 *   targets          — array of phone numbers (any format, will be normalized)
 *   message          — text to send
 *   notificationType — one of the TOGGLE_MAP keys or "test_send"
 *   relatedEntityId  — optional, used for anti-spam dedup
 *
 * Returns { success, reason?, sent? }
 * Never throws — all errors are logged and returned.
 */
export async function sendWhatsAppNotification(base44, params) {
  const { targets, message, notificationType, relatedEntityId } = params;
  const now = new Date().toISOString();
  const validTargets = (targets || []).map(normalizePhone).filter(Boolean);
  const preview = (message || "").slice(0, 200);

  const logBase = {
    sent_at: now,
    targets: validTargets,
    notification_type: notificationType,
    message_preview: preview,
    related_entity_id: relatedEntityId || "",
  };

  // 1. Check settings / token
  const settings = await getSettings(base44);
  if (!settings || !settings.fonnte_token) {
    await logEntry(base44, {
      ...logBase,
      status: "skipped",
      error_reason: "Token Fonnte belum diset",
    });
    return { success: false, reason: "no_token" };
  }

  // 2. Check toggle (test_send always passes)
  if (notificationType !== "test_send") {
    const toggleField = TOGGLE_MAP[notificationType];
    if (toggleField && settings[toggleField] === false) {
      await logEntry(base44, {
        ...logBase,
        status: "skipped",
        error_reason: "Notifikasi ini dimatikan",
      });
      return { success: false, reason: "disabled" };
    }
  }

  // 3. Check valid targets
  if (validTargets.length === 0) {
    await logEntry(base44, {
      ...logBase,
      status: "skipped",
      error_reason: "Tidak ada nomor tujuan valid",
    });
    return { success: false, reason: "no_valid_targets" };
  }

  // 4. Anti-spam: skip if already sent for same entity + type
  if (relatedEntityId) {
    try {
      const existing = await base44.asServiceRole.entities.WhatsAppLog.filter({
        related_entity_id: relatedEntityId,
        notification_type: notificationType,
        status: "terkirim",
      });
      if (existing.length > 0) {
        await logEntry(base44, {
          ...logBase,
          status: "skipped",
          error_reason: "Sudah dikirim sebelumnya (anti-spam)",
        });
        return { success: false, reason: "duplicate" };
      }
    } catch {
      // if the check fails, proceed with sending
    }
  }

  // 5. Call Fonnte API
  try {
    const body = new URLSearchParams();
    body.append("target", validTargets.join(","));
    body.append("message", message);

    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        Authorization: settings.fonnte_token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const result = await res.json();

    if (result.status === true || result.status === "success") {
      await logEntry(base44, {
        ...logBase,
        status: "terkirim",
        error_reason: "",
      });
      return { success: true, sent: validTargets.length };
    } else {
      const errMsg = result.reason || result.message || JSON.stringify(result);
      await logEntry(base44, {
        ...logBase,
        status: "gagal",
        error_reason: String(errMsg).slice(0, 500),
      });
      return { success: false, reason: String(errMsg) };
    }
  } catch (err) {
    const errMsg = (err && err.message) ? err.message : String(err);
    await logEntry(base44, {
      ...logBase,
      status: "gagal",
      error_reason: errMsg.slice(0, 500),
    });
    return { success: false, reason: errMsg };
  }
}