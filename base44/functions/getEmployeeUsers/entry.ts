import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Mengembalikan daftar user karyawan (id, full_name, email, role) untuk keperluan
 * slip gaji, rekap poin, dan daftar karyawan. Pakai service role agar bypass
 * RLS bawaan entity User — semua role terautentikasi (admin, manajer, owner)
 * bisa membaca daftar karyawan read-only TANPA bisa mengubah/menghapus user.
 *
 * Role "kicked" selalu dikecualikan. Hanya role karyawan (keeper, kepala_feeder,
 * admin) yang dikembalikan — owner/manajer/investor/kicked tidak termasuk.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allUsers = await base44.asServiceRole.entities.User.list();

    const EMPLOYEE_ROLES = ['keeper', 'kepala_feeder', 'admin'];
    const employees = allUsers
      .filter(u => EMPLOYEE_ROLES.includes(u.role) && u.role !== 'kicked')
      .map(u => ({
        id: u.id,
        full_name: u.full_name || '',
        email: u.email || '',
        role: u.role || '',
      }))
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));

    return Response.json({ employees, count: employees.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});