import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Dipanggil otomatis via entity automation saat HealthRecord baru dibuat
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data: record, event } = body;

    if (!record || event?.type !== "create") {
      return Response.json({ skipped: true });
    }

    // Hanya proses jika type = sakit
    if (record.type !== "sakit") {
      return Response.json({ skipped: "not_sakit" });
    }

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const isDuplicate = async (email) => {
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: email,
        related_entity_id: record.id,
        category: "kesehatan",
      });
      return existing.some(n => !n.is_dismissed);
    };

    // Ambil nama petugas pelapor
    const reporter = record.created_by_id
      ? (await base44.asServiceRole.entities.User.filter({ id: record.created_by_id }))[0]
      : null;
    const reporterName = reporter?.full_name || record.created_by_id || "Petugas";

    const gejalaText = record.diagnosis_notes
      ? record.diagnosis_notes.split(",")[0].trim()
      : record.description?.split(".")[0] || "tidak diketahui";

    const allUsers = await base44.asServiceRole.entities.User.list();
    const targets = allUsers.filter(u => ["owner", "manajer"].includes(u.role));

    for (const target of targets) {
      if (await isDuplicate(target.email)) continue;
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: target.email,
        title: `Kura Sakit Dilaporkan — ${record.tortoise_name}`,
        message: `${reporterName} melaporkan ${record.tortoise_name} kandang ${record.enclosure || "?"} gejala: ${gejalaText}. Tangani segera.`,
        type: "alert",
        priority: "tinggi",
        category: "kesehatan",
        action_label: "Lihat Laporan",
        action_url: "/health",
        related_entity_id: record.id,
        related_entity_type: "HealthRecord",
        is_read: false,
        is_dismissed: false,
        created_at: now,
      });
    }

    return Response.json({ success: true, notified: targets.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});