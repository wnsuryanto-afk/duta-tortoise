/**
 * claimIncidentalTask — saat keeper mencentang tugas insidentil.
 *
 * Poin MASUK ke DailyChecklist hari itu (completed_tasks + total_points_claimed,
 * status="submitted") sehingga ikut alur approval yang sudah ada (SOPApproval →
 * approved_points → KPI slip gaji). TIDAK membuat jalur poin terpisah.
 *
 * Anti-dobel: cek apakah task_id sudah ada di completed_tasks sebelum append;
 * tandai IncidentalTask.status="done" agar tidak bisa diklaim 2x.
 */
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export async function claimIncidentalTask(task, user) {
  if (task.status === "done") return; // anti-dobel
  if (task.material_status === "waiting_materials") {
    throw new Error("Tugas masih menunggu barang tersedia");
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const taskId = `incidental_${task.id}`;
  const taskEntry = {
    task_id: taskId,
    task_title: task.title,
    points: task.points || 0,
    notes: "📌 Tugas dari Owner",
  };

  const existing = await base44.entities.DailyChecklist.filter({
    employee_email: user.email,
    date: today,
  });
  const cl = existing[0];

  let dailyChecklistId;
  if (cl) {
    dailyChecklistId = cl.id;
    const already = (cl.completed_tasks || []).some((t) => t.task_id === taskId);
    if (!already && (cl.status === "draft" || cl.status === "submitted")) {
      const completed_tasks = [...(cl.completed_tasks || []), taskEntry];
      const total_points_claimed = completed_tasks.reduce((s, t) => s + (t.points || 0), 0);
      await base44.entities.DailyChecklist.update(cl.id, {
        completed_tasks,
        total_points_claimed,
        status: "submitted",
      });
    }
  } else {
    const created = await base44.entities.DailyChecklist.create({
      date: today,
      employee_id: user.id,
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      completed_tasks: [taskEntry],
      total_points_claimed: task.points || 0,
      status: "submitted",
    });
    dailyChecklistId = created.id;
  }

  await base44.entities.IncidentalTask.update(task.id, {
    status: "done",
    done_at: format(new Date(), "HH:mm"),
    done_date: today,
    done_by_email: user.email,
    done_by_name: user.full_name || user.email,
    daily_checklist_id: dailyChecklistId,
  });
}