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

    return Response.json({ ok: true, poin: poinEarned, date: taskDate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});