import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      // Allow scheduled automation (no user context)
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const results = [];

    const createNotif = async (data) => {
      await base44.asServiceRole.entities.Notification.create({
        ...data,
        is_read: false,
        created_at: today,
      });
    };

    const getEmails = async (roles) => {
      const allUsers = await base44.asServiceRole.entities.User.list();
      return allUsers.filter(u => roles.includes(u.role)).map(u => u.email);
    };

    // 1. Stok gudang di bawah minimum
    const warehouseItems = await base44.asServiceRole.entities.WarehouseItem.list();
    const lowStock = warehouseItems.filter(i => i.current_stock <= i.minimum_stock);
    if (lowStock.length > 0) {
      const emails = await getEmails(["admin", "manajer", "owner"]);
      for (const email of emails) {
        // Cek apakah sudah ada notif serupa hari ini
        const existing = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: email,
          category: "stok",
          created_at: today
        });
        if (existing.length === 0) {
          await createNotif({
            recipient_email: email,
            recipient_role: "admin",
            title: `⚠️ ${lowStock.length} Item Stok Gudang Menipis`,
            message: `Item berikut sudah di bawah stok minimum: ${lowStock.slice(0, 3).map(i => i.name).join(", ")}${lowStock.length > 3 ? ` dan ${lowStock.length - 3} lainnya` : ""}.`,
            type: "warning",
            category: "stok",
            action_url: "/warehouse",
          });
        }
      }
      results.push(`low_stock: ${lowStock.length} items, notified ${emails.length} users`);
    }

    // 2. Obat/vitamin mendekati expired (30 hari)
    const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const expiring = warehouseItems.filter(i =>
      i.expired_date && i.expired_date <= in30days && i.expired_date >= today && ["obat", "vitamin"].includes(i.category)
    );
    if (expiring.length > 0) {
      const emails = await getEmails(["admin", "manajer", "owner"]);
      for (const email of emails) {
        const existing = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: email,
          category: "stok",
          title: `🔴 ${expiring.length} Item Mendekati Expired`,
        });
        const todayExisting = existing.filter(e => e.created_at === today);
        if (todayExisting.length === 0) {
          await createNotif({
            recipient_email: email,
            title: `🔴 ${expiring.length} Item Mendekati Expired`,
            message: `Stok berikut akan expired dalam 30 hari: ${expiring.slice(0, 3).map(i => `${i.name} (${i.expired_date})`).join(", ")}.`,
            type: "alert",
            category: "stok",
            action_url: "/warehouse",
          });
        }
      }
      results.push(`expiring: ${expiring.length} items`);
    }

    // 3. Telur mendekati estimasi menetas (7 hari)
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const breedingRecords = await base44.asServiceRole.entities.Breeding.list();
    const nearHatch = breedingRecords.filter(b =>
      b.estimated_hatch_date && b.estimated_hatch_date <= in7days && b.estimated_hatch_date >= today && b.status === "inkubasi"
    );
    if (nearHatch.length > 0) {
      const emails = await getEmails(["keeper", "manajer", "owner"]);
      for (const email of emails) {
        const existing = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: email,
          category: "breeding",
        });
        const todayExisting = existing.filter(e => e.created_at === today && e.title.includes("menetas"));
        if (todayExisting.length === 0) {
          await createNotif({
            recipient_email: email,
            title: `🐣 ${nearHatch.length} Telur Segera Menetas!`,
            message: `${nearHatch.length} clutch diperkirakan menetas dalam 7 hari ke depan. Pastikan inkubator dalam kondisi optimal.`,
            type: "warning",
            category: "breeding",
            action_url: "/breeding",
          });
        }
      }
      results.push(`near_hatch: ${nearHatch.length} clutches`);
    }

    // 4. Kura-kura belum ditimbang > 30 hari
    const tortoises = await base44.asServiceRole.entities.Tortoise.list();
    const healthRecords = await base44.asServiceRole.entities.HealthRecord.list("-date", 500);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const healthMap = {};
    healthRecords.forEach(r => {
      if (r.tortoise_id && (!healthMap[r.tortoise_id] || r.date > healthMap[r.tortoise_id])) {
        healthMap[r.tortoise_id] = r.date;
      }
    });
    const notWeighed = tortoises.filter(t =>
      ["aktif", "baby"].includes(t.status) &&
      (!healthMap[t.id] || healthMap[t.id] < last30)
    );
    if (notWeighed.length > 10) {
      const keeperEmails = await getEmails(["keeper"]);
      for (const email of keeperEmails) {
        const existing = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: email,
          category: "kesehatan",
        });
        const todayExisting = existing.filter(e => e.created_at === today && e.title.includes("ditimbang"));
        if (todayExisting.length === 0) {
          await createNotif({
            recipient_email: email,
            title: `⚖️ ${notWeighed.length} Kura-Kura Belum Ditimbang`,
            message: `${notWeighed.length} kura-kura belum ditimbang lebih dari 30 hari. Segera lakukan penimbangan rutin.`,
            type: "warning",
            category: "kesehatan",
            action_url: "/health",
          });
        }
      }
      results.push(`not_weighed: ${notWeighed.length} tortoises`);
    }

    return Response.json({ success: true, results, timestamp: now.toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});