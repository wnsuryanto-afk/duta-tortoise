import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { diPeternakan } from "../../shared/kura.ts";
import { masukLaporan } from "../../shared/laporan.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";
import { perluDitimbang } from "../../shared/timbang.ts";

/**
 * getRotasiUkur — kura mana yang perlu ditimbang hari ini, dan KENAPA.
 *
 * Namanya masih "rotasi" karena dipakai dua layar dan satu tugas SOP; isinya
 * bukan rotasi lagi sejak 17-09-2026.
 *
 * ── APA YANG BERUBAH ───────────────────────────────────────────────
 *
 * Dulu: dua kura dewasa per hari, yang paling lama tidak ditimbang lebih
 * dulu, ambang 60 hari. Di atas kertas seluruh kawanan tersapu tiap dua
 * bulan.
 *
 * Nyatanya, dari 120 kura dewasa aktif: 44 ekor masih memakai berat
 * 12 Juli 2025 — empat belas bulan. Rotasinya tidak pernah menyelesaikan
 * satu putaran. Kura dewasa 20–37 kg tidak mau diam, tugasnya sering
 * terlewat, dan yang terlewat kembali ke antrean tanpa pernah naik.
 *
 * Sekarang: yang ditimbang hanya yang ada alasannya —
 *
 *   1. dilaporkan TIDAK MAKAN dan belum ditimbang sesudahnya,
 *   2. SEDANG DIOBATI dengan berat lebih dari 7 hari (dosis obat dibagi
 *      dengan berat; ini satu-satunya pemicu yang menyentuh keselamatan),
 *   3. BABY & JUVENILE, tetap rutin tiap 14 hari.
 *
 * Kura dewasa yang sehat dan makan tidak muncul sama sekali. Itu memang
 * maksudnya: rotasi yang tidak pernah selesai bukan pengawasan, hanya
 * daftar tugas yang gagal tiap hari.
 *
 * Aturannya dipegang shared/timbang.ts bersama kembaran frontend
 * src/lib/jadwalTimbang.js, dan jawabannya diuji scripts/cek-timbang.mjs.
 *
 * Read-only. Bentuk balasannya dipertahankan ({ babies, dewasa }) supaya
 * daftar tugas harian dan widget keeper tidak perlu diubah sekaligus —
 * tapi tiap baris kini membawa `alasan` yang bisa ditampilkan.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split("T")[0];

    const svc = base44.asServiceRole;

    const [tortoises, measurements, laporanMakan] = await Promise.all([
      svc.entities.Tortoise.list("-created_date", BATAS_AMBIL),
      svc.entities.MeasurementHistory.list("-date", BATAS_AMBIL),
      svc.entities.LaporanMakan.list("-date", BATAS_AMBIL),
    ]);

    const active = (tortoises || []).filter(diPeternakan);

    /*
     * Tanggal ukur terakhir dihitung dari MeasurementHistory, bukan dari
     * kolom Tortoise.last_weighed_date saja.
     *
     * Baris kembar dan salah ketik ditandai keluar dari laporan, dan baris
     * seperti itu TIDAK boleh menghitung sebagai "sudah ditimbang" — kalau
     * dihitung, satu salah ketik membuat kura hilang dari daftar selama dua
     * minggu. Pengukuran hari ini juga tidak dihitung, supaya daftar tugas
     * stabil sepanjang hari dan tidak berubah di tengah kerja.
     */
    const terakhir: Record<string, string> = {};
    for (const m of measurements || []) {
      if (!masukLaporan(m)) continue;
      if (!m?.tortoise_id || !m?.date) continue;
      if (m.date >= targetDate) continue;
      if (!terakhir[m.tortoise_id]) terakhir[m.tortoise_id] = m.date;
    }

    const kura = active.map((t: any) => ({
      ...t,
      last_weighed_date: terakhir[t.id] || null,
    }));

    const daftar = perluDitimbang(kura, (laporanMakan || []).filter(masukLaporan), targetDate);

    const baris = (d: any) => ({
      id: d.kura.id,
      code: d.kura.code || d.kura.name,
      name: d.kura.name,
      enclosure: d.kura.enclosure || "-",
      species: d.kura.species,
      lastMeasuredDate: d.kura.last_weighed_date,
      alasan: d.kode,
      alasanTeks: d.teks,
      prioritas: d.prioritas,
    });

    // Bentuk lama dipertahankan: babies = yang rutin, dewasa = yang berpemicu.
    const babies = daftar.filter((d: any) => d.kode === "rutin_baby").map(baris);
    const dewasa = daftar.filter((d: any) => d.kode !== "rutin_baby").map(baris);

    return Response.json({
      date: targetDate,
      babies,
      dewasa,
      semua: daftar.map(baris),
      totalBabyCandidates: babies.length,
      totalAdultCandidates: dewasa.length,
    });
  } catch (error) {
    return Response.json({ error: (error as Error)?.message }, { status: 500 });
  }
});
