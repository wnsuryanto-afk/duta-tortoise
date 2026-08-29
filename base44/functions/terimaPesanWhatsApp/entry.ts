import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, wibTanggal, emailPerRole } from "../../shared/otomatis.ts";
import { sendWhatsAppNotification, getSettings, normalizePhone, trackAICall } from "../../shared/whatsapp.ts";

/**
 * C10 — Laporan masuk lewat balasan WhatsApp.
 *
 * Untuk orang lapangan, WhatsApp selalu menang melawan aplikasi: sudah terbuka,
 * sudah dipakai, tidak perlu login. Fungsi ini adalah alamat webhook yang
 * dipanggil Fonnte setiap ada pesan masuk.
 *
 * PENTING — batas versi pertama ini: pesan yang masuk TIDAK langsung menjadi
 * catatan resmi. Ia dibaca AI untuk dikenali maksudnya, lalu diteruskan sebagai
 * notifikasi kepada owner/manajer beserta teks aslinya, dan pengirimnya dibalas
 * agar tahu laporannya sampai. Menulis langsung ke catatan kesehatan atau stok
 * dari teks bebas berisiko memasukkan data salah yang sulit ditelusuri; langkah
 * itu sebaiknya menyusul setelah pola pesannya terlihat dari data nyata.
 *
 * Cara memasang: di dashboard Fonnte, arahkan webhook pesan masuk ke URL fungsi
 * ini, lalu nyalakan saklar wa_masuk_enabled.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.wa_masuk_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    let payload: any = {};
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        payload = await req.json();
      } else {
        const form = await req.formData();
        for (const [k, v] of form.entries()) payload[k] = v;
      }
    } catch {
      return Response.json({ error: "payload tidak terbaca" }, { status: 400 });
    }

    const pengirim = normalizePhone(payload.sender || payload.from || payload.pengirim || "");
    const teks = String(payload.message || payload.text || payload.pesan || "").trim();
    const urlLampiran = payload.url || payload.media || "";

    if (!pengirim || !teks) {
      return Response.json({ skipped: "pesan_kosong" });
    }

    // Abaikan pesan dari grup — ini jalur laporan pribadi.
    if (String(payload.sender || "").includes("@g.us")) {
      return Response.json({ skipped: "dari_grup" });
    }

    const settings = await getSettings(base44);
    const daftar = Array.isArray(settings?.employee_phones) ? settings.employee_phones : [];
    const cocok = daftar.find((e: any) => normalizePhone(e.phone) === pengirim);

    if (!cocok) {
      // Nomor tak dikenal — jangan diproses, dan jangan dibalas (hindari spam).
      return Response.json({ skipped: "nomor_tidak_dikenal", pengirim });
    }

    // ── Kenali maksud pesan ──
    let maksud = "lainnya";
    let ringkas = teks.slice(0, 200);
    let mendesak = false;

    try {
      if (settings) await trackAICall(base44, settings);
      const hasil = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt:
          `Pesan WhatsApp dari karyawan peternakan kura. Kenali maksudnya.\n\n` +
          `Pengirim: ${cocok.name || cocok.email}\nPesan: "${teks}"\n\n` +
          `Kategori: lapor_kura_sakit, alat_rusak, stok_habis, selesai_tugas, izin_tidak_masuk, pertanyaan, lainnya.\n` +
          `mendesak = true hanya bila menyangkut keselamatan hewan atau orang.\n` +
          `ringkasan: satu kalimat, bahasa Indonesia.\n\nJawab HANYA dengan JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            kategori: { type: "string" },
            ringkasan: { type: "string" },
            mendesak: { type: "boolean" },
          },
        },
      });
      if (hasil?.kategori) maksud = String(hasil.kategori);
      if (hasil?.ringkasan) ringkas = String(hasil.ringkasan).slice(0, 300);
      mendesak = hasil?.mendesak === true;
    } catch {
      // AI gagal — pesan tetap diteruskan apa adanya
    }

    const hariIni = wibTanggal();
    const judulPer: Record<string, string> = {
      lapor_kura_sakit: "Laporan kura sakit lewat WhatsApp",
      alat_rusak: "Laporan alat rusak lewat WhatsApp",
      stok_habis: "Laporan stok habis lewat WhatsApp",
      selesai_tugas: "Laporan tugas selesai lewat WhatsApp",
      izin_tidak_masuk: "Izin tidak masuk lewat WhatsApp",
      pertanyaan: "Pertanyaan dari karyawan (WhatsApp)",
      lainnya: "Pesan masuk dari karyawan (WhatsApp)",
    };

    const penerima = await emailPerRole(base44, ["owner", "manajer"]);
    for (const email of penerima) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: email,
        title: judulPer[maksud] || judulPer.lainnya,
        message:
          `${cocok.name || cocok.email}: ${ringkas}\n\n` +
          `Pesan asli:\n"${teks.slice(0, 500)}"` +
          (urlLampiran ? `\n\nLampiran: ${urlLampiran}` : ""),
        type: mendesak ? "alert" : "info",
        priority: mendesak ? "tinggi" : "sedang",
        category: maksud === "lapor_kura_sakit" ? "kesehatan" : maksud === "stok_habis" ? "stok" : "lainnya",
        action_label: "Buka Aplikasi",
        action_url: "/",
        related_entity_id: `wa_masuk_${pengirim}_${Date.now()}`,
        related_entity_type: "WhatsAppLog",
        is_read: false,
        is_dismissed: false,
        created_at: new Date().toISOString(),
      });
    }

    // Balas pengirim supaya ia tahu laporannya sampai.
    await sendWhatsAppNotification(base44, {
      targets: [pengirim],
      message:
        `Terima kasih ${cocok.name || ""}, laporannya sudah kami terima dan diteruskan ke manajemen.` +
        (maksud === "lapor_kura_sakit"
          ? `\n\nKalau kondisinya berat, tolong segera hubungi kepala feeder langsung ya.`
          : ""),
      notificationType: "balasan_wa_masuk",
      relatedEntityId: `balas_${pengirim}_${hariIni}_${maksud}`,
    });

    return Response.json({
      success: true,
      pengirim: cocok.name || cocok.email,
      maksud,
      mendesak,
      ringkasan: ringkas,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
