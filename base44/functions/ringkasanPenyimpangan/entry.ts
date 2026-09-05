import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  getOtomatis,
  setOtomatis,
  wibTanggal,
  wibJam,
  sudahWaktunya,
  userPerRole,
  sopIdDariTaskId,
  itemIdDariTaskId,
  petaFotoHarian,
} from "../../shared/otomatis.ts";
import { sendWhatsAppNotification, getPhoneNumbersForRoles } from "../../shared/whatsapp.ts";
import { dilacak } from "../../shared/stok.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";


/**
 * A14 — Laporan khusus penyimpangan untuk owner.
 *
 * Ringkasan sore yang ada sekarang mengirim keadaan lengkap tiap hari, baik
 * ada masalah maupun tidak. Laporan yang selalu datang berhenti dibaca, dan
 * hari yang benar-benar bermasalah tenggelam di antara hari-hari normal.
 *
 * Fungsi ini hanya bicara bila ada yang menyimpang:
 *   - checklist belum masuk sampai sore
 *   - foto ditolak AI / gagal diperiksa
 *   - task wajib foto dicentang tanpa foto
 *   - checklist masih menunggu persetujuan
 *   - bahan gudang habis padahal SOP hariannya jalan
 *   - stok pakan menipis
 *   - laporan kura sakit hari ini
 *   - obat kadaluarsa dalam 7 hari
 *
 * Bila semuanya normal, tidak ada pesan sama sekali (bisa diubah lewat
 * ringkasan_penyimpangan_diam_bila_aman).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.ringkasan_penyimpangan_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.ringkasan_penyimpangan_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_kirim_hari_ini" });
    }
    if (!sudahWaktunya(otomatis.ringkasan_penyimpangan_jam, "17:00")) {
      return Response.json({ skipped: "belum_waktunya", wib_now: wibJam() });
    }

    const [checklists, sopTasks, gudang, pakan, kesehatan, petugas] = await Promise.all([
      base44.asServiceRole.entities.DailyChecklist.filter({ date: hariIni }, null, BATAS_AMBIL),
      base44.asServiceRole.entities.SOPTask.list(null, BATAS_AMBIL),
      base44.asServiceRole.entities.WarehouseItem.list("name", 500),
      base44.asServiceRole.entities.FeedStock.list("name", 200),
      base44.asServiceRole.entities.HealthRecord.list("-date", 100),
      userPerRole(base44, ["keeper", "kepala_feeder"]),
    ]);

    const penyimpangan: string[] = [];

    // 1. Siapa yang belum mengisi checklist.
    const sudahIsi = new Set(
      (checklists || [])
        .filter((cl: any) => Array.isArray(cl.completed_tasks) && cl.completed_tasks.length > 0)
        .map((cl: any) => cl.employee_email),
    );
    const belum = (petugas || []).filter((u: any) => !sudahIsi.has(u.email));
    if (belum.length > 0) {
      penyimpangan.push(
        `❌ Checklist belum masuk: ${belum.map((u: any) => u.full_name || u.email).join(", ")}`,
      );
    }

    // 2. Mutu bukti kerja.
    //
    // Foto disimpan di MaintenanceLog dan hanya sebagian tersalin ke checklist.
    // Membaca dari checklist saja menghasilkan laporan "dicentang tanpa foto"
    // untuk pekerjaan yang fotonya sebenarnya ada — satu-dua laporan palsu cukup
    // untuk membuat seluruh ringkasan ini berhenti dipercaya.
    const petaFoto = await petaFotoHarian(base44, hariIni);
    const wajibFoto: Record<string, boolean> = {};
    for (const t of sopTasks || []) wajibFoto[t.id] = t.require_photo === true;
    const kebersihanWajibFoto = (sopTasks || []).some(
      (t: any) =>
        t.is_active === true &&
        t.task_scope === "per_kandang" &&
        /pembersihan kandang/i.test(t.title || "") &&
        t.require_photo === true,
    );

    let aiTolak = 0;
    let aiGagal = 0;
    let tanpaFoto = 0;
    const namaBermasalah = new Set<string>();
    for (const cl of checklists || []) {
      for (const t of cl.completed_tasks || []) {
        if (t.status === "skipped_no_stock") continue;
        if (t.ai_verified === false) { aiTolak++; namaBermasalah.add(cl.employee_name); }
        if (t.ai_status === "gagal") aiGagal++;
        const itemId = itemIdDariTaskId(t.task_id);
        const adaFoto = !!t.photo_url || petaFoto.has(`${cl.employee_email}|${itemId}`);
        const sopId = sopIdDariTaskId(t.task_id);
        const perluFoto = sopId
          ? wajibFoto[sopId] === true
          : itemId.startsWith("kebersihan_kandang_") && kebersihanWajibFoto;
        if (perluFoto && !adaFoto) {
          tanpaFoto++;
          namaBermasalah.add(cl.employee_name);
        }
      }
    }
    if (aiTolak > 0) penyimpangan.push(`📷 ${aiTolak} foto dinilai tidak sesuai oleh AI (${[...namaBermasalah].join(", ")})`);
    if (tanpaFoto > 0) penyimpangan.push(`📷 ${tanpaFoto} task wajib foto dicentang tanpa foto`);
    if (aiGagal > 0) penyimpangan.push(`⚙️ ${aiGagal} foto gagal diperiksa AI (perlu dicek manual)`);

    // 3. Antrian persetujuan.
    const menunggu = (checklists || []).filter((cl: any) => cl.status === "submitted");
    if (menunggu.length > 0) {
      penyimpangan.push(`⏳ ${menunggu.length} checklist menunggu persetujuan`);
    }

    // 4. Bahan habis padahal SOP-nya jalan hari ini.
    const stokPerSku = new Map<string, any>();
    for (const i of gudang || []) {
      if (i.sku) stokPerSku.set(String(i.sku), i);
    }
    const sopTerkunci: string[] = [];
    for (const t of sopTasks || []) {
      if (t.is_active !== true) continue;
      if (t.butuh_bahan_gudang !== true) continue;
      for (const sku of t.required_skus || []) {
        const item = stokPerSku.get(String(sku));
        if (item && Number(item.current_stock || 0) <= 0) {
          sopTerkunci.push(`${t.title} → ${item.name} habis`);
        }
      }
    }
    if (sopTerkunci.length > 0) {
      penyimpangan.push(`🔒 SOP terhenti karena bahan habis:\n   ${sopTerkunci.slice(0, 5).join("\n   ")}`);
    }

    // 5. Stok pakan menipis.
    const ambangHari = Number(otomatis.belanja_ambang_hari ?? 7);
    const pakanMenipis = (pakan || []).filter((f: any) => {
      // Sembilan record pakan seluruhnya dinonaktifkan pemilik; tanpa saringan
      // ini semuanya dilaporkan "menipis" tiap hari.
      if (!dilacak(f)) return false;
      const ideal = Number(f.daily_ideal || 0);
      const stok = Number(f.current_stock || 0);
      if (ideal > 0) return stok / ideal <= ambangHari;
      const min = Number(f.minimum_stock || 0);
      return min > 0 && stok <= min;
    });
    if (pakanMenipis.length > 0) {
      penyimpangan.push(
        `🥬 ${pakanMenipis.length} pakan menipis: ` +
        pakanMenipis.slice(0, 6).map((f: any) => f.name).join(", "),
      );
    }

    // 6. Kura sakit hari ini.
    const sakitHariIni = (kesehatan || []).filter((h: any) => String(h.date || "").startsWith(hariIni));
    if (sakitHariIni.length > 0) {
      penyimpangan.push(
        `🩺 ${sakitHariIni.length} laporan kesehatan baru: ` +
        sakitHariIni.slice(0, 5).map((h: any) => h.tortoise_name || "-").join(", "),
      );
    }

    // 7. Obat kadaluarsa dalam 7 hari.
    const dalam7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const kadaluarsa = (gudang || []).filter(
      (i: any) => i.expired_date && String(i.expired_date) <= dalam7,
    );
    if (kadaluarsa.length > 0) {
      penyimpangan.push(
        `⏰ ${kadaluarsa.length} barang kadaluarsa ≤7 hari: ` +
        kadaluarsa.slice(0, 5).map((i: any) => i.name).join(", "),
      );
    }

    if (penyimpangan.length === 0) {
      await setOtomatis(base44, otomatis, { ringkasan_penyimpangan_terakhir: hariIni });
      if (otomatis.ringkasan_penyimpangan_diam_bila_aman !== false) {
        return Response.json({ success: true, aman: true, dikirim: false });
      }
      const nomor = await getPhoneNumbersForRoles(base44, ["owner"]);
      if (nomor.length > 0) {
        await sendWhatsAppNotification(base44, {
          targets: nomor,
          message: `✅ *${hariIni}* — tidak ada penyimpangan hari ini.`,
          notificationType: "ringkasan_penyimpangan",
          relatedEntityId: `penyimpangan_${hariIni}`,
        });
      }
      return Response.json({ success: true, aman: true, dikirim: true });
    }

    const pesan =
      `⚠️ *Perlu perhatian — ${hariIni}*\n\n` +
      penyimpangan.map((p) => `${p}`).join("\n\n") +
      `\n\n_Hanya penyimpangan yang dilaporkan. Yang tidak disebut berarti normal._`;

    const nomor = await getPhoneNumbersForRoles(base44, ["owner"]);
    let wa = false;
    if (nomor.length > 0) {
      const r = await sendWhatsAppNotification(base44, {
        targets: nomor,
        message: pesan.slice(0, 2000),
        notificationType: "ringkasan_penyimpangan",
        relatedEntityId: `penyimpangan_${hariIni}`,
      });
      wa = r.success;
    }

    await setOtomatis(base44, otomatis, { ringkasan_penyimpangan_terakhir: hariIni });

    return Response.json({
      success: true,
      jumlah_penyimpangan: penyimpangan.length,
      wa_terkirim: wa,
      detail: penyimpangan,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
