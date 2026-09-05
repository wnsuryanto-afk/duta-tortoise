import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { BATAS_AMBIL } from "../../shared/batas.ts";

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

    // PENYAPU: batalkan tugas perawatan untuk kura yang sudah TIDAK sakit.
    //
    // Dulu fungsi ini hanya berhenti MEMBUAT tugas baru saat kura sembuh, dan
    // tidak pernah menutup yang terlanjur ada. Karena tugas dibuat setiap hari
    // selama kura sakit, sisanya menumpuk sebagai tugas berpoin yang tidak
    // perlu dikerjakan: pada 29 Agustus 2026 ada 30 tugas menggantung untuk
    // enam kura yang semuanya sudah sehat, senilai 450 poin.
    //
    // Penyapu berjalan lebih dulu, dan tetap berjalan walaupun tidak ada kura
    // sakit sama sekali.
    const idSakit = new Set(sickTortoises.map((t) => t.id));
    const namaSakit = sickTortoises.map((t) => t.code || t.name).filter(Boolean);
    const semuaPending = await base44.asServiceRole.entities.IncidentalTask.filter({ status: "pending" }, null, BATAS_AMBIL);
    let cancelled = 0;
    for (const t of semuaPending || []) {
      if (t.created_by_email !== "system") continue;
      const judul = String(t.title || "");
      if (!/^Perawatan /i.test(judul)) continue;
      const masihSakit = t.tortoise_id
        ? idSakit.has(t.tortoise_id)
        : namaSakit.some((n) => judul.includes(n));
      if (masihSakit) continue;
      await base44.asServiceRole.entities.IncidentalTask.update(t.id, {
        status: "cancelled",
        is_active: false,
        notes: String(t.notes || "") + " | Dibatalkan otomatis " + today + ": kura sudah tidak berstatus sakit.",
      });
      cancelled++;
    }

    if (sickTortoises.length === 0) {
      return Response.json({ success: true, created: 0, skipped: 0, cancelled, total_sick: 0 });
    }

    // 2. Ambil protokol diagnosis aktif
    const protocols = await base44.asServiceRole.entities.DiagnosisProtocol.filter({ is_active: true }, null, BATAS_AMBIL);

    // 3. Cek duplikat terhadap SELURUH tugas yang masih pending, bukan hanya
    //    yang bertanggal hari ini.
    //
    //    Pemeriksaan lama hanya melihat due_date hari ini, jadi tiap hari
    //    terbit satu tugas baru walaupun tugas kemarin belum dikerjakan.
    //    Satu kura dengan satu diagnosis cukup punya satu tugas terbuka:
    //    kalau yang kemarin belum selesai, menambah yang baru tidak membuatnya
    //    lebih cepat dikerjakan, hanya menggandakan poinnya.
    const existingTitles = new Set(
      (semuaPending || [])
        .filter((t) => t.status === "pending")
        .map((t) => (t.title || "").toLowerCase()),
    );

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
            // Tautan ke kuranya disimpan sebagai id, bukan hanya lewat judul.
            tortoise_id: tortoise.id,
            tortoise_code: tortoise.code || "",
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

    return Response.json({ success: true, created, skipped, cancelled, total_sick: sickTortoises.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}