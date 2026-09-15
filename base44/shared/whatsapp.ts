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
  // ID grup WhatsApp (mis. 120363xxxxxxxxx@g.us) BUKAN nomor telepon.
  // Sebelumnya ID grup dibuang diam-diam oleh validasi di bawah, sehingga
  // pesan ke grup tidak pernah terkirim tanpa keterangan apa pun.
  const raw2 = String(raw).trim();
  if (raw2.includes("@g.us") || /^\d{15,}-\d+$/.test(raw2)) return raw2;
  let cleaned = raw2.replace(/[\s\-().]/g, "");
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
 * Nomor WhatsApp seorang karyawan dari profilnya sendiri.
 *
 * UserProfile bisa punya lebih dari satu baris per orang — 15-09-2026 ada 29
 * baris untuk 10 orang, 19 di antaranya bernama "[DUPLIKAT-HAPUS]" tapi masih
 * membawa email dan nomor asli. Jadi tidak cukup mengambil baris pertama:
 * dipilih baris yang nomornya benar-benar sah, yang terbaru lebih dulu.
 */
async function nomorDariProfil(base44, email) {
  try {
    const profil = await base44.asServiceRole.entities.UserProfile.filter({ user_email: email });
    if (!Array.isArray(profil) || profil.length === 0) return "";
    const urut = [...profil].sort((a, b) =>
      String(b.updated_date || b.created_date || "").localeCompare(String(a.updated_date || a.created_date || "")),
    );
    for (const p of urut) {
      const nomor = normalizePhone(p.hp_whatsapp);
      if (nomor) return nomor;
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Arah sebaliknya: dari nomor pengirim ke email karyawan.
 *
 * Dipakai jalur WhatsApp masuk. Sumbernya harus sama persis dengan
 * getEmployeePhone — kalau tidak, seseorang bisa dikirimi pesan tapi
 * balasannya tidak dikenali, atau sebaliknya.
 *
 * @returns {Promise<string>} email, atau "" bila nomor tidak dikenal
 */
export async function emailDariNomor(base44, nomorMentah) {
  const nomor = normalizePhone(nomorMentah);
  if (!nomor) return "";

  const settings = await getSettings(base44);
  const daftar = settings && Array.isArray(settings.employee_phones) ? settings.employee_phones : [];
  const cocok = daftar.find((e) => e && normalizePhone(e.phone) === nomor);
  if (cocok && cocok.email) return cocok.email;

  try {
    const profil = await base44.asServiceRole.entities.UserProfile.list(null, 500);
    if (!Array.isArray(profil)) return "";
    const urut = [...profil].sort((a, b) =>
      String(b.updated_date || b.created_date || "").localeCompare(String(a.updated_date || a.created_date || "")),
    );
    const p = urut.find((x) => x && x.user_email && normalizePhone(x.hp_whatsapp) === nomor);
    return p ? p.user_email : "";
  } catch {
    return "";
  }
}

/**
 * Get a single employee's phone by email.
 *
 * Dua tempat menyimpan nomor karyawan, dan yang dipakai pengirim WhatsApp
 * selama ini hanya salah satunya:
 *
 *   UserProfile.hp_whatsapp          — diisi karyawan sendiri saat melengkapi
 *                                      profil. Terisi untuk semua orang.
 *   WhatsAppSettings.employee_phones — daftar terpisah di halaman Pengaturan
 *                                      WhatsApp, harus diketik ulang oleh owner.
 *
 * Per 15-09-2026 daftar kedua KOSONG (`employee_phones: []`), padahal hanya
 * itu yang dibaca di sini. Akibatnya setiap notifikasi WhatsApp per-karyawan —
 * tugas insidentil, pengajuan alat, slip gaji — mendapat nomor kosong dan
 * tidak pernah terkirim, tanpa satu pun pesan galat. Yang berhasil selama ini
 * hanya pesan ke grup, karena grup memakai jalur nomor yang berbeda.
 *
 * Sekarang daftar di Pengaturan menjadi PENIMPA, bukan satu-satunya sumber:
 * kalau ada entri di sana ia menang, kalau tidak nomor diambil dari profil
 * orang itu sendiri — tempat nomornya memang dirawat.
 */
export async function getEmployeePhone(base44, email) {
  if (!email) return "";
  const settings = await getSettings(base44);
  const daftar = settings && Array.isArray(settings.employee_phones) ? settings.employee_phones : [];
  const entry = daftar.find((e) => e && e.email === email);
  const dariPengaturan = entry ? normalizePhone(entry.phone) : "";
  if (dariPengaturan) return dariPengaturan;
  return await nomorDariProfil(base44, email);
}

/**
 * Track AI call count per day (for cost monitoring on Log page).
 */
export async function trackAICall(base44, settings) {
  try {
    const now = new Date();
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    const updates: any = {};
    if (settings.ai_calls_count_date !== todayStr) {
      updates.ai_calls_count_date = todayStr;
      updates.ai_calls_today = 1;
    } else {
      updates.ai_calls_today = (settings.ai_calls_today || 0) + 1;
    }
    await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, updates);
  } catch {
    // tracking failure must not break the main flow
  }
}

/**
 * Assess notification urgency using AI.
 * Falls back to MENDESAK on any error (safety: never block alerts due to AI failure).
 * Safety override: severe sick reports (berat/darurat/kritis) ALWAYS MENDESAK.
 */
async function assessUrgency(base44, settings, notificationType, message) {
  // Safety override: severe sick reports always urgent
  if (notificationType === "sick_report") {
    const lowerMsg = (message || "").toLowerCase();
    if (lowerMsg.includes("berat") || lowerMsg.includes("darurat") || lowerMsg.includes("kritis")) {
      return "MENDESAK";
    }
  }
  try {
    await trackAICall(base44, settings);
    const prompt = `Nilai tingkat urgensi notifikasi peternakan kura. Jawab HANYA dengan "MENDESAK", "BIASA", atau "RENDAH".

Kriteria:
- Kesehatan kura & keselamatan hewan = MENDESAK
- Stok bahan yang menghentikan SOP = MENDESAK
- Stok umum menipis = BIASA
- Hal kosmetik/kualitas foto = RENDAH
- Kejadian yang berulang (>=3 kali seminggu) naik satu tingkat

Jenis notifikasi: ${notificationType}
Pesan: ${(message || "").slice(0, 300)}`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          urgency: { type: "string", enum: ["MENDESAK", "BIASA", "RENDAH"] }
        }
      }
    });
    const urgency = res?.urgency || "MENDESAK";
    return ["MENDESAK", "BIASA", "RENDAH"].includes(urgency) ? urgency : "MENDESAK";
  } catch {
    return "MENDESAK";
  }
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

  // 2.5. Smart alert filtering (AI urgency assessment)
  if (settings.ai_smart_alerts_enabled === true && ["sick_report", "low_stock", "tool_request"].includes(notificationType)) {
    const urgency = await assessUrgency(base44, settings, notificationType, message);
    if (urgency === "RENDAH" || urgency === "BIASA") {
      await logEntry(base44, {
        ...logBase,
        status: "pending_ai",
        error_reason: `AI: ${urgency} — ditahan untuk ringkasan berikutnya`,
      });
      return { success: false, reason: `ai_${urgency.toLowerCase()}` };
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

/**
 * Tentukan tujuan tambahan berupa grup WhatsApp untuk sebuah jenis notifikasi.
 *
 * Setiap jenis punya pengaturan tujuan sendiri (`individuals` | `group` | `both`)
 * supaya tidak ada satu tombol yang mengirim SEMUA notifikasi ke grup — gaji
 * karyawan tidak boleh ikut terkirim ke grup karena salah setel.
 *
 * Grup PAGI (morning_group_id) berisi keeper; grup SORE (group_id) hanya manajemen.
 *
 * @returns {{ targets: string[], mode: string }}
 */
export function resolveNotificationTargets(settings, notificationType, individualPhones) {
  const NONE = { targets: individualPhones || [], mode: "individuals" };
  if (!settings) return NONE;

  // Jenis notifikasi yang boleh ke grup, beserta grup bawaannya bila owner
  // belum memilih grup lain. Gaji & tugas insidentil sengaja TIDAK ada di sini.
  const groupMap = {
    sick_report:  { destField: "notif_sick_report_destination",  groupField: "notif_sick_report_group_id",  fallback: settings.morning_group_id },
    tool_request: { destField: "notif_tool_request_destination", groupField: "notif_tool_request_group_id", fallback: settings.morning_group_id },
    low_stock:    { destField: "notif_low_stock_destination",    groupField: "notif_low_stock_group_id",    fallback: settings.group_id },
  };

  const conf = groupMap[notificationType];
  if (!conf) return NONE;

  const mode = settings[conf.destField] || "individuals";
  // Grup yang dipilih owner untuk jenis ini; kosong berarti pakai grup bawaan.
  const groupId = String(settings[conf.groupField] || conf.fallback || "").trim();

  if (mode === "individuals" || !groupId) return NONE;
  if (mode === "group") return { targets: [groupId], mode: "group" };
  return { targets: [...(individualPhones || []), groupId], mode: "both" };
}

/**
 * Semua grup yang tersedia: dua grup bawaan + grup tambahan buatan owner.
 * Dipakai UI untuk menampilkan pilihan, dan bisa dipakai backend untuk validasi.
 */
export function listAllGroups(settings) {
  if (!settings) return [];
  const out = [];
  if (settings.morning_group_id) {
    out.push({ group_id: settings.morning_group_id, name: "Grup PAGI (berisi keeper)", builtin: true });
  }
  if (settings.group_id) {
    out.push({ group_id: settings.group_id, name: "Grup SORE (manajemen)", builtin: true });
  }
  (settings.wa_groups || []).forEach((g) => {
    if (g && g.group_id) out.push({ group_id: g.group_id, name: g.name || g.group_id, note: g.note, builtin: false });
  });
  return out;
}
