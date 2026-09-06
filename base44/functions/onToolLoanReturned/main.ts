import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Dipanggil via entity automation saat ToolLoan diupdate.
// Saat alat dikembalikan dengan kondisi rusak/hilang → buat ShoppingList otomatis.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: loan, old_data, event } = body;

    if (!loan || event?.type !== 'update') {
      return Response.json({ skipped: true });
    }

    const oldStatus = old_data?.status;
    const newStatus = loan.status;

    if (oldStatus === newStatus || newStatus !== 'dikembalikan') {
      return Response.json({ skipped: 'no_return' });
    }

    // Hanya untuk kondisi rusak/hilang
    if (!['rusak', 'hilang'].includes(loan.return_condition)) {
      return Response.json({ skipped: 'good_condition' });
    }

    // Anti-dobel: skip jika shopping_list_id sudah ada
    if (loan.shopping_list_id) {
      return Response.json({ skipped: 'already_has_shopping_list' });
    }

    const today = new Date().toISOString().split('T')[0];
    const conditionLabel = loan.return_condition === 'hilang' ? 'HILANG' : 'RUSAK';

    const sl = await base44.asServiceRole.entities.ShoppingList.create({
      nama_barang: `${loan.tool_name} (${conditionLabel} - perlu ganti)`,
      jumlah: 1,
      satuan: 'pcs',
      priority: 'segera',
      status: 'belum_dibeli',
      notes: `Auto-created dari pengembalian alat oleh ${loan.borrower_name} pada ${loan.return_date || today}. Kondisi: ${loan.return_condition}.`,
    });

    // Update ToolLoan dengan shopping_list_id
    await base44.asServiceRole.entities.ToolLoan.update(loan.id, {
      shopping_list_id: sl.id,
    });

    return Response.json({ success: true, shopping_list_id: sl.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});