import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getDailyEmployees — Mengembalikan daftar karyawan harian (keeper, kepala_feeder)
 * untuk halaman Slip Gaji Rutin. Berjalan dengan izin server (service role) agar
 * bisa membaca entity User penuh — bypass RLS bawaan yang membatasi admin.
 *
 * Keamanan:
 *  - Hanya owner/manajer/admin yang boleh memanggil (role lain → 403).
 *  - Role "kicked" selalu dikecualikan.
 *  - Mengembalikan HANYA field aman: id, full_name, email, role.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ALLOWED_CALLERS = ['owner', 'manajer', 'admin'];
    if (!ALLOWED_CALLERS.includes(caller.role)) {
      return Response.json({ error: 'Akses ditolak: role tidak diizinkan' }, { status: 403 });
    }

    // Service role: baca daftar User penuh (bypass RLS)
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Filter: hanya karyawan harian (keeper, kepala_feeder); kecualikan kicked
    const EMPLOYEE_ROLES = ['keeper', 'kepala_feeder'];
    const employees = allUsers
      .filter(u => EMPLOYEE_ROLES.includes(u.role))
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