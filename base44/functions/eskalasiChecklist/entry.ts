import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  getOtomatis,
  setOtomatis,
  wibTanggal,
  wibJam,
  keMenit,
  menitSekarang,
  userPerRole,
} from "../../shared/otomatis.ts";
import {
  sendWhatsAppNotification,
  getSettings,
  getEmployeePhone,
  getPhoneNumbersForRoles,
} from "../../shared/whatsapp.ts";

/**
 * A4 — Pengingat bertingkat bila checklist belum masuk.
 *
 * Sekarang pengingat hanya satu lapis dan ujungnya selalu owner. Di sini
 * masalahnya diselesaikan di tingkat terendah dulu:
 *
 *   10:00 WIB → pesan ke karyawan yang bersangkutan
 *   13:00 WIB → pesan ke kepala feeder, menyebut siapa yang belum
 *   16:00 WIB → baru ke owner
 *
 * Setiap tingkat hanya sekali per hari. Bila semua checklist sudah masuk,
 * tidak ada pesan sama sekali.
 *
 * Fungsi ini menjaga jamnya sendiri (WIB), jadi penjadwal boleh memanggilnya
 * tiap jam tanpa perlu tahu zona waktu.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.eskalasi_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    const sekarang = menitSekarang();

    const jamKeeper = keMenit(otomatis.eskalasi_jam_keeper || "10:00", "10:00");
    const jamKepala = keMenit(otomatis.eskalasi_jam_kepala || "13:00", "13:00");
    const jamOwner = keMenit(otomatis.eskalasi_jam_owner || "16:00", "16:00");

    let level = 0;
    if (sekarang >= jamOwner) level = 3;
    else if (sekarang >= jamKepala) level = 2;
    else if (sekarang >= jamKeeper) level = 1;

    if (level === 0) {
      return Response.json({ skipped: "belum_waktunya", wib_now: wibJam() });
    }

    const penanda = `${hariIni}|${level}`;
    if ((otomatis.eskalasi_terakhir || "") === penanda) {
      return Response.json({ skipped: "sudah_kirim_level_ini", level });
    }

    // Siapa yang wajib mengisi checklist hari ini.
    const petugas = await userPerRole(base44, ["keeper", "kepala_feeder"]);
    if (petugas.length === 0) {
      await setOtomatis(base44, otomatis, { eskalasi_terakhir: penanda });
      return Response.json({ skipped: "tidak_ada_petugas" });
    }

    const checklists = await base44.asServiceRole.entities.DailyChecklist.filter({ date: hariIni });
    const sudahIsi = new Set(
      (checklists || [])
        .filter((cl: any) => Array.isArray(cl.completed_tasks) && cl.completed_tasks.length > 0)
        .map((cl: any) => cl.employee_email),
    );

    const belum = petugas.filter((u: any) => !sudahIsi.has(u.email));

    if (belum.length === 0) {
      await setOtomatis(base44, otomatis, { eskalasi_terakhir: penanda });
      return Response.json({ success: true, semua_sudah_isi: true, level });
    }

    const settings = await getSettings(base44);
    const daftarNama = belum.map((u: any) => u.full_name || u.email).join(", ");
    let terkirim = 0;
    let tujuan = "";

    if (level === 1) {
      tujuan = "karyawan";
      for (const u of belum) {
        const nomor = await getEmployeePhone(base44, u.email);
        if (!nomor) continue;
        const pesan =
          `Halo ${u.full_name || ""}, checklist hari ini belum ada isinya.\n\n` +
          `Kalau sudah dikerjakan, tinggal dicentang di aplikasi supaya poinnya tercatat. ` +
          `Kalau ada kendala, kabari kepala feeder ya.`;
        const r = await sendWhatsAppNotification(base44, {
          targets: [nomor],
          message: pesan,
          notificationType: "eskalasi_checklist",
          relatedEntityId: `eskalasi_${hariIni}_1_${u.email}`,
        });
        if (r.success) terkirim++;
      }
    } else if (level === 2) {
      tujuan = "kepala feeder";
      const kepala = await userPerRole(base44, ["kepala_feeder"]);
      const nomor: string[] = [];
      for (const u of kepala) {
        const n = await getEmployeePhone(base44, u.email);
        if (n) nomor.push(n);
      }
      if (nomor.length > 0) {
        const pesan =
          `⏰ *Checklist belum masuk*\n\n` +
          `Sampai jam ${wibJam()} WIB belum ada checklist dari: *${daftarNama}*.\n\n` +
          `Mohon dicek langsung di lapangan.`;
        const r = await sendWhatsAppNotification(base44, {
          targets: nomor,
          message: pesan,
          notificationType: "eskalasi_checklist",
          relatedEntityId: `eskalasi_${hariIni}_2`,
        });
        if (r.success) terkirim += r.sent || 0;
      }
    } else {
      tujuan = "owner";
      const nomor = await getPhoneNumbersForRoles(base44, ["owner"]);
      if (nomor.length > 0) {
        const pesan =
          `⚠️ *Checklist tidak masuk sampai sore*\n\n` +
          `Belum ada checklist hari ini dari: *${daftarNama}*.\n\n` +
          `Pengingat sudah dikirim ke yang bersangkutan (${otomatis.eskalasi_jam_keeper || "10:00"}) ` +
          `dan ke kepala feeder (${otomatis.eskalasi_jam_kepala || "13:00"}).`;
        const r = await sendWhatsAppNotification(base44, {
          targets: nomor,
          message: pesan,
          notificationType: "eskalasi_checklist",
          relatedEntityId: `eskalasi_${hariIni}_3`,
        });
        if (r.success) terkirim += r.sent || 0;
      }
    }

    await setOtomatis(base44, otomatis, { eskalasi_terakhir: penanda });

    return Response.json({
      success: true,
      level,
      tujuan,
      belum_isi: belum.map((u: any) => u.full_name || u.email),
      terkirim,
      ada_setting_wa: Boolean(settings),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
