import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  getOtomatis,
  setOtomatis,
  wibTanggal,
  tanggalMundur,
  notifSekali,
  emailPerRole,
} from "../../shared/otomatis.ts";
import { getSettings, trackAICall } from "../../shared/whatsapp.ts";

/**
 * C4 — Deteksi dini penyakit dari foto yang sudah ada.
 *
 * Keeper sudah mengunggah foto bukti kerja tiap hari, dan foto timbang juga
 * masuk ke riwayat. Foto-foto itu selama ini hanya dipakai untuk membuktikan
 * bahwa tugas dikerjakan, lalu dilupakan. Fungsi ini membacanya sekali lagi
 * dengan pertanyaan yang berbeda: adakah tanda penyakit di sini.
 *
 * Tidak ada kerja tambahan bagi keeper — sumbernya foto yang sudah diambil.
 *
 * Yang dicari: shell rot (busuk tempurung), piramiding, mata bengkak/tertutup,
 * hidung berlendir, luka terbuka, tempurung retak, kondisi terlalu kurus.
 *
 * Hasil BUKAN diagnosis. Temuan disimpan sebagai PhotoFinding berstatus aktif
 * dan dilaporkan sebagai "perlu dilihat manusia" — keputusan pengobatan tetap
 * pada dokter hewan atau owner.
 *
 * Biaya AI dijaga lewat batas jumlah foto per hari (deteksi_penyakit_maks_foto).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.deteksi_penyakit_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.deteksi_penyakit_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_jalan_hari_ini" });
    }

    const maksFoto = Number(otomatis.deteksi_penyakit_maks_foto ?? 12);
    const kemarin = tanggalMundur(1);

    // Kumpulkan foto: bukti checklist + foto timbang.
    type Foto = {
      url: string;
      sumber: string;
      tanggal: string;
      judul: string;
      kura: string;
      kandang: string;
      email: string;
      nama: string;
      checklistId: string;
    };
    const fotoList: Foto[] = [];

    for (const tanggal of [hariIni, kemarin]) {
      const checklists = await base44.asServiceRole.entities.DailyChecklist.filter({ date: tanggal });
      for (const cl of checklists || []) {
        for (const t of cl.completed_tasks || []) {
          if (!t.photo_url) continue;
          const judul = String(t.task_title || "");
          // Prioritaskan foto yang memang memperlihatkan kura atau kandang.
          const relevan = /kura|mandi|bersih|kandang|timbang|periksa|baby|jemur/i.test(judul);
          if (!relevan) continue;
          fotoList.push({
            url: t.photo_url,
            sumber: "checklist",
            tanggal,
            judul,
            kura: "",
            kandang: String(t.notes || ""),
            email: cl.employee_email,
            nama: cl.employee_name,
            checklistId: cl.id,
          });
        }
      }
    }

    const ukuran = await base44.asServiceRole.entities.MeasurementHistory.list("-date", 40);
    for (const m of ukuran || []) {
      if (!m.photo_url) continue;
      if (String(m.date || "") < tanggalMundur(7)) continue;
      fotoList.push({
        url: m.photo_url,
        sumber: "timbang",
        tanggal: m.date,
        judul: "Foto timbang",
        kura: m.tortoise_name || "",
        kandang: "",
        email: m.measured_by || "",
        nama: m.measured_by || "",
        checklistId: "",
      });
    }

    if (fotoList.length === 0) {
      await setOtomatis(base44, otomatis, { deteksi_penyakit_terakhir: hariIni });
      return Response.json({ success: true, tidak_ada_foto: true });
    }

    // Jangan periksa foto yang sudah pernah diperiksa.
    const temuanLama = await base44.asServiceRole.entities.PhotoFinding.list("-date", 300);
    const sudahDiperiksa = new Set((temuanLama || []).map((f: any) => f.photo_url).filter(Boolean));
    const antrian = fotoList.filter((f) => !sudahDiperiksa.has(f.url)).slice(0, maksFoto);

    const settings = await getSettings(base44);
    const temuan: string[] = [];
    let diperiksa = 0;
    let gagal = 0;

    for (const f of antrian) {
      try {
        if (settings) await trackAICall(base44, settings);
        const hasil = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt:
            `Anda pemeriksa kesehatan kura sulcata yang berhati-hati. Periksa foto ini untuk TANDA PENYAKIT saja.\n\n` +
            `Konteks foto: ${f.judul}${f.kura ? ` — kura ${f.kura}` : ""}${f.kandang ? ` — ${f.kandang}` : ""}.\n\n` +
            `Cari khusus: busuk tempurung (shell rot), piramiding, mata bengkak/tertutup, hidung berlendir, ` +
            `luka terbuka, tempurung retak atau penyok, badan terlalu kurus, kotoran tidak normal.\n\n` +
            `Aturan penting:\n` +
            `- Bila tidak ada kura yang terlihat jelas di foto, jawab ada_tanda=false.\n` +
            `- Bila ragu, jawab ada_tanda=false. Peringatan palsu lebih merugikan daripada terlewat, karena ` +
            `  membuat semua peringatan berhenti dipercaya.\n` +
            `- Ini BUKAN diagnosis. Sebutkan apa yang TERLIHAT, bukan nama penyakit yang dipastikan.\n` +
            `- keyakinan 0-100. Di bawah 60 berarti ragu.\n\n` +
            `Jawab HANYA dengan JSON.`,
          file_urls: [f.url],
          response_json_schema: {
            type: "object",
            properties: {
              ada_tanda: { type: "boolean" },
              keyakinan: { type: "number" },
              yang_terlihat: { type: "string" },
              tingkat: { type: "string", enum: ["ringan", "sedang", "perlu_segera"] },
              saran_langkah: { type: "string" },
            },
          },
        });
        diperiksa++;

        if (hasil?.ada_tanda === true && Number(hasil.keyakinan || 0) >= 60) {
          const kunci = `deteksi_${f.tanggal}_${f.url.slice(-24)}`;
          await base44.asServiceRole.entities.PhotoFinding.create({
            finding_key: kunci,
            checklist_id: f.checklistId || undefined,
            date: f.tanggal,
            task_title: f.judul,
            employee_email: f.email || undefined,
            employee_name: f.nama || undefined,
            enclosure: f.kandang || undefined,
            tortoise_code: f.kura || undefined,
            photo_url: f.url,
            finding_text:
              `[AI deteksi dini, keyakinan ${Math.round(Number(hasil.keyakinan || 0))}%] ` +
              `${hasil.yang_terlihat || "ada tanda tidak wajar"}` +
              (hasil.saran_langkah ? ` — saran: ${hasil.saran_langkah}` : ""),
            category: "kesehatan_kura",
            status: "active",
          });
          temuan.push(
            `${f.kura || f.kandang || f.judul} (${f.tanggal}): ${hasil.yang_terlihat} [${hasil.tingkat || "sedang"}]`,
          );
        }
      } catch {
        gagal++;
      }
    }

    if (temuan.length > 0) {
      const penerima = await emailPerRole(base44, ["owner", "manajer"]);
      for (const email of penerima) {
        await notifSekali(base44, {
          recipient_email: email,
          title: `${temuan.length} kemungkinan tanda penyakit dari foto`,
          message:
            temuan.slice(0, 8).join("\n\n") +
            `\n\nIni hasil pembacaan AI atas foto rutin, bukan diagnosis. Mohon dilihat langsung.`,
          type: "alert",
          priority: "tinggi",
          category: "kesehatan",
          action_label: "Lihat Temuan Foto",
          action_url: "/temuan-foto",
          related_entity_id: `deteksi_penyakit_${hariIni}`,
          related_entity_type: "PhotoFinding",
        });
      }
    }

    await setOtomatis(base44, otomatis, { deteksi_penyakit_terakhir: hariIni });

    return Response.json({
      success: true,
      foto_tersedia: fotoList.length,
      diperiksa,
      gagal,
      temuan: temuan.length,
      detail: temuan,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
