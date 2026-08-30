import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
import { clutchAktif } from "../../shared/kura.ts";
  getOtomatis,
  setOtomatis,
  wibTanggal,
  sudahWaktunya,
  notifSekali,
  emailPerRole,
} from "../../shared/otomatis.ts";

/**
 * A10 — Pengingat catat suhu & kelembapan yang menyala sendiri saat ada telur.
 *
 * Pencatatan inkubator berhenti sejak 1 Juni. Sebabnya bukan malas: pengingat
 * tetap tidak ada, sementara telur baru masuk berbulan-bulan kemudian. Fungsi
 * ini mengikat pengingat pada keadaan, bukan pada jadwal tetap — selama ada
 * clutch berstatus "inkubasi", pengingat muncul tiap hari; begitu semuanya
 * menetas atau selesai, pengingat berhenti sendiri tanpa dimatikan siapa pun.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.inkubator_reminder_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.inkubator_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_kirim_hari_ini" });
    }
    if (!sudahWaktunya(otomatis.inkubator_jam, "08:00")) {
      return Response.json({ skipped: "belum_waktunya" });
    }

    const breedings = await base44.asServiceRole.entities.Breeding.list("-egg_laying_date", 200);
    // Clutch AKTIF = "bertelur" ATAU "inkubasi".
    //
    // Fungsi ini dulu hanya memeriksa "inkubasi", sementara enam tempat lain di
    // aplikasi (beranda owner, beranda investor, Ringkasan Pagi, ekspor laporan,
    // dan dua fungsi di lib/breedingUtils) memakai pasangan keduanya. Selisih
    // itu bukan teori: satu-satunya clutch yang sedang dierami sekarang
    // (C23 x A40, 22 telur, 12 Agustus) berstatus "bertelur" — jadi pengingat
    // yang dibuat khusus untuk membangunkan pencatatan inkubator justru diam
    // pada satu-satunya clutch yang perlu dicatat.
    const sedangInkubasi = (breedings || []).filter(clutchAktif);

    if (sedangInkubasi.length === 0) {
      // Tidak ada telur — tandai supaya tidak diperiksa berulang hari ini.
      await setOtomatis(base44, otomatis, { inkubator_terakhir: hariIni });
      return Response.json({ success: true, tidak_ada_inkubasi: true });
    }

    // Sudah ada bacaan hari ini?
    const bacaan = await base44.asServiceRole.entities.IncubatorReading.filter({ date: hariIni });
    if ((bacaan || []).length > 0) {
      await setOtomatis(base44, otomatis, { inkubator_terakhir: hariIni });
      return Response.json({ success: true, sudah_ada_bacaan: true });
    }

    const daftarInkubator = [
      ...new Set(sedangInkubasi.map((b: any) => b.incubator_name).filter(Boolean)),
    ];
    const totalTelur = sedangInkubasi.reduce((s: number, b: any) => s + Number(b.egg_count || 0), 0);

    const penerima = await emailPerRole(base44, ["keeper", "kepala_feeder", "manajer"]);
    let dibuat = 0;
    for (const email of penerima) {
      const ok = await notifSekali(base44, {
        recipient_email: email,
        title: "Catat suhu & kelembapan inkubator hari ini",
        message:
          `Ada ${totalTelur} telur sedang dierami di ${daftarInkubator.join(", ") || "inkubator"}. ` +
          `Catat suhu dan kelembapan hari ini — bacaan harian adalah satu-satunya cara tahu ada yang bergeser sebelum telur gagal.`,
        type: "warning",
        priority: "tinggi",
        category: "breeding",
        action_label: "Catat Sekarang",
        action_url: "/incubator-reading",
        related_entity_id: `inkubator_${hariIni}`,
        related_entity_type: "IncubatorReading",
      });
      if (ok) dibuat++;
    }

    await setOtomatis(base44, otomatis, { inkubator_terakhir: hariIni });

    return Response.json({
      success: true,
      clutch_inkubasi: sedangInkubasi.length,
      total_telur: totalTelur,
      inkubator: daftarInkubator,
      notifikasi_dibuat: dibuat,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
