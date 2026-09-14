/**
 * checkInSekali.js — penjaga agar satu orang hanya punya satu catatan hadir
 * per hari.
 *
 * EMPAT layar membuat catatan absensi, dan penjagaannya berbeda-beda:
 *
 *   AksiHarianKiper   if (hasCheckedIn || attendance || sibuk) return;   ← terbaik
 *   GuidedHariIni     if (hasCheckedIn) return;
 *   CheckInWidget     (tidak ada)
 *   KeeperDashboard   (tidak ada)
 *
 * Keempatnya bersandar pada keadaan React yang dimuat saat layar dibuka. Itu
 * tidak cukup: mengambil posisi GPS memakan beberapa detik, dan selama itu
 * tombolnya masih hidup. Ketukan kedua — atau ketukan di dua perangkat —
 * menghasilkan baris kedua.
 *
 * Sudah terjadi: Angsolo punya dua catatan hadir pada 28 Juli 2026, check-in
 * 07:11 dan 07:41. Gaji pokok harian dihitung dari jumlah baris, jadi satu
 * baris kembar bernilai satu hari upah.
 *
 * Penjaga ini memeriksa ke BASIS DATA tepat sebelum menulis, bukan ke keadaan
 * layar. Itu tidak menutup celah balapan sepenuhnya (tidak ada kunci unik di
 * sisi basis data), tapi menutup jarak beberapa detik yang selama ini terbuka.
 * Perhitungan gajinya sendiri sekarang memakai tanggal unik — lihat
 * hariHadirUnik() di hitungGaji.js — jadi baris kembar yang lolos pun tidak
 * lagi berubah jadi uang.
 */
import { base44 } from "@/api/base44Client";

/**
 * Buat catatan hadir, kecuali sudah ada untuk orang dan tanggal itu.
 *
 * @param {object} data payload Attendance; wajib memuat employee_email & date
 * @returns {Promise<{dibuat: boolean, record: object|null}>}
 *   `dibuat:false` berarti sudah ada catatan sebelumnya — `record` berisi yang lama.
 */
export async function buatAbsenSekali(data) {
  const email = data?.employee_email;
  const tanggal = data?.date;
  if (!email || !tanggal) {
    // Tanpa keduanya kita tidak bisa memeriksa apa pun. Menolak menulis lebih
    // aman daripada menulis baris yang tidak bisa dicocokkan dengan siapa pun.
    throw new Error("Catatan absensi butuh employee_email dan date.");
  }

  const sudahAda = await base44.entities.Attendance.filter({ employee_email: email, date: tanggal });
  if (Array.isArray(sudahAda) && sudahAda.length > 0) {
    return { dibuat: false, record: sudahAda[0] };
  }

  const record = await base44.entities.Attendance.create(data);
  return { dibuat: true, record };
}
