import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, notifSekali, emailPerRole } from "../../shared/otomatis.ts";
import { masukLaporan } from "../../shared/laporan.ts";
import { STATUS_KELUAR } from "../../shared/kura.ts";


/**
 * A11 — Deteksi kura yang turun berat atau berhenti tumbuh.
 *
 * Data timbang sudah masuk tapi tidak pernah dibandingkan dengan riwayatnya
 * sendiri. Padahal turun berat adalah tanda paling awal yang bisa dilihat
 * tanpa dokter: kura sakit berhenti makan jauh sebelum terlihat sakit.
 *
 * Dua hal yang ditandai:
 *   - TURUN  : berat terakhir lebih rendah dari sebelumnya melebihi ambang persen
 *   - STAGNAN: berat tidak pernah naik selama sekian hari (bayi & remaja saja;
 *              kura dewasa memang berhenti tumbuh, jadi tidak dihitung)
 *
 * Hasilnya satu notifikasi ringkas per hari ke owner & manajer, bukan satu
 * notifikasi per kura.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.anomali_berat_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.anomali_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_jalan_hari_ini" });
    }

    const ambangTurun = Number(otomatis.anomali_turun_persen ?? 5);
    const ambangStagnan = Number(otomatis.anomali_stagnan_hari ?? 90);

    const [tortoises, ukuran] = await Promise.all([
      base44.asServiceRole.entities.Tortoise.list("name", 2000),
      base44.asServiceRole.entities.MeasurementHistory.list("-date", 3000),
    ]);

    const diPeternakan = (t: any) => t && !t.is_archived && !STATUS_KELUAR.includes(t.status);

    // Kelompokkan riwayat per kura, urut naik menurut tanggal.
    const perKura = new Map<string, any[]>();
    for (const m of ukuran || []) {
      if (!masukLaporan(m)) continue;
      if (!m.tortoise_id || !m.weight_grams) continue;
      if (!perKura.has(m.tortoise_id)) perKura.set(m.tortoise_id, []);
      perKura.get(m.tortoise_id)!.push(m);
    }
    for (const arr of perKura.values()) {
      arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }

    const turun: string[] = [];
    const stagnan: string[] = [];

    for (const t of tortoises || []) {
      if (!diPeternakan(t)) continue;
      const riwayat = perKura.get(t.id) || [];
      if (riwayat.length < 2) continue;

      const terakhir = riwayat[riwayat.length - 1];
      const sebelumnya = riwayat[riwayat.length - 2];
      const beratAkhir = Number(terakhir.weight_grams || 0);
      const beratSebelum = Number(sebelumnya.weight_grams || 0);

      if (beratSebelum > 0 && beratAkhir > 0) {
        const selisihPersen = ((beratSebelum - beratAkhir) / beratSebelum) * 100;
        if (selisihPersen >= ambangTurun) {
          turun.push(
            `${t.name || t.code || t.id} turun ${selisihPersen.toFixed(1)}% ` +
            `(${beratSebelum}g → ${beratAkhir}g, ${terakhir.date})`,
          );
          continue; // sudah ditandai, tidak perlu dicek stagnan
        }
      }

      // Stagnan hanya relevan untuk yang masih seharusnya tumbuh.
      const masihTumbuh =
        t.age_category === "baby" ||
        t.age_category === "juvenile" ||
        (t.shell_length_cm && Number(t.shell_length_cm) < 30);
      if (!masihTumbuh) continue;

      // Kapan terakhir kali beratnya naik?
      let tanggalNaikTerakhir = riwayat[0].date;
      for (let i = 1; i < riwayat.length; i++) {
        if (Number(riwayat[i].weight_grams) > Number(riwayat[i - 1].weight_grams)) {
          tanggalNaikTerakhir = riwayat[i].date;
        }
      }
      const selisihHari =
        (new Date(terakhir.date).getTime() - new Date(tanggalNaikTerakhir).getTime()) /
        (24 * 60 * 60 * 1000);
      if (selisihHari >= ambangStagnan) {
        stagnan.push(
          `${t.name || t.code || t.id} tidak naik berat sejak ${tanggalNaikTerakhir} (${Math.round(selisihHari)} hari)`,
        );
      }
    }

    let dikirim = 0;
    if (turun.length > 0 || stagnan.length > 0) {
      const penerima = await emailPerRole(base44, ["owner", "manajer"]);
      const bagian: string[] = [];
      if (turun.length > 0) bagian.push(`TURUN BERAT (${turun.length}):\n` + turun.slice(0, 10).join("\n"));
      if (stagnan.length > 0) bagian.push(`BERHENTI TUMBUH (${stagnan.length}):\n` + stagnan.slice(0, 10).join("\n"));

      for (const email of penerima) {
        const dibuat = await notifSekali(base44, {
          recipient_email: email,
          title: `${turun.length + stagnan.length} kura perlu diperiksa (berat)`,
          message: bagian.join("\n\n").slice(0, 900),
          type: turun.length > 0 ? "alert" : "warning",
          priority: turun.length > 0 ? "tinggi" : "sedang",
          category: "kesehatan",
          action_label: "Lihat Daftar Kura",
          action_url: "/tortoise",
          related_entity_id: `anomali_berat_${hariIni}`,
          related_entity_type: "MeasurementHistory",
        });
        if (dibuat) dikirim++;
      }
    }

    await setOtomatis(base44, otomatis, { anomali_terakhir: hariIni });

    return Response.json({
      success: true,
      turun: turun.length,
      stagnan: stagnan.length,
      notifikasi_dibuat: dikirim,
      detail_turun: turun.slice(0, 20),
      detail_stagnan: stagnan.slice(0, 20),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
