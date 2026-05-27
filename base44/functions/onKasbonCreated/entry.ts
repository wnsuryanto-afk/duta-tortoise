import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Automation entity trigger: Kasbon → create
// Kirim notifikasi ke semua user ber-role "owner" saat kasbon baru dibuat
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const kasbon = payload.data;
    if (!kasbon) return Response.json({ ok: true, skipped: "no data" });

    // Hanya proses kasbon baru dengan status pending
    if (kasbon.status !== "pending") return Response.json({ ok: true, skipped: "not pending" });

    // Cari semua user dengan role owner
    const allUsers = await base44.asServiceRole.entities.User.list();
    const owners = allUsers.filter(u => u.role === "owner");

    const notifications = owners.map(owner => ({
      recipient_email: owner.email,
      recipient_role: "owner",
      title: "📋 Kasbon Baru Menunggu Persetujuan",
      message: `${kasbon.employee_name} mengajukan kasbon Rp ${(kasbon.amount || 0).toLocaleString("id-ID")} — ${kasbon.reason_category || ""}${kasbon.reason ? `: ${kasbon.reason}` : ""}. Mohon segera ditinjau.`,
      type: "warning",
      category: "keuangan",
      is_read: false,
      created_at: new Date().toISOString().split("T")[0],
    }));

    for (const notif of notifications) {
      await base44.asServiceRole.entities.Notification.create(notif);
    }

    return Response.json({ ok: true, notified: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});