import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { segarkanIsiKandang } from "../../shared/isiKandang.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { new_enclosure, old_enclosure } = await req.json();

    // Dihitung ulang dari data kura, bukan dinaikkan/diturunkan satu.
    //
    // Versi lama punya dua cacat sekaligus. Pertama, ia memanggil
    // Enclosure.get(new_enclosure) padahal yang dikirim adalah NAMA kandang
    // sementara .get() menerima NOMOR — pencariannya tidak pernah ketemu dan
    // fungsinya diam-diam tidak melakukan apa pun. Kedua, ia memakai daftar
    // putih status ['aktif','baby','sakit','breeding','karantina'], sehingga
    // status yang ditambahkan ke skema kelak akan hilang dari hitungan tanpa
    // ada yang menyadarinya.
    const hasil = await segarkanIsiKandang(
      base44.asServiceRole,
      [old_enclosure, new_enclosure].filter(Boolean),
    );
    if (hasil.error) {
      return Response.json({ error: hasil.error }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
