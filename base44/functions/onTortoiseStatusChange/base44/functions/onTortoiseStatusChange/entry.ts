import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { BATAS_AMBIL } from "../../shared/batas.ts";

// Dipanggil via entity automation saat Tortoise diupdate.
// Alur 2 (sembuh): is_currently_sick true→false atau status dari "sakit" ke non-sakit
// Alur 3 (mati): status berubah ke "mati"
// Kedua alur: batalkan IncidentalTask pending yang terkait kura tersebut
// (identifikasi dari title/notes yang memuat kode/nama kura).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: tortoise, old_data, event } = body;

    if (!tortoise || event?.type !== 'update') {
      return Response.json({ skipped: true });
    }

    const wasSick = old_data?.is_currently_sick === true;
    const isSick = tortoise.is_currently_sick === true;
    const recovered = wasSick && !isSick;

    const oldStatus = old_data?.status;
    const newStatus = tortoise.status;
    const died = oldStatus !== 'mati' && newStatus === 'mati';
    const statusRecovered = oldStatus === 'sakit' && newStatus !== 'sakit' && newStatus !== 'mati';

    if (!recovered && !died && !statusRecovered) {
      return Response.json({ skipped: 'no_relevant_change' });
    }

    // Identifikasi kura: kode atau nama (minimum 3 karakter untuk hindari false match)
    const rawIds = [tortoise.code, tortoise.name, old_data?.code, old_data?.name];
    const identifiers = rawIds.filter((id) => id && id.length >= 3);
    if (identifiers.length === 0) {
      return Response.json({ skipped: 'no_identifier' });
    }

    // Fetch semua IncidentalTask pending yang masih aktif
    const pendingTasks = await base44.asServiceRole.entities.IncidentalTask.filter({
      status: 'pending',
      is_active: true,
    }, null, BATAS_AMBIL);

    // Filter task yang title/notes-nya memuat kode/nama kura (case-insensitive)
    const lowerIds = identifiers.map((id) => id.toLowerCase());
    const matchingTasks = pendingTasks.filter((t) => {
      const text = `${t.title || ''} ${t.notes || ''}`.toLowerCase();
      return lowerIds.some((id) => text.includes(id));
    });

    if (matchingTasks.length === 0) {
      return Response.json({ skipped: 'no_matching_tasks' });
    }

    // Batalkan semua task yang cocok
    const reason = died ? 'kura mati' : 'kura sembuh';
    await Promise.all(
      matchingTasks.map((t) =>
        base44.asServiceRole.entities.IncidentalTask.update(t.id, {
          status: 'cancelled',
          is_active: false,
          notes: (t.notes || '') + ` [Dibatalkan otomatis: ${reason}]`,
        })
      )
    );

    return Response.json({ success: true, cancelled: matchingTasks.length, reason });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});