import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  sendWhatsAppNotification,
  getSettings,
  getPhoneNumbersForRoles,
} from "../../shared/whatsapp.ts";

/**
 * Pengingat harian 17:30 — kirim jumlah checklist menunggu approval ke Owner.
 * Dipanggil oleh scheduled automation (daily 17:30) dan/atau saat owner membuka app.
 * Idempotent: hanya kirim sekali per hari (cek daily_reminder_last_sent).
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Gunakan tanggal WIB (UTC+7) untuk anti-dobel-kirim
    const _now = new Date();
    const _wib = new Date(_now.getTime() + 7 * 60 * 60 * 1000);
    const today = `${_wib.getUTCFullYear()}-${String(_wib.getUTCMonth() + 1).padStart(2, "0")}-${String(_wib.getUTCDate()).padStart(2, "0")}`;

    // 1. Get settings
    const settings = await getSettings(base44);
    if (!settings) {
      return Response.json({ skipped: 'no_settings' });
    }

    // 2. Already sent today?
    if (settings.daily_reminder_last_sent === today) {
      return Response.json({ skipped: 'already_sent_today' });
    }

    // 3. Toggle off?
    if (settings.notif_daily_approval === false) {
      // Mark as sent to avoid repeated checks when disabled
      await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
        daily_reminder_last_sent: today,
      });
      return Response.json({ skipped: 'disabled' });
    }

    // 4. Count pending DailyChecklist submissions
    const pending = await base44.asServiceRole.entities.DailyChecklist.filter({
      status: 'submitted',
    });
    const count = pending.length;

    // 5. No pending — mark as sent, don't message
    if (count === 0) {
      await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
        daily_reminder_last_sent: today,
      });
      return Response.json({ skipped: 'no_pending', count: 0 });
    }

    // 6. Send to owner
    const phones = await getPhoneNumbersForRoles(base44, ['owner']);
    if (phones.length === 0) {
      await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
        daily_reminder_last_sent: today,
      });
      return Response.json({ skipped: 'no_owner_phone' });
    }

    const message =
      `⏰ *Pengingat Harian — Duta Tortoise*\n\n` +
      `Ada *${count}* checklist menunggu approval hari ini.\n\n` +
      `Buka aplikasi → menu *Approval Poin* untuk meninjau.\n` +
      `https://dutatortoise.base44.app/approval-poin`;

    const result = await sendWhatsAppNotification(base44, {
      targets: phones,
      message,
      notificationType: 'daily_approval',
    });

    // 7. Mark as sent today regardless of WA result (avoid retry spam)
    await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
      daily_reminder_last_sent: today,
    });

    return Response.json({
      success: result.success,
      sent: result.sent,
      pendingCount: count,
      reason: result.reason,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}