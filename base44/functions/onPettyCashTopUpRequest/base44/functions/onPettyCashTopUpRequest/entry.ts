import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { BATAS_AMBIL } from "../../shared/batas.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: request, old_data, event } = body;

    if (!request) return Response.json({ skipped: true });

    const now = new Date().toISOString();
    const amountStr = Number(request.amount_requested || 0).toLocaleString('id-ID');

    // ── On create: notify owner ──
    if (event?.type === 'create' && request.status === 'pending') {
      const allUsers = await base44.asServiceRole.entities.User.list(null, BATAS_AMBIL);
      const owners = allUsers.filter(u => u.role === 'owner');
      for (const owner of owners) {
        // Anti-duplikat
        const existing = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: owner.email,
          related_entity_id: request.id,
          category: 'keuangan',
        }, null, BATAS_AMBIL);
        if (existing.some(n => n.title.includes('Request Top-up'))) continue;

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: owner.email,
          title: `Request Top-up Kas — Rp ${amountStr}`,
          message: `${request.requester_name} mengajukan top-up kas kecil Rp ${amountStr}. ${request.reason || ''}`.trim(),
          type: 'info',
          priority: 'sedang',
          category: 'keuangan',
          action_label: 'Tinjau Top-up',
          action_url: '/petty-cash',
          related_entity_id: request.id,
          related_entity_type: 'PettyCashTopUpRequest',
          is_read: false,
          is_dismissed: false,
          created_at: now,
        });
      }
    }

    // ── On update: notify admin (approved or rejected) ──
    if (event?.type === 'update') {
      const oldStatus = old_data?.status;
      const newStatus = request.status;

      if (newStatus === oldStatus) return Response.json({ skipped: 'no_status_change' });

      if ((newStatus === 'approved' || newStatus === 'rejected') && request.requester_email) {
        // Anti-duplikat
        const existing = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: request.requester_email,
          related_entity_id: request.id,
          category: 'keuangan',
        }, null, BATAS_AMBIL);
        const keyword = newStatus === 'approved' ? 'Disetujui' : 'Ditolak';
        if (existing.some(n => n.title.includes(keyword) && !n.is_dismissed)) {
          return Response.json({ skipped: 'duplicate' });
        }

        const isApproved = newStatus === 'approved';
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: request.requester_email,
          title: isApproved
            ? `Top-up Disetujui & Ditransfer — Rp ${amountStr}`
            : `Top-up Kas Ditolak — Rp ${amountStr}`,
          message: isApproved
            ? `Request top-up Rp ${amountStr} sudah disetujui & ditransfer oleh ${request.approved_by || 'owner'}. Saldo kas kecil bertambah.`
            : `Request top-up Rp ${amountStr} ditolak.${request.rejection_reason ? ' Alasan: ' + request.rejection_reason : ''}`,
          type: isApproved ? 'success' : 'warning',
          priority: 'sedang',
          category: 'keuangan',
          action_label: 'Lihat Kas Kecil',
          action_url: '/petty-cash',
          related_entity_id: request.id,
          related_entity_type: 'PettyCashTopUpRequest',
          is_read: false,
          is_dismissed: false,
          created_at: now,
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});