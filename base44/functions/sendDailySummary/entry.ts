import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSettings } from "../../shared/whatsapp.ts";

/**
 * sendDailySummary — kirim ringkasan harian / mingguan ke grup WhatsApp.
 *
 * Payload:
 *   { force: true }            → kirim ringkasan HARIAN sekarang (manual test)
 *   { force: true, type: "weekly" } → kirim ringkasan MINGGUAN sekarang
 *   {}                          → scheduled check (kirim bila waktunya tiba)
 *
 * Anti-doBEL: catat daily_summary_last_sent / weekly_summary_last_sent di settings.
 * Tidak menampilkan nominal gaji/kasbon/saldo kas.
 */
const FONNTE_API_URL = "https://api.fonnte.com/send";

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function getTodayStr(now) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function formatDateID(now) {
  return `${DAY_NAMES[now.getUTCDay()]}, ${now.getUTCDate()} ${MONTH_NAMES[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
}

async function logWhatsApp(base44, data) {
  try {
    await base44.asServiceRole.entities.WhatsAppLog.create(data);
  } catch {}
}

async function sendToGroup(base44, token, groupId, message, notificationType) {
  const nowIso = new Date().toISOString();
  const preview = (message || "").slice(0, 200);

  try {
    const body = new URLSearchParams();
    body.append("target", groupId);
    body.append("message", message);

    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const result = await res.json();

    if (result.status === true || result.status === "success") {
      await logWhatsApp(base44, {
        sent_at: nowIso,
        targets: [groupId],
        notification_type: notificationType,
        message_preview: preview,
        status: "terkirim",
        error_reason: "",
      });
      return { success: true };
    } else {
      const errMsg = result.reason || result.message || JSON.stringify(result);
      await logWhatsApp(base44, {
        sent_at: nowIso,
        targets: [groupId],
        notification_type: notificationType,
        message_preview: preview,
        status: "gagal",
        error_reason: String(errMsg).slice(0, 500),
      });
      return { success: false, reason: String(errMsg) };
    }
  } catch (err) {
    const errMsg = (err && err.message) ? err.message : String(err);
    await logWhatsApp(base44, {
      sent_at: nowIso,
      targets: [groupId],
      notification_type: notificationType,
      message_preview: preview,
      status: "gagal",
      error_reason: errMsg.slice(0, 500),
    });
    return { success: false, reason: errMsg };
  }
}

function isTaskScheduledToday(task, now) {
  if (task.is_active === false) return false;
  const freq = task.frequency || "harian";
  if (freq === "harian") return true;
  const todayDow = now.getUTCDay();
  if (freq === "mingguan") {
    if (!Array.isArray(task.weekly_days) || task.weekly_days.length === 0) return true;
    return task.weekly_days.includes(todayDow);
  }
  if (freq === "bulanan") {
    if (!Array.isArray(task.monthly_dates) || task.monthly_dates.length === 0) return true;
    return task.monthly_dates.includes(now.getUTCDate());
  }
  return true;
}

async function buildDailySummary(base44, today, now, showPoints) {
  const lines = [];
  const dateLabel = formatDateID(now);

  lines.push(`🐢 *DUTA TORTOISE — Ringkasan ${dateLabel}*`);
  lines.push("");

  // ── Kehadiran ──
  const [users, attendances] = await Promise.all([
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Attendance.filter({ date: today }),
  ]);

  const staff = users.filter(u => ["keeper", "kepala_feeder", "admin"].includes(u.role));
  const attLines = [];

  for (const a of attendances) {
    if (a.status === "hadir" && a.check_in) {
      const out = a.check_out ? a.check_out : "belum pulang";
      attLines.push(`• ${a.employee_name} masuk ${a.check_in} – ${out}`);
    } else if (a.status === "izin" || a.status === "sakit") {
      attLines.push(`• ${a.employee_name}: ${a.status}`);
    }
  }

  const attEmails = new Set(attendances.map(a => a.employee_email).filter(Boolean));
  for (const s of staff) {
    if (!attEmails.has(s.email)) {
      attLines.push(`• ${s.full_name || s.email}: tidak hadir`);
    }
  }

  if (attLines.length > 0) {
    lines.push("👥 *Kehadiran*");
    lines.push(...attLines);
    lines.push("");
  }

  // ── Tugas Hari Ini ──
  const [checklists, sopTasks] = await Promise.all([
    base44.asServiceRole.entities.DailyChecklist.filter({ date: today }),
    base44.asServiceRole.entities.SOPTask.filter({ is_active: true }),
  ]);

  const scheduledToday = sopTasks.filter(t => isTaskScheduledToday(t, now));
  const Y = scheduledToday.length;
  const allCompletedTitles = new Set();
  const taskLines = [];

  for (const cl of checklists) {
    const tasks = cl.completed_tasks || [];
    const X = tasks.length;
    tasks.forEach(t => {
      if (t.task_title) allCompletedTitles.add(t.task_title.toLowerCase());
    });

    let line = `• ${cl.employee_name}: ${X} dari ${Y} tugas selesai`;
    if (showPoints) {
      line += ` (${cl.total_points_claimed || 0} poin)`;
    }
    taskLines.push(line);
  }

  const belumSelesai = scheduledToday
    .filter(t => !allCompletedTitles.has((t.title || "").toLowerCase()))
    .map(t => t.title)
    .filter(Boolean)
    .slice(0, 5);

  if (taskLines.length > 0) {
    lines.push("✅ *Tugas Hari Ini*");
    lines.push(...taskLines);
    if (belumSelesai.length > 0) {
      lines.push(`• Belum selesai: ${belumSelesai.join(", ")}`);
    }
    lines.push("");
  }

  // ── Pakan ──
  const pakanRecords = await base44.asServiceRole.entities.PakanHarian.filter({ log_date: today });
  const pakanBaskets = pakanRecords.reduce((s, p) => s + (p.basket_count || 0), 0);
  if (pakanBaskets > 0) {
    lines.push(`🥬 *Pakan*: ${pakanBaskets} keranjang tercatat`);
  }

  // ── Kura Sakit ──
  const sickRecords = await base44.asServiceRole.entities.HealthRecord.filter({ type: "sakit", date: today });
  if (sickRecords.length > 0) {
    const names = sickRecords.map(r => r.tortoise_name).filter(Boolean);
    const namesStr = names.length > 0 ? ` (${names.join(", ")})` : "";
    lines.push(`🤒 *Kura sakit*: ${sickRecords.length} laporan baru hari ini${namesStr}`);
  }

  // ── Temuan dari Foto ──
  let temuanCount = 0;
  for (const cl of checklists) {
    for (const t of (cl.completed_tasks || [])) {
      if (t.ai_temuan_penting && String(t.ai_temuan_penting).trim()) {
        temuanCount++;
      }
    }
  }
  if (temuanCount > 0) {
    lines.push(`🔎 *Temuan dari foto*: ${temuanCount} hal perlu diperiksa`);
  }

  // ── Stok Kritis ──
  const [warehouse, feedStock] = await Promise.all([
    base44.asServiceRole.entities.WarehouseItem.list("-name", 100),
    base44.asServiceRole.entities.FeedStock.list("-name", 100),
  ]);
  const lowStockItems = [
    ...warehouse.filter(i => i.is_mandatory && (i.current_stock || 0) < (i.minimum_stock || 0)),
    ...feedStock.filter(i => i.is_mandatory && (i.current_stock || 0) < (i.minimum_stock || 0)),
  ];
  if (lowStockItems.length > 0) {
    lines.push(`📦 *Stok kritis*: ${lowStockItems.length} item perlu dibeli`);
  }

  // ── Vitamin Betina ──
  const treatmentSchedules = await base44.asServiceRole.entities.TreatmentSchedule.filter({ is_active: true });
  const vitBetinaSchedules = treatmentSchedules.filter(s =>
    s.mod_type === "vitamin" && (s.gender_filter === "betina" || (s.title || "").toLowerCase().includes("betina"))
  );
  if (vitBetinaSchedules.length > 0) {
    const vitTaskTitles = vitBetinaSchedules
      .map(s => (s.sop_task_title || s.title || "").toLowerCase())
      .filter(Boolean);

    let vitDone = false;
    for (const cl of checklists) {
      for (const t of (cl.completed_tasks || [])) {
        const titleLower = (t.task_title || "").toLowerCase();
        if (vitTaskTitles.some(vt => titleLower.includes(vt) || vt.includes(titleLower))) {
          vitDone = true;
          break;
        }
      }
      if (vitDone) break;
    }
    lines.push(`💊 *Vitamin betina*: ${vitDone ? "sudah" : "belum"} diberikan`);
  }

  lines.push("");
  lines.push("_Ringkasan otomatis dari aplikasi Duta Tortoise_");

  return lines.join("\n");
}

async function buildWeeklySummary(base44, today, now) {
  const lines = [];
  const dateLabel = formatDateID(now);

  lines.push(`🐢 *DUTA TORTOISE — Ringkasan Mingguan*`);
  lines.push(`_${dateLabel}_`);
  lines.push("");

  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekAgoStr = getTodayStr(weekAgo);

  const [users, allAttendances, allChecklists] = await Promise.all([
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Attendance.list("-date", 500),
    base44.asServiceRole.entities.DailyChecklist.list("-date", 500),
  ]);

  const staff = users.filter(u => ["keeper", "kepala_feeder", "admin"].includes(u.role));
  const weekAttendances = allAttendances.filter(a =>
    a.date >= weekAgoStr && a.date <= today && a.status === "hadir"
  );
  const weekChecklists = allChecklists.filter(cl =>
    cl.date >= weekAgoStr && cl.date <= today
  );

  lines.push("📊 *Rekap Minggu Ini*");
  for (const s of staff) {
    const attDays = weekAttendances.filter(a => a.employee_email === s.email).length;
    const myChecklists = weekChecklists.filter(cl => cl.employee_email === s.email);
    const totalTasks = myChecklists.reduce((sum, cl) => sum + ((cl.completed_tasks || []).length), 0);
    lines.push(`• ${s.full_name || s.email}: hadir ${attDays} hari, ${totalTasks} tugas selesai`);
  }
  lines.push("");

  // Sick reports this week
  const sickRecords = await base44.asServiceRole.entities.HealthRecord.filter({ type: "sakit" });
  const weekSick = sickRecords.filter(r => r.date >= weekAgoStr && r.date <= today);
  if (weekSick.length > 0) {
    lines.push(`🤒 *Kura sakit minggu ini*: ${weekSick.length} laporan`);
    lines.push("");
  }

  lines.push("🙏 Terima kasih atas kerja keras minggu ini!");
  lines.push("");
  lines.push("_Ringkasan otomatis dari aplikasi Duta Tortoise_");

  return lines.join("\n");
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { force, type } = body;

    const settings = await getSettings(base44);
    if (!settings) {
      return Response.json({ success: false, error: "Pengaturan WhatsApp belum dikonfigurasi" });
    }
    if (!settings.fonnte_token) {
      return Response.json({ success: false, error: "Token Fonnte belum diisi" });
    }
    if (!settings.group_id || !settings.group_id.trim()) {
      return Response.json({ success: false, error: "ID Grup WhatsApp belum diisi" });
    }

    const now = new Date();
    const today = getTodayStr(now);
    const groupId = settings.group_id.trim();

    // ── Manual: send immediately ──
    if (force) {
      if (type === "weekly") {
        const message = await buildWeeklySummary(base44, today, now);
        const result = await sendToGroup(base44, settings.fonnte_token, groupId, message, "weekly_summary");
        return Response.json(result);
      }
      const message = await buildDailySummary(base44, today, now, settings.daily_summary_show_points === true);
      const result = await sendToGroup(base44, settings.fonnte_token, groupId, message, "daily_summary");
      return Response.json(result);
    }

    // ── Scheduled check ──
    const configuredTime = settings.daily_summary_time || "17:00";
    const [cfgHour, cfgMin] = configuredTime.split(":").map(Number);
    const configuredMinutes = (cfgHour || 17) * 60 + (cfgMin || 0);
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const timeReached = currentMinutes >= configuredMinutes;

    // Daily summary
    if (settings.daily_summary_enabled && timeReached && settings.daily_summary_last_sent !== today) {
      const message = await buildDailySummary(base44, today, now, settings.daily_summary_show_points === true);
      const result = await sendToGroup(base44, settings.fonnte_token, groupId, message, "daily_summary");
      if (result.success) {
        try {
          await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
            daily_summary_last_sent: today,
          });
        } catch {}
      }
    }

    // Weekly summary (Saturday = 6)
    const isSaturday = now.getUTCDay() === 6;
    if (settings.weekly_summary_enabled && isSaturday && timeReached && settings.weekly_summary_last_sent !== today) {
      const message = await buildWeeklySummary(base44, today, now);
      const result = await sendToGroup(base44, settings.fonnte_token, groupId, message, "weekly_summary");
      if (result.success) {
        try {
          await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
            weekly_summary_last_sent: today,
          });
        } catch {}
      }
    }

    return Response.json({ success: true, message: "Scheduled check completed" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}