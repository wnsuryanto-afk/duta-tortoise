import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from "base44:runtime";
import {
  sendWhatsAppNotification,
  resolveNotificationTargets,
  getSettings,
  getPhoneNumbersForRoles,
} from "../../shared/whatsapp.ts";

/**
 * Entity automation: fires when a ToolRequest is created.
 * Sends WhatsApp notification to Owner + Manajer.
 * Covers both "Lapor Rusak" from warehouse and direct tool requests.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: toolReq, event } = body;

    if (!toolReq || event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const reasonLabel = {
      rusak: 'Rusak',
      hilang: 'Hilang',
      perlu_tambahan: 'Perlu Tambahan',
    };
    const reason = reasonLabel[toolReq.reason] || toolReq.reason || '—';

    const message =
      `🔴 *Pengajuan Barang Baru*\n\n` +
      `Alat: ${toolReq.tool_name}\n` +
      `Diajukan oleh: ${toolReq.requester_name}\n` +
      `Alasan: ${reason}\n` +
      `Jumlah: ${toolReq.quantity || 1}\n` +
      (toolReq.notes ? `Catatan: ${toolReq.notes}\n` : '') +
      `\nBuka aplikasi → menu *Alat Kerja* untuk menyetujui.`;

    // Send WA asynchronously — don't block the automation response
    waitUntil(
      (async () => {
        const phones = await getPhoneNumbersForRoles(base44, ['owner', 'manajer']);
        {
          // Tambahkan grup WhatsApp bila owner mengaktifkannya untuk jenis ini.
          const waSettings = await getSettings(base44);
          const resolved = resolveNotificationTargets(waSettings, 'tool_request', phones);
          if (resolved.targets.length === 0) return;
          await sendWhatsAppNotification(base44, {
            targets: resolved.targets,
            message,
            notificationType: 'tool_request',
            relatedEntityId: toolReq.id,
          });
        }
      })()
    );

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}