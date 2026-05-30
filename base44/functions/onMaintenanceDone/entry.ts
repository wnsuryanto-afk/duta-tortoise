import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    // Hanya proses jika is_done=true dan ada done_by
    if (!data || !data.is_done || !data.done_by) {
      return Response.json({ ok: true, skipped: "not done or no done_by" });
    }

    const log = data;
    const poinEarned = log.poin_earned || 5; // default 5 poin per task

    // Tentukan tanggal berdasarkan freq
    let taskDate;
    if (log.freq === "harian" && log.period_key && log.period_key.match(/^\d{4}-\d{2}-\d{2}$/)) {
      taskDate = log.period_key;
    } else {
      taskDate = new Date().toISOString().split("T")[0];
    }

    // Cari DailyChecklist yang sudah ada untuk karyawan + tanggal ini
    const existing = await base44.asServiceRole.entities.DailyChecklist.filter({
      date: taskDate,
      employee_name: log.done_by,
    });

    const taskEntry = {
      task_id: log.id || log.check_key,
      task_title: log.item_label || log.item_id,
      points: poinEarned,
      notes: log.enclosure_name || "",
    };

    if (existing && existing.length > 0) {
      const checklist = existing[0];
      const currentTasks = checklist.completed_tasks || [];
      // Cek apakah task sudah ada (hindari duplikat)
      const alreadyExists = currentTasks.some(t => t.task_id === taskEntry.task_id);
      if (!alreadyExists) {
        await base44.asServiceRole.entities.DailyChecklist.update(checklist.id, {
          completed_tasks: [...currentTasks, taskEntry],
          total_points_claimed: (checklist.total_points_claimed || 0) + poinEarned,
        });
      }
    } else {
      // Buat DailyChecklist baru
      await base44.asServiceRole.entities.DailyChecklist.create({
        date: taskDate,
        employee_name: log.done_by,
        employee_email: log.done_by_email || "",
        completed_tasks: [taskEntry],
        total_points_claimed: poinEarned,
        approved_points: 0,
        status: "submitted",
      });
    }

    // ══════════════════════════════════════════════════
    // 13. POIN MILESTONE (300 / 500 / 750 / 1000)
    // ══════════════════════════════════════════════════
    if (log.done_by_email) {
      const monthKey = taskDate.substring(0, 7);
      const allThisMonth = await base44.asServiceRole.entities.DailyChecklist.filter({});
      const monthlyTotal = allThisMonth
        .filter(cl => cl.employee_email === log.done_by_email && (cl.date || "").startsWith(monthKey))
        .reduce((sum, cl) => sum + (cl.approved_points || cl.total_points_claimed || 0), 0);

      const milestones = [300, 500, 750, 1000];
      for (const milestone of milestones) {
        if (monthlyTotal >= milestone) {
          // Cek apakah sudah ada notif milestone ini bulan ini
          const existingMilestone = await base44.asServiceRole.entities.Notification.filter({
            recipient_email: log.done_by_email,
            category: "lainnya",
          });
          const alreadyHas = existingMilestone.some(n =>
            n.title?.includes(`${milestone} Poin`) &&
            (n.created_at || n.created_date || "").startsWith(monthKey) &&
            !n.is_dismissed
          );
          if (!alreadyHas) {
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: log.done_by_email,
              title: `Selamat! Kamu Sudah ${milestone} Poin Bulan Ini!`,
              message: `Poin kamu sudah ${monthlyTotal} dari target 300 poin. Terus semangat — makin banyak poin, makin besar bonus!`,
              type: "success",
              priority: "rendah",
              category: "lainnya",
              related_entity_id: `milestone_${log.done_by_email}_${milestone}_${monthKey}`,
              related_entity_type: "DailyChecklist",
              is_read: false,
              is_dismissed: false,
              created_at: new Date().toISOString(),
            });
          }
          break; // hanya notif milestone tertinggi yang baru dicapai
        }
      }
    }

    return Response.json({ ok: true, poin: poinEarned, date: taskDate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});