import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, sudahWaktunya, notifSekali, emailPerRole } from "../../shared/otomatis.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";
import { stokPerluDiperhatikan, stokHabis } from "../../shared/stok.ts";

/**
 * Pemeriksaan stok harian.
 *
 * Menggantikan otomatisasi "Alert Stok Obat Menipis", yang dipicu SAAT
 * WarehouseItem diubah. Pemicu berbasis kejadian punya titik buta yang persis
 * berlawanan dengan yang dibutuhkan: barang yang turun di bawah minimum lalu
 * tidak pernah disentuh lagi berhenti berbunyi selamanya. Justru barang yang
 * diam itulah yang paling lama kosong.
 *
 * Buktinya di data 15-09-2026: otomatisasi lama terakhir jalan 31 Agustus,
 * sementara racikan Duta Repro, bahan Vitamin E, dan bahan Vitamin D sudah
 * berstok nol tanpa satu pun peringatan. Tanpa Vitamin E dan D, racikannya
 * bahkan tidak bisa dibuat ulang.
 *
 * Pemeriksaan ini berjalan tiap hari atas SELURUH daftar — gudang dan pakan —
 * jadi barang yang diam tetap terhitung. Anti-dobelnya per tanggal WIB, dan
 * ada pagar jam supaya tidak mendarat tengah malam.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.cek_stok_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.cek_stok_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_jalan_hari_ini" });
    }
    if (!sudahWaktunya(otomatis.cek_stok_jam, "07:00")) {
      return Response.json({ skipped: "belum_jamnya" });
    }

    const [gudang, pakan] = await Promise.all([
      base44.asServiceRole.entities.WarehouseItem.list("name", BATAS_AMBIL),
      base44.asServiceRole.entities.FeedStock.list("name", BATAS_AMBIL),
    ]);

    const perlu = stokPerluDiperhatikan(gudang || [], pakan || []);
    const habis = perlu.filter(stokHabis);
    const menipis = perlu.filter((i: any) => !stokHabis(i));

    const baris = (i: any) =>
      `${i.name}${i._sumber === "pakan" ? " (pakan)" : ""}: ${Number(i.current_stock) || 0} dari minimum ${Number(i.minimum_stock) || 0} ${i.unit || ""}`.trim();

    let dikirim = 0;
    if (perlu.length > 0) {
      const bagian: string[] = [];
      if (habis.length > 0) bagian.push(`HABIS (${habis.length}):\n` + habis.slice(0, 12).map(baris).join("\n"));
      if (menipis.length > 0) bagian.push(`MENIPIS (${menipis.length}):\n` + menipis.slice(0, 12).map(baris).join("\n"));

      for (const email of await emailPerRole(base44, ["owner", "manajer", "admin"])) {
        const dibuat = await notifSekali(base44, {
          recipient_email: email,
          title: `${habis.length} barang habis, ${menipis.length} menipis`,
          message: bagian.join("\n\n").slice(0, 900),
          type: habis.length > 0 ? "alert" : "warning",
          priority: habis.length > 0 ? "tinggi" : "sedang",
          category: "stok",
          action_label: "Buka Stok & Gudang",
          action_url: "/stok-unified",
          related_entity_id: `cek_stok_${hariIni}`,
          related_entity_type: "WarehouseItem",
        });
        if (dibuat) dikirim++;
      }
    }

    await setOtomatis(base44, otomatis, { cek_stok_terakhir: hariIni });

    return Response.json({
      success: true,
      diperiksa: (gudang?.length || 0) + (pakan?.length || 0),
      habis: habis.length,
      menipis: menipis.length,
      notifikasi_dibuat: dikirim,
      detail_habis: habis.slice(0, 20).map(baris),
      detail_menipis: menipis.slice(0, 20).map(baris),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
