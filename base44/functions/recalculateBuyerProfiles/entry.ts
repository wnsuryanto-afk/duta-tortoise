import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { hanyaLaporan } from "../../shared/laporan.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";

// Hitung ulang total_purchases dan total_spent semua BuyerProfile dari data Sale.
// Aman dijalankan berkali-kali (idempoten). Bisa untuk satu buyer (buyer_profile_id atau hp)
// atau semua buyer sekaligus.
//
// ── Satu baris rusak tidak boleh membatalkan seluruhnya (24 Okt 2026) ──────
//
// Tombol "Recalculate Buyer Profile" di Pemeliharaan Sistem gagal dengan
//
//     Error in field hp_whatsapp: Field required (HTTP 500)
//
// Dua dari empat belas BuyerProfile tidak punya `hp_whatsapp` — "Ibu Rina"
// dan "Pak Ahmad", dua baris tertua, dibuat pada detik yang sama, tanpa satu
// pun Sale yang menyebut mereka. Skema BuyerProfile MEWAJIBKAN hp_whatsapp,
// jadi menyentuh baris itu membuat server memeriksa ulang seluruh recordnya
// dan menolaknya.
//
// Dua cacat sekaligus, dan yang kedua lebih buruk:
//
//   1. Penolakan satu baris melempar keluar dari loop, sehingga fungsi
//      membalas 500. Dua belas profil SUDAH diperbarui sebelum itu, tetapi
//      layarnya hanya menampilkan merah — tidak ada cara tahu bahwa
//      sebagian besar pekerjaannya berhasil.
//
//   2. Profil tanpa hp_whatsapp dicocokkan dengan `salesByHp[undefined]`,
//      yang selalu kosong. Seandainya penyimpanannya lolos, totalnya
//      di-NOL-kan — menghapus angka yang ada di sana tanpa ada yang
//      memintanya. Jadi melewatinya bukan sekadar menghindari galat;
//      itu memang perilaku yang benar.
//
// Sekarang tiap profil ditangani sendiri-sendiri, yang dilewati dan yang
// gagal dihitung terpisah, dan jawabannya menyebut keduanya.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { buyer_profile_id, hp_whatsapp: targetHp } = body;

    const db = base44.asServiceRole;

    // Ambil semua Sales sekaligus.
    //
    // Penyaringnya tidak boleh dilewat di sini. Membatalkan penjualan di
    // SalesList memasang `excluded_from_reports: true` pada Sale — bukan
    // menghapusnya. Tanpa saringan ini, profil pembeli tetap mencatat
    // penjualan yang sudah dibatalkan sebagai uang yang pernah dibelanjakan,
    // dan angkanya tidak pernah kembali turun.
    const allSales = hanyaLaporan(await db.entities.Sale.list('-sale_date', 2000));

    // Group by hp_whatsapp
    const salesByHp = {};
    for (const s of allSales) {
      const hp = s.hp_whatsapp;
      if (!hp) continue;
      if (!salesByHp[hp]) salesByHp[hp] = [];
      salesByHp[hp].push(s);
    }

    // Ambil buyer profile(s) yang perlu diupdate
    let profiles;
    if (buyer_profile_id) {
      const p = await db.entities.BuyerProfile.get(buyer_profile_id);
      profiles = p ? [p] : [];
    } else if (targetHp) {
      profiles = await db.entities.BuyerProfile.filter({ hp_whatsapp: targetHp }, null, BATAS_AMBIL);
    } else {
      profiles = await db.entities.BuyerProfile.list('-created_date', 2000);
    }

    let updatedCount = 0;
    const dilewati: string[] = [];
    const gagal: string[] = [];

    for (const profile of profiles) {
      const hp = profile.hp_whatsapp;

      // Tanpa nomor HP, profil ini tidak bisa dicocokkan dengan penjualan
      // mana pun — perhitungannya selalu menghasilkan nol, dan nol itu akan
      // MENGHAPUS angka yang sudah ada. Dilewati, lalu disebut namanya.
      if (!hp) {
        dilewati.push(profile.name || profile.id);
        continue;
      }

      const buyerSales = salesByHp[hp] || [];

      const totalPurchases = buyerSales.length;
      const totalSpent = buyerSales.reduce((sum, s) => sum + (s.price || 0), 0);
      const sortedDates = buyerSales.map(s => s.sale_date).filter(Boolean).sort();
      const firstPurchaseDate = sortedDates[0] || profile.first_purchase_date;
      const lastPurchaseDate = sortedDates[sortedDates.length - 1] || profile.last_purchase_date;

      const lastSale = buyerSales
        .filter(s => s.sale_date)
        .sort((a, b) => (a.sale_date > b.sale_date ? -1 : 1))[0];
      const lastTortoiseCode = lastSale?.tortoise_code || profile.last_purchased_tortoise || "";

      let tier = "baru";
      if (totalSpent > 10000000) tier = "vip";
      else if (totalSpent > 2000000) tier = "reguler";

      // Ditangkap per profil: satu baris yang ditolak server tidak boleh
      // membuang sebelas baris yang sudah benar.
      try {
        await db.entities.BuyerProfile.update(profile.id, {
          total_purchases: totalPurchases,
          total_spent: totalSpent,
          first_purchase_date: firstPurchaseDate,
          last_purchase_date: lastPurchaseDate,
          last_purchased_tortoise: lastTortoiseCode,
          is_repeat_buyer: totalPurchases > 1,
          tier,
        });
        updatedCount++;
      } catch (e) {
        gagal.push(`${profile.name || profile.id}: ${e?.message || 'kesalahan tidak diketahui'}`);
      }
    }

    const bagian = [`${updatedCount} profil dihitung ulang`];
    if (dilewati.length) bagian.push(`${dilewati.length} dilewati karena belum ada nomor HP (${dilewati.join(', ')})`);
    if (gagal.length) bagian.push(`${gagal.length} gagal (${gagal.join('; ')})`);

    return Response.json({
      // Berhasil sebagian tetap berhasil, dan jumlahnya disebut. Membalas
      // gagal total untuk dua baris yang memang tidak bisa dihitung membuat
      // dua belas pembaruan yang benar ikut terlihat seperti kegagalan.
      success: gagal.length === 0,
      message: bagian.join('. ') + '.',
      updated: updatedCount,
      skipped: dilewati,
      failed: gagal,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});