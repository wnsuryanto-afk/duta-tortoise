import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Migrasi: buyer_phone → hp_whatsapp di Sale, phone → hp_whatsapp di UserProfile
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "owner") {
      return Response.json({ error: "Hanya owner yang bisa menjalankan migrasi ini" }, { status: 403 });
    }

    const results = { sale_migrated: 0, profile_migrated: 0 };

    // Migrasi Sale: buyer_phone → hp_whatsapp
    const sales = await base44.asServiceRole.entities.Sale.list("-created_date", 500);
    for (const sale of sales) {
      if (sale.buyer_phone && !sale.hp_whatsapp) {
        await base44.asServiceRole.entities.Sale.update(sale.id, {
          hp_whatsapp: sale.buyer_phone
        });
        results.sale_migrated++;
      }
    }

    // Migrasi UserProfile: phone → hp_whatsapp
    const profiles = await base44.asServiceRole.entities.UserProfile.list("-created_date", 200);
    for (const profile of profiles) {
      if (profile.phone && !profile.hp_whatsapp) {
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          hp_whatsapp: profile.phone
        });
        results.profile_migrated++;
      }
    }

    return Response.json({
      success: true,
      message: `Migrasi selesai: ${results.sale_migrated} penjualan, ${results.profile_migrated} profil user diperbarui`,
      ...results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});