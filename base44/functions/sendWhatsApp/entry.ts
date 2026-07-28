import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  sendWhatsAppNotification,
  getSettings,
  normalizePhone,
} from "../../shared/whatsapp.ts";

/**
 * Catat panggilan fetch_groups ke WhatsAppLog (berhasil/gagal + alasan).
 */
async function logFetchGroups(base44, settings, groups, status, reason) {
  try {
    await base44.asServiceRole.entities.WhatsAppLog.create({
      sent_at: new Date().toISOString(),
      targets: groups.length > 0 ? groups.map(g => g.id || g.name || "") : ["fetch_groups"],
      notification_type: "test_send",
      message_preview: `Ambil daftar grup: ${groups.length} grup ditemukan${reason ? " — " + reason : ""}`,
      status: status,
      error_reason: reason || "",
    });
  } catch {}
}

/**
 * HTTP handler untuk pengiriman WhatsApp dari frontend.
 * - action: "test_send"     → kirim pesan uji ke nomor owner
 * - action: "send"          → kirim pesan umum (targets, message, notificationType)
 * - action: "fetch_groups"  → ambil daftar grup Fonnte (fetch-group + get-whatsapp-group)
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
          error: 'Token Fonnte belum tersimpan. Isi token di halaman pengaturan, lalu tekan 💾 Simpan Pengaturan.',
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
          error: `Pengiriman gagal — ${result.reason || 'Gagal mengirim pesan uji'}`,
        });
      }
    }

    // ── Fetch groups from Fonnte ──
    if (action === 'fetch_groups') {
      const settings = await getSettings(base44);
      if (!settings || !settings.fonnte_token) {
        return Response.json({
          success: false,
          error: 'Token Fonnte belum diisi atau tidak valid.',
        });
      }

      const token = settings.fonnte_token;

      // Anti-spam 1 menit dihandle di frontend (lastFetchTime)

      // Langkah 1: fetch-group (perbarui daftar grup di server Fonnte)
      let fetchOk = false;
      let fetchErr = '';
      try {
        const fetchRes = await fetch('https://api.fonnte.com/fetch-group', {
          method: 'POST',
          headers: { Authorization: token },
        });
        const fetchResult = await fetchRes.json();
        if (fetchResult.status === true || fetchResult.status === 'success') {
          fetchOk = true;
        } else {
          fetchErr = fetchResult.reason || fetchResult.message || JSON.stringify(fetchResult);
          // Bisa jadi device terputus — tetap lanjut ke get-whatsapp-group untuk ambil data cache
        }
      } catch (e) {
        fetchErr = e.message || String(e);
      }

      // Langkah 2: get-whatsapp-group (ambil daftar grup)
      try {
        const groupRes = await fetch('https://api.fonnte.com/get-whatsapp-group', {
          method: 'POST',
          headers: { Authorization: token },
        });
        const groupResult = await groupRes.json();

        // Deteksi device terputus
        const reasonStr = String(groupResult.reason || groupResult.message || '').toLowerCase();
        const isDeviceDisconnected =
          !groupResult.status ||
          reasonStr.includes('disconnected') ||
          reasonStr.includes('offline') ||
          reasonStr.includes('not connected') ||
          reasonStr.includes('device');

        if (isDeviceDisconnected && !(Array.isArray(groupResult.data) && groupResult.data.length > 0)) {
          await logFetchGroups(base44, settings, [], 'gagal', 'Perangkat WhatsApp terputus');
          return Response.json({
            success: false,
            error: 'Perangkat WhatsApp sedang terputus. Buka dashboard Fonnte lalu tekan Reconnect.',
            fetchError: fetchErr,
          });
        }

        const groups = Array.isArray(groupResult.data) ? groupResult.data : [];

        if (groups.length === 0) {
          await logFetchGroups(base44, settings, [], 'skipped', 'Belum ada grup terdeteksi');
          return Response.json({
            success: false,
            error: 'Belum ada grup terdeteksi. Pastikan nomor pengirim sudah menjadi anggota grup, lalu tekan Ambil Daftar Grup lagi.',
            fetchError: fetchErr,
          });
        }

        await logFetchGroups(base44, settings, groups, 'terkirim', '');
        return Response.json({ success: true, groups, fetchOk, fetchError: fetchErr });
      } catch (e) {
        await logFetchGroups(base44, settings, [], 'gagal', e.message || String(e));
        return Response.json({
          success: false,
          error: 'Gagal menghubungi server Fonnte. Coba lagi dalam beberapa saat.',
          detail: e.message || String(e),
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