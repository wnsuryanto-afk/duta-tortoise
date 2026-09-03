/**
 * hitungGaji.js — SUMBER TUNGGAL perhitungan gaji bulanan.
 *
 * Sebelumnya gaji bulanan dihitung di dua tempat dengan rumus yang berbeda:
 *
 *   - Halaman "Hitung Gaji" — hanya menampilkan, tidak pernah menulis apa pun.
 *   - Halaman "Rekap Poin & Gaji" — yang benar-benar menerbitkan slip.
 *
 * Keduanya untuk periode dan orang yang sama, tapi berselisih dalam tiga hal,
 * sehingga angka yang dilihat pemilik di layar "Hitung Gaji" bukan angka yang
 * akhirnya dibayarkan:
 *
 *   1. Poin bonus (BonusReward) dihitung penerbit slip, tidak dihitung pratinjau.
 *   2. Potongan absen: pratinjau menganggap SETIAP hari dalam bulan yang tidak
 *      ada catatan hadirnya sebagai absen — di bulan yang absensinya tidak
 *      diisi tiap hari, ini memotong sangat besar. Penerbit slip hanya
 *      menghitung hari yang memang tercatat mangkir, dan tidak menghitung izin
 *      maupun sakit.
 *   3. Uang sayur: penerbit slip membatasinya pada peran harian; pratinjau
 *      memberikannya ke siapa pun yang punya catatan trip.
 *
 * Pemeriksaan kasbon ganda sudah ada di kedua tempat dan tidak berbeda.
 *
 * Rumus di bawah mengikuti PENERBIT SLIP, karena itulah yang benar-benar
 * membayar. Menyamakan pratinjau ke penerbit membuat angkanya jujur tanpa
 * mengubah gaji siapa pun.
 *
 * Slip MINGGUAN punya aturannya sendiri (tanpa potongan absen) dan sengaja
 * tidak disatukan ke sini — periodenya beda, dan mengubahnya berarti mengubah
 * gaji yang sudah berjalan.
 */

import { nilaiPerPoin } from "@/lib/nilaiPoin";
import { masukLaporan } from "@/lib/laporan";


/** Peran yang dibayar harian; sisanya dibayar bulanan flat. */
export const PERAN_HARIAN = ["keeper", "kepala_feeder"];

/**
 * Peran yang benar-benar menerima slip gaji dari aplikasi ini.
 *
 * Tiga layar menghitung gaji, dan sebelum daftar ini ada mereka memakai
 * definisi "karyawan" yang berbeda:
 *
 *   /salary dan /rekap-poin-gaji : ["keeper", "kepala_feeder"]  → 2 orang
 *   /payroll-gaji                : semua kecuali owner/investor/kicked
 *                                  → 4 orang, ikut admin dan manajer
 *
 * Hanya /rekap-poin-gaji yang benar-benar menerbitkan SalarySlip, dan ia hanya
 * mengenal dua peran itu. Jadi /payroll-gaji — layar yang justru bernama
 * "Penggajian Karyawan" — menampilkan baris gaji untuk orang yang tidak akan
 * pernah menerima slip.
 *
 * Dampaknya bukan sekadar baris nyasar. Admin dan manajer bukan peran harian,
 * jadi gaji pokoknya dihitung FLAT tanpa memandang kehadiran (lihat gajiPokok
 * di bawah). Akun admin "duta tortoise" punya base_salary Rp 250.000 dan nol
 * catatan kehadiran — sehingga total penggajian di layar itu lebih besar
 * Rp 250.000 setiap bulan daripada yang benar-benar dibayarkan.
 *
 * Daftar ini disetel mengikuti KENYATAAN hari ini (siapa yang bisa dapat
 * slip), bukan siapa yang punya SalaryConfig. Bila kelak admin atau manajer
 * memang digaji lewat aplikasi ini, yang harus diubah adalah penerbit slipnya
 * lebih dulu — bukan daftar ini sendirian, karena itu hanya memindahkan
 * selisihnya ke tempat lain.
 */
export const PERAN_BERGAJI = ["keeper", "kepala_feeder"];

/** Karyawan yang perhitungan gajinya berarti — dipakai ketiga layar gaji. */
export function karyawanBergaji(users = []) {
  return (users || []).filter((u) => u && PERAN_BERGAJI.includes(u.role));
}

/** Nilai poin bawaan untuk peran harian bila konfigurasi belum diisi. */
export const NILAI_POIN_BAWAAN = 200;

/** Potongan kasbon bawaan per periode bila kasbon tidak menentukan sendiri. */
export const POTONGAN_KASBON_BAWAAN = 100000;

export function adalahPeranHarian(role) {
  return PERAN_HARIAN.includes(role);
}

/**
 * Poin seorang karyawan pada satu periode.
 *
 * Checklist yang ditolak tidak dihitung. Poin yang sudah disetujui menang atas
 * poin yang baru diklaim; bila keduanya kosong, poin dijumlahkan dari tugas
 * yang tercentang.
 */
export function hitungPoin({ checklists = [], bonusRewards = [], email, awal, akhir, periode }) {
  const dariChecklist = checklists
    .filter((c) => c.employee_email === email && c.date >= awal && c.date < akhir)
    // Checklist Mode Uji dan checklist yang dikecualikan pemilik tidak dibayar.
    // Tanpa saringan ini, mencoba aplikasi sebagai keeper menaikkan gaji orang
    // yang perannya sedang ditiru, dan tombol "Kecualikan dari laporan" tidak
    // berpengaruh apa pun pada uang yang keluar.
    .filter(masukLaporan)
    .filter((c) => c.status !== "rejected")
    .reduce((total, c) => {
      const poin =
        c.approved_points ||
        c.total_points_claimed ||
        (Array.isArray(c.completed_tasks)
          ? c.completed_tasks.reduce((t, x) => t + (x.points || 0), 0)
          : 0);
      return total + (poin || 0);
    }, 0);

  const bonus = bonusRewards.find((b) => b.employee_email === email && b.period === periode);
  const dariBonus = bonus?.total_points || 0;

  return { dariChecklist, dariBonus, total: dariChecklist + dariBonus };
}

/**
 * Potongan kasbon untuk satu periode.
 *
 * Kasbon yang potongannya sudah tercatat untuk periode ini dilewati — tanpa
 * pemeriksaan ini, membuka layar gaji dua kali bisa memotong dua kali.
 */
export function hitungKasbon({ kasbons = [], email, periode }) {
  let potongan = 0;
  let sisa = 0;
  const idDipotong = [];

  kasbons
    .filter((k) => k.employee_email === email && k.status === "approved")
    .forEach((k) => {
      const sisaKasbon = (k.amount || 0) - (k.total_paid || 0);
      if (sisaKasbon <= 0) return;

      const sudahDipotong = (k.deduction_log || []).some(
        (d) => d.salary_period === periode && d.salary_slip_id
      );
      if (sudahDipotong) {
        sisa += sisaKasbon;
        return;
      }

      const kali = Math.min(k.weekly_deduction || POTONGAN_KASBON_BAWAAN, sisaKasbon);
      potongan += kali;
      idDipotong.push(k.id);
      sisa += sisaKasbon - kali;
    });

  return { potongan, sisa, idDipotong };
}

/**
 * Hitung gaji satu karyawan untuk satu periode bulanan.
 *
 * @param {object} karyawan  { email, role }
 * @param {object} sumber    seluruh data mentah yang dibutuhkan
 * @returns {object} rincian lengkap — setiap komponen dikembalikan terpisah
 *   supaya layar bisa menjelaskan angkanya, bukan hanya menampilkan totalnya.
 */
export function hitungGajiKaryawan(karyawan, sumber) {
  const {
    salaryConfigs = [],
    checklists = [],
    bonusRewards = [],
    attendances = [],
    overtimeLogs = [],
    vegTripsMap = {},
    kasbons = [],
    periode,
    awal,
    akhir,
    targetPoin = 0,
    companySettings = null,
  } = sumber;

  const email = karyawan.email;
  const config = salaryConfigs.find((c) => c.role === karyawan.role) || {};
  const harian = adalahPeranHarian(karyawan.role);

  // SATU DEFINISI — lihat lib/nilaiPoin.js. Sebelumnya berkas ini
  // mendahulukan SalaryConfig.point_value sementara layar kiper dan penyiapan
  // slip otomatis mendahulukan CompanySettings.nilai_per_poin, sehingga slip
  // gaji bisa memakai tarif yang berbeda dari yang dijanjikan di layar.
  const nilaiPoin =
    nilaiPerPoin(companySettings, config) || (harian ? NILAI_POIN_BAWAAN : 0);

  // ── Poin ──
  const poin = hitungPoin({ checklists, bonusRewards, email, awal, akhir, periode });
  // Sakelar "bonus poin dibayar sebagai uang" (CompanySettings.poin_bonus_enabled)
  // BAWAANNYA MATI, dan itu disengaja: poin tetap dicatat sebagai pencapaian
  // tetapi tidak dibayar sampai pemilik menyalakannya.
  //
  // Berkas ini dulu tidak memeriksanya sama sekali, sementara Rekap Poin & Gaji
  // dan slip mingguan memeriksanya. Akibatnya slip untuk orang dan periode yang
  // sama membayar bonus poin atau tidak, tergantung layar mana yang dipakai
  // membuatnya - dan tidak ada satu pun tanda bahwa itu terjadi.
  const bonusPoinDibayar = companySettings?.poin_bonus_enabled === true;
  const bonusPoin = bonusPoinDibayar ? poin.total * nilaiPoin : 0;

  // ── Kehadiran ──
  const absensi = attendances.filter(
    (a) => a.employee_email === email && a.date >= awal && a.date < akhir
  );
  const hariHadir = absensi.filter((a) => a.status === "hadir").length;
  // Izin dan sakit bukan mangkir, jadi tidak ikut dipotong. Hari yang sama
  // sekali tidak punya catatan juga tidak dihitung absen — ketiadaan catatan
  // berarti belum diisi, bukan berarti orangnya tidak masuk.
  const hariAbsen = absensi.filter(
    (a) => a.status !== "hadir" && a.status !== "izin" && a.status !== "sakit" && a.status !== "libur"
  ).length;
  const hariLibur = absensi.filter((a) => a.status === "libur").length;

  /*
    Hari dalam periode yang TIDAK punya catatan absensi sama sekali.

    Ini bukan hari libur dan bukan mangkir — ini lubang data. Gaji dihitung
    dari hari masuk, jadi setiap hari tanpa catatan diam-diam mengurangi gaji
    Rp 70.000 tanpa ada yang pernah memutuskannya. Pada Agustus 2026 ada enam
    hari seperti itu pada Angsolo (Rp 420.000) dan empat pada Sholehuddin.

    Angkanya dikembalikan supaya layar gaji bisa MENANYAKANNYA sebelum slip
    terbit, bukan supaya aplikasi menebak sendiri isinya.
  */
  const tanggalTercatat = new Set(absensi.map((a) => a.date));
  const hariTanpaCatatan = [];
  {
    const d = new Date(awal);
    const batas = new Date(akhir);
    const hariIni = new Date();
    while (d < batas && d <= hariIni) {
      const teks = d.toISOString().split("T")[0];
      if (!tanggalTercatat.has(teks)) hariTanpaCatatan.push(teks);
      d.setDate(d.getDate() + 1);
    }
  }

  // ── Komponen gaji ──
  const gajiPokok = harian ? hariHadir * (config.base_salary || 0) : config.base_salary || 0;
  const potonganAbsen = harian ? 0 : hariAbsen * (config.absent_deduction || 0);

  const jamLembur = overtimeLogs
    .filter((o) => o.employee_email === email && o.date >= awal && o.date < akhir)
    .reduce((t, o) => t + (o.hours || 0), 0);
  const upahLembur = jamLembur * (config.overtime_rate_per_hour || 0);

  const sayur = vegTripsMap[email] || { trips: 0, dates: [] };
  // Uang sayur hanya untuk peran harian — merekalah yang menjemput sayur.
  const tripSayur = harian ? sayur.trips || 0 : 0;
  const upahSayur = tripSayur * (config.vegetable_rate_per_trip || 0);

  const kasbon = hitungKasbon({ kasbons, email, periode });

  const kotor = gajiPokok + bonusPoin + upahLembur + upahSayur;
  const potongan = potonganAbsen + kasbon.potongan;
  const bersih = kotor - potongan;

  return {
    karyawan,
    config,
    harian,
    nilaiPoin,

    poinChecklist: poin.dariChecklist,
    poinBonus: poin.dariBonus,
    totalPoin: poin.total,
    targetPoin,
    targetTercapai: poin.total >= targetPoin,
    selisihPoin: Math.abs(poin.total - targetPoin),
    bonusPoin,

    hariHadir,
    hariAbsen,
    hariLibur,
    hariTanpaCatatan,
    gajiPokok,
    potonganAbsen,

    jamLembur,
    upahLembur,

    tripSayur,
    tanggalSayur: sayur.dates || [],
    upahSayur,

    potonganKasbon: kasbon.potongan,
    sisaKasbon: kasbon.sisa,
    idKasbonDipotong: kasbon.idDipotong,

    kotor,
    potongan,
    bersih,
  };
}

/** Hitung seluruh karyawan sekaligus, terurut dari gaji bersih terbesar. */
export function hitungGajiSemua(karyawanList = [], sumber) {
  return karyawanList
    .map((k) => hitungGajiKaryawan(k, sumber))
    .sort((a, b) => b.bersih - a.bersih);
}
