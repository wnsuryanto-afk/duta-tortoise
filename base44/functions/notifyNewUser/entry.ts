import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { newUserEmail, newUserName } = body;

    // Ambil semua user dengan role owner atau manajer
    const allUsers = await base44.asServiceRole.entities.User.list();
    const recipients = allUsers.filter(u =>
      u.role === 'owner' || u.role === 'manajer' || u.role === 'admin'
    );

    const displayName = newUserName || newUserEmail || "Pengguna baru";
    const subject = `👤 Pengguna Baru Bergabung — ${displayName}`;
    const body_html = `Halo,\n\nAda pengguna baru yang bergabung di Sulcata Farm Manager:\n\n📧 Email: ${newUserEmail}\n👤 Nama: ${displayName}\n\nSilakan cek halaman Manajemen User untuk mengelola role pengguna tersebut.\n\nSalam,\nSulcata Farm Manager`;

    await Promise.all(
      recipients.map(u =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          subject,
          body: body_html,
        })
      )
    );

    return Response.json({ success: true, notified: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});