import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function getSortDate(entry) {
  const ed = entry.entry_date;
  if (ed && ed !== 'null' && ed !== 'undefined') {
    const d = new Date(ed);
    if (!isNaN(d.getTime())) return ed;
  }
  return entry.created_date || '';
}

async function recalculateBalance(base44) {
  const allEntries = await base44.asServiceRole.entities.PettyCashLedger.list('entry_date', 500);
  const sorted = [...allEntries].sort((a, b) => {
    const keyA = getSortDate(a);
    const keyB = getSortDate(b);
    if (keyA !== keyB) return keyA.localeCompare(keyB);
    return (a.created_date || '').localeCompare(b.created_date || '');
  });

  let balance = 0;
  const updates = [];
  for (const entry of sorted) {
    const amt = Math.round(entry.amount || 0);
    if (entry.entry_type === 'top_up') {
      balance += amt;
    } else if (entry.entry_type === 'pemakaian') {
      balance -= amt;
    } else if (entry.entry_type === 'penyesuaian') {
      if (entry.balance_after != null && !isNaN(entry.balance_after)) {
        balance = Math.round(entry.balance_after);
      }
    }
    balance = Math.round(balance);
    if (entry.balance_after !== balance) {
      updates.push({ id: entry.id, balance_after: balance });
    }
  }
  if (updates.length > 0) {
    await base44.asServiceRole.entities.PettyCashLedger.bulkUpdate(updates);
  }
  return balance;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, request_id, transfer_proof_url, transfer_date, rejection_reason } = body;

    if (action === 'approve') {
      if (user.role !== 'owner') {
        return Response.json({ error: 'Hanya owner yang bisa menyetujui' }, { status: 403 });
      }

      const request = await base44.asServiceRole.entities.PettyCashTopUpRequest.get(request_id);
      if (!request) return Response.json({ error: 'Request tidak ditemukan' }, { status: 404 });

      // Anti-dobel guard
      if (request.status !== 'pending') {
        return Response.json({ error: 'Request sudah diproses', status: request.status }, { status: 400 });
      }

      const today = new Date().toISOString().split('T')[0];
      const tDate = transfer_date || today;
      const amount = Math.round(request.amount_requested || 0);

      // Get current balance from latest ledger entry
      const ledger = await base44.asServiceRole.entities.PettyCashLedger.list('-entry_date', 500);
      let currentBalance = 0;
      if (ledger.length > 0) {
        const sorted = [...ledger].sort((a, b) => {
          const d = (b.entry_date || '').localeCompare(a.entry_date || '');
          return d !== 0 ? d : (b.created_date || '').localeCompare(a.created_date || '');
        });
        currentBalance = Math.round(sorted[0]?.balance_after || 0);
      }
      const balanceAfter = Math.round(currentBalance + amount);

      // Create ledger top_up entry — reuses existing top_up path (no new money path)
      const ledgerEntry = await base44.asServiceRole.entities.PettyCashLedger.create({
        entry_type: 'top_up',
        amount: amount,
        balance_after: balanceAfter,
        entry_date: tDate,
        description: `Top-up via request ${tDate}`,
        proof_photo: transfer_proof_url || undefined,
        recorded_by_name: user.full_name || user.email,
        recorded_by_email: user.email,
        recorded_by_role: user.role,
        linked_request_id: request_id,
      });

      // Update request status
      await base44.asServiceRole.entities.PettyCashTopUpRequest.update(request_id, {
        status: 'approved',
        transfer_proof_url: transfer_proof_url || undefined,
        transfer_date: tDate,
        approved_by: user.full_name || user.email,
        approved_date: today,
        ledger_entry_id: ledgerEntry.id,
      });

      // Recalculate all balance_after for chain consistency
      const finalBalance = await recalculateBalance(base44);

      return Response.json({ success: true, ledger_entry_id: ledgerEntry.id, finalBalance });
    }

    if (action === 'reject') {
      if (user.role !== 'owner') {
        return Response.json({ error: 'Hanya owner yang bisa menolak' }, { status: 403 });
      }

      const request = await base44.asServiceRole.entities.PettyCashTopUpRequest.get(request_id);
      if (!request) return Response.json({ error: 'Request tidak ditemukan' }, { status: 404 });

      if (request.status !== 'pending') {
        return Response.json({ error: 'Request sudah diproses', status: request.status }, { status: 400 });
      }

      const today = new Date().toISOString().split('T')[0];
      await base44.asServiceRole.entities.PettyCashTopUpRequest.update(request_id, {
        status: 'rejected',
        rejection_reason: rejection_reason || '',
        approved_by: user.full_name || user.email,
        approved_date: today,
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});