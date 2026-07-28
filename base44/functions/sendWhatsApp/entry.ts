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
          error: 'Token Fonnte belum diisi atau belum tersimpan. Tekan 💾 Simpan Pengaturan dulu.',
        });
      }

      const token = settings.fonnte_token;

      // Helper: safely parse response body (JSON or raw text)
      async function safeParse(res: Response) {
        const text = await res.text();
        let body: any = null;
        try { body = JSON.parse(text); } catch { body = { raw: text }; }
        return { ok: res.ok, httpStatus: res.status, body, text };
      }

      // Helper: translate common Fonnte errors to Indonesian
      function translateFonnteError(detail: string): string {
        const d = (detail || '').toLowerCase();
        if (d.includes('you have no whatsapp group')) {
          return 'Belum ada grup terdeteksi. Pastikan nomor sudah menjadi anggota grup, lalu coba lagi 1 menit kemudian.';
        }
        if (d.includes('device') && (d.includes('disconnect') || d.includes('offline') || d.includes('not connect'))) {
          return 'Perangkat WhatsApp terputus. Buka dashboard Fonnte lalu tekan Reconnect.';
        }
        if (d.includes('invalid token') || d.includes('unauthorized') || d.includes('token is invalid')) {
          return 'Token tidak valid, periksa kembali.';
        }
        return detail || '';
      }

      // Langkah 1: fetch-group (perbarui daftar grup di server Fonnte)
      // Spec: POST, hanya header Authorization, TANPA body
      let fetchErr = '';
      try {
        const fetchRes = await fetch('https://api.fonnte.com/fetch-group', {
          method: 'POST',
          headers: { Authorization: token },
        });
        const parsed = await safeParse(fetchRes);
        if (!parsed.ok) {
          const detail = parsed.body?.detail || parsed.body?.reason || parsed.body?.message || parsed.text || '';
          fetchErr = translateFonnteError(detail) || detail || `HTTP ${parsed.httpStatus}`;
        }
      } catch (e: any) {
        fetchErr = e.message || String(e);
      }

      // Langkah 2: tunggu 4 detik — Fonnte butuh waktu memproses fetch-group
      await new Promise((r) => setTimeout(r, 4000));

      // Langkah 3: get-whatsapp-group (ambil daftar grup)
      // Spec: POST, hanya header Authorization, TANPA body
      try {
        const groupRes = await fetch('https://api.fonnte.com/get-whatsapp-group', {
          method: 'POST',
          headers: { Authorization: token },
        });
        const parsed = await safeParse(groupRes);
        const body = parsed.body || {};

        // Deteksi device terputus / token invalid
        const detailStr = String(body.detail || body.reason || body.message || parsed.text || '').toLowerCase();
        const isDeviceDisconnected =
          detailStr.includes('disconnect') ||
          detailStr.includes('offline') ||
          detailStr.includes('not connected') ||
          (detailStr.includes('device') && !Array.isArray(body.data));
        const isInvalidToken =
          detailStr.includes('invalid token') ||
          detailStr.includes('unauthorized') ||
          detailStr.includes('token is invalid');

        if (isInvalidToken) {
          const msg = 'Token tidak valid, periksa kembali.';
          await logFetchGroups(base44, settings, [], 'gagal', msg);
          return Response.json({ success: false, error: msg, rawResponse: parsed.text, fetchError: fetchErr });
        }

        if (isDeviceDisconnected && !(Array.isArray(body.data) && body.data.length > 0)) {
          const msg = 'Perangkat WhatsApp terputus. Buka dashboard Fonnte lalu tekan Reconnect.';
          await logFetchGroups(base44, settings, [], 'gagal', msg);
          return Response.json({ success: false, error: msg, rawResponse: parsed.text, fetchError: fetchErr });
        }

        const groups = Array.isArray(body.data) ? body.data : [];

        if (groups.length === 0) {
          const rawDetail = body.detail || body.reason || body.message || 'you have no whatsapp group yet';
          const msg = translateFonnteError(rawDetail) || 'Belum ada grup terdeteksi.';
          await logFetchGroups(base44, settings, [], 'skipped', msg);
          return Response.json({ success: false, error: msg, rawResponse: parsed.text, fetchError: fetchErr });
        }

        await logFetchGroups(base44, settings, groups, 'terkirim', '');
        return Response.json({ success: true, groups, fetchError: fetchErr });
      } catch (e: any) {
        await logFetchGroups(base44, settings, [], 'gagal', e.message || String(e));
        return Response.json({
          success: false,
          error: 'Gagal menghubungi server Fonnte. Coba lagi dalam beberapa saat.',
          detail: e.message || String(e),
          fetchError: fetchErr,
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