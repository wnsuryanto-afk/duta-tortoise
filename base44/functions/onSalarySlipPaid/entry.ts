import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Dipanggil via entity automation saat SalarySlip dibuat atau status berubah
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: slip, old_data, event } = body;

    if (!slip || !slip.employee_email) return Response.json({ skipped: true });

    const now = new Date().toISOString();
    const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
    let bulan;
    if (slip.period_type === "weekly") {
      const ws = slip.week_start ? new Date(slip.week_start) : new Date(slip.period);
      const we = slip.week_end ? new Date(slip.week_end) : new Date(ws.getTime() + 6 * 86400000);
      const fmtD = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      bulan = `${fmtD(ws)} – ${fmtD(we)}`;
    } else {
      bulan = slip.period
        ? new Date(slip.period + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
        : slip.period;
    }

    // ── CREATE: slip baru dibuat (draft) ──
    if (event?.type === "create") {
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: slip.employee_email,
        related_entity_id: slip.id,
        category: "keuangan",
      });
      if (existing.some(n => !n.is_dismissed)) return Response.json({ skipped: "duplicate" });

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: slip.employee_email,
        title: `Slip Gaji ${bulan} Sudah Dibuat`,
        message: `Total gaji kamu periode ${bulan}: ${fmtRp(slip.net_total)}.`,
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

    // ── UPDATE: status berubah menjadi "paid" → notifikasi "gaji ditransfer" ──
    if (event?.type === "update") {
      const wasPaid = old_data?.status === "paid";
      const isPaid = slip.status === "paid";

      if (isPaid && !wasPaid) {
        const hasProof = !!slip.payment_proof_url;

        // Dedup: cek apakah notifikasi "ditransfer" sudah pernah dibuat untuk slip ini
        const existing = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: slip.employee_email,
          related_entity_id: slip.id,
          category: "keuangan",
        });
        if (existing.some(n => (n.title || "").includes("ditransfer") && !n.is_dismissed)) {
          return Response.json({ skipped: "duplicate_paid" });
        }

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: slip.employee_email,
          title: `💸 Gaji periode ${bulan} sudah ditransfer`,
          message: `Gaji kamu periode ${bulan} sebesar ${fmtRp(slip.net_total)} sudah ditransfer${hasProof ? ". Bukti transfer tersedia, klik untuk melihat." : "."}`,
          type: "success",
          priority: "tinggi",
          category: "keuangan",
          action_label: hasProof ? "Lihat Bukti Transfer" : "Lihat Slip Gaji",
          action_url: "/salary-slip",
          related_entity_id: slip.id,
          related_entity_type: "SalarySlip",
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