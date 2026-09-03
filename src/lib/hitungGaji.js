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


/*
  ATURAN GAJI YANG BERLAKU (keputusan Iwan, 01-09-2026):

  1. Periode BULANAN, mulai tanggal 1. Tarif Rp 70.000 per hari MASUK.
     Tidak ada plafon: masuk 31 hari dibayar 31 hari. "Jatah 2 hari libur"
     karena itu bukan aturan gaji — hari libur memang tidak dibayar, hari
     pertama maupun hari kelima. Yang berubah cuma satu: hari libur sekarang
     PUNYA CATATAN, supaya hari tanpa catatan berarti absensi belum diisi.
  2. Poin dibayar Rp 75 per poin (CompanySettings "main", sudah menyala).
  3. Lembur Rp 10.000 per jam, dari catatan lembur manual.
  4. Kasbon dibatasi gaji yang sudah dijalani — lihat batasKasbon() di bawah.
  5. Trip ambil sayur di pasar Rp 30.000 sekali jalan. Sumbernya catatan Pakan
     Harian bersumber "sayur_pasar" atau "campur" — lihat hooks/useVegTrips.js.
     PERINGATAN: sampai 03-09-2026 seluruh aplikasi cuma punya SATU catatan
     pakan (27 Juli, sumber rumput), jadi aturan ini hidup tetapi belum pernah
     membayar sepeser pun. Bukan kode yang salah — formulirnya tidak diisi.
  6. Pekan Senin–Minggu yang tujuh harinya hadir penuh dibayar tambahan satu
     hari kerja — lihat pekanPenuhHadir() di bawah. Definisi tujuh hari dipilih
     Iwan 03-09-2026 setelah diberi tahu konsekuensinya: memakai jatah libur
     menghanguskan bonus pekan itu.

  Slip MINGGUAN adalah sistem lama dan masih hidup berdampingan
  (period_type "weekly", otomatisasi A5 siapkanSlipMingguan). Selama keduanya
  aktif, satu periode bisa dibayar dua kali.
*/

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
 * Berapa pekan PENUH (Senin s/d Minggu, tujuh hari, semuanya hadir) yang
 * dijalani seorang karyawan dalam satu periode.
 *
 * Aturannya keputusan Iwan 03-09-2026: satu pekan penuh dibayar tambahan satu
 * hari kerja. Definisi tujuh harinya dipilih sadar konsekuensinya — memakai
 * jatah libur menghanguskan bonus pekan itu.
 *
 * PEKAN YANG TERPOTONG UJUNG BULAN TIDAK DIHITUNG. Agustus 2026 dimulai hari
 * Sabtu dan berakhir hari Senin, jadi 1–2 Agustus dan 31 Agustus tidak pernah
 * bisa menjadi pekan penuh di dalam periodenya sendiri. Menghitungnya separuh
 * berarti membayar bonus untuk pekan yang belum tentu penuh; menghitungnya
 * lintas bulan berarti satu pekan bisa dibayar di dua slip. Keduanya lebih
 * buruk daripada mengabaikannya — tetapi ini memang merugikan karyawan pada
 * bulan yang ujungnya terpotong, dan itu perlu diketahui, bukan disembunyikan.
 *
 * @param {Array} absensi catatan Attendance milik SATU orang dalam periode
 * @param {string} awal   tanggal awal periode, "YYYY-MM-DD"
 * @param {string} akhir  batas akhir EKSKLUSIF, "YYYY-MM-DD"
 * @returns {{ jumlah: number, pekan: string[] }} pekan = daftar "YYYY-MM-DD s/d YYYY-MM-DD"
 */
export function pekanPenuhHadir(absensi = [], awal, akhir) {
  const hadir = new Set(
    (absensi || []).filter((a) => a && a.status === "hadir").map((a) => a.date)
  );

  const teks = (d) => d.toISOString().split("T")[0];
  const kelompok = new Map();

  const d = new Date(awal + "T00:00:00Z");
  const batas = new Date(akhir + "T00:00:00Z");
  while (d < batas) {
    // Senin = awal pekan. getUTCDay(): 0 Minggu ... 6 Sabtu.
    const geser = (d.getUTCDay() + 6) % 7;
    const senin = new Date(d.getTime());
    senin.setUTCDate(senin.getUTCDate() - geser);
    const kunci = teks(senin);
    if (!kelompok.has(kunci)) kelompok.set(kunci, []);
    kelompok.get(kunci).push(teks(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }

  const pekan = [];
  for (const [kunci, hari] of kelompok) {
    if (hari.length !== 7) continue;
    if (hari.every((x) => hadir.has(x))) pekan.push(`${kunci} s/d ${hari[6]}`);
  }
  return { jumlah: pekan.length, pekan };
}

/**
 * Batas nominal kasbon yang boleh diajukan seorang karyawan hari ini.
 *
 * Aturannya (keputusan Iwan 01-09-2026): kasbon tidak boleh melebihi GAJI YANG
 * SUDAH DIJALANI — hari masuk sejak tanggal 1 sampai hari pengajuan, dikali
 * tarif hariannya — dikurangi kasbon lain yang belum lunas.
 *
 * Kenapa dibatasi di hari yang sudah dikerjakan, bukan perkiraan sebulan
 * penuh: kalau orangnya berhenti di tengah bulan, selisihnya ditanggung farm
 * dan praktis tidak akan kembali. Batas ini membuat farm tidak pernah
 * menalangi uang untuk pekerjaan yang belum terjadi.
 *
 * Sampai hari ini formulir kasbon tidak punya batas apa pun — hanya memeriksa
 * nominal lebih besar dari nol.
 *
 * @returns {{ batas, gajiBerjalan, hariHadir, kasbonBerjalan, tarifHarian }}
 *   batas bisa 0 (belum ada hari masuk, atau kasbon berjalan sudah menutupi
 *   seluruh gaji yang dijalani).
 */
export function batasKasbon({ attendances = [], kasbons = [], email, config = {}, awal, sampai }) {
  const tarifHarian = Number(config.base_salary) || 0;

  const hariHadir = attendances.filter(
    (a) => a.employee_email === email && a.status === "hadir" && a.date >= awal && a.date <= sampai
  ).length;

  const gajiBerjalan = hariHadir * tarifHarian;

  const kasbonBerjalan = kasbons
    .filter((k) => k.employee_email === email && k.status === "approved")
    .reduce((t, k) => t + Math.max(0, (k.amount || 0) - (k.total_paid || 0)), 0);

  return {
    tarifHarian,
    hariHadir,
    gajiBerjalan,
    kasbonBerjalan,
    batas: Math.max(0, gajiBerjalan - kasbonBerjalan),
  };
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

  // Bonus pekan penuh: satu hari kerja tambahan per pekan Senin-Minggu yang
  // seluruh tujuh harinya hadir. Hanya untuk peran harian - peran bulanan
  // dibayar flat, jadi "satu hari tambahan" tidak punya arti di sana.
  const pekanPenuh = harian ? pekanPenuhHadir(absensi, awal, akhir) : { jumlah: 0, pekan: [] };
  const bonusPekanPenuh = harian ? pekanPenuh.jumlah * (config.base_salary || 0) : 0;
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

  const kotor = gajiPokok + bonusPekanPenuh + bonusPoin + upahLembur + upahSayur;
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
    pekanPenuh: pekanPenuh.jumlah,
    daftarPekanPenuh: pekanPenuh.pekan,
    bonusPekanPenuh,
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
