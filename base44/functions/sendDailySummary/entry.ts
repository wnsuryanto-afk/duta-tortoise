import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSettings, normalizePhone } from "../../shared/whatsapp.ts";

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

async function sendFonnteMessage(token: string, target: string, message: string) {
  const body = new URLSearchParams();
  body.append("target", target);
  body.append("message", message);
  const res = await fetch(FONNTE_API_URL, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  let result: any;
  try { result = JSON.parse(text); } catch { result = { raw: text }; }
  if (result.status === true || result.status === "success") {
    return { success: true };
  }
  return { success: false, reason: result.reason || result.message || text };
}

async function sendAndLog(base44, token, target, label, message, notificationType) {
  const nowIso = new Date().toISOString();
  const preview = (message || "").slice(0, 200);
  let result;
  try {
    result = await sendFonnteMessage(token, target, message);
  } catch (err) {
    result = { success: false, reason: (err && err.message) ? err.message : String(err) };
  }
  await logWhatsApp(base44, {
    sent_at: nowIso,
    targets: [target],
    notification_type: notificationType,
    message_preview: preview,
    status: result.success ? "terkirim" : "gagal",
    error_reason: result.success ? "" : String(result.reason || "").slice(0, 500),
  });
  return { target: label || target, success: result.success, reason: result.success ? "" : String(result.reason || "") };
}

/**
 * Kirim ringkasan ke tujuan terpilih (individu / grup / keduanya).
 * Mengembalikan { success, results } — results berisi per-recipient.
 */
async function sendSummaryToDestinations(base44, settings, message, notificationType) {
  const token = settings.fonnte_token;
  const destination = settings.summary_destination || "individuals";
  const results: any[] = [];

  const sendToIndividuals = destination === "individuals" || destination === "both";
  const sendToGroup = (destination === "group" || destination === "both") && settings.group_id && settings.group_id.trim();

  // ── Kirim ke nomor perorangan (satu per satu, jeda 500ms) ──
  if (sendToIndividuals) {
    const recipients = Array.isArray(settings.summary_recipients)
      ? settings.summary_recipients.filter((r) => r && r.phone)
      : [];
    for (const r of recipients) {
      const phone = normalizePhone(r.phone);
      if (!phone) {
        results.push({ target: r.name || r.phone, success: false, reason: "Nomor tidak valid" });
        continue;
      }
      const res = await sendAndLog(base44, token, phone, r.name || phone, message, notificationType);
      results.push(res);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // ── Kirim ke grup ──
  if (sendToGroup) {
    const groupId = settings.group_id.trim();
    const res = await sendAndLog(base44, token, groupId, "Grup WhatsApp", message, notificationType);
    results.push(res);
  }

  const anySuccess = results.some((r) => r.success);
  return { success: anySuccess, results };
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

function isTaskScheduledForDate(task, date) {
  if (task.is_active === false) return false;
  const freq = task.frequency || "harian";
  if (freq === "harian") return true;
  const dow = date.getUTCDay();
  if (freq === "mingguan") {
    if (!Array.isArray(task.weekly_days) || task.weekly_days.length === 0) return true;
    return task.weekly_days.includes(dow);
  }
  if (freq === "bulanan") {
    if (!Array.isArray(task.monthly_dates) || task.monthly_dates.length === 0) return true;
    return task.monthly_dates.includes(date.getUTCDate());
  }
  return true;
}

async function buildDailySummary(base44, today, now, showPoints) {
  const lines: string[] = [];
  const dateLabel = formatDateID(now);
  const timeLabel = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

  lines.push(`🐢 *DUTA TORTOISE — ${dateLabel}*`);
  lines.push("");

  // ── Fetch all data in parallel ──
  const [
    users, attendances, checklists, sopTasks,
    warehouseItems, feedStocks, incidentalTasks, toolRequests,
    sickRecords, photoFindings, pakanRecords, treatmentSchedules,
    stockMovements, tortoises,
  ] = await Promise.all([
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Attendance.filter({ date: today }),
    base44.asServiceRole.entities.DailyChecklist.filter({ date: today }),
    base44.asServiceRole.entities.SOPTask.filter({ is_active: true }),
    base44.asServiceRole.entities.WarehouseItem.list("-name", 100),
    base44.asServiceRole.entities.FeedStock.list("-name", 100),
    base44.asServiceRole.entities.IncidentalTask.filter({ is_active: true }),
    base44.asServiceRole.entities.ToolRequest.filter({ status: "menunggu" }),
    base44.asServiceRole.entities.HealthRecord.filter({ type: "sakit", date: today }),
    base44.asServiceRole.entities.PhotoFinding.filter({ date: today }),
    base44.asServiceRole.entities.PakanHarian.filter({ log_date: today }),
    base44.asServiceRole.entities.TreatmentSchedule.filter({ is_active: true }),
    base44.asServiceRole.entities.StockMovement.filter({ date: today }),
    base44.asServiceRole.entities.Tortoise.list("-name", 200),
  ]);

  // ── KEHADIRAN ──
  // Hanya karyawan harian (keeper & kepala_feeder) yang ditampilkan "tidak hadir".
  // Admin/manajer/owner hanya muncul bila absen masuk, tanpa status "tidak hadir".
  const dailyStaff = users.filter(u => ["keeper", "kepala_feeder"].includes(u.role));
  const nonDailyStaff = users.filter(u => ["admin", "manajer", "owner"].includes(u.role));

  // Kelompokkan absensi per orang (key = email, fallback ke nama)
  const attByKey = new Map();
  for (const a of attendances) {
    const key = a.employee_email || a.employee_name;
    if (!key) continue;
    if (!attByKey.has(key)) attByKey.set(key, []);
    attByKey.get(key).push(a);
  }

  // Ambil jam masuk paling awal & jam pulang paling akhir; tandai bila absen masuk >1x
  function summarizeAttendance(records) {
    const hadir = records.filter(r => r.status === "hadir" && r.check_in);
    if (hadir.length === 0) return null;
    hadir.sort((a, b) => (a.check_in || "").localeCompare(b.check_in || ""));
    const earliest = hadir[0];
    const checkOuts = hadir.filter(r => r.check_out)
      .sort((a, b) => (b.check_out || "").localeCompare(a.check_out || ""));
    const out = checkOuts.length > 0 ? checkOuts[0].check_out : "belum pulang";
    const dupMark = hadir.length > 1 ? " (absen masuk 2x)" : "";
    return { earliest, out, dupMark };
  }

  const attLines: string[] = [];
  const processedKeys = new Set();

  // Karyawan harian: satu baris per orang (hadir / izin / sakit / tidak hadir)
  for (const s of dailyStaff) {
    processedKeys.add(s.email);
    const records = attByKey.get(s.email) || [];
    if (records.length === 0) {
      attLines.push(`• ${s.full_name || s.email}: tidak hadir`);
      continue;
    }
    const summary = summarizeAttendance(records);
    if (summary) {
      attLines.push(`• ${s.full_name || s.email}: masuk ${summary.earliest.check_in} – ${summary.out}${summary.dupMark}`);
    } else {
      const izinSakit = records.find(r => r.status === "izin" || r.status === "sakit");
      attLines.push(`• ${s.full_name || s.email}: ${izinSakit ? izinSakit.status : "tidak hadir"}`);
    }
  }

  // Admin/manajer/owner: hanya tampil bila absen masuk, tanpa "tidak hadir"
  for (const s of nonDailyStaff) {
    processedKeys.add(s.email);
    const records = attByKey.get(s.email) || [];
    const summary = summarizeAttendance(records);
    if (!summary) continue;
    const roleLabel = s.role === "owner" ? "Owner" : s.role === "manajer" ? "Manajer" : "Admin";
    attLines.push(`• ${roleLabel} ${s.full_name || s.email}: masuk ${summary.earliest.check_in} – ${summary.out}${summary.dupMark}`);
  }

  // Absensi tanpa match user (email tidak terdaftar) — tampilkan apa adanya
  for (const [key, records] of attByKey) {
    if (processedKeys.has(key)) continue;
    const summary = summarizeAttendance(records);
    if (!summary) continue;
    attLines.push(`• ${summary.earliest.employee_name || key}: masuk ${summary.earliest.check_in} – ${summary.out}${summary.dupMark}`);
  }

  if (attLines.length > 0) {
    lines.push("👥 *KEHADIRAN*");
    lines.push(...attLines);
    lines.push("");
  }

  // ── TUGAS HARI INI ──
  // Pembilang (X) = tugas dicentang; penyebut (Y) = SOP terjadwal + tugas insidentil
  // yang ditugaskan ke karyawan ini hari itu. Y selalu >= X supaya persentase <= 100%.
  const scheduledToday = sopTasks.filter(t => isTaskScheduledToday(t, now));
  const Y_sop = scheduledToday.length;
  const todayIncidental = incidentalTasks.filter(t => t.due_date === today && t.status !== "cancelled");
  const allCompletedTitles = new Set();
  const taskLines: string[] = [];
  for (const cl of checklists) {
    const tasks = cl.completed_tasks || [];
    const X = tasks.length;
    tasks.forEach(t => {
      if (t.task_title) allCompletedTitles.add(t.task_title.toLowerCase());
    });
    const myIncidental = todayIncidental.filter(t =>
      !t.assigned_to_email || t.assigned_to_email === cl.employee_email
    ).length;
    const Y = Math.max(Y_sop + myIncidental, X);
    const pct = Y > 0 ? Math.min(100, Math.round((X / Y) * 100)) : 0;
    let line = `• ${cl.employee_name}: ${X}/${Y} selesai (${pct}%)`;
    if (showPoints) {
      line += ` (${cl.total_points_claimed || 0} poin)`;
    }
    taskLines.push(line);
  }
  const belumSelesai = scheduledToday
    .filter(t => !allCompletedTitles.has((t.title || "").toLowerCase()))
    .map(t => t.title)
    .filter(Boolean)
    .slice(0, 6);
  if (taskLines.length > 0 || belumSelesai.length > 0) {
    lines.push("✅ *TUGAS HARI INI*");
    lines.push(...taskLines);
    if (belumSelesai.length > 0) {
      lines.push(`⚠️ Belum selesai: ${belumSelesai.join(", ")}`);
    }
    lines.push("");
  }

  // ── PERLU DIBELI ──
  const catPriority: Record<string, number> = { obat: 0, vitamin: 1, suplemen: 2 };
  const lowStockItems = [
    ...warehouseItems
      .filter(i => (i.current_stock || 0) < (i.minimum_stock || 0))
      .map(i => ({ name: i.name, stock: i.current_stock || 0, min: i.minimum_stock || 0, unit: i.unit || "", category: i.category || "lainnya" })),
    ...feedStocks
      .filter(i => (i.current_stock || 0) < (i.minimum_stock || 0))
      .map(i => ({ name: i.name, stock: i.current_stock || 0, min: i.minimum_stock || 0, unit: i.unit || "", category: i.category || "lainnya" })),
  ];
  lowStockItems.sort((a, b) => {
    const pa = catPriority[a.category] ?? 9;
    const pb = catPriority[b.category] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.stock - b.stock;
  });

  const buyLines: string[] = [];
  for (const item of lowStockItems.slice(0, 10)) {
    if (item.stock <= 0) {
      buyLines.push(`• ${item.name} — HABIS`);
    } else {
      buyLines.push(`• ${item.name} — sisa ${item.stock} ${item.unit} (min ${item.min})`);
    }
  }
  if (lowStockItems.length > 10) {
    buyLines.push(`…dan ${lowStockItems.length - 10} barang lain`);
  }

  // Tugas menunggu barang
  const waitingTasks = incidentalTasks.filter(t => t.material_status === "waiting_materials" && t.status === "pending");
  for (const wt of waitingTasks.slice(0, 3)) {
    const missing = (wt.required_items || []).filter(r => !r.is_available).map(r => r.item_name).filter(Boolean);
    if (missing.length > 0) {
      buyLines.push(`⏳ ${wt.title}: butuh ${missing.join(", ")}`);
    }
  }
  // Pengajuan alat
  for (const tr of toolRequests.slice(0, 3)) {
    buyLines.push(`🔴 ${tr.tool_name} dari ${tr.requester_name}`);
  }
  if (buyLines.length > 0) {
    lines.push("🛒 *PERLU DIBELI*");
    lines.push(...buyLines);
    lines.push("");
  }

  // ── KURA & KESEHATAN ──
  const healthLines: string[] = [];
  for (const r of sickRecords) {
    const name = r.tortoise_name || "—";
    const diag = Array.isArray(r.diagnosis) && r.diagnosis.length > 0
      ? r.diagnosis.join(", ")
      : (r.description || "tanpa gejala terperinci");
    healthLines.push(`• Sakit baru: ${name} — ${diag}`);
  }
  const inTreatment = tortoises.filter(t => t.is_currently_sick === true || t.status === "sakit");
  if (inTreatment.length > 0) {
    healthLines.push(`• Dalam perawatan: ${inTreatment.length} ekor`);
  }
  // Temuan dari foto
  const activeFindings = photoFindings.filter(f => f.status === "active" && f.finding_text);
  for (const f of activeFindings.slice(0, 3)) {
    healthLines.push(`🔎 ${String(f.finding_text).slice(0, 80)}`);
  }
  if (healthLines.length > 0) {
    lines.push("🤒 *KURA & KESEHATAN*");
    lines.push(...healthLines);
    lines.push("");
  }

  // ── PAKAN & LAIN-LAIN ──
  const pakanLines: string[] = [];
  const pakanBaskets = pakanRecords.reduce((s, p) => s + (p.basket_count || 0), 0);
  if (pakanBaskets > 0) {
    pakanLines.push(`• Pakan tercatat: ${pakanBaskets} keranjang`);
  }
  // Vitamin betina
  const vitBetinaSchedules = treatmentSchedules.filter(s =>
    s.mod_type === "vitamin" && (s.gender_filter === "betina" || (s.title || "").toLowerCase().includes("betina"))
  );
  if (vitBetinaSchedules.length > 0) {
    const vitTaskTitles = vitBetinaSchedules.map(s => (s.sop_task_title || s.title || "").toLowerCase()).filter(Boolean);
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
    pakanLines.push(`• Vitamin betina: ${vitDone ? "sudah" : "belum"} diberikan`);
  }
  // Azolla dipanen
  const azollaHarvested = stockMovements.some(m => m.feed_source === "panen_azola" && m.type === "masuk");
  if (azollaHarvested) {
    pakanLines.push(`• Azolla dipanen: ya`);
  }
  if (pakanLines.length > 0) {
    lines.push("🥬 *PAKAN & LAIN-LAIN*");
    lines.push(...pakanLines);
    lines.push("");
  }

  // ── BESOK ──
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowTasks = sopTasks.filter(t => t.frequency !== "harian" && isTaskScheduledForDate(t, tomorrow));
  const tomorrowTitles = tomorrowTasks.map(t => t.title).filter(Boolean).slice(0, 4);
  if (tomorrowTitles.length > 0) {
    lines.push("📅 *BESOK*");
    for (const title of tomorrowTitles) {
      lines.push(`• ${title}`);
    }
    lines.push("");
  }

  lines.push(`_Ringkasan otomatis Duta Tortoise · ${timeLabel}_`);

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

    const destination = settings.summary_destination || "individuals";
    const needsGroup = destination === "group" || destination === "both";
    if (needsGroup && (!settings.group_id || !settings.group_id.trim())) {
      return Response.json({ success: false, error: "ID Grup WhatsApp belum diisi. Pilih tujuan 'Nomor perorangan' atau isi ID grup." });
    }

    const now = new Date();
    const today = getTodayStr(now);

    // ── Manual: send immediately ──
    if (force) {
      if (type === "weekly") {
        const message = await buildWeeklySummary(base44, today, now);
        const result = await sendSummaryToDestinations(base44, settings, message, "weekly_summary");
        return Response.json(result);
      }
      const message = await buildDailySummary(base44, today, now, settings.daily_summary_show_points === true);
      const result = await sendSummaryToDestinations(base44, settings, message, "daily_summary");
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
      const result = await sendSummaryToDestinations(base44, settings, message, "daily_summary");
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
      const result = await sendSummaryToDestinations(base44, settings, message, "weekly_summary");
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