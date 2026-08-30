import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { masukLaporan } from "../../shared/laporan.ts";
import { diPeternakan } from "../../shared/kura.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const [financeTx, salarySlips, pettyCash, tortoises, settings] = await Promise.all([
      base44.asServiceRole.entities.FinanceTransaction.list('-date', 5000),
      base44.asServiceRole.entities.SalarySlip.list('-period', 100),
      base44.asServiceRole.entities.PettyCashRequest.list('-request_date', 100),
      base44.asServiceRole.entities.Tortoise.list('name', 2000),
      base44.asServiceRole.entities.CompanySettings.list('setting_key', 5),
    ]);

    const totalFinance = financeTx.filter(t => t.type === 'pengeluaran' && (t.date||'').startsWith(month) && masukLaporan(t)).reduce((s,t)=>s+(t.amount||0),0);
    // D18 — Gaji diambil dari FinanceTransaction, bukan dari SalarySlip. Slip
    // yang ditandai dibayar membuat catatan keuangannya sendiri, jadi gajinya
    // sudah ada di totalFinance. Menjumlahkan slip lagi di sini membuat setiap
    // gaji terhitung dua kali dan biaya per ekor ikut menggelembung.
    const totalSalary = financeTx.filter(t => t.type === 'pengeluaran' && (t.date||'').startsWith(month) && ['gaji','gaji_karyawan'].includes(t.category) && masukLaporan(t)).reduce((s,t)=>s+(t.amount||0),0);
    const totalPettyCash = pettyCash.filter(p => p.status==='disbursed' && (p.disbursement_date||'').startsWith(month) && masukLaporan(p)).reduce((s,t)=>s+(t.amount_requested||0),0);

    // Pencairan kas kecil TIDAK ditambahkan ke biaya. Mencairkan kas kecil adalah
    // memindahkan uang ke kotak kas, bukan mengeluarkannya; biayanya baru muncul
    // saat dibelanjakan, dan saat itu ia sudah tercatat sebagai FinanceTransaction
    // yang ikut di totalFinance. Menjumlahkan keduanya membuat setiap rupiah kas
    // kecil terhitung dua kali, dan biaya per ekor ikut menggelembung.
    //
    // Alasan yang sama sudah tertulis di labaRugiData/entry.ts dan diterapkan di
    // sana; berkas ini luput. Dua fungsi yang menghitung "total pengeluaran"
    // dengan aturan berbeda memberi pemilik dua jawaban yang keduanya terlihat
    // resmi. Angkanya tetap dilaporkan terpisah sebagai keterangan.
    //
    // totalSalary juga TIDAK ditambahkan lagi: sejak D18 ia diambil dari
    // FinanceTransaction, jadi sudah termasuk di totalFinance. Ia tetap
    // dikembalikan sebagai rincian.
    const totalPengeluaran = totalFinance;
    // Populasi dihitung dengan MENGECUALIKAN yang sudah keluar, bukan dengan
    // daftar putih status yang ditulis tangan. Aturan yang sama ada di
    // src/lib/populasiKura.js (diPeternakan) - keduanya harus tetap sepakat.
    //
    // Daftar putih ['aktif','breeding','baby'] melewatkan status 'sakit', yang
    // ada di skema dan akan dipakai. Akibatnya terbalik dari kenyataan: begitu
    // seekor kura ditandai sakit, ia hilang dari pembagi, biaya per ekor semua
    // kura lain NAIK, dan HPP setiap penjualan berikutnya ikut naik - karena
    // ada yang sakit. Padahal kura sakit tetap makan, bahkan lebih mahal.
    //
    // Dengan aturan pengecualian, status baru yang ditambahkan kelak otomatis
    // terhitung sebagai masih ada, bukan diam-diam hilang dari pembagi.
    const activeCount = tortoises.filter(diPeternakan).length;

    let costPerTortoise = 0, isActual = false;
    if (activeCount > 0 && totalPengeluaran > 0) { costPerTortoise = Math.round(totalPengeluaran/activeCount); isActual = true; }

    let fallback = 100000;
    if (settings.length > 0 && settings[0].hpp_fallback_per_ekor != null) fallback = settings[0].hpp_fallback_per_ekor;
    if (!isActual) costPerTortoise = fallback;

    return Response.json({ month, total_pengeluaran: totalPengeluaran, total_finance: totalFinance, total_salary: totalSalary, total_petty_cash: totalPettyCash, active_tortoise_count: activeCount, cost_per_tortoise: costPerTortoise, fallback, is_actual: isActual, label: isActual ? 'Data aktual' : 'Estimasi default' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});