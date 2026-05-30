import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Dipanggil dari frontend (Dashboard) saat user buka app
// Notif 7: Keeper belum submit checklist setelah jam 15:00
// Notif 8: Checklist submitted → notif ke kepala_feeder
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const hourUTC = now.getUTCHours();
    // UTC+7 = jam lokal, 15:00 WIB = 08:00 UTC
    const isAfter15WIB = hourUTC >= 8;

    const results = [];

    const isDuplicate = async (email, entityId, category) => {
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: email,
        related_entity_id: entityId,
        category,
      });
      return existing.some(n => {
        const ca = n.created_at || n.created_date || "";
        return ca.startsWith(today) && !n.is_dismissed;
      });
    };

    // ══════════════════════════════════════════════════
    // 7. CHECKLIST BELUM DISUBMIT (setelah jam 15:00 WIB)
    // ══════════════════════════════════════════════════
    if (user.role === "keeper" && isAfter15WIB) {
      const myChecklists = await base44.asServiceRole.entities.DailyChecklist.filter({
        employee_email: user.email,
        date: today,
      });
      const hasSubmitted = myChecklists.some(cl =>
        cl.status === "submitted" || cl.status === "approved"
      );

      if (!hasSubmitted) {
        const dupKey = `checklist_reminder_${user.email}_${today}`;
        if (!(await isDuplicate(user.email, dupKey, "absensi"))) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: user.email,
            title: "Jangan Lupa Submit Checklist Hari Ini!",
            message: "Checklist kamu belum dikirim. Submit sebelum jam 16:00 agar poin hari ini tercatat.",
            type: "warning",
            priority: "sedang",
            category: "absensi",
            action_label: "Submit Sekarang",
            action_url: "/",
            related_entity_id: dupKey,
            related_entity_type: "DailyChecklist",
            is_read: false,
            is_dismissed: false,
            created_at: now.toISOString(),
          });
          results.push("checklist_reminder: created");
        } else {
          results.push("checklist_reminder: duplicate");
        }
      } else {
        results.push("checklist_reminder: already_submitted");
      }
    }

    // ══════════════════════════════════════════════════
    // 8. CHECKLIST SUBMITTED → notif kepala_feeder
    // (Cek checklist hari ini yang submitted & belum dinotif)
    // ══════════════════════════════════════════════════
    if (user.role === "kepala_feeder") {
      const todayChecklists = await base44.asServiceRole.entities.DailyChecklist.filter({ date: today });
      const submitted = todayChecklists.filter(cl => cl.status === "submitted");

      for (const cl of submitted) {
        if (!(await isDuplicate(user.email, cl.id, "absensi"))) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: user.email,
            title: `${cl.employee_name} Mengirim Checklist`,
            message: `${cl.employee_name} mengklaim ${cl.total_points_claimed || 0} poin hari ini. Periksa dan setujui.`,
            type: "info",
            priority: "sedang",
            category: "absensi",
            recipient_role: "kepala_feeder",
            action_label: "Approve Checklist",
            action_url: "/",
            related_entity_id: cl.id,
            related_entity_type: "DailyChecklist",
            is_read: false,
            is_dismissed: false,
            created_at: now.toISOString(),
          });
          results.push(`checklist_submitted_notif: ${cl.employee_name}`);
        }
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});