import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  getOtomatis,
  setOtomatis,
  wibTanggal,
  tanggalMundur,
  sudahWaktunya,
  userPerRole,
  sopIdDariTaskId,
} from "../../shared/otomatis.ts";
import { sendWhatsAppNotification, getSettings, trackAICall } from "../../shared/whatsapp.ts";
import { terjadwalPada } from "../../shared/jadwalSOP.ts";

const STATUS_KELUAR = ["mati", "terjual", "diarsipkan"];

/**
 * C1 — "Kepala Feeder Digital": perintah kerja pagi yang disusun dari keadaan,
 * bukan dari template.
 *
 * Ringkasan pagi yang ada sekarang mengirim daftar tugas yang sama tiap hari.
 * Yang hilang justru penghubungnya: tugas apa yang kemarin tidak selesai, kura
 * mana yang sedang sakit, bahan apa yang habis sehingga sebuah tugas percuma
 * dikerjakan hari ini.
 *
 * Fungsi ini mengumpulkan keadaan nyata pagi itu, meminta AI menyusunnya
 * menjadi perintah kerja berprioritas dalam bahasa yang wajar untuk dibaca di
 * grup, lalu mengirimnya ke grup PAGI.
 *
 * Bila AI gagal, pesan tetap dikirim dalam bentuk daftar biasa — perintah kerja
 * tidak boleh hilang hanya karena layanan AI sedang sibuk.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.kepala_feeder_digital_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.kepala_feeder_digital_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_kirim_hari_ini" });
    }
    if (!sudahWaktunya(otomatis.kepala_feeder_digital_jam, "06:45")) {
      return Response.json({ skipped: "belum_waktunya" });
    }

    const kemarin = tanggalMundur(1);

    const [sopTasks, checklistKemarin, kesehatan, pakan, gudang, tortoises, breedings, petugas] =
      await Promise.all([
        base44.asServiceRole.entities.SOPTask.list(),
        base44.asServiceRole.entities.DailyChecklist.filter({ date: kemarin }),
        base44.asServiceRole.entities.HealthRecord.list("-date", 60),
        base44.asServiceRole.entities.FeedStock.list("name", 200),
        base44.asServiceRole.entities.WarehouseItem.list("name", 500),
        base44.asServiceRole.entities.Tortoise.list("name", 2000),
        base44.asServiceRole.entities.Breeding.list("-egg_laying_date", 100),
        userPerRole(base44, ["keeper", "kepala_feeder"]),
      ]);

    // ── Kumpulkan keadaan ──

    // Aturan jadwalnya dipegang satu tempat (../../shared/jadwalSOP.ts) supaya
    // daftar tugas kepala feeder tidak bisa berbeda dari ringkasan harian dan
    // dari layar kepatuhan.
    const tugasHariIni = (sopTasks || []).filter((t: any) => terjadwalPada(t, hariIni));

    // Tugas kemarin yang tidak tercentang sama sekali.
    const dikerjakanKemarin = new Set<string>();
    for (const cl of checklistKemarin || []) {
      for (const t of cl.completed_tasks || []) {
        const id = sopIdDariTaskId(t.task_id);
        if (id) dikerjakanKemarin.add(id);
      }
    }
    const tertinggal = (sopTasks || [])
      .filter((t: any) => t.is_active === true && t.frequency === "harian" && !dikerjakanKemarin.has(t.id))
      .map((t: any) => t.title);

    const terkunci = tugasHariIni
      .filter((t: any) => t.terkunci_bahan === true)
      .map((t: any) => `${t.title} (${t.terkunci_alasan || "bahan habis"})`);

    const kuraSakit = (tortoises || [])
      .filter((t: any) => !t.is_archived && !STATUS_KELUAR.includes(t.status) && (t.status === "sakit" || t.status === "karantina"))
      .map((t: any) => `${t.name || t.code} (${t.status}${t.enclosure ? ", " + t.enclosure : ""})`);

    const kesehatanBaru = (kesehatan || [])
      .filter((h: any) => String(h.date || "") >= kemarin)
      .map((h: any) => `${h.tortoise_name}: ${h.description || h.treatment || "perlu dicek"}`);

    const pakanHabis = (pakan || [])
      .filter((f: any) => Number(f.current_stock || 0) <= 0)
      .map((f: any) => f.name);

    const gudangHabis = (gudang || [])
      .filter((i: any) => Number(i.minimum_stock || 0) > 0 && Number(i.current_stock || 0) <= 0)
      .filter((i: any) => !String(i.name || "").toUpperCase().includes("DUPLIKAT"))
      .map((i: any) => i.name);

    const inkubasi = (breedings || []).filter((b: any) => b.status === "inkubasi" && !b.is_archived);
    const menetasDekat = inkubasi
      .filter((b: any) => {
        const t = b.estimated_hatch_start || b.estimated_hatch_date;
        return t && t >= hariIni && t <= tanggalMundur(-7);
      })
      .map((b: any) => `${b.male_name} × ${b.female_name} (perkiraan ${b.estimated_hatch_start || b.estimated_hatch_date})`);

    const keadaan = {
      tanggal: hariIni,
      jumlah_petugas: (petugas || []).length,
      tugas_hari_ini: tugasHariIni.map((t: any) => `${t.title}${t.deadline_time ? ` (batas ${t.deadline_time})` : ""}`),
      tertinggal_kemarin: tertinggal,
      tugas_terkunci_bahan: terkunci,
      kura_sakit: kuraSakit,
      laporan_kesehatan_baru: kesehatanBaru,
      pakan_habis: pakanHabis,
      bahan_gudang_habis: gudangHabis,
      telur_mendekati_menetas: menetasDekat,
    };

    // ── Susun pesan ──
    const settings = await getSettings(base44);
    let pesan = "";
    let pakaiAI = false;

    try {
      if (settings) await trackAICall(base44, settings);
      const hasil = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt:
          `Anda kepala feeder senior di peternakan kura sulcata. Susun perintah kerja pagi untuk grup WhatsApp berisi ${keadaan.jumlah_petugas} orang.\n\n` +
          `Keadaan hari ini (JSON):\n${JSON.stringify(keadaan, null, 1)}\n\n` +
          `Aturan menulis:\n` +
          `- Bahasa Indonesia sehari-hari, hangat dan langsung, seperti rekan kerja senior. Bukan atasan yang menegur.\n` +
          `- Mulai dengan sapaan singkat dan 1 kalimat keadaan hari ini.\n` +
          `- Lalu daftar PRIORITAS maksimal 6 butir, urut dari yang paling penting. Sebutkan alasannya bila ada (mis. tertinggal kemarin, ada kura sakit).\n` +
          `- Sebut tugas yang TIDAK PERLU dikerjakan hari ini karena bahannya habis, supaya tidak ada yang sia-sia.\n` +
          `- Tutup dengan 1 kalimat pengingat mencentang tugas di aplikasi.\n` +
          `- DILARANG: menyebut poin, gaji, atau membandingkan antar karyawan. Jangan menyebut nama orang tertentu secara negatif.\n` +
          `- Maksimal 1300 karakter. Boleh pakai emoji seperlunya.\n\n` +
          `Jawab HANYA dengan JSON.`,
        response_json_schema: {
          type: "object",
          properties: { pesan: { type: "string" } },
        },
      });
      if (hasil?.pesan && String(hasil.pesan).trim().length > 40) {
        pesan = String(hasil.pesan).trim();
        pakaiAI = true;
      }
    } catch {
      // jatuh ke bentuk daftar biasa di bawah
    }

    if (!pesan) {
      const baris: string[] = [`🌅 *Perintah Kerja — ${hariIni}*`, ""];
      if (tertinggal.length > 0) baris.push(`⚠️ Tertinggal kemarin: ${tertinggal.slice(0, 5).join(", ")}`, "");
      baris.push("*Prioritas hari ini:*");
      tugasHariIni.slice(0, 8).forEach((t: any, i: number) => {
        baris.push(`${i + 1}. ${t.title}${t.deadline_time ? ` — sebelum ${t.deadline_time}` : ""}`);
      });
      if (kuraSakit.length > 0) baris.push("", `🩺 Perhatian khusus: ${kuraSakit.slice(0, 5).join(", ")}`);
      if (terkunci.length > 0) baris.push("", `🔒 Jangan dikerjakan (bahan habis): ${terkunci.slice(0, 4).join(", ")}`);
      if (menetasDekat.length > 0) baris.push("", `🥚 Telur mendekati menetas: ${menetasDekat.join(", ")}`);
      baris.push("", "Jangan lupa dicentang di aplikasi ya 🙏");
      pesan = baris.join("\n");
    }

    const grupPagi = settings?.morning_group_id;
    let terkirim = false;
    if (grupPagi) {
      const r = await sendWhatsAppNotification(base44, {
        targets: [grupPagi],
        message: pesan.slice(0, 2000),
        notificationType: "kepala_feeder_digital",
        relatedEntityId: `perintah_kerja_${hariIni}`,
      });
      terkirim = r.success;
    }

    await setOtomatis(base44, otomatis, { kepala_feeder_digital_terakhir: hariIni });

    return Response.json({
      success: true,
      pakai_ai: pakaiAI,
      terkirim,
      ada_grup_pagi: Boolean(grupPagi),
      keadaan,
      pesan,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
