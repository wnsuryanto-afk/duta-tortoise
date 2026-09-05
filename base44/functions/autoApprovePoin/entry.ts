import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  getOtomatis,
  wibTanggal,
  tanggalMundur,
  sopIdDariTaskId,
  itemIdDariTaskId,
  petaFotoHarian,
} from "../../shared/otomatis.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";

/**
 * A1 — Setujui poin checklist secara otomatis, KECUALI yang mencurigakan.
 *
 * Sebelum ini owner membuka layar approval tiap sore dan menyetujui satu per
 * satu, termasuk hari-hari yang tidak ada apa-apanya. Fungsi ini membalik
 * bebannya: yang normal lewat sendiri, yang aneh ditahan dan dilaporkan.
 *
 * Sebuah checklist DITAHAN bila salah satu benar:
 *   - total poin melebihi ambang wajar (auto_approve_max_points)
 *   - ada foto yang dinilai AI tidak sesuai (ai_verified === false)
 *   - pemeriksaan AI gagal (ai_status === "gagal")
 *   - ada peringatan umur/jam foto (photo_age_warning / photo_time_warning)
 *   - ada task wajib-foto yang dicentang tanpa foto
 *   - belum lewat masa tunggu (auto_approve_tunda_menit) sejak dikirim
 *
 * Yang ditahan tetap berstatus "submitted" — persis seperti sekarang — dan
 * owner menerima satu notifikasi berisi alasannya. Fungsi ini TIDAK PERNAH
 * menolak checklist; menolak tetap keputusan manusia.
 *
 * Aman dipanggil berulang: hanya menyentuh checklist berstatus "submitted".
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.auto_approve_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const maxPoin = Number(otomatis.auto_approve_max_points ?? 150);
    const tundaMenit = Number(otomatis.auto_approve_tunda_menit ?? 60);
    const cekAI = otomatis.auto_approve_wajib_foto_lolos_ai !== false;
    const cekFoto = otomatis.auto_approve_tahan_tanpa_foto !== false;

    // Hanya checklist hari ini dan kemarin — yang lebih tua sengaja dibiarkan
    // untuk diperiksa manusia, karena konteksnya sudah lewat.
    const hariIni = wibTanggal();
    const kemarin = tanggalMundur(1);

    const semua = await base44.asServiceRole.entities.DailyChecklist.filter({
      status: "submitted",
    }, null, BATAS_AMBIL);
    const kandidat = (semua || []).filter(
      (cl: any) => cl.date === hariIni || cl.date === kemarin,
    );

    if (kandidat.length === 0) {
      return Response.json({ success: true, disetujui: 0, ditahan: 0, alasan: "tidak ada antrian" });
    }

    // Peta SOPTask untuk tahu task mana yang wajib foto.
    const sopTasks = await base44.asServiceRole.entities.SOPTask.list(null, BATAS_AMBIL);
    const wajibFoto: Record<string, boolean> = {};
    const judulSOP: Record<string, string> = {};
    for (const t of sopTasks || []) {
      wajibFoto[t.id] = t.require_photo === true;
      judulSOP[t.id] = t.title || "";
    }

    // Kebersihan per kandang dicatat sebagai item tersendiri
    // ("kebersihan_kandang_N2"), bukan sebagai sop_<id>. Kewajiban fotonya
    // mengikuti task induk "Pembersihan kandang".
    const kebersihanWajibFoto = (sopTasks || []).some(
      (t: any) =>
        t.is_active === true &&
        t.task_scope === "per_kandang" &&
        /pembersihan kandang/i.test(t.title || "") &&
        t.require_photo === true,
    );

    // Foto bukti kerja hidup di MaintenanceLog dan hanya sebagian tersalin ke
    // checklist. Tanpa peta ini, checklist yang fotonya lengkap tetap dituduh
    // "dicentang tanpa foto" dan tidak pernah disetujui otomatis.
    const petaFoto = new Map<string, string>();
    for (const tgl of [hariIni, kemarin]) {
      const p = await petaFotoHarian(base44, tgl);
      for (const [k, v] of p) petaFoto.set(k, v);
    }

    const sekarang = Date.now();
    const disetujui: string[] = [];
    const ditahan: { nama: string; tanggal: string; alasan: string[] }[] = [];

    for (const cl of kandidat) {
      const alasan: string[] = [];
      const tugas = Array.isArray(cl.completed_tasks) ? cl.completed_tasks : [];
      const poin = Number(cl.total_points_claimed || 0);

      // 1. Masa tunggu — beri jeda supaya owner sempat melihat lebih dulu.
      const dikirim = new Date(cl.updated_date || cl.created_date || 0).getTime();
      const umurMenit = dikirim ? (sekarang - dikirim) / 60000 : 99999;
      if (umurMenit < tundaMenit) continue; // belum waktunya, coba lagi nanti

      // 2. Poin di atas kewajaran.
      if (poin > maxPoin) {
        alasan.push(`poin ${poin} melebihi batas wajar ${maxPoin}`);
      }

      // 3. Pemeriksaan per task.
      let tanpaFoto = 0;
      let aiTolak = 0;
      let aiGagal = 0;
      let peringatanFoto = 0;

      for (const t of tugas) {
        if (t.status === "skipped_no_stock") continue;

        if (cekAI && t.ai_verified === false) aiTolak++;
        if (cekAI && t.ai_status === "gagal") aiGagal++;
        if (t.photo_age_warning || t.photo_time_warning) peringatanFoto++;

        if (cekFoto) {
          const itemId = itemIdDariTaskId(t.task_id);
          const adaFoto =
            !!t.photo_url || petaFoto.has(`${cl.employee_email}|${itemId}`);
          const sopId = sopIdDariTaskId(t.task_id);
          const perluFoto = sopId
            ? wajibFoto[sopId] === true
            : itemId.startsWith("kebersihan_kandang_") && kebersihanWajibFoto;
          if (perluFoto && !adaFoto) tanpaFoto++;
        }
      }

      if (aiTolak > 0) alasan.push(`${aiTolak} foto dinilai tidak sesuai oleh AI`);
      if (aiGagal > 0) alasan.push(`${aiGagal} foto gagal diperiksa AI`);
      if (peringatanFoto > 0) alasan.push(`${peringatanFoto} foto punya peringatan waktu`);
      if (tanpaFoto > 0) alasan.push(`${tanpaFoto} task wajib foto dicentang tanpa foto`);

      if (alasan.length > 0) {
        ditahan.push({ nama: cl.employee_name || cl.employee_email, tanggal: cl.date, alasan });
        continue;
      }

      await base44.asServiceRole.entities.DailyChecklist.update(cl.id, {
        status: "approved",
        approved_points: poin,
        approved_by: "Otomatis (aturan)",
        approved_at: new Date().toISOString(),
      });
      disetujui.push(`${cl.employee_name || cl.employee_email} ${cl.date} (${poin} poin)`);
    }

    // Satu notifikasi ringkas ke owner untuk yang ditahan — bukan satu per checklist.
    if (ditahan.length > 0) {
      const users = await base44.asServiceRole.entities.User.list(null, BATAS_AMBIL);
      const owners = (users || []).filter((u: any) => u.role === "owner");
      const kunci = `auto_approve_tahan_${hariIni}`;
      const isi = ditahan
        .map((d) => `• ${d.nama} (${d.tanggal}): ${d.alasan.join("; ")}`)
        .join("\n");

      for (const o of owners) {
        const sudah = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: o.email,
          related_entity_id: kunci,
        }, null, BATAS_AMBIL);
        if ((sudah || []).some((n: any) => !n.is_dismissed)) continue;
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: o.email,
          title: `${ditahan.length} checklist perlu diperiksa manual`,
          message: isi.slice(0, 900),
          type: "warning",
          priority: "sedang",
          category: "absensi",
          recipient_role: "owner",
          action_label: "Buka Approval Poin",
          action_url: "/approval-poin",
          related_entity_id: kunci,
          related_entity_type: "DailyChecklist",
          is_read: false,
          is_dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({
      success: true,
      disetujui: disetujui.length,
      ditahan: ditahan.length,
      detail_disetujui: disetujui,
      detail_ditahan: ditahan,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
