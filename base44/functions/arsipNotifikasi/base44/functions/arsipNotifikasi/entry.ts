import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, WIB_OFFSET_MS } from "../../shared/otomatis.ts";

/**
 * A15 — Arsipkan notifikasi lama dan gabungkan yang berulang.
 *
 * Beberapa notifikasi (mis. "kura belum ditimbang >30 hari") terbit lagi tiap
 * hari selama penyebabnya belum ditangani, sehingga lonceng penuh dan justru
 * berhenti dibaca. Fungsi ini menyisakan yang terbaru dari tiap judul yang
 * sama, lalu meng-arsipkan sisanya dan semua yang lebih tua dari batas umur.
 *
 * Tidak ada yang dihapus — hanya ditandai is_dismissed, jadi bisa dilihat lagi.
 * Jalan paling banyak sekali sehari.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.arsip_notif_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.arsip_notif_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_jalan_hari_ini" });
    }

    const umurHari = Number(otomatis.arsip_notif_umur_hari ?? 7);
    const batas = Date.now() - umurHari * 24 * 60 * 60 * 1000;

    const semua = await base44.asServiceRole.entities.Notification.list("-created_date", 1000);
    const aktif = (semua || []).filter((n: any) => !n.is_dismissed);

    let kadaluarsa = 0;
    let duplikat = 0;

    // 1. Terlalu tua.
    const masihHidup: any[] = [];
    for (const n of aktif) {
      const waktu = new Date(n.created_at || n.created_date || 0).getTime();
      if (waktu && waktu < batas) {
        await base44.asServiceRole.entities.Notification.update(n.id, { is_dismissed: true });
        kadaluarsa++;
      } else {
        masihHidup.push(n);
      }
    }

    // 2. Judul yang sama untuk orang yang sama — sisakan yang terbaru saja.
    const terbaru = new Map<string, any>();
    const usang: any[] = [];
    for (const n of masihHidup) {
      const kunci = `${n.recipient_email}|${n.title}`;
      const ada = terbaru.get(kunci);
      if (!ada) {
        terbaru.set(kunci, n);
        continue;
      }
      const waktuAda = new Date(ada.created_at || ada.created_date || 0).getTime();
      const waktuIni = new Date(n.created_at || n.created_date || 0).getTime();
      if (waktuIni > waktuAda) {
        terbaru.set(kunci, n);
        usang.push(ada);
      } else {
        usang.push(n);
      }
    }
    for (const n of usang) {
      await base44.asServiceRole.entities.Notification.update(n.id, { is_dismissed: true });
      duplikat++;
    }

    await setOtomatis(base44, otomatis, {
      arsip_notif_terakhir: `${hariIni} ${new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(11, 16)} WIB`,
    });

    return Response.json({
      success: true,
      diarsipkan_kadaluarsa: kadaluarsa,
      diarsipkan_duplikat: duplikat,
      tersisa_aktif: terbaru.size,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
