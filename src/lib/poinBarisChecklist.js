/**
 * poinBarisChecklist.js — aturan murni untuk baris poin di DailyChecklist.
 *
 * Dipisahkan dari poinKeChecklist.js yang menulisnya, karena berkas ini tidak
 * menyentuh jaringan sama sekali dan karena itu bisa diuji langsung oleh
 * penjaga (scripts/cek-ronda.mjs). Yang mengimpor base44 tidak bisa dibundel
 * untuk node: klien itu membaca `import.meta.env` saat dimuat.
 *
 * Latar belakang lengkapnya ada di kepala poinKeChecklist.js.
 */
import { cariTugas, normalJudul } from "@/lib/kunciTugas";

/**
 * Jumlah poin Inisiatif yang SUDAH disetujui untuk satu judul, satu orang,
 * satu hari.
 *
 * Kiper bisa mencatat judul yang sama dua kali sehari — "Cari rumput" pagi dan
 * sore; pada 23 Juni 2026 itu benar-benar terjadi. Di checklist keduanya
 * mengenai SATU baris, karena `onMaintenanceDone` menyatukan baris berjudul
 * sama. Jadi yang dituliskan ke baris itu harus JUMLAH-nya: menuliskan poin
 * satu catatan saja berarti penilaian kedua menimpa yang pertama, dan kiper
 * kehilangan poin yang sudah diberikan penilai.
 *
 * `tambahan` adalah catatan yang SEDANG dinilai: angka barunya belum ada di
 * dalam daftar, jadi ia dihitung dari situ dan catatan aslinya dilewati.
 */
export function poinJudulHari(logs = [], { judul, email, tanggal, tambahan = null } = {}) {
  const kunci = normalJudul(judul);
  if (!kunci || !email || !tanggal) return 0;
  const idTambahan = tambahan?.log?.id;
  const dari = (logs || [])
    .filter((l) => l?.is_extra)
    .filter((l) => !l.excluded_from_reports && !l.is_test_data)
    .filter((l) => l.done_by_email === email && l.period_key === tanggal)
    .filter((l) => normalJudul(l.item_label) === kunci)
    .filter((l) => (idTambahan ? l.id !== idTambahan : true))
    .filter((l) => l.approval_status === "approved")
    .reduce((jumlah, l) => jumlah + (Number(l.poin_earned) || 0), 0);
  return dari + Math.max(0, Number(tambahan?.poin) || 0);
}

/** Jumlah poin yang diklaim dari seluruh baris. */
export function totalPoinTugas(tugas = []) {
  return (tugas || []).reduce((jumlah, t) => jumlah + (Number(t?.points) || 0), 0);
}

/**
 * Pasang poin pada baris yang cocok. Murni — tidak menyentuh jaringan.
 *
 * @returns {{tugas:Array, ketemu:boolean, berubah:boolean, poinLama:number, totalBaru:number}}
 */
export function terapkanPoin(tugas = [], { judul, kandang, poin }) {
  const daftar = Array.isArray(tugas) ? tugas : [];
  const idx = cariTugas(daftar, judul, kandang);
  if (idx === -1) {
    return { tugas: daftar, ketemu: false, berubah: false, poinLama: 0, totalBaru: totalPoinTugas(daftar) };
  }
  const poinLama = Number(daftar[idx]?.points) || 0;
  const poinBaru = Math.max(0, Number(poin) || 0);
  if (poinLama === poinBaru) {
    return { tugas: daftar, ketemu: true, berubah: false, poinLama, totalBaru: totalPoinTugas(daftar) };
  }
  const salinan = daftar.slice();
  salinan[idx] = { ...salinan[idx], points: poinBaru };
  return { tugas: salinan, ketemu: true, berubah: true, poinLama, totalBaru: totalPoinTugas(salinan) };
}

/** Status yang mungkin, supaya layar tidak perlu menebak teksnya dari pesan. */
export const STATUS = {
  TERSIMPAN: "tersimpan",
  SAMA: "sama",
  SUDAH_DISETUJUI: "sudah-disetujui",
  TANPA_BARIS: "tanpa-baris",
  TANPA_CHECKLIST: "tanpa-checklist",
  GAGAL: "gagal",
};

/** Kalimat untuk penilai. Kosong bila tidak ada yang perlu dikatakan. */
export function pesanStatus(hasil) {
  switch (hasil?.status) {
    case STATUS.SUDAH_DISETUJUI:
      return `Checklist ${hasil.tanggal || "hari itu"} sudah disetujui, jadi poin ini belum ikut dihitung — setujui ulang checklist hari itu bila ingin dibayarkan.`;
    case STATUS.TANPA_BARIS:
      return "Baris pekerjaan ini tidak ditemukan di checklist hari itu, jadi poinnya baru tercatat pada Inisiatifnya saja.";
    case STATUS.TANPA_CHECKLIST:
      return "Belum ada checklist untuk tanggal itu, jadi poinnya baru tercatat pada Inisiatifnya saja.";
    case STATUS.GAGAL:
      return "Poin tersimpan pada Inisiatifnya, tetapi gagal dituliskan ke checklist hari itu.";
    default:
      return "";
  }
}

