/**
 * potonganKasbon.js — satu pintu untuk mencatat cicilan kasbon.
 *
 * Sebelum berkas ini ada, TIGA tempat menaikkan `total_paid` dan tidak satu
 * pun sepakat apa yang harus ikut ditulis:
 *
 *   RekapPoinGajiPage "Buat slip"      total_paid ✓  deduction_log ✓
 *   RekapPoinGajiPage "Buat semua"     total_paid ✓  deduction_log ✓
 *   PayrollPage "Potong"               total_paid ✓  deduction_log ✗
 *
 * Potongan yang dilakukan dari halaman Payroll karena itu menaikkan angka
 * terbayar tanpa meninggalkan satu baris pun di riwayat. Akibatnya sudah ada
 * di data: kasbon Ahmad Ali 11 Agustus 2026 tercatat `total_paid` Rp 300.000
 * sementara jumlah seluruh `deduction_log` hanya Rp 200.000 — Rp 100.000 utang
 * seorang karyawan yang tidak bisa dipastikan sudah dipotong atau belum.
 *
 * Dan komentar di RekapPoinGajiPage berbunyi "anti-dobel via salary_slip_id",
 * padahal pemeriksaan itu tidak pernah ada di kodenya. Membuat ulang slip
 * bulan yang sama — yang memang didukung tombolnya — memotong kasbonnya lagi.
 *
 * Aturan di sini:
 *   1. `deduction_log` adalah buku yang sah. `total_paid` hanya ringkasannya.
 *   2. Satu slip gaji hanya boleh memotong sekali.
 *   3. Membatalkan slip mengembalikan potongannya.
 */

/** Jumlah seluruh potongan yang tercatat di riwayat. */
export function jumlahDariRiwayat(kasbon) {
  return (kasbon?.deduction_log || []).reduce((t, d) => t + (Number(d?.amount) || 0), 0);
}

/**
 * Selisih antara ringkasan dan riwayat.
 *
 * Bukan untuk diperbaiki diam-diam. Angka mana yang benar hanya bisa dijawab
 * orang yang menyerahkan uangnya — menebak berarti mengubah utang seseorang.
 *
 * @returns {number} 0 bila cocok; positif bila `total_paid` lebih besar dari
 *   riwayat (ada potongan yang tidak tercatat baris riwayatnya).
 */
export function selisihPencatatan(kasbon) {
  if (!kasbon) return 0;
  if ((kasbon.deduction_log || []).length === 0) return 0; // data lama, belum pernah pakai riwayat
  return (Number(kasbon.total_paid) || 0) - jumlahDariRiwayat(kasbon);
}

/** Sisa utang. Memakai angka terbesar di antara ringkasan dan riwayat —
 *  saat keduanya berselisih, yang aman bagi karyawan adalah menganggap
 *  potongannya SUDAH terjadi, bukan menagihnya dua kali. */
export function sisaKasbon(kasbon) {
  const terbayar = Math.max(Number(kasbon?.total_paid) || 0, jumlahDariRiwayat(kasbon));
  return Math.max(0, (Number(kasbon?.amount) || 0) - terbayar);
}

/** Apakah slip gaji ini sudah pernah memotong kasbon tersebut? */
export function sudahDipotongSlip(kasbon, salarySlipId) {
  if (!salarySlipId) return false;
  return (kasbon?.deduction_log || []).some((d) => d?.salary_slip_id === salarySlipId);
}

/**
 * Susun perubahan untuk satu potongan baru.
 *
 * @returns {object|null} patch untuk Kasbon.update, atau null bila tidak ada
 *   yang perlu dipotong (sudah lunas, atau slip ini sudah memotong).
 */
export function patchPotongan(kasbon, { jumlah, metode = "manual", salarySlipId = null, periode = null, tanggal, olehNama = "", catatan = null }) {
  if (!kasbon) return null;
  if (salarySlipId && sudahDipotongSlip(kasbon, salarySlipId)) return null;

  const sisa = sisaKasbon(kasbon);
  if (sisa <= 0) return null;

  const dipotong = Math.min(Number(jumlah) || 0, sisa);
  if (dipotong <= 0) return null;

  const riwayatBaru = [
    ...(kasbon.deduction_log || []),
    {
      amount: dipotong,
      date: tanggal || new Date().toISOString().split("T")[0],
      method: metode,
      salary_period: periode,
      salary_slip_id: salarySlipId,
      recorded_by: olehNama,
      notes: catatan,
    },
  ];

  // total_paid diturunkan dari riwayat, bukan ditambah sendiri. Selisih data
  // lama ikut terbawa lewat max() di sisaKasbon() agar tidak ada yang ditagih
  // dua kali, tapi angka barunya tidak pernah lagi lepas dari riwayatnya.
  const terbayarBaru = Math.max(Number(kasbon.total_paid) || 0, jumlahDariRiwayat({ deduction_log: riwayatBaru }));

  return {
    deduction_log: riwayatBaru,
    total_paid: terbayarBaru,
    status: terbayarBaru >= (Number(kasbon.amount) || 0) ? "lunas" : "approved",
  };
}

/**
 * Susun perubahan untuk MENGEMBALIKAN potongan sebuah slip yang dibatalkan.
 *
 * Slip gaji 27 Agustus 2026 milik Ahmad Ali dibatalkan tiga hari kemudian
 * dengan alasan "tidak boleh dibayar — akan terhitung dua kali". Potongan
 * kasbon Rp 100.000 yang menempel padanya tidak ikut dikembalikan, jadi
 * aplikasi mencatat cicilan dari gaji yang tidak pernah dibayarkan.
 *
 * @returns {object|null} patch, atau null bila slip itu memang tidak memotong.
 */
export function patchBatalkanPotonganSlip(kasbon, salarySlipId) {
  if (!kasbon || !salarySlipId || !sudahDipotongSlip(kasbon, salarySlipId)) return null;
  const riwayatBaru = (kasbon.deduction_log || []).filter((d) => d?.salary_slip_id !== salarySlipId);
  const dikembalikan = jumlahDariRiwayat(kasbon) - jumlahDariRiwayat({ deduction_log: riwayatBaru });
  const terbayarBaru = Math.max(0, (Number(kasbon.total_paid) || 0) - dikembalikan);
  return {
    deduction_log: riwayatBaru,
    total_paid: terbayarBaru,
    status: terbayarBaru >= (Number(kasbon.amount) || 0) ? "lunas" : "approved",
    _dikembalikan: dikembalikan,
  };
}
