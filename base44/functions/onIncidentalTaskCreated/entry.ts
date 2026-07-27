import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from "base44:runtime";
import {
  sendWhatsAppNotification,
  getEmployeePhone,
} from "../../shared/whatsapp.ts";

/**
 * Entity automation: fires when an IncidentalTask is created.
 * If the task is assigned to a specific employee, send WhatsApp notification to them.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: task, event } = body;

    if (!task || event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    // Only notify if assigned to a specific person
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

    // Send WA asynchronously
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