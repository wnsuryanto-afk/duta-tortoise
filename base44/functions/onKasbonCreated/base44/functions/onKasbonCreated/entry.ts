import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { BATAS_AMBIL } from "../../shared/batas.ts";

// Dipanggil via entity automation saat Kasbon dibuat atau status berubah
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: kasbon, old_data, event } = body;

    if (!kasbon) return Response.json({ skipped: true });

    const now = new Date().toISOString();

    // Notif saat kasbon disetujui atau ditolak (status berubah)
    if (event?.type === "update" && kasbon.employee_email) {
      const oldStatus = old_data?.status;
      const newStatus = kasbon.status;

      if (newStatus === oldStatus) return Response.json({ skipped: "no_status_change" });

      if (newStatus === "approved" || newStatus === "rejected") {
        const isDuplicate = async () => {
          const existing = await base44.asServiceRole.entities.Notification.filter({
            recipient_email: kasbon.employee_email,
            related_entity_id: kasbon.id,
            category: "keuangan",
          }, null, BATAS_AMBIL);
          return existing.some(n => n.title.includes(newStatus === "approved" ? "Disetujui" : "Ditolak") && !n.is_dismissed);
        };
        if (await isDuplicate()) return Response.json({ skipped: "duplicate" });

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: kasbon.employee_email,
          title: newStatus === "approved"
            ? `Kasbon Disetujui — Rp ${Number(kasbon.amount || 0).toLocaleString("id-ID")}`
            : "Kasbon Ditolak",
          message: newStatus === "approved"
            ? `Kasbon kamu Rp ${Number(kasbon.amount || 0).toLocaleString("id-ID")} sudah disetujui${kasbon.approved_by ? " oleh " + kasbon.approved_by : ""}.`
            : "Kasbon kamu ditolak. Hubungi admin untuk info lebih lanjut.",
          type: newStatus === "approved" ? "success" : "warning",
          priority: "sedang",
          category: "keuangan",
          action_label: "Lihat Kasbon",
          action_url: "/kasbon",
          related_entity_id: kasbon.id,
          related_entity_type: "Kasbon",
          is_read: false,
          is_dismissed: false,
          created_at: now,
        });
      }
    }

    // Notif ke admin saat kasbon baru dibuat (pending approval)
    if (event?.type === "create" && kasbon.status === "pending") {
      const adminUsers = await base44.asServiceRole.entities.User.list(null, BATAS_AMBIL);
      const admins = adminUsers.filter(u => ["admin", "owner"].includes(u.role));
      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: admin.email,
          title: `Permintaan Kasbon — ${kasbon.employee_name || kasbon.employee_email}`,
          message: `${kasbon.employee_name || kasbon.employee_email} mengajukan kasbon Rp ${Number(kasbon.amount || 0).toLocaleString("id-ID")}. Perlu persetujuan.`,
          type: "info",
          priority: "sedang",
          category: "keuangan",
          action_label: "Tinjau Kasbon",
          action_url: "/kasbon",
          related_entity_id: kasbon.id,
          related_entity_type: "Kasbon",
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