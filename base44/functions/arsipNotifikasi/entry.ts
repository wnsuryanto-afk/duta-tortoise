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

    /*
     * Batas kerja per panggilan.
     *
     * Versi pertama meng-update satu per satu tanpa batas. Saat pertama kali
     * benar-benar dijalankan (14 Sep 2026) ada 375 notifikasi menunggu, dan
     * fungsinya mati di tengah jalan dengan "Rate limit exceeded" — SEBELUM
     * sempat menulis arsip_notif_terakhir. Artinya tiap jam ia mengulang
     * seluruhnya dari awal dan gagal lagi di titik yang sama, selamanya.
     *
     * Pola kegagalan yang sama persis dengan ringkasan WhatsApp yang mati 11
     * hari: gagal sebelum menandai selesai, lalu mengulang tanpa henti.
     *
     * Sekarang: dikirim berkelompok, dibatasi per panggilan, dan penanda
     * "sudah jalan hari ini" HANYA ditulis bila tunggakannya benar-benar
     * habis. Kalau masih ada sisa, panggilan jam berikutnya melanjutkan.
     */
    /*
     * Takaran sengaja kecil. Percobaan 14 Sep 2026 dengan 250 per jalan tetap
     * kena "Rate limit exceeded" — dan lemparannya datang dari list(), bukan
     * dari penulisan, artinya kuota akun memang sudah tipis saat itu. Lebih
     * baik tunggakan 375 selesai dalam 4 jam daripada gagal terus tiap jam.
     */
    const MAKS_PER_JALAN = 100;
    const UKURAN_KELOMPOK = 25;

    const semua = await base44.asServiceRole.entities.Notification.list("-created_date", 1000);
    const aktif = (semua || []).filter((n: any) => !n.is_dismissed);

    const waktuNotif = (n: any) => new Date(n.created_at || n.created_date || 0).getTime();

    // 1. Terlalu tua.
    const terlaluTua: any[] = [];
    const masihHidup: any[] = [];
    for (const n of aktif) {
      const waktu = waktuNotif(n);
      if (waktu && waktu < batas) terlaluTua.push(n);
      else masihHidup.push(n);
    }

    // 2. Judul yang sama untuk orang yang sama — sisakan yang terbaru saja.
    const terbaru = new Map<string, any>();
    const usang: any[] = [];
    for (const n of masihHidup) {
      const kunci = `${n.recipient_email}|${n.title}`;
      const ada = terbaru.get(kunci);
      if (!ada) { terbaru.set(kunci, n); continue; }
      if (waktuNotif(n) > waktuNotif(ada)) { terbaru.set(kunci, n); usang.push(ada); }
      else usang.push(n);
    }

    // Yang tua diberesi lebih dulu — itu yang paling memenuhi lonceng.
    const antre = [...terlaluTua, ...usang];
    const dikerjakan = antre.slice(0, MAKS_PER_JALAN);
    const sisa = antre.length - dikerjakan.length;

    let berhasil = 0;
    for (let i = 0; i < dikerjakan.length; i += UKURAN_KELOMPOK) {
      const kelompok = dikerjakan.slice(i, i + UKURAN_KELOMPOK);
      try {
        await base44.asServiceRole.entities.Notification.bulkUpdate(
          kelompok.map((n: any) => ({ id: n.id, is_dismissed: true }))
        );
        berhasil += kelompok.length;
      } catch {
        // Satu kelompok gagal tidak boleh membatalkan yang sudah berhasil.
        // Sisanya diambil panggilan berikutnya karena penanda tidak ditulis.
        break;
      }
    }

    const kadaluarsa = Math.min(berhasil, terlaluTua.length);
    const duplikat = Math.max(0, berhasil - kadaluarsa);
    const tuntas = berhasil >= antre.length;

    if (tuntas) {
      await setOtomatis(base44, otomatis, {
        arsip_notif_terakhir: `${hariIni} ${new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(11, 16)} WIB`,
      });
    }

    return Response.json({
      success: true,
      diarsipkan_kadaluarsa: kadaluarsa,
      diarsipkan_duplikat: duplikat,
      tersisa_aktif: terbaru.size,
      // Bila belum tuntas, penanda harian sengaja TIDAK ditulis supaya
      // panggilan jam berikutnya melanjutkan sisanya.
      sisa_antre: sisa + (antre.length - berhasil - sisa),
      tuntas,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
