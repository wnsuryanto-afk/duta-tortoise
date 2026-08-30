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

import { checklistSah } from "@/lib/poinChecklist";

export async function claimIncidentalTask(task, user, { photoUrl, notes, noPhotoReason } = {}) {
  // Re-fetch untuk race condition protection (dua orang klaim bersamaan)
  const fresh = await base44.entities.IncidentalTask.get(task.id);
  if (fresh.status === "done") {
    throw new Error(`sudah dikerjakan ${fresh.done_by_name || "karyawan lain"}`);
  }
  // Hanya tugas resmi (pending) yang boleh diklaim. Usulan/cancelled tidak menghasilkan poin.
  if (fresh.status !== "pending") {
    throw new Error("Tugas belum bisa diklaim (menunggu persetujuan/dibatalkan)");
  }
  if (fresh.material_status === "waiting_materials") {
    throw new Error("Tugas masih menunggu barang tersedia");
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const taskId = `incidental_${task.id}`;
  const keeperNote = notes ? `📌 ${notes}` : "📌 Tugas dari Owner";
  const taskEntry = {
    task_id: taskId,
    task_title: task.title,
    points: task.points || 0,
    notes: "📌 Tugas dari Owner",
    photo_url: photoUrl || undefined,
    photo_taken_at: photoUrl ? format(new Date(), "HH:mm") : undefined,
    photo_notes: keeperNote,
  };

  const existing = await base44.entities.DailyChecklist.filter({
    employee_email: user.email,
    date: today,
  });
  const cl = checklistSah(existing);

  let dailyChecklistId;
  let kembaliKeAntrean = false;
  if (cl) {
    dailyChecklistId = cl.id;
    const already = (cl.completed_tasks || []).some((t) => t.task_id === taskId);
    if (!already) {
      // Dulu blok ini hanya berjalan bila status "draft" atau "submitted".
      // Bila checklist hari itu SUDAH DISETUJUI — pemilik menyetujui pagi,
      // tugas insidentil dikerjakan sore — poinnya hilang tanpa suara:
      // IncidentalTask tetap ditandai selesai dan tetap menunjuk checklist yang
      // isinya tidak pernah memuat tugas itu. Pekerjaannya nyata, upahnya nol.
      //
      // Sekarang tugasnya selalu masuk. Bila checklistnya sudah diputuskan,
      // ia kembali ke antrean persetujuan supaya poin barunya diperiksa —
      // `approved_points` lama sengaja dibiarkan agar pemilik masih melihat
      // keputusan yang tadi ia ambil.
      const completed_tasks = [...(cl.completed_tasks || []), taskEntry];
      const total_points_claimed = completed_tasks.reduce((s, t) => s + (t.points || 0), 0);
      kembaliKeAntrean = cl.status === "approved" || cl.status === "rejected";
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
    done_photo_url: photoUrl || undefined,
    done_notes: notes || (noPhotoReason ? `(Tanpa foto) ${noPhotoReason}` : undefined),
  });

  return { dailyChecklistId, kembaliKeAntrean };
}