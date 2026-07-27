import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  sendWhatsAppNotification,
  getSettings,
  normalizePhone,
} from "../../shared/whatsapp.ts";

/**
 * HTTP handler untuk pengiriman WhatsApp dari frontend.
 * - action: "test_send" → kirim pesan uji ke nomor owner
 * - action: "send"     → kirim pesan umum (targets, message, notificationType)
 *
 * Hanya owner yang boleh memanggil fungsi ini.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return Response.json({ error: 'Hanya owner yang dapat mengakses' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // ── Test send ke nomor owner ──
    if (action === 'test_send') {
      const settings = await getSettings(base44);
      if (!settings || !settings.fonnte_token) {
        return Response.json({
          success: false,
          error: 'Token Fonnte belum diisi. Isi token di kolom di atas, lalu Simpan.',
        });
      }
      const ownerPhone = settings.phone_owner
        ? normalizePhone(settings.phone_owner)
        : '';
      if (!ownerPhone) {
        return Response.json({
          success: false,
          error: 'Nomor WhatsApp Owner belum diisi. Isi nomor owner di pengaturan.',
        });
      }

      const testMessage =
        body.message ||
        '🧪 *Tes Notifikasi WhatsApp — Duta Tortoise*\n\nIntegrasi Fonnte berfungsi dengan baik. Anda akan menerima notifikasi otomatis melalui WhatsApp ini.';

      const result = await sendWhatsAppNotification(base44, {
        targets: [ownerPhone],
        message: testMessage,
        notificationType: 'test_send',
      });

      if (result.success) {
        return Response.json({
          success: true,
          message: `Pesan uji terkirim ke ${ownerPhone}`,
        });
      } else {
        return Response.json({
          success: false,
          error: result.reason || 'Gagal mengirim pesan uji',
        });
      }
    }

    // ── Generic send ──
    if (action === 'send' || !action) {
      const { targets, message, notificationType, relatedEntityId } = body;
      if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return Response.json({ error: 'targets wajib diisi (array nomor)' }, { status: 400 });
      }
      if (!message) {
        return Response.json({ error: 'message wajib diisi' }, { status: 400 });
      }
      const result = await sendWhatsAppNotification(base44, {
        targets,
        message,
        notificationType: notificationType || 'test_send',
        relatedEntityId,
      });
      return Response.json(result);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}