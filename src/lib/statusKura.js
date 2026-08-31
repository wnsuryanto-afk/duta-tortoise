import { STATUS_KELUAR } from "@/lib/populasiKura";
/**
 * statusKura.js — aturan perpindahan status kura.
 *
 * Ada tiga tempat berbeda yang menandai kura sembuh: layar keeper, panel tutup
 * kasus di Rekam Kesehatan, dan formulir catatan kesehatan. Ketiganya menulis
 * `status: "aktif"` secara harfiah.
 *
 * Akibatnya kura **baby** yang sakit lalu sembuh berubah jadi **aktif** dan
 * tidak pernah kembali jadi baby. Klasifikasi itu ikut dipakai menghitung
 * populasi baby di beranda dan menentukan perlakuan hariannya, jadi yang hilang
 * bukan sekadar label.
 *
 * Skema entitas sudah menyediakan `previous_status` untuk keperluan ini —
 * hanya saja baru dipakai oleh TortoiseForm.
 */

/** Status yang masuk akal untuk kura yang masih hidup dan ada di peternakan. */
const STATUS_HIDUP = ["aktif", "baby", "breeding"];

/**
 * Status yang seharusnya dipakai setelah kura dinyatakan sembuh.
 *
 * Mengembalikan status sebelum sakit bila masih masuk akal. "sakit" sendiri
 * tidak pernah dikembalikan (itu yang baru saja diakhiri), begitu pula status
 * yang berarti kura sudah tidak dirawat lagi — mati, terjual, diarsipkan —
 * karena memulihkannya akan menghidupkan kembali data yang sudah ditutup.
 *
 * @param {object} kura data kura, atau objek apa pun yang membawa previous_status
 * @returns {string}
 */
export function statusSetelahSembuh(kura) {
  const sebelumnya = kura?.previous_status;
  return STATUS_HIDUP.includes(sebelumnya) ? sebelumnya : "aktif";
}

/**
 * Perubahan yang harus ditulis saat kura ditandai sembuh.
 *
 * Dikumpulkan di satu tempat supaya kedua penanda sakit — `status` dan
 * `is_currently_sick` — tidak pernah dibersihkan sebagian. Keduanya dibaca di
 * belasan tempat dengan pola `status === "sakit" || is_currently_sick`, jadi
 * satu saja yang tertinggal membuat kura tampak sakit selamanya di separuh
 * aplikasi.
 */
export function perubahanSembuh(kura, tanggal) {
  return {
    is_currently_sick: false,
    status: statusSetelahSembuh(kura),
    last_status_change: tanggal || new Date().toISOString().split("T")[0],
  };
}

/**
 * Perubahan yang harus ditulis saat kura ditandai sakit.
 *
 * `previous_status` hanya disimpan bila status sekarang bukan "sakit", supaya
 * laporan sakit kedua kalinya tidak menimpa status asli dengan "sakit" —
 * yang akan membuat kura tidak pernah bisa kembali ke status semula.
 */
export function perubahanSakit(kura, tanggal) {
  const sekarang = kura?.status;
  return {
    is_currently_sick: true,
    status: "sakit",
    previous_status: sekarang && sekarang !== "sakit" ? sekarang : kura?.previous_status,
    last_status_change: tanggal || new Date().toISOString().split("T")[0],
  };
}

/**
 * Status yang berarti kura tidak lagi dirawat di peternakan.
 * Kura dengan status ini tidak mungkin "sedang sakit".
 */
/**
 * Nama lain untuk STATUS_KELUAR di lib/populasiKura.js — dipertahankan supaya
 * pemanggil yang sudah ada tidak perlu diubah, tapi isinya tidak lagi ditulis
 * ulang di sini. Satu daftar, satu tempat.
 */
export const STATUS_TUTUP = STATUS_KELUAR;

/**
 * SATU definisi "kura ini sedang sakit".
 *
 * Sakit ditandai dua kali di data kura: lewat `status` dan lewat centang
 * `is_currently_sick`. Sebelas layar sudah membacanya dengan pola gabungan
 * `status === "sakit" || is_currently_sick`, tapi Daftar Kura membacanya
 * setengah-setengah — lencana "Sakit Saat Ini" menghitung centangnya saja,
 * sedangkan penyaringnya membandingkan statusnya saja. Tombolnya menyebut satu
 * angka, isinya kura yang lain, dan kura yang kedua penandanya berbeda tidak
 * muncul di mana pun sehingga tidak bisa diperbaiki dari layar itu.
 *
 * Selama dua penanda itu masih ada, keduanya harus dibaca lewat fungsi ini.
 */
export function sedangSakit(kura) {
  return kura?.status === "sakit" || !!kura?.is_currently_sick;
}

/** Apakah kedua penanda sakit sepakat? */
export function tandaSelaras(kura) {
  if (!kura) return true;
  return (kura.status === "sakit") === !!kura.is_currently_sick;
}

/**
 * Apa kata riwayat kesehatan: kasus terakhir masih terbuka atau sudah ditutup?
 *
 * Catatan "sakit" membuka kasus, catatan "sembuh" menutupnya. Jenis lain
 * (checkup, obat, timbang) terjadi di tengah perawatan dan tidak memutuskan
 * apa pun. Bila tanggal keduanya sama persis, riwayat tidak dianggap menjawab —
 * menebak urutan dari dua catatan bertanggal sama bisa keliru.
 *
 * @returns {"sakit"|"sembuh"|null} null bila riwayat tidak menjawab.
 */
export function keputusanRiwayat(tortoiseId, healthRecords = []) {
  if (!tortoiseId) return null;
  let sakit = null;
  let sembuh = null;
  healthRecords.forEach((h) => {
    if (!h || h.tortoise_id !== tortoiseId || !h.date) return;
    if (h.type === "sakit") { if (!sakit || h.date > sakit) sakit = h.date; }
    else if (h.type === "sembuh") { if (!sembuh || h.date > sembuh) sembuh = h.date; }
  });
  if (!sakit && !sembuh) return null;
  if (sakit && sembuh && sakit === sembuh) return null;
  if (!sembuh) return "sakit";
  if (!sakit) return "sembuh";
  return sakit > sembuh ? "sakit" : "sembuh";
}

/**
 * Periksa keselarasan penanda sakit pada seluruh kura, tanpa mengubah apa pun.
 *
 * Dua penanda yang berselisih tidak selalu punya satu jawaban benar, jadi
 * pemeriksaan ini memisahkan yang PASTI dari yang RAGU, dan hanya yang pasti
 * yang boleh diperbaiki massal:
 *
 *   - nyalakan  — statusnya "sakit" tapi centangnya kosong. Statusnya sudah
 *                 terlihat di kartu dan penghitung, centangnya tinggal menyusul.
 *   - matikan   — centangnya terisi padahal kuranya sudah mati/terjual/
 *                 diarsipkan, atau catatan sembuhnya sudah ada.
 *   - sakitkan  — centangnya terisi dan catatan sakit terakhir belum ditutup,
 *                 tapi statusnya bukan "sakit".
 *   - sembuhkan — statusnya "sakit" padahal catatan sembuhnya sudah ada.
 *   - ragu      — centangnya terisi, statusnya hidup dan bukan sakit, dan
 *                 riwayatnya tidak menjawab. Ini keputusan manusia: menebaknya
 *                 berarti mengeluarkan kura yang benar-benar sakit dari daftar
 *                 perawatan, atau sebaliknya menghidupkan kembali kasus yang
 *                 sengaja ditutup.
 *
 * @returns {{ selaras: number, perbaikan: Array, ragu: Array }}
 */
export function periksaTandaSakit(tortoises = [], healthRecords = []) {
  const perbaikan = [];
  const ragu = [];
  let selaras = 0;

  tortoises.forEach((kura) => {
    if (tandaSelaras(kura)) { selaras += 1; return; }
    const riwayat = keputusanRiwayat(kura.id, healthRecords);

    if (kura.status === "sakit") {
      // Centangnya kosong.
      if (riwayat === "sembuh") {
        perbaikan.push({
          kura,
          jenis: "sembuhkan",
          alasan: "Catatan sembuhnya sudah ada, tapi statusnya masih sakit.",
          perubahan: perubahanSembuh(kura),
        });
      } else {
        perbaikan.push({
          kura,
          jenis: "nyalakan",
          alasan: "Statusnya sakit, tapi centang sakitnya kosong.",
          perubahan: { is_currently_sick: true },
        });
      }
      return;
    }

    // Centangnya terisi, statusnya bukan "sakit".
    if (STATUS_TUTUP.includes(kura.status) || kura.is_archived) {
      perbaikan.push({
        kura,
        jenis: "matikan",
        alasan: "Sudah tidak dirawat lagi, jadi tidak mungkin sedang sakit.",
        perubahan: { is_currently_sick: false },
      });
      return;
    }
    if (riwayat === "sembuh") {
      perbaikan.push({
        kura,
        jenis: "matikan",
        alasan: "Catatan sembuhnya sudah ada, tapi centang sakitnya belum dilepas.",
        perubahan: { is_currently_sick: false },
      });
      return;
    }
    if (riwayat === "sakit") {
      perbaikan.push({
        kura,
        jenis: "sakitkan",
        alasan: "Catatan sakit terakhir belum ditutup, tapi statusnya bukan sakit.",
        perubahan: perubahanSakit(kura),
      });
      return;
    }
    ragu.push({
      kura,
      alasan: "Centang sakitnya terisi, tapi statusnya bukan sakit dan tidak ada catatan kesehatan yang menjelaskan.",
    });
  });

  return { selaras, perbaikan, ragu };
}
