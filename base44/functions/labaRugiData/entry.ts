import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { masukLaporan } from "../../shared/laporan.ts";

/**
 * labaRugiData — ringkasan laba-rugi satu periode.
 *
 * CATATAN: fungsi ini belum dipanggil dari layar mana pun. Laba-rugi yang
 * dipakai aplikasi dihitung di sisi peramban lewat src/hooks/useCostPerTortoise.js
 * dan src/components/finance/LabaRugiEnhanced.jsx.
 *
 * Perhitungan di sini sengaja disamakan dengan keduanya, supaya siapa pun yang
 * kelak menyambungkannya tidak mendapat angka yang berbeda dari yang selama ini
 * dilihat pemilik.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || new Date().toISOString().slice(0, 7);

    // 1. FinanceTransaction bulan ini
    const allTx = await db.entities.FinanceTransaction.list('-date', 2000);
    const monthTx = allTx.filter(t => t.date?.startsWith(period) && masukLaporan(t));
    const pemasukan = monthTx.filter(t => t.type === 'pemasukan');
    const pengeluaran = monthTx.filter(t => t.type === 'pengeluaran');

    const totalPemasukan = pemasukan.reduce((s, t) => s + (t.amount || 0), 0);
    const totalPengeluaran = pengeluaran.reduce((s, t) => s + (t.amount || 0), 0);

    // Pengeluaran by category
    const pengeluaranByCat = {};
    pengeluaran.forEach(t => {
      const cat = t.category || 'lainnya';
      pengeluaranByCat[cat] = (pengeluaranByCat[cat] || 0) + (t.amount || 0);
    });

    // 2. Gaji bulan ini
    //
    // D18 — Gaji TIDAK lagi dijumlahkan dari SalarySlip. Sejak slip yang
    // ditandai dibayar membuat FinanceTransaction-nya sendiri, gajinya sudah
    // ikut terhitung di totalPengeluaran di atas. Menjumlahkan keduanya berarti
    // setiap gaji terhitung DUA KALI — persis jebakan yang menunggu di kode
    // lama: aman selama semua slip masih draf, salah pada hari pertama ada slip
    // yang ditandai dibayar, dan tidak ada satu pun tanda bahwa itu terjadi.
    //
    // Angkanya tetap dilaporkan terpisah sebagai rincian, tapi diambil dari
    // sumber yang sama dengan totalnya, bukan dari sumber kedua.
    const totalGaji = monthTx
      .filter(t => t.type === 'pengeluaran' && ['gaji', 'gaji_karyawan'].includes(t.category))
      .reduce((s, t) => s + (t.amount || 0), 0);

    // 3. PettyCash bulan ini
    const allPettyCash = await db.entities.PettyCashRequest.filter({}, '-disbursement_date', 500);
    const monthPetty = allPettyCash.filter(p => p.disbursement_date?.startsWith(period) && p.status === 'disbursed');
    const totalKasKecil = monthPetty.reduce((s, p) => s + (p.amount_requested || 0), 0);
    const pettyByCat = {};
    monthPetty.forEach(p => {
      const cat = p.category || 'lainnya';
      pettyByCat[cat] = (pettyByCat[cat] || 0) + (p.amount_requested || 0);
    });

    // 4. Sales
    const allSales = await db.entities.Sale.list('-sale_date', 500);
    const monthSales = allSales.filter(s => s.sale_date?.startsWith(period) && masukLaporan(s));

    // 5. Biaya per ekor
    //
    // Pencairan kas kecil sengaja TIDAK ditambahkan. Itu perpindahan uang ke
    // kotak kas, bukan biaya; biayanya sudah tercatat sebagai
    // FinanceTransaction saat dibelanjakan dan sudah masuk totalPengeluaran.
    // Menambahkannya membuat setiap rupiah kas kecil terhitung dua kali.
    // (Angkanya tetap dilaporkan terpisah di bawah, sebagai keterangan.)
    const grandTotalPengeluaran = totalPengeluaran;

    const allTortoises = await db.entities.Tortoise.filter({}, '-name', 2000);

    // Semua kura yang masih ada di peternakan ikut dihitung — mereka semua
    // makan dan dirawat. Daftar status yang ditulis tangan melewatkan kura
    // sakit dan karantina, sehingga biaya dibagi ke lebih sedikit ekor dan
    // biaya per ekor terlihat lebih mahal dari kenyataannya.
    const statusKeluar = ['mati', 'terjual', 'diarsipkan'];
    const activeCount = allTortoises.filter(
      (t) => !t.is_archived && !statusKeluar.includes(t.status)
    ).length;

    const settings = await db.entities.CompanySettings.filter({ setting_key: 'main' });
    const fallbackPerEkor = settings[0]?.hpp_fallback_per_ekor || 100000;

    const hasData = grandTotalPengeluaran > 0;
    const biayaPerEkor = hasData && activeCount > 0
      ? Math.round(grandTotalPengeluaran / activeCount)
      : fallbackPerEkor;

    return Response.json({
      period,
      pemasukan: monthSales.map(s => ({
        tortoise_code: s.tortoise_code || s.tortoise_name,
        buyer_name: s.buyer_name,
        price: s.price || 0,
        hpp: s.hpp || 0,
        profit: s.profit || 0,
        margin_percent: s.margin_percent || 0,
        sale_date: s.sale_date,
      })),
      totalPemasukan,
      pengeluaranBreakdown: {
        gaji_karyawan: totalGaji,
        pakan: pengeluaranByCat['pakan'] || 0,
        obat_perawatan: pengeluaranByCat['obat_perawatan'] || 0,
        vitamin_suplemen: pengeluaranByCat['vitamin_suplemen'] || 0,
        kas_kecil: totalKasKecil,
        lainnya: (pengeluaranByCat['lainnya'] || 0) + (pengeluaranByCat['operasional'] || 0),
      },
      grandTotalPengeluaran,
      biayaPerEkor,
      isDataAktual: hasData,
      fallbackPerEkor,
      activeTortoiseCount: activeCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});