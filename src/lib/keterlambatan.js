/**
 * keterlambatan.js — SATU aturan "jam masuk ini terlambat atau tidak, dan kenapa".
 *
 * ── Keadaan sebelum berkas ini ada ──────────────────────────────────────────
 *
 * Skema Attendance sudah punya `late_minutes` sejak awal. Nilainya **0 di
 * seluruh 117 baris absensi** yang pernah tercatat. Bukan karena tidak ada yang
 * terlambat — melainkan karena satu-satunya kode yang pernah mengisinya adalah
 * fungsi server `autoAttendance`, dan fungsi itu belum pernah membuat satu baris
 * pun; semua baris yang ada dibuat manusia lewat tombol check-in, dan jalur itu
 * tidak pernah menulis `late_minutes` sama sekali.
 *
 * Jadi keterlambatan tidak disembunyikan — ia tidak pernah dicatat.
 *
 * Padahal ia ada, dan polanya jelas (diukur 16 Juli – 19 September 2026,
 * 117 hari kerja, shift mulai 07:00):
 *
 *     Angsolo      rata-rata masuk 07:49  ·  telat ≥30 menit  29 dari 58 hari
 *     Sholehuddin  rata-rata masuk 06:56  ·  telat ≥30 menit   5 dari 59 hari
 *
 * Keterlambatan Angsolo menumpuk rapat di 08:01–08:14 — sebelas hari di rentang
 * tiga belas menit itu. Sebaran serapat itu bukan keterlambatan acak, itu
 * rutinitas: ada pekerjaan yang dikerjakan lebih dulu sebelum sampai kandang.
 * Tiga hari lain jenisnya berbeda sama sekali — masuk 11:01, 13:10, dan 14:11.
 *
 * Aplikasi tidak bisa membedakan keduanya, karena tidak pernah ada yang
 * menanyakan.
 *
 * ── Yang TIDAK dilakukan berkas ini ─────────────────────────────────────────
 *
 * Keterlambatan **tidak memotong gaji**, dan berkas ini tidak mengubahnya.
 * Gaji harian dihitung `hariHadir × base_salary` — hari penuh, berapa pun jam
 * masuknya. Masuk 06:45 dan masuk 14:11 dibayar sama persis, dulu dan sekarang.
 *
 * Mencari rumput juga tidak menambah upah. Pemilik menetapkannya begitu: yang
 * dibutuhkan hanyalah keterangan kenapa jam masuknya lain, bukan perhitungan
 * baru. Maka yang dikerjakan di sini hanya satu — **mencatat alasannya**, dan
 * untuk alasan yang berupa pekerjaan, menuntut fotonya.
 *
 * Yang dicatat tetap apa adanya: jam 08:07 tidak diubah jadi 07:00. Menit
 * terlambatnya tetap tersimpan. Yang bertambah hanyalah keterangan di
 * sebelahnya, supaya angka itu bisa dibaca.
 */

import { keMenit, SHIFT_BAWAAN } from "@/lib/weeklySalaryUtils";

/**
 * Batas menit sebelum aplikasi menanyakan alasan.
 *
 * Disetel pemilik ke satu jam penuh. Di data yang ada, ambang ini mengenai 21
 * dari 117 hari (18%) — cukup longgar untuk tidak menginterogasi orang yang
 * telat lima menit, cukup ketat untuk menangkap seluruh rutinitas jam delapan
 * dan ketiga hari ekstrem itu.
 */
export const AMBANG_ALASAN_MENIT = 60;

/**
 * Daftar alasan yang bisa dipilih.
 *
 * `kerja` menandai alasan yang berupa PEKERJAAN, bukan kelalaian. Penanda ini
 * tidak menyentuh rupiah mana pun — ia hanya menentukan bagaimana barisnya
 * dibaca manusia di layar tim dan laporan HR.
 *
 * `butuhFoto` mewajibkan bukti. Hanya "cari rumput" yang memakainya: itu
 * permintaan pemilik, dan masuk akal — rumput adalah barang yang bisa
 * difoto, sementara "ban bocor" tidak.
 */
export const ALASAN_TERLAMBAT = [
  {
    nilai: "cari_rumput",
    label: "Cari rumput / sayur",
    keterangan: "Mengambil pakan dulu sebelum ke kandang",
    kerja: true,
    butuhFoto: true,
    butuhCatatan: false,
  },
  {
    nilai: "tugas_luar",
    label: "Tugas luar lain",
    keterangan: "Beli obat, ke pasar, antar kura, urusan di luar kandang",
    kerja: true,
    butuhFoto: false,
    butuhCatatan: true,
  },
  {
    nilai: "terlambat",
    label: "Terlambat",
    keterangan: "Tulis sendiri apa sebabnya",
    kerja: false,
    butuhFoto: false,
    butuhCatatan: true,
  },
];

/** Cari satu alasan dari daftarnya; null bila nilainya tidak dikenal. */
export function cariAlasan(nilai) {
  return ALASAN_TERLAMBAT.find((a) => a.nilai === nilai) || null;
}

/**
 * Berapa menit setelah jam mulai shift.
 *
 * Mengembalikan 0 bila datang tepat waktu atau lebih awal — bukan angka
 * negatif. Datang lebih pagi bukan "terlambat minus", dan menyimpannya sebagai
 * bilangan negatif hanya akan membuat penjumlahan di laporan jadi aneh.
 *
 * `null` berarti tidak bisa dihitung (jamnya tidak terbaca), dan itu berbeda
 * dari nol. Yang tidak diketahui tidak boleh menyamar jadi tepat waktu.
 */
export function menitTerlambat(jamMasuk, jamMulaiShift = SHIFT_BAWAAN.mulai) {
  const masuk = keMenit(jamMasuk);
  const mulai = keMenit(jamMulaiShift) ?? keMenit(SHIFT_BAWAAN.mulai);
  if (masuk === null || mulai === null) return null;
  return Math.max(0, masuk - mulai);
}

/** Apakah jam masuk ini sudah melewati ambang sehingga alasannya ditanyakan? */
export function perluAlasan(jamMasuk, jamMulaiShift = SHIFT_BAWAAN.mulai) {
  const menit = menitTerlambat(jamMasuk, jamMulaiShift);
  return menit !== null && menit > AMBANG_ALASAN_MENIT;
}

/**
 * Apakah isian alasannya sudah lengkap?
 *
 * Mengembalikan `{ sah, kurang }`, dengan `kurang` berisi kalimat yang bisa
 * langsung ditampilkan. Dipakai bersama oleh tombol simpan (untuk menonaktifkan
 * dirinya) dan oleh penyimpan (untuk menolak) — supaya keduanya tidak pernah
 * berbeda pendapat soal apa yang dianggap lengkap.
 */
export function periksaIsianAlasan({ alasan, catatan, fotoUrl }) {
  const a = cariAlasan(alasan);
  if (!a) return { sah: false, kurang: "Pilih dulu alasannya." };
  if (a.butuhFoto && !fotoUrl) {
    return { sah: false, kurang: "Foto wajib untuk alasan ini." };
  }
  if (a.butuhCatatan && !String(catatan || "").trim()) {
    return { sah: false, kurang: "Tulis dulu keterangannya." };
  }
  return { sah: true, kurang: "" };
}

/**
 * Bacaan satu baris absensi, untuk ditampilkan.
 *
 * Satu-satunya tempat yang boleh memutuskan bagaimana sebuah jam masuk dibaca.
 * Layar HR, layar tim, dan ringkasan mana pun memanggil ini — bukan menghitung
 * sendiri — supaya tiga layar tidak pernah menyebut hari yang sama dengan tiga
 * sebutan berbeda.
 *
 *   tingkat "tepat"        — datang sebelum atau pada jam shift
 *   tingkat "telat_ringan" — terlambat, tapi belum melewati ambang
 *   tingkat "kerja_lain"   — terlambat, alasannya pekerjaan
 *   tingkat "telat"        — terlambat melewati ambang, bukan pekerjaan
 *   tingkat "tanpa_alasan" — terlambat melewati ambang, alasannya tidak terisi
 *
 * "tanpa_alasan" akan muncul pada seluruh baris LAMA, dan memang seharusnya
 * begitu: aplikasi tidak pernah menanyakannya, jadi tidak ada yang bisa
 * dipura-purakan sekarang.
 */
export function bacaKeterlambatan(att, jamMulaiShiftBawaan = SHIFT_BAWAAN.mulai) {
  const mulai = att?.shift_start || jamMulaiShiftBawaan;
  const menit = menitTerlambat(att?.check_in, mulai);

  if (menit === null) {
    return { menit: null, tingkat: "tidak_diketahui", label: "", alasan: null, kerja: false };
  }
  if (menit === 0) {
    return { menit: 0, tingkat: "tepat", label: "Tepat waktu", alasan: null, kerja: false };
  }

  const a = cariAlasan(att?.late_reason);
  const lewatAmbang = menit > AMBANG_ALASAN_MENIT;

  if (!lewatAmbang) {
    return { menit, tingkat: "telat_ringan", label: `+${menit} mnt`, alasan: a, kerja: !!a?.kerja };
  }
  if (!a) {
    return { menit, tingkat: "tanpa_alasan", label: `+${menit} mnt`, alasan: null, kerja: false };
  }
  return {
    menit,
    tingkat: a.kerja ? "kerja_lain" : "telat",
    label: a.label,
    alasan: a,
    kerja: !!a.kerja,
  };
}

/** Kalimat pendek "1j 7m" untuk menit terlambat; "" bila tidak ada. */
export function tulisDurasi(menit) {
  if (!menit || menit <= 0) return "";
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  if (j === 0) return `${m} mnt`;
  if (m === 0) return `${j} jam`;
  return `${j}j ${m}m`;
}
