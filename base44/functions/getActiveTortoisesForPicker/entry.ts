import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Mengembalikan daftar kura aktif (id, name, code, enclosure) untuk picker
 * form "Lapor Kura Sakit". Pakai service role agar bypass RLS — semua role
 * terautentikasi (keeper, kepala_feeder, manajer, admin, owner) bisa membaca
 * daftar kura aktif read-only tanpa bisa edit/hapus data kura.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tortoises = await base44.asServiceRole.entities.Tortoise.filter({ status: 'aktif' });

    const picker = tortoises
      .map((t) => ({
        id: t.id,
        name: t.name || '',
        code: t.code || '',
        enclosure: t.enclosure || '',
      }))
      .sort((a, b) => (a.code || a.name || '').localeCompare(b.code || b.name || ''));

    return Response.json({ tortoises: picker, count: picker.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});