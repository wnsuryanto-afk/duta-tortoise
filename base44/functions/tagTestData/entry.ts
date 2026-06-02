/**
 * tagTestData — dipanggil dari frontend sebelum membuat record baru
 * saat test_mode_active = true.
 *
 * Usage dari frontend (opsional helper):
 *   await base44.functions.invoke('tagTestData', {})
 *   → returns { is_test_data: true/false }
 *
 * Lebih sering dipakai sebagai utilitas cek status test mode.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await base44.asServiceRole.entities.CompanySettings.filter({ setting_key: "main" });
  const isTestMode = !!settings[0]?.test_mode_active;

  return Response.json({ is_test_data: isTestMode, test_mode_active: isTestMode });
});