import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * generateDailyCareTasks — cron harian untuk membuat tugas "Perawatan [kode] — [penyakit]"
 * otomatis tiap hari untuk kura yang masih sakit. Satu tugas per kura per diagnosis,
 * 15 poin, dengan langkah perawatan sebagai sub-steps.
 * Berhenti otomatis ketika kura ditandai sembuh (status != "sakit").
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const CARE_POINTS = 15;

    // 1. Ambil semua kura yang masih sakit (tidak archived)
    const allTortoises = await base44.asServiceRole.entities.Tortoise.list("-updated_date", 500);
    const sickTortoises = allTortoises.filter(t =>
      (t.status === "sakit" || t.is_currently_sick === true) && !t.is_archived
    );

    if (sickTortoises.length === 0) {
      return Response.json({ success: true, created: 0, skipped: 0, total_sick: 0 });
    }

    // 2. Ambil protokol diagnosis aktif
    const protocols = await base44.asServiceRole.entities.DiagnosisProtocol.filter({ is_active: true });

    // 3. Ambil tugas pending hari ini untuk cek duplikat
    const existingTasks = await base44.asServiceRole.entities.IncidentalTask.filter({
      status: "pending",
      due_date: today,
    });
    const existingTitles = new Set(existingTasks.map(t => (t.title || "").toLowerCase()));

    let created = 0;
    let skipped = 0;

    for (const tortoise of sickTortoises) {
      try {
        const healthRecords = await base44.asServiceRole.entities.HealthRecord.filter(
          { tortoise_id: tortoise.id, type: "sakit" },
          "-date",
          10
        );
        if (!healthRecords.length) continue;

        const latestRecord = healthRecords[0];
        if (!latestRecord.diagnosis || !latestRecord.diagnosis.length) continue;

        const matchedProtocols = latestRecord.diagnosis
          .map(d => protocols.find(p => p.diagnosis_code === d))
          .filter(Boolean);

        if (!matchedProtocols.length) continue;

        for (const protocol of matchedProtocols) {
          const diagnosisName = protocol.diagnosis_name || protocol.diagnosis_code;
          const tortoiseLabel = tortoise.code || tortoise.name;
          const taskTitle = `Perawatan ${tortoiseLabel} — ${diagnosisName}`;

          if (existingTitles.has(taskTitle.toLowerCase())) {
            skipped++;
            continue;
          }

          const subSteps = (protocol.perawatan_pendukung || []).map(step => ({
            label: step,
            is_checked: false,
          }));

          if (!subSteps.length) continue;

          await base44.asServiceRole.entities.IncidentalTask.create({
            title: taskTitle,
            due_date: today,
            points: CARE_POINTS,
            status: "pending",
            notes: `Auto dari diagnosis ${diagnosisName} untuk ${tortoiseLabel}. Wajib foto kondisi kura. Tandai selesai bila semua langkah dikerjakan.`,
            sub_steps: subSteps,
            created_by_email: "system",
            created_by_name: "Sistem Auto Perawatan",
            is_active: true,
            material_status: "ready",
          });
          existingTitles.add(taskTitle.toLowerCase());
          created++;
        }
      } catch (e) {
        // Lanjut ke kura berikutnya jika ada error untuk satu kura
      }
    }

    return Response.json({ success: true, created, skipped, total_sick: sickTortoises.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}