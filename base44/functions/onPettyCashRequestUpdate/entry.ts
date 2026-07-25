import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Dipanggil via entity automation saat PettyCashRequest diupdate.
// Notifikasi pemohon saat status berubah ke "dicairkan".
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: request, old_data, event } = body;

    if (!request) return Response.json({ skipped: true });
    if (event?.type !== 'update') return Response.json({ skipped: 'not_update' });

    const oldStatus = old_data?.status;
    const newStatus = request.status;

    if (newStatus === oldStatus) return Response.json({ skipped: 'no_status_change' });
    if (newStatus !== 'dicairkan') return Response.json({ skipped: 'not_disbursed' });
    if (!request.requester_email) return Response.json({ skipped: 'no_email' });

    const now = new Date().toISOString();
    const amountStr = Number(request.amount_requested || 0).toLocaleString('id-ID');

    // Anti-duplikat: cek notifikasi "Dicairkan" yang belum di-dismiss untuk request ini
    const existing = await base44.asServiceRole.entities.Notification.filter({
      recipient_email: request.requester_email,
      related_entity_id: request.id,
      category: 'keuangan',
    });
    if (existing.some(n => n.title.includes('Dicairkan') && !n.is_dismissed)) {
      return Response.json({ skipped: 'duplicate' });
    }

    const methodLabel = request.disbursement_method === 'tunai' ? 'tunai' : 'transfer';
    const hasProof = !!request.disbursement_proof_url;

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: request.requester_email,
      title: `Dana Rp ${amountStr} Sudah Dicairkan`,
      message: `Request kas kecil Rp ${amountStr} sudah dicairkan (${methodLabel})` +
        (request.disbursement_proof_uploaded_by ? ' oleh ' + request.disbursement_proof_uploaded_by : '') +
        '.' + (hasProof ? ' Bukti transfer tersedia di halaman Kas Kecil.' : ''),
      type: 'success',
      priority: 'sedang',
      category: 'keuangan',
      action_label: 'Lihat Bukti',
      action_url: '/petty-cash',
      related_entity_id: request.id,
      related_entity_type: 'PettyCashRequest',
      is_read: false,
      is_dismissed: false,
      created_at: now,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});