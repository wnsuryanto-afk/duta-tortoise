/**
 * Satu definisi: kapan sebuah SOPTask terjadwal.
 *
 * Aturan ini sebelumnya ditulis ulang di enam tempat — dua kali di
 * sendDailySummary, sekali di kepalaFeederDigital, dan tiga versi lagi di sisi
 * frontend. Enam salinan tidak pernah persis sama, dan perbedaannya baru
 * kelihatan sebagai angka yang tidak cocok: ringkasan sore mengumumkan tugas
 * yang menurut layar kepatuhan tidak jatuh tempo hari itu.
 *
 * Kembarannya di frontend ada di src/lib/kepatuhanSOP.js (terjadwalPada).
 * Kalau salah satu diubah, ubah keduanya — Deno tidak bisa mengimpor src/.
 *
 * Tiga aturan yang mudah keliru:
 *   - `bulan_aktif` menyaring lebih dulu. Task "2 bulan sekali, bulan ganjil"
 *     punya monthly_dates [10] DAN bulan_aktif [1,3,5,7,9,11]; mengabaikan
 *     bulan_aktif membuatnya jatuh tempo tiap tanggal 10, dua kali lebih sering
 *     dari yang dimaksud.
 *   - `mingguan` tanpa weekly_days berarti SETIAP HARI, bukan tidak pernah.
 *     Sebagian besar tugas inti peternakan tersimpan sebagai mingguan dengan
 *     daftar hari, jadi salah tafsir di sini menyembunyikan pekerjaan utama.
 *   - `bulanan` tanpa monthly_dates berarti TIDAK PERNAH. Tanggalnya wajib
 *     ditentukan; menebak "berarti tiap hari" membuat tugas bulanan muncul 30x.
 */

export type JadwalTask = {
  is_active?: boolean;
  frequency?: string;
  weekly_days?: number[];
  monthly_dates?: number[];
  bulan_aktif?: number[];
};

/**
 * Apakah task terjadwal pada tanggal tertentu?
 *
 * @param t       SOPTask
 * @param tanggal "YYYY-MM-DD" (tanggal WIB)
 */
export function terjadwalPada(t: JadwalTask | null | undefined, tanggal: string): boolean {
  if (!t || t.is_active !== true) return false;
  if (typeof tanggal !== "string" || tanggal.length < 10) return false;

  // Dibaca sebagai UTC lalu komponennya diambil dengan getUTC*(), supaya
  // zona waktu server tidak menggeser hari. Tanggalnya sudah tanggal WIB.
  const d = new Date(tanggal + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;

  const bulanAktif = Array.isArray(t.bulan_aktif) ? t.bulan_aktif : [];
  if (bulanAktif.length > 0 && !bulanAktif.includes(d.getUTCMonth() + 1)) return false;

  if (t.frequency === "harian") return true;
  if (t.frequency === "mingguan") {
    const hari = Array.isArray(t.weekly_days) ? t.weekly_days : [];
    return hari.length === 0 || hari.includes(d.getUTCDay());
  }
  if (t.frequency === "bulanan") {
    const tgl = Array.isArray(t.monthly_dates) ? t.monthly_dates : [];
    return tgl.includes(d.getUTCDate());
  }
  return false;
}

/** Tanggal WIB "YYYY-MM-DD" dari Date yang sudah digeser ke WIB. */
export function tanggalDariWib(wib: Date): string {
  return wib.toISOString().slice(0, 10);
}
