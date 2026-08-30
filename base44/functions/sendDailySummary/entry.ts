import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSettings, normalizePhone, trackAICall } from "../../shared/whatsapp.ts";
import { terjadwalPada, tanggalDariWib } from "../../shared/jadwalSOP.ts";
import { perluDiperhatikan } from "../../shared/stok.ts";

/**
 * Batas pengambilan data untuk ringkasan harian.
 *
 * Sebelumnya 200, sementara peternakan ini sudah mencatat 178 kura. Begitu
 * jumlahnya lewat 200, ringkasan harian akan diam-diam menghitung sebagian
 * saja — tanpa galat, tanpa tanda apa pun di pesan yang terkirim.
 */
const BATAS_AMBIL = 2000;

/**
 * sendDailySummary — kirim ringkasan harian / mingguan / pagi ke grup WhatsApp.
 *
 * Dipanggil oleh scheduled automation dan/atau saat user membuka app
 * (pemicu di AuthContext, body kosong = scheduled check).
 *
 * Semua waktu disimpan & ditampilkan dalam WIB (Asia/Jakarta, UTC+7).
 * Konversi ke UTC dilakukan di sini saat membandingkan waktu server.
 *
 * Payload:
 *   { force: true }                    → kirim ringkasan SORE sekarang (manual test)
 *   { force: true, type: "weekly" }    → kirim ringkasan MINGGUAN sekarang
 *   { force: true, type: "morning" }   → kirim ringkasan PAGI sekarang
 *   {}                                 → scheduled check (kirim bila waktunya tiba)
 *
 * Anti-dobel: catat *_last_sent di settings menggunakan tanggal WIB.
 */
const FONNTE_API_URL = "https://api.fonnte.com/send";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ── WIB helpers ──
// Semua memakai Date yang sudah digeser +7 jam, lalu baca dengan getUTC* agar konsisten.
function getWIBNow(now: Date): Date {
  return new Date(now.getTime() + WIB_OFFSET_MS);
}

function wibDateToStr(wib: Date): string {
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-${String(wib.getUTCDate()).padStart(2, "0")}`;
}

function wibDateTimeStr(wib: Date): string {
  return `${wibDateToStr(wib)} ${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")} WIB`;
}

function formatDateID(wib: Date): string {
  return `${DAY_NAMES[wib.getUTCDay()]}, ${wib.getUTCDate()} ${MONTH_NAMES[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
}

/** Konversi jam WIB (HH:mm) ke menit UTC untuk perbandingan dengan waktu server. */
function wibTimeToUtcMinutes(wibTime: string): number {
  const [h, m] = (wibTime || "17:30").split(":").map(Number);
  let utcMin = (h * 60 + m) - (7 * 60);
  if (utcMin < 0) utcMin += 24 * 60;
  return utcMin;
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

/** Kirim ringkasan SORE ke tujuan terpilih (individu / grup / keduanya). */
async function sendSummaryToDestinations(base44, settings, message, notificationType) {
  const token = settings.fonnte_token;
  const destination = settings.summary_destination || "individuals";
  const results: any[] = [];

  const sendToIndividuals = destination === "individuals" || destination === "both";
  const sendToGroup = (destination === "group" || destination === "both") && settings.group_id && settings.group_id.trim();

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

  if (sendToGroup) {
    const groupId = settings.group_id.trim();
    const res = await sendAndLog(base44, token, groupId, "Grup WhatsApp", message, notificationType);
    results.push(res);
  }

  const anySuccess = results.some((r) => r.success);
  return { success: anySuccess, results };
}

/** Kirim ringkasan PAGI ke tujuan terpilih (memakai morning_* fields). */
async function sendMorningSummaryToDestinations(base44, settings, message, notificationType) {
  const token = settings.fonnte_token;
  const destination = settings.morning_summary_destination || "group";
  const results: any[] = [];

  const sendToIndividuals = destination === "individuals" || destination === "both";
  const sendToGroup = (destination === "group" || destination === "both") && settings.morning_group_id && settings.morning_group_id.trim();

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

  if (sendToGroup) {
    const groupId = settings.morning_group_id.trim();
    const res = await sendAndLog(base44, token, groupId, "Grup Pagi", message, notificationType);
    results.push(res);
  }

  const anySuccess = results.some((r) => r.success);
  return { success: anySuccess, results };
}

// ── AI helpers ──

async function buildAISorotan(base44, settings, ctx) {
  if (settings.ai_sorotan_enabled === false) return "";
  try {
    await trackAICall(base44, settings);
    const prompt = `Kamu asisten manajer peternakan kura sulcata. Tulis 3-4 kalimat bahasa Indonesia yang HANGAT dan LANGSUNG ke inti untuk pemilik farm: apa yang paling penting hari ini, apa yang perlu perhatian besok, dan satu apresiasi bila ada yang patut dipuji. Sebutkan angka konkret. Jangan mengulang seluruh daftar (daftar rinci sudah ada di bawah). Jangan menyebut gaji/uang. Jangan menggurui.

Data hari ini (${ctx.tanggal}):
- Kehadiran: ${ctx.kehadiran || "tidak ada data"}
- Tugas: ${ctx.tugas || "tidak ada data"}
- Belum selesai: ${ctx.belumSelesai || "tidak ada"}
- Perlu dibeli: ${ctx.perluDibeli || "tidak ada"}
- Kesehatan kura: ${ctx.kesehatan || "tidak ada laporan"}
- Pakan: ${ctx.pakan || "tidak ada data"}`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const text = typeof res === "string" ? res : (res?.response || res?.text || "");
    return String(text || "").trim();
  } catch {
    return "";
  }
}

async function buildWeeklyAIAnalysis(base44, settings, ctx) {
  if (settings.ai_weekly_enabled === false) return null;
  try {
    await trackAICall(base44, settings);
    const prompt = `Buat analisis mingguan untuk pemilik peternakan kura. Bandingkan dengan minggu lalu, sebutkan tren (membaik/menurun) dengan ANGKA, temukan POLA yang berulang, dan beri 3 saran konkret yang bisa dikerjakan minggu depan. Bahasa Indonesia, jujur tapi tidak menyalahkan orang, maksimal 8 kalimat + 3 saran. Jangan menyebut gaji atau nominal uang.

Data minggu ini vs minggu lalu:
${ctx}`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          analysis: { type: "string", description: "Analisis 5-8 kalimat" },
          suggestions: {
            type: "array",
            items: { type: "string" },
            description: "3 saran konkret untuk minggu depan"
          }
        }
      }
    });
    return res;
  } catch {
    return null;
  }
}

/**
 * Apakah task terjadwal pada hari yang diwakili `wib`?
 *
 * Dulu aturannya ditulis di sini dan diulang lagi persis di bawah sebagai
 * isTaskScheduledForDate. Dua salinan itu sama-sama meleset dari definisi di
 * src/lib/kepatuhanSOP.js dalam dua hal: keduanya mengabaikan `bulan_aktif`
 * (sehingga tugas "2 bulan sekali, bulan ganjil" diumumkan juga di bulan
 * genap), dan keduanya menganggap `bulanan` tanpa monthly_dates berarti setiap
 * hari, padahal artinya belum dijadwalkan. Sekarang keduanya memanggil satu
 * definisi bersama di ../../shared/jadwalSOP.ts.
 */
function isTaskScheduledToday(task, wib: Date) {
  return terjadwalPada(task, tanggalDariWib(wib));
}

/** Alias historis — sama persis, dipertahankan agar pemanggil lama tetap jalan. */
function isTaskScheduledForDate(task, wib: Date) {
  return terjadwalPada(task, tanggalDariWib(wib));
}

// ── RINGKASAN SORE ──
async function buildDailySummary(base44, settings, wibToday: string, wibNow: Date) {
  const lines: string[] = [];
  const dateLabel = formatDateID(wibNow);
  const timeLabel = `${String(wibNow.getUTCHours()).padStart(2, "0")}:${String(wibNow.getUTCMinutes()).padStart(2, "0")}`;

  lines.push(`🐢 *DUTA TORTOISE — ${dateLabel}*`);
  lines.push("");

  const [
    users, attendances, checklists, sopTasks,
    warehouseItems, feedStocks, incidentalTasks, toolRequests,
    sickRecords, photoFindings, pakanRecords, treatmentSchedules,
    stockMovements, tortoises,
  ] = await Promise.all([
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Attendance.filter({ date: wibToday }),
    base44.asServiceRole.entities.DailyChecklist.filter({ date: wibToday }),
    base44.asServiceRole.entities.SOPTask.filter({ is_active: true }),
    base44.asServiceRole.entities.WarehouseItem.list("-name", 100),
    base44.asServiceRole.entities.FeedStock.list("-name", 100),
    base44.asServiceRole.entities.IncidentalTask.filter({ is_active: true }),
    base44.asServiceRole.entities.ToolRequest.filter({ status: "menunggu" }),
    base44.asServiceRole.entities.HealthRecord.filter({ type: "sakit", date: wibToday }),
    base44.asServiceRole.entities.PhotoFinding.filter({ date: wibToday }),
    base44.asServiceRole.entities.PakanHarian.filter({ log_date: wibToday }),
    base44.asServiceRole.entities.TreatmentSchedule.filter({ is_active: true }),
    base44.asServiceRole.entities.StockMovement.filter({ date: wibToday }),
    base44.asServiceRole.entities.Tortoise.list("-name", BATAS_AMBIL),
  ]);

  // ── KEHADIRAN ──
  const dailyStaff = users.filter(u => ["keeper", "kepala_feeder"].includes(u.role));
  const nonDailyStaff = users.filter(u => ["admin", "manajer", "owner"].includes(u.role));

  const attByKey = new Map();
  for (const a of attendances) {
    const key = a.employee_email || a.employee_name;
    if (!key) continue;
    if (!attByKey.has(key)) attByKey.set(key, []);
    attByKey.get(key).push(a);
  }

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

  for (const s of nonDailyStaff) {
    processedKeys.add(s.email);
    const records = attByKey.get(s.email) || [];
    const summary = summarizeAttendance(records);
    if (!summary) continue;
    const roleLabel = s.role === "owner" ? "Owner" : s.role === "manajer" ? "Manajer" : "Admin";
    attLines.push(`• ${roleLabel} ${s.full_name || s.email}: masuk ${summary.earliest.check_in} – ${summary.out}${summary.dupMark}`);
  }

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
  const scheduledToday = sopTasks.filter(t => isTaskScheduledToday(t, wibNow));
  const Y_sop = scheduledToday.length;
  const todayIncidental = incidentalTasks.filter(t => t.due_date === wibToday && t.status !== "cancelled");
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
    // Angka per orang ditulis sebagai JUMLAH, bukan persentase.
    //
    // src/lib/kepatuhanSOP.js memutuskan hal ini dengan alasan yang tegas:
    // sebagian besar tugas berskala "bersama" — sekali dikerjakan siapa pun,
    // selesai untuk semua. Membagi persentasenya per orang membuat angka
    // seseorang jatuh hanya karena rekannya lebih dulu mengerjakan, bukan
    // karena ia lalai. Pesan ini masuk ke grup WhatsApp yang dibaca kipernya
    // sendiri, jadi "Angsolo: 6/17 selesai (35%)" adalah tuduhan yang tidak
    // dimaksudkan siapa pun.
    //
    // Rumus lamanya juga menutupi gejalanya sendiri: penyebut dinaikkan ke X
    // bila X melebihi jumlah tugas terjadwal, supaya hasilnya tidak lewat 100%.
    // Yang perlu diperbaiki bukan tampilannya, melainkan pembaginya.
    let line = `• ${cl.employee_name}: ${X} tugas`;
    if (myIncidental > 0) line += ` (+${myIncidental} insidental)`;
    if (settings.daily_summary_show_points === true) {
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
    // Kepatuhan diukur untuk TIM, satu angka untuk hari itu — bukan satu angka
    // per orang. Penyebutnya jumlah tugas terjadwal; pembilangnya tugas yang
    // sudah tersentuh siapa pun.
    const selesaiTim = scheduledToday.filter(t =>
      allCompletedTitles.has((t.title || "").toLowerCase())
    ).length;
    if (Y_sop > 0) {
      const pctTim = Math.round((selesaiTim / Y_sop) * 100);
      lines.push(`Kepatuhan tim: ${selesaiTim}/${Y_sop} tugas (${pctTim}%)`);
    }
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
      .filter(perluDiperhatikan)
      .map(i => ({ name: i.name, stock: i.current_stock || 0, min: i.minimum_stock || 0, unit: i.unit || "", category: i.category || "lainnya" })),
    ...feedStocks
      .filter(perluDiperhatikan)
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

  const waitingTasks = incidentalTasks.filter(t => t.material_status === "waiting_materials" && t.status === "pending");
  for (const wt of waitingTasks.slice(0, 3)) {
    const missing = (wt.required_items || []).filter(r => !r.is_available).map(r => r.item_name).filter(Boolean);
    if (missing.length > 0) {
      buyLines.push(`⏳ ${wt.title}: butuh ${missing.join(", ")}`);
    }
  }
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
  const tomorrow = new Date(wibNow);
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

  // ── AI SOROTAN ──
  if (settings.ai_sorotan_enabled !== false) {
    const aiContext = {
      tanggal: dateLabel,
      kehadiran: attLines.join("; "),
      tugas: taskLines.join("; "),
      belumSelesai: belumSelesai.join(", "),
      perluDibeli: buyLines.join("; "),
      kesehatan: healthLines.join("; "),
      pakan: pakanLines.join("; "),
    };
    const sorotan = await buildAISorotan(base44, settings, aiContext);
    if (sorotan) {
      lines.splice(2, 0, "💡 *SOROTAN HARI INI*", sorotan, "");
    }
  }

  // ── TUGAS PER ORANG (PR yang belum selesai) ──
  // Ringkasan lama hanya melaporkan keadaan farm, tanpa menyebut siapa yang
  // harus mengerjakan apa. Bagian ini menautkan setiap pekerjaan tertunda ke
  // peran pemiliknya, supaya tidak ada yang menunggu satu sama lain.
  // Bisa dimatikan owner lewat Pengaturan WhatsApp (summary_show_pr).
  if (settings?.summary_show_pr !== false) try {
    const [shoppingList, pembelian, kasbonPending, pendingApproval, incompleteTortoises] =
      await Promise.all([
        base44.asServiceRole.entities.ShoppingList.filter({ status: "belum_dibeli" }).catch(() => []),
        base44.asServiceRole.entities.PembelianBarang.filter({ status: "dipesan" }).catch(() => []),
        base44.asServiceRole.entities.Kasbon.filter({ status: "pending" }).catch(() => []),
        base44.asServiceRole.entities.DailyChecklist.filter({ status: "submitted" }).catch(() => []),
        Promise.resolve(tortoises),
      ]);

    const rp = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");

    // PIC ditentukan owner lewat Pengaturan WhatsApp. Versi lama menyebut
    // SEMUA orang ber-role sama, sehingga "Pembelian" tertulis atas nama tiga
    // orang padahal yang belanja hanya satu. Bila belum diatur, jatuh ke role.
    const byEmail = (email) => users.find((u) => u.email === email);
    const firstName = (u) => (u?.full_name || u?.email || "").split(" ")[0];
    const picNama = (settingEmail, fallbackRole) => {
      const u = settingEmail ? byEmail(settingEmail) : null;
      if (u) return firstName(u);
      const arr = users.filter((x) => x.role === fallbackRole);
      return arr.map(firstName).join(" / ") || "-";
    };
    const namaPembelian = picNama(settings?.pic_pembelian, "owner");
    const namaAdmin = picNama(settings?.pic_administrasi, "admin");
    const namaApproval = picNama(settings?.pic_approval, "manajer");

    const picLines = [];

    // ── Pembelian (owner) ──
    const belanjaOwner = [];
    if (shoppingList.length > 0) {
      const totalEst = shoppingList.reduce((t, i) => t + (i.total_est || 0), 0);
      const urgent = shoppingList
        .filter((i) => i.priority === "segera")
        .sort((a, b) => (b.total_est || 0) - (a.total_est || 0));
      belanjaOwner.push(
        `  • ${shoppingList.length} barang belum dibeli${urgent.length ? ` (${urgent.length} SEGERA)` : ""} — est ${rp(totalEst)}`
      );

      // Sebut namanya. Tanpa ini penerima tidak tahu apa yang harus dibeli
      // dan harus membuka aplikasi hanya untuk melihat daftarnya.
      const urut = [...shoppingList].sort((a, b) => {
        const rank = { segera: 0, minggu_ini: 1, bulan_ini: 2, opsional: 3 };
        const ra = rank[a.priority] ?? 9, rb = rank[b.priority] ?? 9;
        if (ra !== rb) return ra - rb;
        return (b.total_est || 0) - (a.total_est || 0);
      });
      // SEMUA barang SEGERA disebut satu per satu — tujuannya agar daftar ini
      // bisa dipakai langsung dari WhatsApp tanpa membuka aplikasi. Sisanya
      // cukup disebut jumlahnya supaya pesan tidak menjadi terlalu panjang.
      const baris = (it) => {
        const nm = it.nama_barang || it.item_name || "(tanpa nama)";
        const jml = it.jumlah ?? it.qty_needed ?? 0;
        const sat = it.satuan || it.unit || "";
        return `${nm} — ${jml} ${sat}${it.total_est ? ` · ${rp(it.total_est)}` : ""}`;
      };

      for (const it of urgent) {
        belanjaOwner.push(`     ‼️ ${baris(it)}`);
      }

      const sisa = urut.filter((i) => i.priority !== "segera");
      const tampilSisa = sisa.slice(0, 5);
      for (const it of tampilSisa) {
        belanjaOwner.push(`     ▫️ ${baris(it)}`);
      }
      if (sisa.length > tampilSisa.length) {
        belanjaOwner.push(
          `     …${sisa.length - tampilSisa.length} barang lain tidak mendesak, lihat menu Harus Dibeli`
        );
      }
    }
    if (pembelian.length > 0) {
      belanjaOwner.push(`  • ${pembelian.length} pesanan masih ditunggu barangnya`);
    }
    const utang = pembelian.filter((p) => p.is_talangan && p.status_utang === "belum_dibayar");
    if (utang.length > 0) {
      const totalUtang = utang.reduce((t, p) => t + (p.total_bayar || 0), 0);
      belanjaOwner.push(`  • Talangan belum dilunasi: ${rp(totalUtang)}`);
    }
    if (belanjaOwner.length > 0) {
      picLines.push(`👤 *Pembelian — ${namaPembelian}*`);
      picLines.push(...belanjaOwner);
    }

    // ── Administrasi (admin) ──
    const adminLines = [];
    const tanpaBerat = incompleteTortoises.filter(
      (t) => t.status === "aktif" && !t.is_archived && !t.weight_grams
    ).length;
    const tanpaFoto = incompleteTortoises.filter(
      (t) => t.status === "aktif" && !t.is_archived && !(t.photos || []).length
    ).length;
    if (tanpaBerat > 0) adminLines.push(`  • ${tanpaBerat} kura belum ada data berat`);
    if (tanpaFoto > 0) adminLines.push(`  • ${tanpaFoto} kura belum ada foto`);
    if (kasbonPending.length > 0) adminLines.push(`  • ${kasbonPending.length} kasbon menunggu ditinjau`);
    if (toolRequests.length > 0) adminLines.push(`  • ${toolRequests.length} pengajuan barang menunggu`);
    if (adminLines.length > 0) {
      picLines.push(`👤 *Administrasi — ${namaAdmin}*`);
      picLines.push(...adminLines);
    }

    // ── Pengawasan tim (manajer) ──
    const mgrLines = [];
    if (pendingApproval.length > 0) {
      mgrLines.push(`  • ${pendingApproval.length} checklist menunggu approval poin`);
    }
    const sakitAktif = tortoises.filter((t) => t.is_currently_sick).length;
    if (sakitAktif > 0) {
      mgrLines.push(`  • ${sakitAktif} kura masih berstatus sakit, pastikan perawatannya jalan`);
    }
    if (mgrLines.length > 0) {
      picLines.push(`👤 *Approval & Pengawasan — ${namaApproval}*`);
      picLines.push(...mgrLines);
    }

    if (picLines.length > 0) {
      lines.push("📋 *PR MASING-MASING*");
      lines.push(...picLines);
      lines.push("");
    }
  } catch { /* bagian ini tidak boleh menggagalkan seluruh ringkasan */ }

  // ── PERINGATAN TERTUNDA ──
  try {
    const pendingAlerts = await base44.asServiceRole.entities.WhatsAppLog.filter({ status: "pending_ai" });
    if (pendingAlerts.length > 0) {
      const alertLines = pendingAlerts.slice(0, 5).map(a => {
        const icon = a.notification_type === "sick_report" ? "🤒" : a.notification_type === "low_stock" ? "📦" : "🔴";
        return `${icon} ${(a.message_preview || "").slice(0, 80)}`;
      });
      lines.push("⚠️ *PERINGATAN TERTUNDA*");
      lines.push(...alertLines);
      lines.push("");
    }
  } catch {}

  // Penanda versi: cara paling cepat memastikan fungsi backend yang berjalan
  // sudah versi terbaru atau masih versi lama yang ter-deploy sebelumnya.
  lines.push(`_Ringkasan otomatis Duta Tortoise · ${timeLabel} WIB · v3_`);

  return lines.join("\n");
}

// ── RINGKASAN PAGI ──
// Grup ini berisi keeper → orientasi PERINTAH KERJA, bukan daftar lengkap / poin.
async function buildMorningSummary(base44, settings, wibToday: string, wibNow: Date) {
  const lines: string[] = [];
  const dateLabel = formatDateID(wibNow);

  lines.push(`🌅 *DUTA TORTOISE — RENCANA KERJA HARI INI*`);
  lines.push(`📅 ${dateLabel}`);
  lines.push("");

  // Yesterday WIB date
  const wibYesterday = new Date(wibNow);
  wibYesterday.setUTCDate(wibYesterday.getUTCDate() - 1);
  const wibYesterdayStr = wibDateToStr(wibYesterday);

  const [
    sopTasks, checklistsYesterday, sickRecords, diagnosisProtocols,
    warehouseItems, feedStocks, tortoises, incidentalTasks,
  ] = await Promise.all([
    base44.asServiceRole.entities.SOPTask.filter({ is_active: true }),
    base44.asServiceRole.entities.DailyChecklist.filter({ date: wibYesterdayStr }),
    base44.asServiceRole.entities.HealthRecord.filter({ type: "sakit" }),
    base44.asServiceRole.entities.DiagnosisProtocol.filter({ is_active: true }),
    base44.asServiceRole.entities.WarehouseItem.list("-name", 100),
    base44.asServiceRole.entities.FeedStock.list("-name", 100),
    base44.asServiceRole.entities.Tortoise.list("-name", BATAS_AMBIL),
    base44.asServiceRole.entities.IncidentalTask.filter({ is_active: true }),
  ]);

  // ── 1. CARRY-OVER (tugas kemarin belum selesai) ──
  const yesterdayScheduled = sopTasks.filter(t => isTaskScheduledForDate(t, wibYesterday));
  const yesterdayCompletedTitles = new Set();
  for (const cl of checklistsYesterday) {
    for (const t of (cl.completed_tasks || [])) {
      if (t.task_title) yesterdayCompletedTitles.add(t.task_title.toLowerCase());
    }
  }
  const carryOver = yesterdayScheduled
    .filter(t => !yesterdayCompletedTitles.has((t.title || "").toLowerCase()))
    .map(t => t.title)
    .filter(Boolean);
  const yesterdayIncidental = incidentalTasks.filter(t =>
    t.due_date === wibYesterdayStr && t.status === "pending"
  );

  if (carryOver.length > 0 || yesterdayIncidental.length > 0) {
    lines.push("📋 *TUGAS KEMARIN BELUM SELESAI*");
    for (const title of carryOver.slice(0, 8)) {
      lines.push(`• ${title}`);
    }
    for (const t of yesterdayIncidental.slice(0, 4)) {
      const assignee = t.assigned_to_name ? ` → ${t.assigned_to_name}` : "";
      lines.push(`• ${t.title}${assignee}`);
    }
    lines.push("");
  }

  // ── 2. BAHAN/STOK HABIS YANG MEMBLOKIR TUGAS ──
  const blockedTasks = sopTasks.filter(t => {
    if (!t.required_skus || t.required_skus.length === 0) return false;
    return t.required_skus.some(sku => {
      const item = warehouseItems.find(w => w.sku === sku);
      return item && (item.current_stock || 0) <= 0;
    });
  });

  if (blockedTasks.length > 0) {
    lines.push("🚫 *TUGAS TERBLOKIR (STOK HABIS)*");
    for (const t of blockedTasks.slice(0, 6)) {
      const missingItems = (t.required_skus || []).map(sku => {
        const item = warehouseItems.find(w => w.sku === sku);
        return item && (item.current_stock || 0) <= 0 ? item.name : null;
      }).filter(Boolean);
      lines.push(`• ${t.title} — butuh: ${missingItems.join(", ")}`);
    }
    lines.push("");
  }

  // ── 3. KURA SAKIT + LANGKAH PERAWATAN ──
  const sickTortoises = tortoises.filter(t => t.is_currently_sick === true || t.status === "sakit");
  if (sickTortoises.length > 0) {
    lines.push("🤒 *KURA SAKIT — PERAWATAN HARI INI*");
    for (const t of sickTortoises.slice(0, 8)) {
      const label = t.code || t.name;
      const records = sickRecords.filter(r => r.tortoise_id === t.id)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const latest = records[0];
      const diagCodes = latest?.diagnosis || [];
      const protocols = diagCodes.map(c => diagnosisProtocols.find(p => p.diagnosis_code === c)).filter(Boolean);
      const steps = protocols.flatMap(p => p.perawatan_pendukung || []);
      lines.push(`• ${label}${diagCodes.length > 0 ? ` (${diagCodes.join(", ")})` : ""}`);
      for (const step of steps.slice(0, 4)) {
        lines.push(`  → ${step}`);
      }
    }
    lines.push("");
  }

  // ── 4. TUGAS MINGGUAN/BULANAN JATUH TEMPO HARI INI ──
  const dueToday = sopTasks.filter(t =>
    t.frequency !== "harian" && isTaskScheduledToday(t, wibNow)
  );
  if (dueToday.length > 0) {
    lines.push("📅 *TUGAS KHUSUS HARI INI*");
    for (const t of dueToday.slice(0, 8)) {
      lines.push(`• ${t.title}`);
    }
    lines.push("");
  }

  lines.push("_Perintah kerja otomatis Duta Tortoise_");

  return lines.join("\n");
}

// ── RINGKASAN MINGGUAN ──
async function buildWeeklySummary(base44, settings, wibToday: string, wibNow: Date) {
  const lines: string[] = [];
  const dateLabel = formatDateID(wibNow);

  const weekAgo = new Date(wibNow);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekAgoStr = wibDateToStr(weekAgo);
  const weekStartLabel = formatDateID(weekAgo);

  const twoWeeksAgo = new Date(wibNow);
  twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 13);
  const twoWeeksAgoStr = wibDateToStr(twoWeeksAgo);

  const [users, allAttendances, allChecklists, sickRecords, incidentalTasks, pakanRecords, photoFindings] = await Promise.all([
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Attendance.list("-date", 500),
    base44.asServiceRole.entities.DailyChecklist.list("-date", 500),
    base44.asServiceRole.entities.HealthRecord.filter({ type: "sakit" }),
    base44.asServiceRole.entities.IncidentalTask.list("-due_date", 500),
    base44.asServiceRole.entities.PakanHarian.list("-log_date", 500),
    base44.asServiceRole.entities.PhotoFinding.list("-date", 500),
  ]);

  const staff = users.filter(u => ["keeper", "kepala_feeder"].includes(u.role));

  const thisWeekAtt = allAttendances.filter(a => a.date >= weekAgoStr && a.date <= wibToday && a.status === "hadir");
  const lastWeekAtt = allAttendances.filter(a => a.date >= twoWeeksAgoStr && a.date < weekAgoStr && a.status === "hadir");
  const thisWeekCl = allChecklists.filter(cl => cl.date >= weekAgoStr && cl.date <= wibToday);
  const lastWeekCl = allChecklists.filter(cl => cl.date >= twoWeeksAgoStr && cl.date < weekAgoStr);
  const thisWeekSick = sickRecords.filter(r => r.date >= weekAgoStr && r.date <= wibToday);
  const lastWeekSick = sickRecords.filter(r => r.date >= twoWeeksAgoStr && r.date < weekAgoStr);
  const thisWeekPakan = pakanRecords.filter(p => p.log_date >= weekAgoStr && p.log_date <= wibToday);
  const lastWeekPakan = pakanRecords.filter(p => p.log_date >= twoWeeksAgoStr && p.log_date < weekAgoStr);
  const thisWeekInc = incidentalTasks.filter(t => t.due_date >= weekAgoStr && t.due_date <= wibToday);
  const lastWeekInc = incidentalTasks.filter(t => t.due_date >= twoWeeksAgoStr && t.due_date < weekAgoStr);
  const thisWeekFindings = photoFindings.filter(f => f.date >= weekAgoStr && f.date <= wibToday && f.status === "active");
  const lastWeekFindings = photoFindings.filter(f => f.date >= twoWeeksAgoStr && f.date < weekAgoStr && f.status === "active");

  let ctx = `Periode: ${weekStartLabel} s/d ${dateLabel}\n\n`;
  for (const s of staff) {
    const attThis = thisWeekAtt.filter(a => a.employee_email === s.email).length;
    const attLast = lastWeekAtt.filter(a => a.employee_email === s.email).length;
    const tasksThis = thisWeekCl.filter(cl => cl.employee_email === s.email).reduce((sum, cl) => sum + ((cl.completed_tasks || []).length), 0);
    const tasksLast = lastWeekCl.filter(cl => cl.employee_email === s.email).reduce((sum, cl) => sum + ((cl.completed_tasks || []).length), 0);
    ctx += `${s.full_name || s.email}: hadir ${attThis} hari (minggu lalu ${attLast}), ${tasksThis} tugas selesai (minggu lalu ${tasksLast})\n`;
  }
  ctx += `\nLaporan sakit: ${thisWeekSick.length} (minggu lalu ${lastWeekSick.length})\n`;
  ctx += `Temuan foto aktif: ${thisWeekFindings.length} (minggu lalu ${lastWeekFindings.length})\n`;
  ctx += `Pakan: ${thisWeekPakan.reduce((s, p) => s + (p.basket_count || 0), 0)} keranjang (minggu lalu ${lastWeekPakan.reduce((s, p) => s + (p.basket_count || 0), 0)})\n`;
  ctx += `Tugas insidentil: ${thisWeekInc.filter(t => t.status === "done").length} selesai, ${thisWeekInc.filter(t => t.status === "pending").length} tertunda (minggu lalu: ${lastWeekInc.filter(t => t.status === "done").length} selesai)\n`;

  lines.push(`📊 *LAPORAN MINGGU INI — ${weekStartLabel} s/d ${dateLabel}*`);
  lines.push("");

  const aiResult = await buildWeeklyAIAnalysis(base44, settings, ctx);

  if (aiResult && aiResult.analysis) {
    lines.push(aiResult.analysis);
    lines.push("");
    if (Array.isArray(aiResult.suggestions) && aiResult.suggestions.length > 0) {
      lines.push("📌 *3 SARAN MINGGU DEPAN*");
      aiResult.suggestions.slice(0, 3).forEach((s, i) => {
        lines.push(`${i + 1}. ${s}`);
      });
      lines.push("");
    }
  } else {
    lines.push("📊 *Rekap Minggu Ini*");
    for (const s of staff) {
      const attDays = thisWeekAtt.filter(a => a.employee_email === s.email).length;
      const myChecklists = thisWeekCl.filter(cl => cl.employee_email === s.email);
      const totalTasks = myChecklists.reduce((sum, cl) => sum + ((cl.completed_tasks || []).length), 0);
      lines.push(`• ${s.full_name || s.email}: hadir ${attDays} hari, ${totalTasks} tugas selesai`);
    }
    lines.push("");
    if (thisWeekSick.length > 0) {
      lines.push(`🤒 *Kura sakit minggu ini*: ${thisWeekSick.length} laporan`);
      lines.push("");
    }
    lines.push("🙏 Terima kasih atas kerja keras minggu ini!");
    lines.push("");
  }

  lines.push("_Ringkasan otomatis dari aplikasi Duta Tortoise_");

  return lines.join("\n");
}

// ── MAIN HANDLER ──
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

    const now = new Date();
    const wibNow = getWIBNow(now);
    const wibToday = wibDateToStr(wibNow);

    // ── Manual: send immediately ──
    if (force) {
      if (type === "morning") {
        if (!settings.morning_group_id || !settings.morning_group_id.trim()) {
          return Response.json({ success: false, error: "ID Grup Pagi belum diisi. Isi di Pengaturan WhatsApp → Ringkasan Pagi." });
        }
        const message = await buildMorningSummary(base44, settings, wibToday, wibNow);
        const result = await sendMorningSummaryToDestinations(base44, settings, message, "daily_summary");
        return Response.json(result);
      }
      if (type === "weekly") {
        const message = await buildWeeklySummary(base44, settings, wibToday, wibNow);
        const result = await sendSummaryToDestinations(base44, settings, message, "weekly_summary");
        return Response.json(result);
      }
      const message = await buildDailySummary(base44, settings, wibToday, wibNow);
      const result = await sendSummaryToDestinations(base44, settings, message, "daily_summary");
      return Response.json(result);
    }

    // ── Scheduled checks — SEMUA dalam WIB, dari objek yang sama ──
    // wibMinutes DAN wibToday keduanya dari wibNow. Tidak ada pencampuran zona waktu.
    const wibMinutes = wibNow.getUTCHours() * 60 + wibNow.getUTCMinutes();
    const wibSentAt = wibDateTimeStr(wibNow); // untuk disimpan ke *_last_sent

    function parseWibMinutes(t: string): number {
      const [h, m] = (t || "00:00").split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    // Ambil bagian tanggal "YYYY-MM-DD" dari nilai *_last_sent (10 karakter pertama)
    function lastSentDate(s: string): string {
      return (s || "").slice(0, 10);
    }

    // 1. Ringkasan PAGI
    if (
      settings.morning_summary_enabled === true &&
      settings.morning_group_id && settings.morning_group_id.trim() &&
      lastSentDate(settings.morning_summary_last_sent) !== wibToday
    ) {
      const scheduledMin = parseWibMinutes(settings.morning_summary_time || "07:00");
      const diff = wibMinutes - scheduledMin; // menit setelah jadwal (negatif = belum saatnya)
      if (diff >= 0) { // lewat jadwal = kirim (anti-dobel dijaga last_sent)
        const message = await buildMorningSummary(base44, settings, wibToday, wibNow);
        const result = await sendMorningSummaryToDestinations(base44, settings, message, "daily_summary");
        if (result.success) {
          try {
            await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
              morning_summary_last_sent: wibSentAt,
            });
          } catch {}
        }
      }
    }

    // 2. Ringkasan SORE
    if (settings.daily_summary_enabled && lastSentDate(settings.daily_summary_last_sent) !== wibToday) {
      const scheduledMin = parseWibMinutes(settings.daily_summary_time || "16:30");
      const diff = wibMinutes - scheduledMin;
      if (diff >= 0) {
        const destination = settings.summary_destination || "individuals";
        const needsGroup = destination === "group" || destination === "both";
        if (!needsGroup || (settings.group_id && settings.group_id.trim())) {
          const message = await buildDailySummary(base44, settings, wibToday, wibNow);
          const result = await sendSummaryToDestinations(base44, settings, message, "daily_summary");
          if (result.success) {
            try {
              await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
                daily_summary_last_sent: wibSentAt,
              });
            } catch {}
            // Mark pending_ai alerts as processed
            try {
              const pendingAlerts = await base44.asServiceRole.entities.WhatsAppLog.filter({ status: "pending_ai" });
              for (const alert of pendingAlerts) {
                await base44.asServiceRole.entities.WhatsAppLog.update(alert.id, {
                  status: "terkirim",
                  error_reason: "Dimasukkan ke ringkasan harian",
                });
              }
            } catch {}
          }
        }
      }
    }

    // 3. Ringkasan MINGGUAN (Sabtu WIB)
    const isSaturdayWib = wibNow.getUTCDay() === 6;
    if (settings.weekly_summary_enabled && isSaturdayWib && lastSentDate(settings.weekly_summary_last_sent) !== wibToday) {
      const scheduledMin = parseWibMinutes(settings.daily_summary_time || "16:30");
      const diff = wibMinutes - scheduledMin;
      if (diff >= 0) {
        const message = await buildWeeklySummary(base44, settings, wibToday, wibNow);
        const result = await sendSummaryToDestinations(base44, settings, message, "weekly_summary");
        if (result.success) {
          try {
            await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
              weekly_summary_last_sent: wibSentAt,
            });
          } catch {}
        }
      }
    }

    return Response.json({ success: true, message: "Scheduled check completed" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}