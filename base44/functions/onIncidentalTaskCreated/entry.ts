import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from "base44:runtime";
import {
  sendWhatsAppNotification,
  getEmployeePhone,
} from "../../shared/whatsapp.ts";

/**
 * Entity automation: fires when an IncidentalTask is created.
 *
 * - status "usulan" (usulan keeper/kepala_feeder): kirim notifikasi in-app
 *   ke owner & manajer agar mereka meninjau. Tidak mengirim WA ke assignee
 *   karena tugas belum resmi (poin belum berlaku).
 * - status "pending" (tugas resmi dari owner/manajer/admin): kirim WA
 *   ke karyawan yang ditugaskan (perilaku lama, tidak diubah).
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: task, event } = body;

    if (!task || event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    // ── Usulan dari keeper/kepala_feeder → notifikasi owner & manajer ──
    if (task.status === 'usulan') {
      waitUntil(
        (async () => {
          try {
            const users = await base44.asServiceRole.entities.User.list();
            const reviewers = users.filter(
              (u) => u.role === 'owner' || u.role === 'manajer'
            );
            const nowIso = new Date().toISOString();
            for (const rv of reviewers) {
              await base44.asServiceRole.entities.Notification.create({
                recipient_email: rv.email,
                recipient_role: rv.role,
                title: '🔎 Usulan Tugas Baru',
                message: `${task.created_by_name || 'Keeper'} mengusulkan: ${task.title} (${task.points || 0} poin). Perlu persetujuan Anda.`,
                type: 'info',
                priority: 'sedang',
                category: 'sistem',
                action_label: 'Tinjau',
                action_url: '/tugas-insidentil',
                related_entity_id: task.id,
                related_entity_type: 'IncidentalTask',
                is_read: false,
                is_dismissed: false,
                created_at: nowIso,
              });
            }
          } catch (_e) {
            // best-effort, jangan gagalkan create
          }
        })()
      );
      return Response.json({ success: true, notified: 'reviewers' });
    }

    // ── Tugas resmi (pending) → WA ke assignee (perilaku lama) ──
    if (!task.assigned_to_email) {
      return Response.json({ skipped: 'no_assignee' });
    }

    const dueLabel = task.due_date || '—';

    const message =
      `📌 *Tugas Baru untuk Anda*\n\n` +
      `Judul: ${task.title}\n` +
      `Tenggat: ${dueLabel}\n` +
      `Poin: ${task.points || 10}\n` +
      (task.notes ? `Catatan: ${task.notes}\n` : '') +
      `\nBuka aplikasi → menu *Tugas Insidentil* untuk mengerjakan.`;

    waitUntil(
      (async () => {
        const phone = await getEmployeePhone(base44, task.assigned_to_email);
        if (phone) {
          await sendWhatsAppNotification(base44, {
            targets: [phone],
            message,
            notificationType: 'incidental_task',
            relatedEntityId: task.id,
          });
        }
      })()
    );

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}