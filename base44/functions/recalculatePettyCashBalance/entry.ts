import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all ledger entries
    const allEntries = await base44.asServiceRole.entities.PettyCashLedger.list('entry_date', 500);

    // Sort by (entry_date, created_date) ascending for correct chronological order
    const sorted = [...allEntries].sort((a, b) => {
      const dateA = a.entry_date || '';
      const dateB = b.entry_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const createdA = a.created_date || '';
      const createdB = b.created_date || '';
      return createdA.localeCompare(createdB);
    });

    let balance = 0;
    const updates = [];
    for (const entry of sorted) {
      if (entry.entry_type === 'top_up') {
        balance += entry.amount || 0;
      } else if (entry.entry_type === 'pemakaian') {
        balance -= entry.amount || 0;
      } else if (entry.entry_type === 'penyesuaian') {
        // Penyesuaian sets balance to absolute physical count (trusted human count)
        if (entry.balance_after != null && !isNaN(entry.balance_after)) {
          balance = entry.balance_after;
        }
      }
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