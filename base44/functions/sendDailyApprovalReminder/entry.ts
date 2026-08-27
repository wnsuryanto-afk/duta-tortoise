import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  sendWhatsAppNotification,
  getSettings,
  getPhoneNumbersForRoles,
} from "../../shared/whatsapp.ts";

/**
 * Pengingat harian — kirim jumlah checklist menunggu approval ke Owner.
 *
 * Fungsi ini DULU tidak punya penjaga jam sama sekali: ia mengirim begitu
 * dipanggil, dan hanya dijaga agar tidak dobel dalam satu hari WIB. Jadwalnya
 * diserahkan sepenuhnya kepada penjadwal Base44, yang berjalan dalam UTC —
 * "17:30" di penjadwal berarti 17:30 UTC, yaitu **00:30 WIB dini hari**.
 * Itulah sebabnya pengingatnya tiba tengah malam setiap hari.
 *
 * Ringkasan harian tidak pernah kena masalah ini karena ia menjaga jamnya
 * SENDIRI: penjadwal boleh memanggil kapan saja, tetapi ia baru mengirim bila
 * jam WIB sekarang sudah melewati jam yang disetel. Pola yang sama dipakai di
 * sini, jadi jamnya benar tidak peduli zona waktu apa yang dipakai penjadwal —
 * dan tidak peduli pula bila fungsi ini ikut terpanggil saat owner membuka
 * aplikasi.
 *
 * Idempotent: hanya kirim sekali per hari (cek daily_reminder_last_sent).
 *
 * PENTING soal penjadwalan: karena jamnya kini dijaga di sini, penjadwal harus
 * memanggil fungsi ini BERULANG sepanjang hari (mis. tiap jam), persis seperti
 * penjadwal ringkasan harian. Panggilan sekali sehari pada jam UTC yang jatuh
 * sebelum jam WIB yang disetel akan selalu tertahan dan pesannya tidak pernah
 * pergi. Bila itu terjadi, log akan menyebutkan alasannya secara terang:
 * `skipped: "belum_waktunya"` beserta jam WIB sekarang dan jam yang disetel.
 */

const JAM_BAWAAN = "17:30";

/** Jam "HH:mm" menjadi menit sejak tengah malam. */
function menitWIB(jam: string): number {
  const [h, m] = (jam || JAM_BAWAAN).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Gunakan tanggal WIB (UTC+7) untuk anti-dobel-kirim
    const _now = new Date();
    const _wib = new Date(_now.getTime() + 7 * 60 * 60 * 1000);
    const today = `${_wib.getUTCFullYear()}-${String(_wib.getUTCMonth() + 1).padStart(2, "0")}-${String(_wib.getUTCDate()).padStart(2, "0")}`;
    const wibSentAt = `${today} ${String(_wib.getUTCHours()).padStart(2, "0")}:${String(_wib.getUTCMinutes()).padStart(2, "0")} WIB`;

    // 1. Get settings
    const settings = await getSettings(base44);
    if (!settings) {
      return Response.json({ skipped: 'no_settings' });
    }

    // 2. Already sent today?
    if ((settings.daily_reminder_last_sent || "").slice(0, 10) === today) {
      return Response.json({ skipped: 'already_sent_today' });
    }

    // 3. Sudah lewat jamnya (WIB)?
    //
    // Dibandingkan dalam WIB dari objek yang sama dengan `today` di atas, jadi
    // tidak ada pencampuran zona waktu. Panggilan sebelum jamnya tidak
    // menandai apa pun sebagai terkirim — ia hanya berhenti, dan panggilan
    // berikutnya sesudah jam itu yang mengirim.
    const jamSekarang = _wib.getUTCHours() * 60 + _wib.getUTCMinutes();
    const jamJadwal = menitWIB(settings.daily_approval_time || JAM_BAWAAN);
    if (jamSekarang < jamJadwal) {
      return Response.json({
        skipped: 'belum_waktunya',
        wib_now: `${String(_wib.getUTCHours()).padStart(2, "0")}:${String(_wib.getUTCMinutes()).padStart(2, "0")}`,
        wib_scheduled: settings.daily_approval_time || JAM_BAWAAN,
      });
    }

    // 4. Toggle off?
    if (settings.notif_daily_approval === false) {
      // Mark as sent to avoid repeated checks when disabled
      await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
        daily_reminder_last_sent: wibSentAt,
      });
      return Response.json({ skipped: 'disabled' });
    }

    // 5. Count pending DailyChecklist submissions
    const pending = await base44.asServiceRole.entities.DailyChecklist.filter({
      status: 'submitted',
    });
    const count = pending.length;

    // 6. No pending — mark as sent, don't message
    if (count === 0) {
      await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
        daily_reminder_last_sent: wibSentAt,
      });
      return Response.json({ skipped: 'no_pending', count: 0 });
    }

    // 7. Send to owner
    const phones = await getPhoneNumbersForRoles(base44, ['owner']);
    if (phones.length === 0) {
      await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
        daily_reminder_last_sent: wibSentAt,
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

    // 8. Mark as sent today regardless of WA result (avoid retry spam)
    await base44.asServiceRole.entities.WhatsAppSettings.update(settings.id, {
      daily_reminder_last_sent: wibSentAt,
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