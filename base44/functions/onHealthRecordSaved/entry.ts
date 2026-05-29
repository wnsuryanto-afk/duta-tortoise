import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data, old_data } = payload;

    if (!data || !data.id) return Response.json({ ok: true, skip: "no data" });

    const triggerTypes = ["sakit", "obat"];
    const biayaObat = Number(data.biaya_obat || 0);
    const isTriggerType = triggerTypes.includes(data.type);

    // Case: biaya turun ke 0 atau type berubah → hapus transaksi lama
    if (data.finance_tx_id && (!isTriggerType || biayaObat <= 0)) {
      await base44.asServiceRole.entities.FinanceTransaction.delete(data.finance_tx_id);
      await base44.asServiceRole.entities.HealthRecord.update(data.id, { finance_tx_id: "" });
      return Response.json({ ok: true, action: "deleted_old_tx" });
    }

    // Tidak perlu buat transaksi jika bukan tipe yang tepat atau biaya 0
    if (!isTriggerType || biayaObat <= 0) {
      return Response.json({ ok: true, skip: "not triggered" });
    }

    const diagnosisLabel = (data.diagnosis && data.diagnosis[0]) ? data.diagnosis[0].replace(/_/g, " ") : data.type;
    const description = `Obat: ${data.tortoise_name || "tortoise"} - ${diagnosisLabel}`;

    // Jika sudah ada finance_tx_id → UPDATE transaksi lama
    if (data.finance_tx_id) {
      await base44.asServiceRole.entities.FinanceTransaction.update(data.finance_tx_id, {
        amount: biayaObat,
        date: data.date,
        description,
      });
      return Response.json({ ok: true, action: "updated_tx", tx_id: data.finance_tx_id });
    }

    // Buat FinanceTransaction baru
    const tx = await base44.asServiceRole.entities.FinanceTransaction.create({
      type: "pengeluaran",
      category: "obat_perawatan",
      amount: biayaObat,
      date: data.date,
      description,
      reference_id: data.id,
      created_by_name: "Sistem",
    });

    // Simpan finance_tx_id ke HealthRecord
    if (tx?.id) {
      await base44.asServiceRole.entities.HealthRecord.update(data.id, { finance_tx_id: tx.id });
    }

    return Response.json({ ok: true, action: "created_tx", tx_id: tx?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});