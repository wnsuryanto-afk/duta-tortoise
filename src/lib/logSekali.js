/**
 * logSekali.js — penjaga agar satu centangan hanya tercatat sekali.
 *
 * Ini kejadian KETIGA dari cacat yang sama persis, di tabel ketiga:
 *
 *   Attendance          dua baris hadir di hari yang sama  → checkInSekali.js
 *   MeasurementHistory  dua baris timbang di hari yang sama → ukurSekali.js
 *   MaintenanceLog      dua baris centang dengan check_key sama → berkas ini
 *
 * Polanya selalu sama: layar memeriksa keadaan React yang dimuat saat halaman
 * dibuka, lalu menulis. Di antara pemeriksaan dan penulisan ada jeda — unggah
 * foto, ambil GPS, jaringan lambat — dan tombolnya masih hidup. Ketukan kedua,
 * atau ketukan di perangkat kedua, menghasilkan baris kedua.
 *
 * `check_key` sudah dirancang unik (`email__jenis__item__tanggal`), tapi tidak
 * ada yang memaksakannya: basis datanya tidak punya batasan unik, dan tidak
 * satu pun dari sepuluh tempat yang membuat MaintenanceLog memeriksanya lebih
 * dulu. Sapuan 15-09-2026 menemukan 10 pasang kembar.
 *
 * Akibatnya TIDAK sampai ke gaji — slip gaji menghitung poin dari
 * DailyChecklist, bukan dari sini. Yang membengkak adalah angka poin yang
 * dilihat kiper sendiri di layarnya, dan tingkat/level yang mengikutinya.
 * Kecil, tapi itu angka yang mereka percayai tentang pekerjaan mereka.
 */
import { base44 } from "@/api/base44Client";

/**
 * Buat MaintenanceLog, kecuali check_key-nya sudah ada.
 *
 * @param {object} data payload MaintenanceLog; wajib memuat check_key
 * @returns {Promise<{dibuat: boolean, record: object|null}>}
 *   `dibuat:false` berarti centangan itu sudah tercatat sebelumnya.
 */
export async function catatLogSekali(data) {
  const kunci = data?.check_key;
  if (!kunci) {
    // Tanpa check_key tidak ada yang bisa diperiksa. Tetap ditulis supaya
    // perilaku lama tidak berubah diam-diam, tapi ini yang harus diperbaiki
    // di pemanggilnya.
    const record = await base44.entities.MaintenanceLog.create(data);
    return { dibuat: true, record };
  }

  try {
    const ada = await base44.entities.MaintenanceLog.filter({ check_key: kunci }, null, 5);
    if (Array.isArray(ada) && ada.length > 0) {
      return { dibuat: false, record: ada[0] };
    }
  } catch {
    // Kegagalan memeriksa tidak boleh menggagalkan pencatatan: baris kembar
    // lebih ringan akibatnya daripada pekerjaan yang tidak tercatat sama sekali.
  }

  const record = await base44.entities.MaintenanceLog.create(data);
  return { dibuat: true, record };
}
