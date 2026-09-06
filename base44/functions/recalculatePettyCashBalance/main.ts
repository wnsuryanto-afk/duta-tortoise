import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function getSortDate(entry) {
  const ed = entry.entry_date;
  if (ed && ed !== 'null' && ed !== 'undefined') {
    const d = new Date(ed);
    if (!isNaN(d.getTime())) return ed;
  }
  return entry.created_date || '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all ledger entries
    const allEntries = await base44.asServiceRole.entities.PettyCashLedger.list('entry_date', 500);

    // Sort by (sortKey = entry_date or created_date fallback, then created_date) ascending for chronological order
    const sorted = [...allEntries].sort((a, b) => {
      const keyA = getSortDate(a);
      const keyB = getSortDate(b);
      if (keyA !== keyB) return keyA.localeCompare(keyB);
      const createdA = a.created_date || '';
      const createdB = b.created_date || '';
      return createdA.localeCompare(createdB);
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
        // Penyesuaian sets balance to absolute physical count (trusted human count)
        if (entry.balance_after != null && !isNaN(entry.balance_after)) {
          balance = Math.round(entry.balance_after);
        }
      }
      balance = Math.round(balance);
      const newBalanceAfter = balance;
      if (entry.balance_after !== newBalanceAfter) {
        updates.push({ id: entry.id, balance_after: newBalanceAfter });
      }
    }

    if (updates.length > 0) {
      await base44.asServiceRole.entities.PettyCashLedger.bulkUpdate(updates);
    }

    return Response.json({
      success: true,
      totalEntries: sorted.length,
      updated: updates.length,
      finalBalance: balance,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});