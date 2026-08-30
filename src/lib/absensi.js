/**
 * absensi.js — SATU aturan untuk mencatat kehadiran, dan satu aturan untuk lembur.
 *
 * Kenapa berkas ini ada:
 *
 * 1. **Check-in bisa tercatat dua kali, dan hari dobel itu dibayar dobel.**
 *    Gaji pokok harian dihitung dengan `attendances.filter(a => a.status === "hadir").length`
 *    — menghitung BARIS, bukan tanggal unik. Jadi satu tanggal yang punya dua baris
 *    absensi menghasilkan satu hari kerja tambahan di slip gaji.
 *
 *    Di data sungguhan hal ini sudah terjadi dua kali:
 *      · Angsolo, 28 Juli 2026 — dua baris (07:11 dan 07:41), selisih 30 menit.
 *      · Iwan Suryanto, 19 Juni 2026 — dua baris (17:59 dan 18:00), selisih 5 detik.
 *    Dengan tarif keeper Rp 70.000/hari, baris kembar Angsolo menambah Rp 70.000
 *    pada gaji Juli yang tidak pernah dikerjakan.
 *
 *    Penyebabnya dua-duanya bisa dijelaskan:
 *      · Layar hanya menahan tombol lewat `hasCheckedIn`, yang dibaca dari cache
 *        kueri. Antara `Attendance.create()` selesai dan cache-nya benar-benar
 *        segar ada jeda beberapa ratus milidetik — di situ tombolnya sudah aktif
 *        lagi sementara `hasCheckedIn` masih `false`. Ketukan kedua lolos.
 *      · Sebelum create, kode menunggu GPS sampai 10 detik. Selama itu tidak ada
 *        yang memeriksa ulang apakah baris untuk hari ini sudah ada.
 *
 *    Jawaban di sini: baca ulang dari server TEPAT sebelum membuat, dan tunggu
 *    kuerinya segar sebelum tombolnya dilepas kembali.
 *
 * 2. **Lembur ditulis di dua tempat dan hanya satu yang dibayar.**
 *    `Attendance.overtime_hours` ditulis oleh empat jalur berbeda, tetapi TIDAK
 *    SATU PUN layar gaji membacanya. Yang dibayar adalah `OvertimeLog.hours`
 *    dikali `overtime_rate_per_hour`. Selama keduanya ditulis berbarengan hal ini
 *    tidak terasa — tetapi `autoAttendance` di server menulis `overtime_hours`
 *    tanpa pernah membuat OvertimeLog, jadi lembur yang ia temukan tidak pernah
 *    dibayar sepeser pun.
 *
 *    Jawaban di sini: satu fungsi yang selalu menulis keduanya, dengan penjaga
 *    anti-dobel pada OvertimeLog.
 */

import { base44 } from "@/api/base44Client";
import { SHIFT_BAWAAN, keMenit, jamLembur } from "@/lib/weeklySalaryUtils";

export { SHIFT_BAWAAN, keMenit, jamLembur };

/**
 * Bila satu tanggal terlanjur punya lebih dari satu baris absensi, inilah baris
 * yang dianggap sah: yang check-in-nya paling awal. Sisanya kembar.
 *
 * Aturan ini dipakai bersama oleh penjaga check-in dan oleh alat pembersih,
 * supaya keduanya tidak pernah memilih baris yang berbeda.
 */
export function barisAbsensiSah(baris = []) {
  const hidup = (baris || []).filter(Boolean);
  if (hidup.length === 0) return null;
  return hidup.slice().sort((a, b) => {
    const ma = keMenit(a.check_in);
    const mb = keMenit(b.check_in);
    if (ma !== null && mb !== null && ma !== mb) return ma - mb;
    if (ma === null && mb !== null) return 1;
    if (mb === null && ma !== null) return -1;
    return String(a.created_date || "").localeCompare(String(b.created_date || ""));
  })[0];
}

/** Baris absensi orang ini pada tanggal ini, dibaca segar dari server. */
export async function bacaAbsensi(email, tanggal) {
  if (!email || !tanggal) return null;
  const baris = await base44.entities.Attendance.filter({ employee_email: email, date: tanggal });
  return barisAbsensiSah(baris);
}

/**
 * Catat check-in. Aman dipanggil dua kali.
 *
 * Mengembalikan `{ record, sudahAda }`. Bila `sudahAda` true, tidak ada baris
 * baru yang dibuat — yang dikembalikan adalah baris yang sudah ada, dan pemanggil
 * sebaiknya memberi tahu bahwa orang ini memang sudah absen hari ini.
 */
export async function catatCheckIn({ user, tanggal, jam, lat, lng, verified, shiftStart, shiftEnd, selfieUrl, tandaUji }) {
  const sudah = await bacaAbsensi(user?.email, tanggal);
  if (sudah) return { record: sudah, sudahAda: true };

  const record = await base44.entities.Attendance.create({
    employee_id: user.id,
    employee_name: user.full_name || user.email,
    employee_email: user.email,
    date: tanggal,
    check_in: jam,
    status: "hadir",
    check_in_lat: lat ?? null,
    check_in_lng: lng ?? null,
    location_verified: !!verified,
    shift_start: shiftStart || SHIFT_BAWAAN.mulai,
    shift_end: shiftEnd || SHIFT_BAWAAN.selesai,
    ...(selfieUrl ? { selfie_checkin_url: selfieUrl } : {}),
    ...(tandaUji || {}),
  });
  return { record, sudahAda: false };
}

/**
 * Catat check-out beserta lemburnya.
 *
 * Menulis `overtime_hours` di baris absensi (untuk dilihat orangnya) DAN membuat
 * `OvertimeLog` (yang benar-benar dibayar). Bila OvertimeLog untuk orang dan
 * tanggal yang sama sudah ada, yang lama diperbarui — tidak dibuat baris kedua.
 */
export async function catatCheckOut({ absensi, jam, lat, lng, adaLokasi, selfieUrl, tandaUji }) {
  if (!absensi?.id) return { lembur: 0 };

  const lembur = jamLembur(jam, absensi.shift_end || SHIFT_BAWAAN.selesai);

  await base44.entities.Attendance.update(absensi.id, {
    check_out: jam,
    check_out_lat: lat ?? null,
    check_out_lng: lng ?? null,
    checkout_location_verified: !!adaLokasi,
    overtime_hours: lembur,
    ...(selfieUrl !== undefined ? { selfie_checkout_url: selfieUrl || "" } : {}),
  });

  if (lembur > 0) await simpanLembur(absensi, lembur, jam, tandaUji);

  return { lembur };
}

/** Satu OvertimeLog per orang per tanggal — dibuat bila belum ada, diperbarui bila sudah. */
async function simpanLembur(absensi, lembur, jamPulang, tandaUji) {
  const isi = {
    employee_id: absensi.employee_id || "",
    employee_name: absensi.employee_name,
    employee_email: absensi.employee_email,
    date: absensi.date,
    hours: lembur,
    notes: `Lembur otomatis dari checkout ${jamPulang}`,
  };

  let lama = [];
  try {
    lama = await base44.entities.OvertimeLog.filter({
      employee_email: absensi.employee_email,
      date: absensi.date,
    });
  } catch {
    // gagal membaca bukan alasan menghilangkan lembur orang — lanjut membuat
  }

  if (lama && lama.length > 0) {
    await base44.entities.OvertimeLog.update(lama[0].id, { hours: lembur, notes: isi.notes });
    return;
  }
  await base44.entities.OvertimeLog.create({ ...isi, ...(tandaUji || {}) });
}
