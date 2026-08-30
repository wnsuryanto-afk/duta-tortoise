import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { segarkanIsiKandang } from "../../shared/isiKandang.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sale_data } = await req.json();

    // 1. Buat Sale record
    const sale = await base44.asServiceRole.entities.Sale.create(sale_data);

    // 2. Update tortoise status dan enclosure
    if (sale.tortoise_id) {
      const tortoise = await base44.asServiceRole.entities.Tortoise.get(sale.tortoise_id);
      
      if (tortoise) {
        await base44.asServiceRole.entities.Tortoise.update(sale.tortoise_id, {
          status: 'terjual',
          sale_channel: sale.platform || 'langsung'
        });

        // Isi kandang DIHITUNG ULANG, bukan dikurangi satu.
        //
        // Baris lama memanggil Enclosure.get(tortoise.enclosure) — `enclosure`
        // berisi NAMA sedangkan .get() menerima NOMOR, jadi pencariannya tidak
        // pernah ketemu dan angkanya tidak pernah berkurang. Kalaupun ketemu,
        // "-1" di sini bertabrakan dengan "-1" milik onSaleCreated untuk
        // penjualan yang sama. Menghitung ulang aman dijalankan berkali-kali.
        await segarkanIsiKandang(base44.asServiceRole,
          tortoise.enclosure ? [tortoise.enclosure] : null);
      }
    }

    // BuyerProfile update TIDAK dilakukan di sini —
    // onSaleCreated automation sudah menanganinya (satu tempat saja, anti-dobel).

    return Response.json({ success: true, sale });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});