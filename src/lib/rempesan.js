/**
 * rempesan.js — menyambungkan "ambil rumput" yang TERCATAT dengan yang DIBAYAR.
 *
 * ── Keadaan sebelum berkas ini ada ──────────────────────────────────────────
 *
 * Rempesan punya perangkat yang lengkap: entitas `RempesanLog` dengan alur
 * persetujuan tiga status, halaman untuk mencatat dan menyetujui, tarif per
 * trip, penanda `slip_id` supaya satu trip tidak masuk dua slip, dan pengambil
 * di slip mingguan yang sudah membuang trip kembar per tanggal.
 *
 * Isinya **nol catatan**. Bukan sedikit — nol.
 *
 * Sementara itu, dari 117 baris absensi, jam masuk Angsolo menumpuk rapat di
 * 08:01–08:14 sebanyak sebelas hari. Pekerjaannya dikerjakan; yang tidak ada
 * adalah catatannya. Sejak tombol check-in menanyakan alasan (lihat
 * lib/keterlambatan.js), hari-hari itu meninggalkan jejak yang bisa dipegang:
 * satu baris absensi dengan `late_reason: "cari_rumput"` dan fotonya.
 *
 * Berkas ini memakai jejak itu untuk menutup jaraknya.
 *
 * ── Yang TIDAK dilakukan di sini ────────────────────────────────────────────
 *
 * Tidak ada RempesanLog yang dibuat otomatis dari absensi, dan itu disengaja.
 * `RempesanLog` mewajibkan `weight_kg`, dan fotonya seharusnya foto TIMBANGAN.
 * Saat check-in, yang ada di tangan orangnya baru foto rumputnya — beratnya
 * belum tentu sudah ditimbang. Membuat baris otomatis berarti menciptakan
 * catatan berberat nol atau berberat karangan, lalu mengalirkannya ke slip
 * gaji. Jejaknya dipakai untuk MENGAJAK mencatat, bukan untuk mencatatkan
 * sendiri hal yang tidak diketahui.
 *
 * Uangnya pun tidak berpindah di sini. Trip baru bernilai rupiah setelah
 * pemilik menyetujuinya di halaman Rempesan — persis seperti sebelumnya.
 *
 * ── Satu hal yang perlu diketahui tentang tarifnya ──────────────────────────
 *
 * `rempesan_rate_per_trip` **kosong di keempat baris SalaryConfig**. Angka
 * Rp 30.000 yang tampil di mana-mana berasal dari nilai cadangan yang ditulis
 * di dalam kode (`?? 30000`), bukan dari setelan yang pernah disimpan pemilik.
 *
 * Yang tersimpan justru kolom jalur lama, `vegetable_rate_per_trip` — berisi
 * Rp 30.000 pada keeper dan kepala_feeder. Karena itu `tarifTrip` memakainya
 * sebagai cadangan kedua sebelum jatuh ke angka mati: kebetulan nilainya sama,
 * tetapi yang satu keputusan pemilik dan yang satu tebakan pemrogram, dan
 * keduanya tidak boleh diperlakukan sama.
 */

/** Alasan absensi yang berarti "orang ini sedang mengambil pakan". */
export const ALASAN_RUMPUT = "cari_rumput";

/** Tarif cadangan bila SalaryConfig belum menyimpan tarifnya. */
export const TARIF_TRIP_BAWAAN = 30000;

/** Satu trip per orang per hari — aturan yang sama dipakai slip mingguan. */
export const MAKS_TRIP_PER_HARI = 1;

/**
 * Tarif satu trip untuk sebuah konfigurasi peran.
 *
 * Mengembalikan `{ tarif, dariSetelan, sumber }`. `dariSetelan` false berarti
 * angkanya cadangan dari kode — pemanggil boleh mengatakannya apa adanya
 * alih-alih menampilkannya seolah-olah itu keputusan pemilik.
 *
 * `vegetable_rate_per_trip` dipakai sebagai cadangan KEDUA, sebelum angka
 * mati di kode. Itu tarif jalur lama, dan di data yang ada ia BERISI
 * (Rp 30.000 pada keeper dan kepala_feeder) sementara
 * `rempesan_rate_per_trip` kosong. Memakainya lebih setia pada keputusan
 * pemilik daripada jatuh ke angka yang ditulis pemrogram.
 */
export function tarifTrip(config) {
  const baru = config?.rempesan_rate_per_trip;
  if (typeof baru === "number" && baru >= 0) {
    return { tarif: baru, dariSetelan: true, sumber: "rempesan" };
  }
  const lama = config?.vegetable_rate_per_trip;
  if (typeof lama === "number" && lama > 0) {
    return { tarif: lama, dariSetelan: true, sumber: "sayur_lama" };
  }
  return { tarif: TARIF_TRIP_BAWAAN, dariSetelan: false, sumber: "bawaan" };
}

/** Catatan yang masih "hidup" — ditolak tidak menghalangi pencatatan ulang. */
function hidup(log) {
  return log && log.status !== "rejected";
}

/**
 * Apakah orang ini sudah punya catatan rempesan pada tanggal ini?
 *
 * Dipakai oleh penjaga anti-dobel di formulir DAN oleh pencari hari yang
 * belum dicatat, supaya keduanya tidak pernah berbeda pendapat tentang apa
 * yang dianggap "sudah dicatat".
 */
export function sudahAdaRempesan(logs = [], email, tanggal) {
  if (!email || !tanggal) return false;
  return (logs || []).some(
    (l) => hidup(l) && l.employee_email === email && l.date === tanggal,
  );
}

/**
 * Hari-hari yang absensinya menyebut "cari rumput" tetapi rempesannya belum
 * pernah dicatat.
 *
 * Inilah sambungannya: satu daftar yang bisa ditunjukkan ke orangnya ("kamu
 * ambil rumput Senin, belum dicatat") dan ke pemilik ("tiga hari ada fotonya,
 * belum ada catatannya"). Tanpa daftar ini, jejak di absensi hanya tersimpan
 * dan tidak pernah menagih apa pun.
 *
 * Diurutkan dari yang terbaru — yang paling mungkin masih diingat beratnya.
 */
export function hariRumputBelumDicatat(attendances = [], logs = [], { email } = {}) {
  return (attendances || [])
    .filter((a) => a?.late_reason === ALASAN_RUMPUT)
    .filter((a) => !a.excluded_from_reports && !a.is_test_data)
    .filter((a) => (email ? a.employee_email === email : true))
    .filter((a) => !sudahAdaRempesan(logs, a.employee_email, a.date))
    .map((a) => ({
      id: a.id,
      email: a.employee_email,
      nama: a.employee_name || a.employee_email,
      tanggal: a.date,
      jamMasuk: a.check_in || "",
      fotoUrl: a.late_photo_url || "",
      catatan: a.late_note || "",
    }))
    .sort((x, y) => String(y.tanggal).localeCompare(String(x.tanggal)));
}

/**
 * Trip yang benar-benar bernilai upah: sudah disetujui, satu per tanggal.
 *
 * Bila satu tanggal terlanjur punya dua catatan disetujui, yang dipakai adalah
 * yang tercatat lebih dulu. Slip mingguan sudah membuang kembar dengan cara
 * yang sama; fungsi ini ada supaya LAYAR juga memakainya — sebelum ini halaman
 * Rempesan menampilkan "Nilai trip: Rp 30.000" pada tiap baris disetujui, jadi
 * dua baris di tanggal yang sama terbaca Rp 60.000 padahal slipnya membayar
 * Rp 30.000.
 */
export function tripSah(logs = []) {
  const perHari = new Map();
  for (const l of logs || []) {
    if (!l || l.status !== "approved" || !l.date || !l.employee_email) continue;
    const kunci = `${l.employee_email}|${l.date}`;
    const ada = perHari.get(kunci);
    if (!ada) { perHari.set(kunci, l); continue; }
    const lebihDulu =
      String(l.created_date || "").localeCompare(String(ada.created_date || "")) < 0;
    if (lebihDulu) perHari.set(kunci, l);
  }
  return [...perHari.values()];
}

/** Apakah baris ini kembar — disetujui, tapi bukan yang dipakai slip? */
export function tripKembar(log, logs = []) {
  if (!log || log.status !== "approved") return false;
  return !tripSah(logs).some((l) => l.id === log.id);
}

/**
 * Trip yang dibayar untuk satu orang pada satu rentang tanggal.
 *
 * SATU-SATUNYA tempat yang boleh menjawab "berapa trip yang dibayar". Sebelum
 * ini ada TIGA jawaban, masing-masing dari sumber yang berbeda:
 *
 *   1. `RempesanLog` disetujui           → slip MINGGUAN
 *   2. `PakanHarian` bersumber sayur     → pratinjau & penerbit BULANAN
 *   3. `VegetablePickup`                 → halaman "Hitung Gaji"
 *
 * Satu kejadian nyata yang sama — keeper pergi mengambil pakan — dibayar dari
 * tiga tempat yang tidak saling tahu, dengan dua kolom tarif yang berbeda
 * (`rempesan_rate_per_trip` dan `vegetable_rate_per_trip`). Berapa yang
 * diterima orangnya bergantung pada jenis slip mana yang kebetulan diterbitkan
 * pemilik bulan itu.
 *
 * Yang ketiga ditulis pemilik sendiri lewat dialog "Catat Sayur" di halaman
 * Payroll — pemilik mencatatkan trip atas nama karyawan, tanpa persetujuan,
 * karena ia sendiri yang menyetujui. Isinya nol, tetapi jalurnya hidup. Yang
 * membuatnya berbahaya: kolom `trips` boleh diisi lebih dari satu dan
 * dijumlahkan tanpa membuang tanggal kembar, sehingga ia bisa membayar dua
 * trip sehari padahal seluruh aplikasi lain sepakat maksimal satu.
 *
 * `RempesanLog` yang dipilih karena hanya ia yang punya persetujuan pemilik,
 * berat, dan foto. Skema SalarySlip pun sudah menandai `vegetable_pay`,
 * `vegetable_trips`, dan `vegetable_trip_dates` sebagai "(Legacy)" serta
 * menyediakan `rempesan_pay`/`rempesan_trips`/`rempesan_dates` — perpindahannya
 * memang sudah dimulai, hanya tidak pernah diselesaikan.
 *
 * Batas akhirnya HARUS disebut di tempat pemanggilan. Slip mingguan memakai
 * Minggu–Sabtu dengan kedua ujung ikut (`akhirInklusif`, bawaan), sedangkan
 * `hitungGaji` bulanan memakai `date < akhir`. Diam-diam menganggap keduanya
 * sama berarti satu trip di hari terakhir periode hilang atau terhitung dua
 * kali, dan itu persis jenis selisih yang tidak akan pernah ada yang melapor.
 */
export function tripPerPeriode(logs = [], email, awal, akhir, { akhirInklusif = true } = {}) {
  if (!email || !awal || !akhir) return { trips: 0, tanggal: [] };
  const tanggal = tripSah(logs)
    .filter((l) => l.employee_email === email)
    .filter((l) => l.date >= awal && (akhirInklusif ? l.date <= akhir : l.date < akhir))
    .map((l) => l.date)
    .sort();
  return { trips: tanggal.length, tanggal };
}

/**
 * Hari yang menurut catatan PAKAN dipakai mengambil sayur/rumput, tetapi
 * rempesannya belum pernah dicatat.
 *
 * Dipakai bersama `hariRumputBelumDicatat`. Sejak upah trip hanya dibayar dari
 * `RempesanLog`, hari yang cuma tercatat di `PakanHarian` tidak lagi
 * menghasilkan uang — jadi ia harus DITAGIH, bukan dibiarkan hilang diam-diam.
 * Itu bedanya merapikan dengan memotong.
 */
export const SUMBER_PAKAN_TRIP = ["sayur_pasar", "campur"];

export function hariPakanBelumDicatat(pakanHarian = [], logs = [], { email } = {}) {
  const terlihat = new Set();
  return (pakanHarian || [])
    .filter((p) => SUMBER_PAKAN_TRIP.includes(p?.feed_source))
    .filter((p) => p.recorded_by_email && p.log_date && p.log_date !== "null")
    .filter((p) => (email ? p.recorded_by_email === email : true))
    .filter((p) => !sudahAdaRempesan(logs, p.recorded_by_email, p.log_date))
    .filter((p) => {
      // Satu hari hanya ditagih sekali meski pakannya dicatat beberapa kali.
      const kunci = `${p.recorded_by_email}|${p.log_date}`;
      if (terlihat.has(kunci)) return false;
      terlihat.add(kunci);
      return true;
    })
    .map((p) => ({
      id: `pakan-${p.id}`,
      email: p.recorded_by_email,
      nama: p.recorded_by_name || p.recorded_by_email,
      tanggal: p.log_date,
      jamMasuk: "",
      fotoUrl: "",
      catatan: p.notes || "dari catatan Pakan Harian",
      dariPakan: true,
    }))
    .sort((x, y) => String(y.tanggal).localeCompare(String(x.tanggal)));
}
