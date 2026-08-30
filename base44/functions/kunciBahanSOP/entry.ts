import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, notifSekali, emailPerRole } from "../../shared/otomatis.ts";
import { sendWhatsAppNotification, getPhoneNumbersForRoles } from "../../shared/whatsapp.ts";

/**
 * A9 — Tandai SOP yang bahannya habis, supaya tidak dibayar poin untuk
 * pekerjaan yang mustahil dikerjakan.
 *
 * Contoh nyata pada 29 Agustus 2026: task harian "Vitamin Reproduksi 1 sdm —
 * semua kura betina" aktif dengan 10 poin, sementara stok racikannya 0 dari
 * minimum 3.000 g dan bahan pembuatnya (Vitamin E, Vitamin D) juga 0. Poin
 * tetap keluar tiap hari untuk tugas yang bahannya tidak ada.
 *
 * Fungsi ini menandai task seperti itu dengan `terkunci_bahan = true` beserta
 * alasannya, dan melepas tandanya sendiri begitu stok terisi lagi. Yang
 * memutuskan menonaktifkan task tetap manusia — di sini hanya kebenarannya
 * yang ditegakkan.
 *
 * Bergantung pada `required_skus` di SOPTask. Task yang belum diisi SKU-nya
 * tidak bisa diperiksa, dan itu dilaporkan terpisah supaya tidak diam-diam
 * terlewat.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.kunci_sop_stok_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();

    const [sopTasks, gudang, pakan] = await Promise.all([
      base44.asServiceRole.entities.SOPTask.list(),
      base44.asServiceRole.entities.WarehouseItem.list("name", 500),
      base44.asServiceRole.entities.FeedStock.list("name", 200),
    ]);

    const stokBySku = new Map<string, any>();
    for (const i of gudang || []) if (i.sku) stokBySku.set(String(i.sku), i);
    for (const f of pakan || []) if (f.sku) stokBySku.set(String(f.sku), f);

    const terkunci: string[] = [];
    const dilepas: string[] = [];
    const tanpaSku: string[] = [];

    for (const t of sopTasks || []) {
      if (t.is_active !== true) continue;
      if (t.butuh_bahan_gudang !== true) continue;

      const skus: string[] = Array.isArray(t.required_skus) ? t.required_skus.filter(Boolean) : [];
      if (skus.length === 0) {
        tanpaSku.push(t.title);
        continue;
      }

      const habis: string[] = [];
      for (const sku of skus) {
        const item = stokBySku.get(String(sku));
        if (!item) {
          habis.push(`SKU ${sku} tidak terdaftar`);
          continue;
        }
        if (Number(item.current_stock || 0) <= 0) habis.push(item.name);
      }

      if (habis.length > 0) {
        const alasan = `Bahan habis: ${habis.join(", ")}`;
        if (t.terkunci_bahan !== true || t.terkunci_alasan !== alasan) {
          await base44.asServiceRole.entities.SOPTask.update(t.id, {
            terkunci_bahan: true,
            terkunci_alasan: alasan,
          });
        }
        terkunci.push(`${t.title} — ${habis.join(", ")}`);
      } else if (t.terkunci_bahan === true) {
        await base44.asServiceRole.entities.SOPTask.update(t.id, {
          terkunci_bahan: false,
          terkunci_alasan: "",
        });
        dilepas.push(t.title);
      }
    }

    // Laporkan hanya bila keadaannya berubah atau belum dilaporkan hari ini.
    const perluLapor = terkunci.length > 0 && (otomatis.kunci_sop_terakhir || "").slice(0, 10) !== hariIni;

    if (perluLapor) {
      const isi =
        `SOP berikut tidak bisa dikerjakan karena bahannya habis:\n\n` +
        terkunci.map((s, i) => `${i + 1}. ${s}`).join("\n") +
        `\n\nSelama bahan belum ada, poin untuk task ini sebaiknya tidak dibayar.`;

      const penerima = await emailPerRole(base44, ["owner", "manajer", "admin"]);
      for (const email of penerima) {
        await notifSekali(base44, {
          recipient_email: email,
          title: `${terkunci.length} SOP terhenti karena bahan habis`,
          message: isi.slice(0, 900),
          type: "alert",
          priority: "tinggi",
          category: "stok",
          action_label: "Lihat Gudang",
          action_url: "/warehouse",
          related_entity_id: `kunci_sop_${hariIni}`,
          related_entity_type: "SOPTask",
        });
      }

      const nomor = await getPhoneNumbersForRoles(base44, ["owner"]);
      if (nomor.length > 0) {
        await sendWhatsAppNotification(base44, {
          targets: nomor,
          message: `🔒 *SOP terhenti karena bahan habis*\n\n${isi}`.slice(0, 1500),
          notificationType: "kunci_sop",
          relatedEntityId: `kunci_sop_${hariIni}`,
        });
      }

      await setOtomatis(base44, otomatis, { kunci_sop_terakhir: hariIni });
    }

    return Response.json({
      success: true,
      terkunci: terkunci.length,
      dilepas: dilepas.length,
      belum_punya_sku: tanpaSku.length,
      detail_terkunci: terkunci,
      detail_dilepas: dilepas,
      detail_belum_punya_sku: tanpaSku,
      dilaporkan: perluLapor,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
