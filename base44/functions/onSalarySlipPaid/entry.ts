import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Dipanggil via entity automation saat SalarySlip dibuat atau status berubah
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: slip, old_data, event } = body;

    if (!slip || !slip.employee_email) return Response.json({ skipped: true });

    const now = new Date().toISOString();

    // Notif saat slip baru dibuat (draft)
    if (event?.type === "create") {
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: slip.employee_email,
        related_entity_id: slip.id,
        category: "keuangan",
      });
      if (existing.some(n => !n.is_dismissed)) return Response.json({ skipped: "duplicate" });

      const bulan = slip.period
        ? new Date(slip.period + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
        : slip.period;

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: slip.employee_email,
        title: `Slip Gaji ${bulan} Sudah Dibuat`,
        message: `Total gaji kamu periode ${bulan}: Rp ${Number(slip.net_total || 0).toLocaleString("id-ID")}.`,
        type: "success",
        priority: "sedang",
        category: "keuangan",
        action_label: "Lihat Slip Gaji",
        action_url: "/salary-slip",
        related_entity_id: slip.id,
        related_entity_type: "SalarySlip",
        is_read: false,
        is_dismissed: false,
        created_at: now,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});