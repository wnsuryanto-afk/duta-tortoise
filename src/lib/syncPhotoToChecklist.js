import { base44 } from "@/api/base44Client";

/**
 * Sinkronisasi photo_url + timestamp ke DailyChecklist.completed_tasks entry.
 *
 * Mencocakkan entry berdasarkan judul+kandang yang dinormalisasi (sama dengan
 * kunci dedup di onMaintenanceDone). Jika entry belum ada (automation belum
 * selesai), retry dengan jeda.
 */
const PH_ENC = new Set(["", "tugas harian", "suplemen", "tugas_harian"]);
const normEnc = (e) => {
  const v = (e || "").toString().trim().toLowerCase();
  return PH_ENC.has(v) ? "" : v;
};
const normTitle = (t) => (t || "").toString().trim().toLowerCase();
const dedupKey = (title, enc) => `${normTitle(title)}__${normEnc(enc)}`;

export async function syncPhotoToChecklist({ employeeEmail, date, taskTitle, enclosure, photoUrl, takenAt, photoNotes }) {
  const key = dedupKey(taskTitle, enclosure);

  const trySync = async () => {
    const lists = await base44.entities.DailyChecklist.filter({ employee_email: employeeEmail, date });
    if (!lists.length) return false;
    const checklist = lists[0];
    const tasks = (checklist.completed_tasks || []).slice();
    const idx = tasks.findIndex(t => dedupKey(t.task_title, t.notes) === key);
    if (idx === -1) return false;
    const updated = { ...tasks[idx] };
    if (photoUrl !== undefined) { updated.photo_url = photoUrl; updated.photo_taken_at = takenAt; }
    if (photoNotes !== undefined) updated.photo_notes = photoNotes;
    tasks[idx] = updated;
    await base44.entities.DailyChecklist.update(checklist.id, { completed_tasks: tasks });
    return true;
  };

  if (await trySync()) return true;
  await new Promise(r => setTimeout(r, 1000));
  if (await trySync()) return true;
  await new Promise(r => setTimeout(r, 1500));
  return trySync();
}