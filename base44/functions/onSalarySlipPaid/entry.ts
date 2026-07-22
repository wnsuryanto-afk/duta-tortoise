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
    const fmtD = (d) => {
      const dt = d instanceof Date && !isNaN(d.getTime()) ? d : null;
      return dt ? dt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
    };
    let bulan;
    if (slip.period_type === "weekly") {
      const ws = slip.week_start ? new Date(slip.week_start) : (slip.period ? new Date(slip.period) : null);
      if (!ws || isNaN(ws.getTime())) {
        bulan = slip.week_start || slip.period || "periode mingguan";
      } else {
        const we = slip.week_end ? new Date(slip.week_end) : new Date(ws.getTime() + 6 * 86400000);
        bulan = `${fmtD(ws)} – ${fmtD(we)}`;
      }
    } else if (slip.period && /^\d{4}-\d{2}$/.test(slip.period)) {
      bulan = new Date(slip.period + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } else {
      bulan = slip.period || "periode ini";
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

        // ── Proses potongan kasbon saat slip ditandai dibayar ──
        // Tulis deduction_log & update total_paid HANYA saat slip → paid (bukan saat draft)
        if (Array.isArray(slip.kasbon_ids) && slip.kasbon_ids.length > 0) {
          for (const kasbonId of slip.kasbon_ids) {
            try {
              const kasbon = await base44.asServiceRole.entities.Kasbon.get(kasbonId);
              if (!kasbon) continue;

              // Anti-dobel: skip jika deduction_log sudah ada entry untuk slip ini
              const alreadyLogged = (kasbon.deduction_log || []).some(
                d => d.salary_slip_id === slip.id
              );
              if (alreadyLogged) continue;

              const sisaK = (kasbon.amount || 0) - (kasbon.total_paid || 0);
              if (sisaK <= 0) continue;

              const ded = Math.min(kasbon.weekly_deduction || 100000, sisaK);
              const newPaid = (kasbon.total_paid || 0) + ded;
              const newStatus = newPaid >= (kasbon.amount || 0) ? "lunas" : kasbon.status;
              const periodKey = slip.period_type === "weekly"
                ? (slip.week_start || slip.period)
                : slip.period;

              const newLog = [...(kasbon.deduction_log || []), {
                amount: ded,
                date: new Date().toISOString().split('T')[0],
                method: "salary_slip",
                salary_period: periodKey,
                salary_slip_id: slip.id,
                recorded_by: "system (auto on paid)",
                notes: "Auto-deducted saat slip ditandai dibayar",
              }];

              await base44.asServiceRole.entities.Kasbon.update(kasbonId, {
                total_paid: newPaid,
                status: newStatus,
                deduction_log: newLog,
              });
            } catch {
              // Lanjut ke kasbon berikutnya jika satu gagal
            }
          }
        }

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