import { base44 } from "@/api/base44Client";
import { hitungPemberian } from "@/lib/poinInisiatif";
import { pesanStatus, poinJudulHari, tulisPoinInisiatif } from "@/lib/poinKeChecklist";

/**
 * simpanPenilaianInisiatif.js — SATU jalur menyimpan penilaian Inisiatif.
 *
 * ── Kenapa diangkat jadi modul sendiri ─────────────────────────────────────
 *
 * Penilaian satu catatan menyentuh tiga tempat yang harus bergerak bersama:
 * MaintenanceLog (status + poin), baris checklist tanggal itu (yang dibaca
 * slip gaji), dan notifikasi untuk yang mengerjakan. Urutannya penting,
 * jumlah yang ditulis ke checklist BUKAN poin catatan ini melainkan jumlah
 * poin untuk judul itu pada hari itu, dan kuotanya dihitung dari data segar.
 *
 * Sejak 12 Okt 2026 ada dua pemanggil: kartu satuan di TugasHariIni, dan
 * penilaian sekaligus per kelompok pekerjaan. Menyalin urutan itu ke
 * pemanggil kedua berarti sepasang kembar yang mengurus UANG — dan yang satu
 * akan diperbaiki tanpa yang lain. Jadi urutannya tinggal di sini saja.
 *
 * Yang TIDAK diurus di sini: toast, muat ulang daftar, dan pengambilan
 * `logsKuota`. Ketiganya milik pemanggil, karena penilaian sekaligus
 * mengambil kuota sekali untuk satu orang-tanggal lalu memakainya berulang,
 * sementara kartu satuan mengambilnya sendiri tiap kali.
 */

/**
 * Simpan satu penilaian Inisiatif.
 *
 * @param p.log        catatan MaintenanceLog yang dinilai
 * @param p.poin       angka yang DIMINTA penilai (sebelum batas harian)
 * @param p.catatan    catatan opsional untuk yang mengerjakan
 * @param p.user       penilainya
 * @param p.settings   CompanySettings (untuk batas harian)
 * @param p.logsKuota  log orang+tanggal yang sama, untuk menghitung kuota
 * @param p.kabari     kirim notifikasi ke yang mengerjakan (default true)
 * @returns {Promise<{diberikan, pesan, hasilChecklist}>}
 */
export async function simpanPenilaianInisiatif({
  log, poin, catatan = "", user, settings, logsKuota = [], kabari = true,
}) {
  // Batas harian berlaku pada YANG MENERIMA, bukan pada yang menilai. Kalau
  // kuotanya sudah habis, tugasnya tetap tercatat dinilai — yang berubah
  // hanya poinnya, dan itu DIKATAKAN alih-alih dipotong diam-diam.
  const { diberikan, pesan } = hitungPemberian({
    diminta: poin,
    logs: logsKuota,
    email: log.done_by_email,
    tanggal: log.period_key,
    settings,
    kecualikanId: log.id,
  });

  await base44.entities.MaintenanceLog.update(log.id, {
    // Nol yang DIPUTUSKAN ditandai "rejected" supaya bisa dibedakan dari
    // nol yang belum pernah dilihat siapa pun — 234 catatan lama semuanya
    // nol jenis kedua.
    approval_status: diberikan > 0 ? "approved" : "rejected",
    menunggu_penilaian: false,
    approved_by: user?.full_name || user?.email || "",
    poin_dinilai_oleh: user?.email || "",
    approved_at: new Date().toISOString(), // ISO, sama dengan empat penulis persetujuan lain
    poin_earned: diberikan,
    ...(catatan ? { penilaian_note: String(catatan).trim() } : {}),
  });

  /*
    Poinnya dituliskan juga ke baris checklist tanggal itu.

    Tanpa ini penilaian hanya mengubah MaintenanceLog.poin_earned — yang
    dibaca satu layar, "Poin Saya" milik kiper — sementara slip gaji dan
    bonus bulanan menghitung dari DailyChecklist, tempat barisnya masuk
    bernilai NOL dan tidak pernah diperbarui (`onMaintenanceDone` hanya
    menambah baris yang belum ada).

    Yang dituliskan JUMLAH poin untuk judul itu hari itu, bukan poin catatan
    ini saja. Kiper bisa mencatat judul yang sama dua kali sehari — pada
    23 Juni 2026 "Cari rumput" tercatat dua kali. Di checklist keduanya
    mengenai SATU baris, karena `onMaintenanceDone` menyatukan baris berjudul
    sama. Jadi menuliskan poin satu catatan saja berarti penilaian kedua
    MENIMPA yang pertama, dan kiper kehilangan poin yang sudah diberikan.
  */
  const hasilChecklist = await tulisPoinInisiatif({
    email: log.done_by_email,
    tanggal: log.period_key,
    judul: log.item_label,
    kandang: log.enclosure_name,
    poin: poinJudulHari(logsKuota, {
      judul: log.item_label,
      email: log.done_by_email,
      tanggal: log.period_key,
      tambahan: { log, poin: diberikan },
    }),
  });

  if (kabari) {
    // Kabari yang mengerjakan — inilah yang selama ini tidak pernah ada.
    try {
      await base44.entities.Notification.create({
        recipient_email: log.done_by_email,
        title: `Inisiatif "${log.item_label}" dinilai ${diberikan} poin`,
        message: [
          catatan ? String(catatan).trim() : "",
          pesan,
          // Keterangan checklist ikut dikabarkan: untuk hari yang checklist-nya
          // sudah disetujui, barisnya dibetulkan tetapi angka yang sudah
          // dibayar TIDAK disentuh — dan yang mengerjakan berhak tahu itu.
          pesanStatus(hasilChecklist),
          `Dinilai oleh ${user?.full_name || user?.email || "penilai"}.`,
        ].filter(Boolean).join("\n\n"),
        type: diberikan > 0 ? "success" : "info",
        priority: "rendah",
        category: "lainnya",
        action_url: "/sop",
        action_label: "Lihat",
        related_entity_id: log.id,
        related_entity_type: "MaintenanceLog",
        created_at: new Date().toISOString(),
      });
    } catch {
      // Penilaiannya sudah tersimpan; hanya kabarnya yang gagal.
    }
  }

  return { diberikan, pesan, hasilChecklist };
}

export default simpanPenilaianInisiatif;
