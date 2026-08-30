import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  getOtomatis,
  wibTanggal,
  tanggalMundur,
  keMenit,
  jamDari,
  jamLemburBerbukti,
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

/**
 * Satu OvertimeLog per orang per tanggal, dibuat/diperbarui/dinolkan.
 *
 * Kolom `Attendance.overtime_hours` tidak dibayar oleh layar mana pun — yang
 * dibayar adalah `OvertimeLog.hours` dikali tarif. Jadi menulis yang pertama
 * tanpa yang kedua sama dengan tidak membayar lemburnya sama sekali.
 *
 * Jam pulang di sini bisa MAJU sepanjang hari saat task berikutnya dicentang,
 * jadi baris yang sudah ada diperbarui, bukan ditambah. Bila lemburnya jatuh ke
 * nol (mis. yang tercatat setelah jam shift ternyata cuma centang absensi),
 * baris lamanya ikut dinolkan supaya tidak ada sisa yang terlanjur terbayar.
 */
async function simpanLembur(
  base44: any,
  cl: any,
  tanggal: string,
  lembur: number,
  jamPulang: string,
) {
  try {
    const lama = await base44.asServiceRole.entities.OvertimeLog.filter({
      employee_email: cl.employee_email,
      date: tanggal,
    });
    const catatan = `Lembur otomatis dari checklist, tugas terakhir ${jamPulang}`;

    if (lama && lama.length > 0) {
      if (Number(lama[0].hours || 0) !== lembur) {
        await base44.asServiceRole.entities.OvertimeLog.update(lama[0].id, {
          hours: lembur,
          notes: catatan,
        });
      }
      return;
    }
    if (lembur <= 0) return;

    await base44.asServiceRole.entities.OvertimeLog.create({
      employee_id: cl.employee_id || "",
      employee_name: cl.employee_name || cl.employee_email,
      employee_email: cl.employee_email,
      date: tanggal,
      hours: lembur,
      notes: catatan,
    });
  } catch {
    // gagal mencatat lembur tidak boleh menggagalkan pengisian absensinya
  }
}

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
        if (cl.is_test_data === true) continue;
        const tugas = Array.isArray(cl.completed_tasks) ? cl.completed_tasks : [];
        const jamJam = tugas
          .map((t: any) => jamDari(t.recorded_at || t.photo_taken_at))
          .filter(Boolean)
          .sort();

        if (jamJam.length === 0) continue;

        const masuk = jamJam[0];
        const pulang = jamJam[jamJam.length - 1];
        const telat = Math.max(0, keMenit(masuk) - keMenit(shiftStart, "07:00"));

        // Lembur memakai aturan tunggal aplikasi: menit setelah jam selesai
        // shift, dibulatkan ke 0,5 jam, dan hanya bila ada tugas BUKAN-absensi
        // yang tercatat setelah jam itu.
        //
        // Sebelum ini fungsi ini memakai rumusnya sendiri (tanpa pembulatan)
        // dan — yang lebih parah — hanya menulis `overtime_hours` di baris
        // absensi. Tidak ada satu pun layar gaji yang membaca kolom itu; yang
        // dibayar adalah OvertimeLog. Jadi setiap lembur yang ditemukan fungsi
        // ini tidak pernah dibayar sepeser pun.
        const lembur = jamLemburBerbukti(
          { check_out: pulang, shift_end: shiftEnd },
          cl,
        );

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
            overtime_hours: lembur,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            notes: PENANDA,
          });
          await simpanLembur(base44, cl, tanggal, lembur, pulang);
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
            overtime_hours: lembur,
            shift_start: shiftStart,
            shift_end: shiftEnd,
          });
          await simpanLembur(base44, cl, tanggal, lembur, pulang);
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
