/**
 * tagLegacyTestData — sekali pakai untuk menandai data lama sebagai is_test_data=true
 * Sesuai spesifikasi:
 *   - DailyChecklist oleh "Iwan Suryanto" atau "Diana Susantio" sebelum 2026-06-02
 *   - Attendance dengan durasi < 5 menit (check_in & check_out sangat berdekatan)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { BATAS_AMBIL } from "../../shared/batas.ts";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results = { dailyChecklist: 0, attendance: 0 };

  // 1. DailyChecklist dari Iwan Suryanto atau Diana Susantio sebelum 2026-06-02
  const testNames = ["Iwan Suryanto", "Diana Susantio"];
  for (const name of testNames) {
    const records = await base44.asServiceRole.entities.DailyChecklist.filter({ employee_name: name }, null, BATAS_AMBIL);
    const toTag = records.filter(r => !r.is_test_data && (r.date || "") < "2026-06-02");
    for (const rec of toTag) {
      await base44.asServiceRole.entities.DailyChecklist.update(rec.id, { is_test_data: true });
      results.dailyChecklist++;
    }
  }

  // 2. Attendance dengan durasi check_in s/d check_out < 5 menit
  // Migrasi ini menulis penanda ke tiap baris, jadi daftar yang terpotong
  // berarti sebagian data uji tidak pernah tertandai — dan tidak ada yang
  // memberi tahu. Batasnya ditulis tegas; bila tersentuh, jalankan lagi.
  const allAttendance = await base44.asServiceRole.entities.Attendance.list('-created_date', 5000);
  for (const rec of allAttendance) {
    if (rec.is_test_data) continue;
    if (!rec.check_in || !rec.check_out) continue;
    // Parse time strings "HH:MM" or "HH:MM:SS"
    const parseTime = (t) => {
      const parts = t.split(":").map(Number);
      return parts[0] * 60 + parts[1];
    };
    const inMin = parseTime(rec.check_in);
    const outMin = parseTime(rec.check_out);
    const diff = outMin - inMin;
    if (diff >= 0 && diff < 5) {
      await base44.asServiceRole.entities.Attendance.update(rec.id, { is_test_data: true });
      results.attendance++;
    }
  }

  return Response.json({
    success: true,
    tagged: results,
    message: `Tagged ${results.dailyChecklist} checklist dan ${results.attendance} absensi sebagai data test`
  });
});