import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { clutchAktif } from "../../shared/kura.ts";
import { perluDiperhatikan, dilacak } from "../../shared/stok.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";

// Batas pengambilan ditulis tegas. Pemberitahuan otomatis yang membaca daftar
// tanpa batas mengandalkan bawaan SDK: begitu datanya lewat batas itu,
// peringatan untuk baris-baris sisanya berhenti muncul tanpa galat apa pun —
// aplikasi tampak tenang justru saat ada yang perlu diperhatikan.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const todayStart = today + "T00:00:00.000Z";
    const results = [];

    // ── Helper: cek duplikat notif hari ini ──
    const isDuplicate = async (recipientEmail, relatedEntityId, category) => {
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: recipientEmail,
        related_entity_id: relatedEntityId,
        category,
      }, null, BATAS_AMBIL);
      return existing.some(n => {
        const createdAt = n.created_at || n.created_date || "";
        return createdAt.startsWith(today) && !n.is_dismissed;
      });
    };

    const createNotif = async (data) => {
      await base44.asServiceRole.entities.Notification.create({
        ...data,
        is_read: false,
        is_dismissed: false,
        created_at: now.toISOString(),
      });
    };

    const getEmails = async (roles) => {
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
      return allUsers.filter(u => roles.includes(u.role)).map(u => u.email);
    };

    // ══════════════════════════════════════════════════
    // 2D. OBAT KADALUARSA
    // ══════════════════════════════════════════════════
    const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in7days  = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const warehouseItems = await base44.asServiceRole.entities.WarehouseItem.list('-name', 2000);
    const expiringItems = warehouseItems.filter(i =>
      i.expired_date && i.expired_date <= in30days
    );

    for (const item of expiringItems) {
      const adminEmails = await getEmails(["admin", "owner"]);
      const daysLeft = Math.ceil((new Date(item.expired_date) - now) / (1000 * 60 * 60 * 24));
      const isExpired = daysLeft <= 0;
      const isCritical = daysLeft <= 7;
      for (const email of adminEmails) {
        if (await isDuplicate(email, item.id, "stok")) continue;
        await createNotif({
          recipient_email: email,
          title: isExpired
            ? `${item.name} Sudah Kadaluarsa!`
            : `${item.name} Kadaluarsa ${daysLeft} Hari Lagi`,
          message: `Stok ${item.name} expired ${item.expired_date}. Gunakan atau musnahkan segera.`,
          type: isExpired || isCritical ? "alert" : "warning",
          priority: isExpired ? "tinggi" : isCritical ? "tinggi" : "sedang",
          category: "stok",
          recipient_role: "admin",
          action_label: "Lihat Barang",
          action_url: "/warehouse",
          related_entity_id: item.id,
          related_entity_type: "WarehouseItem",
        });
      }
    }
    results.push(`expiring_items: ${expiringItems.length}`);

    // ══════════════════════════════════════════════════
    // 2E. FOLLOW-UP TREATMENT JATUH TEMPO
    // ══════════════════════════════════════════════════
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const healthRecords = await base44.asServiceRole.entities.HealthRecord.list("-date", 500);
    const followUpDue = healthRecords.filter(r =>
      r.follow_up_date && (r.follow_up_date === today || r.follow_up_date === yesterday)
    );
    for (const record of followUpDue) {
      const recipientEmail = record.created_by_id
        ? (await base44.asServiceRole.entities.User.filter({ id: record.created_by_id }, null, BATAS_AMBIL))[0]?.email
        : null;
      if (!recipientEmail) continue;
      if (await isDuplicate(recipientEmail, record.id, "kesehatan")) continue;
      await createNotif({
        recipient_email: recipientEmail,
        title: `Follow-up ${record.tortoise_name} Hari Ini`,
        message: `Kura ${record.tortoise_name} perlu dicek ulang. Treatment: ${record.treatment || record.description || "lihat catatan"}.`,
        type: "warning",
        priority: "tinggi",
        category: "kesehatan",
        action_label: "Update Kondisi",
        action_url: "/health",
        related_entity_id: record.id,
        related_entity_type: "HealthRecord",
      });
    }
    results.push(`follow_up_due: ${followUpDue.length}`);

    // ══════════════════════════════════════════════════
    // 2F. KURA BELUM DITIMBANG > 30 HARI
    // ══════════════════════════════════════════════════
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const tortoises = await base44.asServiceRole.entities.Tortoise.list('-created_date', 2000);
    const notWeighed = tortoises.filter(t =>
      ["aktif", "breeding"].includes(t.status) &&
      (!t.last_weighed_date || t.last_weighed_date < last30)
    );
    if (notWeighed.length > 0) {
      const adminEmails = await getEmails(["admin", "owner"]);
      for (const email of adminEmails) {
        if (await isDuplicate(email, "not_weighed_bulk_" + today, "kesehatan")) continue;
        await createNotif({
          recipient_email: email,
          title: `${notWeighed.length} Kura Belum Ditimbang >30 Hari`,
          message: `Ada ${notWeighed.length} kura belum ditimbang lebih dari sebulan. Segera lakukan penimbangan rutin.`,
          type: "info",
          priority: "sedang",
          category: "kesehatan",
          recipient_role: "admin",
          action_label: "Lihat Daftar Kura",
          action_url: "/tortoise",
          related_entity_id: "not_weighed_bulk_" + today,
          related_entity_type: "bulk",
        });
      }
    }
    results.push(`not_weighed: ${notWeighed.length}`);

    // ══════════════════════════════════════════════════
    // 12. TELUR MAU MENETAS (3 hari ke depan)
    // Gunakan expected_hatch_start / estimated_hatch_date
    // ══════════════════════════════════════════════════
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const breedingRecords = await base44.asServiceRole.entities.Breeding.list('-created_date', 2000);
    const nearHatch = breedingRecords.filter(b => {
      // Clutch aktif = "bertelur" ATAU "inkubasi" (../../shared/kura.ts).
      // Menyaring "inkubasi" saja membuat peringatan "hampir menetas" diam
      // pada clutch yang statusnya belum sempat diubah.
      if (!clutchAktif(b)) return false;
      const hatchDate = b.estimated_hatch_start || b.estimated_hatch_date;
      return hatchDate && hatchDate >= today && hatchDate <= in3days;
    });
    for (const b of nearHatch) {
      const ownerEmails = await getEmails(["owner", "manajer"]);
      const hatchDate = b.estimated_hatch_start || b.estimated_hatch_date;
      const daysLeft = Math.ceil((new Date(hatchDate) - now) / (1000 * 60 * 60 * 24));
      for (const email of ownerEmails) {
        if (await isDuplicate(email, b.id, "breeding")) continue;
        await createNotif({
          recipient_email: email,
          title: `Telur Akan Menetas ${daysLeft} Hari Lagi!`,
          message: `Breeding ${b.male_name} × ${b.female_name} di ${b.incubator_name || "inkubator"} diperkirakan menetas ${hatchDate}. Siapkan kandang baby.`,
          type: "info",
          priority: "tinggi",
          category: "breeding",
          recipient_role: "owner",
          action_label: "Lihat Breeding",
          action_url: "/breeding",
          related_entity_id: b.id,
          related_entity_type: "Breeding",
        });
      }
    }
    results.push(`near_hatch: ${nearHatch.length}`);

    // ══════════════════════════════════════════════════
    // 14. HAMPIR CAPAI TARGET POIN
    //
    // B2 — dulu angkanya ditulis mati di sini: 250–299 poin, target 300.
    // Target sebenarnya di pengaturan adalah ribuan poin, jadi syarat itu
    // terlewati dalam dua hari kerja dan pengingatnya praktis tidak pernah
    // berbunyi di saat yang berarti. Sekarang targetnya dibaca dari
    // CompanySettings, dan pengingat dikirim saat seseorang sudah di 80%
    // menuju tingkat berikutnya — masih cukup waktu untuk dikejar.
    // ══════════════════════════════════════════════════
    const monthKey = today.substring(0, 7); // YYYY-MM
    const monthStart = monthKey + "-01";
    const allChecklists = await base44.asServiceRole.entities.DailyChecklist.list("-date", 1000);
    // Group by employee_email
    const poinByEmployee = {};
    for (const cl of allChecklists) {
      if (!cl.employee_email || !cl.date || !cl.date.startsWith(monthKey)) continue;
      if (!poinByEmployee[cl.employee_email]) poinByEmployee[cl.employee_email] = 0;
      poinByEmployee[cl.employee_email] += (cl.approved_points || cl.total_points_claimed || 0);
    }
    // Tingkatan target, urut naik. Yang belum diisi dilewati.
    const csList = await base44.asServiceRole.entities.CompanySettings.filter({ setting_key: "main" }, null, BATAS_AMBIL);
    const cs = csList[0] || {};
    // D16 — Tingkat Dasar juga menuntut poin TIM. Aturan yang sama ada di
    // src/lib/bonus.js untuk sisi layar; keduanya harus diubah bersamaan.
    // Kalau tidak, kiper melihat "Dasar tercapai" di layar sementara notifikasi
    // masih mengejarnya — atau sebaliknya, dan tidak ada yang tahu mana benar.
    const poinTim = Object.values(poinByEmployee).reduce((s: number, n) => s + Number(n || 0), 0);
    const tingkatan = [
      { nama: "Dasar", target: Number(cs.min_poin_bulanan || 0), targetTim: Number(cs.target_poin_tim || 0), bonus: Number(cs.bonus_dasar || 0) },
      { nama: "Bagus", target: Number(cs.target_poin_bagus || 0), targetTim: 0, bonus: Number(cs.bonus_bagus || 0) },
      { nama: "Luar biasa", target: Number(cs.target_poin_luar_biasa || 0), targetTim: 0, bonus: Number(cs.bonus_luar_biasa || 0) },
    ].filter((t) => t.target > 0).sort((a, b) => a.target - b.target);

    const sudahTercapai = (t: any, poin: number) =>
      poin >= t.target && (t.targetTim <= 0 || poinTim >= t.targetTim);

    for (const [email, totalPoin] of Object.entries(poinByEmployee)) {
      // Tingkat terdekat yang BELUM tercapai.
      const berikut = tingkatan.find((t) => !sudahTercapai(t, totalPoin as number));
      if (!berikut) continue;
      // Kirim hanya bila sudah 80% jalan — sebelum itu belum berarti apa-apa,
      // sesudah tercapai tidak perlu dikejar lagi. Bila poin pribadinya sudah
      // cukup dan yang kurang hanya poin tim, kabarnya tetap dikirim: itu justru
      // pesan yang paling berguna — ia perlu mengajak rekannya, bukan bekerja
      // lebih keras sendirian.
      if (totalPoin < berikut.target * 0.8) continue;
      // Anti-duplikat: satu kali per TINGKAT per bulan per karyawan.
      //
      // Dulu dicocokkan dari judul ("Kurang" + "Poin"), yang langsung patah
      // begitu judulnya berubah. Sekarang dicocokkan dari related_entity_id
      // yang memang dibuat untuk itu — dan karena tingkatnya ikut di dalam
      // kunci, orang yang sudah melewati Dasar tetap mendapat pengingat saat
      // mendekati Bagus.
      const kunciTingkat = `target_poin_${email}_${monthKey}_${berikut.nama}`;
      const existing14 = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: email,
        related_entity_id: kunciTingkat,
      }, null, BATAS_AMBIL);
      const alreadyNotif14 = existing14.some(n => !n.is_dismissed);
      if (alreadyNotif14) continue;
      const sisa = Math.max(0, berikut.target - (totalPoin as number));
      const sisaTim = berikut.targetTim > 0 ? Math.max(0, berikut.targetTim - poinTim) : 0;
      const nominal = berikut.bonus > 0 ? ` (bonus Rp ${berikut.bonus.toLocaleString("id-ID")})` : "";
      const judul = sisa > 0
        ? `Kurang ${sisa} poin lagi ke tingkat ${berikut.nama}!`
        : `Tim kurang ${sisaTim} poin lagi ke tingkat ${berikut.nama}`;
      const isiPribadi = sisa > 0
        ? `Kamu sudah ${totalPoin} poin bulan ini. Tinggal ${sisa} poin lagi untuk mencapai ${berikut.nama} di ${berikut.target} poin${nominal}.`
        : `Poin kamu sudah cukup (${totalPoin} poin).`;
      const isiTim = sisaTim > 0
        ? ` Tingkat ${berikut.nama} dihitung bersama satu tim: tim kurang ${sisaTim} poin lagi dari ${berikut.targetTim}. Bantu rekanmu supaya terbuka untuk semua.`
        : "";
      await createNotif({
        recipient_email: email,
        title: judul,
        message: isiPribadi + isiTim,
        type: "info",
        priority: "rendah",
        category: "lainnya",
        action_label: "Lihat Poin Saya",
        action_url: "/rekap-poin-gaji",
        related_entity_id: kunciTingkat,
        related_entity_type: "DailyChecklist",
      });
    }
    results.push(`near_target_poin: checked`);

    // ══════════════════════════════════════════════════
    // 15. PENGINGAT BELANJA STOK PAKAN (< 7 hari tersisa)
    // ══════════════════════════════════════════════════
    const feedStocks = await base44.asServiceRole.entities.FeedStock.list('-name', 500);
    const lowFeedItems = feedStocks.filter(f => {
      if (!dilacak(f)) return false;
      if (f.current_stock <= 0) return false;
      if (f.daily_ideal && f.daily_ideal > 0) {
        return (f.current_stock / f.daily_ideal) <= 7;
      }
      // Cadangan bila daily_ideal belum diisi: aturan yang sama dengan layar
      // (../../shared/stok.ts). Ambang lama di sini adalah 300% dari minimum —
      // tiga kali lebih longgar dari mana pun, sehingga barang yang stoknya
      // sehat pun ikut dilaporkan sebagai menipis.
      return perluDiperhatikan(f);
    });

    if (lowFeedItems.length > 0) {
      const adminEmails = await getEmails(["admin", "owner"]);
      const belanjaDupKey = `belanja_stok_pakan_${today}`;
      for (const email of adminEmails) {
        if (await isDuplicate(email, belanjaDupKey, "stok")) continue;
        const itemList = lowFeedItems.map(f => {
          const sisaHari = f.daily_ideal > 0
            ? Math.floor(f.current_stock / f.daily_ideal)
            : "-";
          return `${f.name} (sisa ${sisaHari} hari)`;
        }).join(", ");
        await createNotif({
          recipient_email: email,
          title: `${lowFeedItems.length} Pakan Perlu Segera Dibeli`,
          message: itemList,
          type: "warning",
          priority: "sedang",
          category: "stok",
          recipient_role: "admin",
          action_label: "Lihat Stok Pakan",
          action_url: "/feed-stock",
          related_entity_id: belanjaDupKey,
          related_entity_type: "FeedStock",
        });
      }
    }
    results.push(`low_feed_items: ${lowFeedItems.length}`);

    return Response.json({ success: true, results, timestamp: now.toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});