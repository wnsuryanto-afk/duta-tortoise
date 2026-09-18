import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, notifSekali, emailPerRole, potongRapi } from "../../shared/otomatis.ts";
import { sendWhatsAppNotification, getPhoneNumbersForRoles } from "../../shared/whatsapp.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";

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
      base44.asServiceRole.entities.SOPTask.list(null, BATAS_AMBIL),
      base44.asServiceRole.entities.WarehouseItem.list("name", 500),
      base44.asServiceRole.entities.FeedStock.list("name", 200),
    ]);
    // Bahan nonaktif dilewati. Bahan yang tidak dicatat masuk-keluarnya - mis.
    // rumput dan kaktus dari kebun sendiri - angka stoknya tidak pernah benar,
    // jadi bertindak atasnya berarti bertindak atas angka karangan.
    const pakanAktif = (pakan || []).filter((f: any) => f?.is_active !== false);

    const stokBySku = new Map<string, any>();
    for (const i of gudang || []) if (i.sku) stokBySku.set(String(i.sku), i);
    for (const f of pakanAktif || []) if (f.sku) stokBySku.set(String(f.sku), f);

    const terkunci: string[] = [];
    const dilepas: string[] = [];
    const tanpaSku: string[] = [];
    const kunciManualLama: string[] = [];

    /*
     * Kunci MANUAL yang membusuk.
     *
     * Fungsi ini hanya mengurus task dengan `butuh_bahan_gudang = true`; task
     * lain dilewati, sehingga kunci yang dipasang manusia (mis. "Panen azolla
     * \u2014 stok habis", 18-09-2026) tidak akan pernah dibuka sendiri. Itu
     * memang disengaja, tapi punya sisi gelap: tugas yang terkunci TIDAK
     * dihitung sebagai kewajiban, jadi kunci yang terlupakan menaikkan angka
     * kepatuhan diam-diam. Semakin lama dibiarkan, semakin bagus angkanya \u2014
     * persis kebalikan dari yang seharusnya.
     *
     * Jadi kunci manual yang sudah lebih dari 14 hari dilaporkan. Yang dipakai
     * `updated_date`, yang berubah pada setiap penyuntingan; artinya "sudah
     * 14 hari tidak disentuh", bukan "dikunci 14 hari lalu". Itu perkiraan,
     * dan lebih baik daripada diam.
     */
    const BATAS_KUNCI_HARI = 14;
    const sekarang = Date.now();

    for (const t of sopTasks || []) {
      if (t.is_active !== true) continue;
      if (t.butuh_bahan_gudang !== true) {
        if (t.terkunci_bahan === true) {
          const disentuh = Date.parse(t.updated_date || t.created_date || "");
          const umur = Number.isFinite(disentuh)
            ? Math.floor((sekarang - disentuh) / 86400000)
            : null;
          if (umur === null || umur >= BATAS_KUNCI_HARI) {
            kunciManualLama.push(
              `${t.title} \u2014 ${umur === null ? "tanggal tidak diketahui" : `${umur} hari`}` +
              `${t.terkunci_alasan ? ` (${t.terkunci_alasan})` : ""}`,
            );
          }
        }
        continue;
      }

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
    const perluLapor =
      (terkunci.length > 0 || kunciManualLama.length > 0) &&
      (otomatis.kunci_sop_terakhir || "").slice(0, 10) !== hariIni;

    if (perluLapor) {
      let isi = "";
      if (terkunci.length > 0) {
        isi +=
          `SOP berikut tidak bisa dikerjakan karena bahannya habis:\n\n` +
          terkunci.map((s, i) => `${i + 1}. ${s}`).join("\n") +
          `\n\nSelama bahan belum ada, poin untuk task ini sebaiknya tidak dibayar.`;
      }
      if (kunciManualLama.length > 0) {
        if (isi) isi += "\n\n";
        isi +=
          `SOP berikut dikunci MANUAL dan sudah lama tidak ditinjau. Selama ` +
          `terkunci, tugas ini tidak dihitung sebagai kewajiban \u2014 jadi kunci ` +
          `yang terlupakan membuat angka kepatuhan terlihat lebih baik dari ` +
          `kenyataannya:\n\n` +
          kunciManualLama.map((s, i) => `${i + 1}. ${s}`).join("\n") +
          `\n\nBuka kuncinya bila pekerjaannya sudah bisa dikerjakan lagi.`;
      }

      const penerima = await emailPerRole(base44, ["owner", "manajer", "admin"]);
      for (const email of penerima) {
        await notifSekali(base44, {
          recipient_email: email,
          title: terkunci.length > 0
            ? `${terkunci.length} SOP terhenti karena bahan habis`
            : `${kunciManualLama.length} SOP masih dikunci manual`,
          message: potongRapi(isi, 900),
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
      kunci_manual_lama: kunciManualLama.length,
      detail_kunci_manual_lama: kunciManualLama,
      detail_terkunci: terkunci,
      detail_dilepas: dilepas,
      detail_belum_punya_sku: tanpaSku,
      dilaporkan: perluLapor,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
