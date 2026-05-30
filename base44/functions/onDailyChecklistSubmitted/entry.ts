import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: DailyChecklist update → status berubah ke "submitted"
// Notif 8: kirim ke semua kepala_feeder
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: checklist, event } = body;

    if (!checklist || checklist.status !== "submitted") {
      return Response.json({ skipped: true });
    }

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const allUsers = await base44.asServiceRole.entities.User.list();
    const kepalaFeeders = allUsers.filter(u => u.role === "kepala_feeder");

    for (const kf of kepalaFeeders) {
      // Anti-duplikat: cek per checklist.id per kepala_feeder
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: kf.email,
        related_entity_id: checklist.id,
        category: "absensi",
      });
      if (existing.some(n => !n.is_dismissed)) continue;

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: kf.email,
        title: `${checklist.employee_name} Mengirim Checklist`,
        message: `${checklist.employee_name} mengklaim ${checklist.total_points_claimed || 0} poin hari ini. Periksa dan setujui.`,
        type: "info",
        priority: "sedang",
        category: "absensi",
        recipient_role: "kepala_feeder",
        action_label: "Approve Checklist",
        action_url: "/",
        related_entity_id: checklist.id,
        related_entity_type: "DailyChecklist",
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