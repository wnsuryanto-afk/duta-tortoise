import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
import { masukLaporan } from "../../shared/laporan.ts";
  getOtomatis,
  wibTanggal,
  tanggalMundur,
  keMenit,
  jamDari,
} from "../../shared/otomatis.ts";

/**
 * A3 — Absensi terisi sendiri dari jam centang task pertama dan terakhir.
 *
 * Aplikasi sudah menyimpan `recorded_at` (HH:mm WIB) pada setiap task yang
 * dicentang. Jadi jam datang dan jam pulang sebenarnya sudah ada di data —
 * yang belum ada hanya yang merangkumnya. Dua SOP task "Absensi jam masuk" dan
 * "Absensi jam pulang" (5 poin masing-masing) sesudah ini boleh dinonaktifkan:
 * poinnya dibayar untuk mencatat sesuatu yang sudah tercatat sendiri.
 *
 * Menghormati entri manual: bila sudah ada baris absensi yang BUKAN buatan
 * fungsi ini, isinya tidak ditimpa — hanya kolom kosong yang dilengkapi.
 */
const PENANDA = "Otomatis dari checklist";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.auto_attendance_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const shiftStart = otomatis.shift_start || "07:00";
    const shiftEnd = otomatis.shift_end || "16:00";

    // Hari ini dan kemarin: hari ini supaya absensi terlihat berjalan, kemarin
    // supaya jam pulang yang dicentang lewat tengah malam tetap tertangkap.
    const tanggalDiproses = [wibTanggal(), tanggalMundur(1)];
    const hasil: string[] = [];

    for (const tanggal of tanggalDiproses) {
      const checklists = await base44.asServiceRole.entities.DailyChecklist.filter({ date: tanggal });

      for (const cl of checklists || []) {
        if (!masukLaporan(cl)) continue;
        const tugas = Array.isArray(cl.completed_tasks) ? cl.completed_tasks : [];
        const jamJam = tugas
          .map((t: any) => jamDari(t.recorded_at || t.photo_taken_at))
          .filter(Boolean)
          .sort();

        if (jamJam.length === 0) continue;

        const masuk = jamJam[0];
        const pulang = jamJam[jamJam.length - 1];
        const telat = Math.max(0, keMenit(masuk) - keMenit(shiftStart, "07:00"));
        const lembur = Math.max(0, (keMenit(pulang) - keMenit(shiftEnd, "16:00")) / 60);

        const adaSebelumnya = await base44.asServiceRole.entities.Attendance.filter({
          employee_email: cl.employee_email,
          date: tanggal,
        });
        const baris = (adaSebelumnya || [])[0];

        if (!baris) {
          await base44.asServiceRole.entities.Attendance.create({
            employee_name: cl.employee_name || cl.employee_email,
            employee_email: cl.employee_email,
            employee_id: cl.employee_id || undefined,
            date: tanggal,
            check_in: masuk,
            check_out: pulang,
            status: "hadir",
            late_minutes: telat,
            overtime_hours: Number(lembur.toFixed(2)),
            shift_start: shiftStart,
            shift_end: shiftEnd,
            notes: PENANDA,
          });
          hasil.push(`buat ${cl.employee_name} ${tanggal} ${masuk}–${pulang}`);
          continue;
        }

        const buatanKita = String(baris.notes || "").startsWith(PENANDA);

        if (buatanKita) {
          // Baris milik fungsi ini — perbarui penuh, jam pulang bisa maju
          // sepanjang hari saat task-task berikutnya dicentang.
          await base44.asServiceRole.entities.Attendance.update(baris.id, {
            check_in: masuk,
            check_out: pulang,
            late_minutes: telat,
            overtime_hours: Number(lembur.toFixed(2)),
            shift_start: shiftStart,
            shift_end: shiftEnd,
          });
          hasil.push(`perbarui ${cl.employee_name} ${tanggal} ${masuk}–${pulang}`);
        } else {
          // Entri manusia — hanya lengkapi yang kosong, jangan menimpa.
          const patch: Record<string, unknown> = {};
          if (!baris.check_in) patch.check_in = masuk;
          if (!baris.check_out) patch.check_out = pulang;
          if (Object.keys(patch).length > 0) {
            await base44.asServiceRole.entities.Attendance.update(baris.id, patch);
            hasil.push(`lengkapi ${cl.employee_name} ${tanggal}`);
          }
        }
      }
    }

    return Response.json({ success: true, diproses: hasil.length, detail: hasil });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
