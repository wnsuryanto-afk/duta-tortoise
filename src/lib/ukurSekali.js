/**
 * ukurSekali.js — penjaga agar satu kura hanya punya satu catatan ukur per hari.
 *
 * Bukan ketukan ganda. Buktinya ada di data: dari 32 baris kembar sampai
 * 15-09-2026, 23 di antaranya ditulis oleh DUA ORANG BERBEDA — Angsolo dan
 * sholehuddin sholeh — dengan angka yang sama persis, berjarak dari 0 detik
 * sampai enam jam.
 *
 *     BB-2026034  21 Jul   0,0 detik   Angsolo / sholehuddin sholeh
 *     A27         18 Jul    67 detik   Angsolo / sholehuddin sholeh
 *     BB-2026047  27 Jul   6,3 jam     sholehuddin sholeh / Angsolo
 *
 * Task "Timbang & ukur kura (ROTASI OTOMATIS)" bersifat `task_scope: bersama`,
 * jadi kedua kiper melihat kura yang sama di daftar mereka masing-masing dan
 * keduanya mengerjakannya. Tidak ada yang salah menurut layar: masing-masing
 * hanya menyimpan satu kali.
 *
 * Menonaktifkan tombol tidak menolong untuk kasus ini — dua perangkat, dua
 * sesi, kadang berjam-jam terpisah. Yang menolong hanya memeriksa ke basis
 * data tepat sebelum menulis.
 *
 * Pilihan yang diambil: bukan menolak diam-diam, melainkan memberi tahu siapa
 * yang sudah menimbang lebih dulu, lalu menawarkan memperbarui angkanya.
 * Kiper kedua mungkin menimbang ulang karena tidak yakin dengan yang pertama —
 * membuang pekerjaannya tanpa penjelasan lebih buruk daripada baris kembar.
 */
import { base44 } from "@/api/base44Client";
import { masukLaporan } from "@/lib/laporan";

/**
 * Cari catatan ukur yang sudah ada untuk kura + tanggal ini.
 * Baris yang dikecualikan dari laporan tidak dihitung — justru itu yang perlu
 * digantikan.
 *
 * @returns {Promise<object|null>}
 */
export async function cariUkuranHariIni(tortoiseId, tanggal) {
  if (!tortoiseId || !tanggal) return null;
  const ada = await base44.entities.MeasurementHistory.filter({
    tortoise_id: tortoiseId,
    date: tanggal,
  });
  if (!Array.isArray(ada)) return null;
  return ada.find(masukLaporan) || null;
}

/**
 * Simpan pengukuran, kecuali sudah ada untuk kura dan tanggal itu.
 *
 * @param {object} data payload MeasurementHistory; wajib memuat tortoise_id & date
 * @param {object} [opsi]
 * @param {boolean} [opsi.timpa] true → perbarui baris yang sudah ada, bukan menolak
 * @returns {Promise<{dibuat: boolean, diperbarui: boolean, record: object|null}>}
 *   `dibuat:false, diperbarui:false` berarti sudah ada catatan dan tidak diapa-apakan;
 *   `record` berisi baris yang sudah ada, termasuk `measured_by` untuk ditampilkan.
 */
export async function simpanUkuranSekali(data, opsi = {}) {
  const tortoiseId = data?.tortoise_id;
  const tanggal = data?.date;
  if (!tortoiseId || !tanggal) {
    throw new Error("Catatan pengukuran butuh tortoise_id dan date.");
  }

  const sudahAda = await cariUkuranHariIni(tortoiseId, tanggal);
  if (sudahAda) {
    if (!opsi.timpa) return { dibuat: false, diperbarui: false, record: sudahAda };
    const record = await base44.entities.MeasurementHistory.update(sudahAda.id, {
      weight_grams: data.weight_grams,
      shell_length_cm: data.shell_length_cm,
      measured_by: data.measured_by,
      ...(data.photo_url ? { photo_url: data.photo_url } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    });
    return { dibuat: false, diperbarui: true, record: record || sudahAda };
  }

  const record = await base44.entities.MeasurementHistory.create(data);
  /*
   * Laporan "tidak makan" untuk kura ini dianggap sudah dijawab.
   *
   * Tanpa ini tugas timbang tetap muncul walau kiper baru saja
   * mengerjakannya — dan tugas yang tidak bisa dipadamkan dengan bekerja
   * adalah tugas yang berhenti dikerjakan. Kegagalannya ditelan: penandaan
   * ini tidak boleh membatalkan penyimpanan pengukuran yang sudah berhasil.
   */
  try {
    const { tandaiSudahDitimbang } = await import("@/lib/laporMakan");
    await tandaiSudahDitimbang(tortoiseId);
  } catch { /* penanda gagal, pengukurannya tetap tersimpan */ }
  return { dibuat: true, diperbarui: false, record };
}

/** Kalimat siap pakai untuk memberi tahu bahwa kura ini sudah ditimbang hari ini. */
export function pesanSudahDitimbang(record) {
  const oleh = record?.measured_by ? ` oleh ${record.measured_by}` : "";
  const berat = record?.weight_grams ? `${Number(record.weight_grams).toLocaleString("id-ID")} g` : "";
  const angka = berat ? ` (${berat})` : "";
  return `Kura ini sudah ditimbang hari ini${oleh}${angka}.`;
}
