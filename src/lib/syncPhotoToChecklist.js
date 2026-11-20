import { base44 } from "@/api/base44Client";
import { cariTugas } from "@/lib/kunciTugas";

/**
 * Sinkronisasi photo_url + timestamp ke DailyChecklist.completed_tasks entry.
 *
 * Mencocakkan entry berdasarkan judul+kandang yang dinormalisasi (sama dengan
 * kunci dedup di onMaintenanceDone). Jika entry belum ada (automation belum
 * selesai), retry dengan jeda.
 */
export async function syncPhotoToChecklist({ employeeEmail, date, taskTitle, enclosure, photoUrl, takenAt, photoNotes }) {
  const trySync = async () => {
    const lists = await base44.entities.DailyChecklist.filter({ employee_email: employeeEmail, date });
    if (!lists.length) return false;
    const checklist = lists[0];
    const tasks = (checklist.completed_tasks || []).slice();
    const idx = cariTugas(tasks, taskTitle, enclosure);
    if (idx === -1) return false;
    const updated = { ...tasks[idx] };
    if (photoUrl !== undefined) { updated.photo_url = photoUrl; updated.photo_taken_at = takenAt; }
    if (photoNotes !== undefined) updated.photo_notes = photoNotes;
    tasks[idx] = updated;
    await base44.entities.DailyChecklist.update(checklist.id, { completed_tasks: tasks });
    return true;
  };

  /*
    RENTANG COBA-ULANG — diperpanjang 20 Nov 2026, diukur dari data.

    Baris yang ditambal di sini dibuat oleh automasi server
    (onMaintenanceDone). Sampai ia selesai, `cariTugas` mengembalikan -1 dan
    fotonya tidak punya tempat untuk ditempel.

    Rentang lama 0 + 1,0 + 1,5 detik = menyerah setelah 2,5 detik, tanpa
    suara. Antara 10–20 Nov 2026, 61 dari 110 tugas wajib foto berakhir tanpa
    foto di checklist sementara fotonya ADA di MaintenanceLog — inilah salah
    satu dari dua sebabnya (yang lain: lomba tulis dengan syncAIVerification,
    diperbaiki di pemanggilnya).

    Sekarang 0 + 1 + 2 + 4 + 8 detik = sampai 15 detik. Semuanya berjalan di
    latar; kipernya tidak menunggu. Lima belas detik bukan jaminan, maka sisi
    BACA tidak lagi bergantung pada salinan ini sama sekali — lihat
    lib/fotoBuktiTugas.js.
  */
  const JEDA_MS = [0, 1000, 2000, 4000, 8000];
  for (const jeda of JEDA_MS) {
    if (jeda) await new Promise(r => setTimeout(r, jeda));
    if (await trySync()) return true;
  }
  return false;
}