import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { segarkanIsiKandang } from "../../shared/isiKandang.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Aturan hitungnya dipegang satu modul (../../shared/isiKandang.ts) yang
    // juga dipakai onSaleCreated, recordTortoiseDeath, createSaleWithSync dan
    // updateEnclosureCount. Sebelumnya fungsi inilah satu-satunya yang
    // menghitung dengan benar, sementara empat fungsi lain memakai versi
    // "kurangi satu" yang lebih longgar — sehingga menjalankan perbaikan di
    // sini akan dibatalkan lagi oleh penjualan atau kematian berikutnya.
    const hasil = await segarkanIsiKandang(base44.asServiceRole);
    if (hasil.error) {
      return Response.json({ error: hasil.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: `Diperiksa ${hasil.diperiksa} kandang; ${hasil.diperbarui} kandang diperbarui.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
