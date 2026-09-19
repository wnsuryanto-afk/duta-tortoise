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
 * Selama kolomnya kosong, mengubah tarif lewat halaman pengaturan adalah
 * satu-satunya cara membuatnya berhenti menjadi tebakan kode.
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
 * Mengembalikan `{ tarif, dariSetelan }`. `dariSetelan` false berarti angkanya
 * cadangan dari kode — pemanggil boleh mengatakannya apa adanya alih-alih
 * menampilkannya seolah-olah itu keputusan pemilik.
 */
export function tarifTrip(config) {
  const t = config?.rempesan_rate_per_trip;
  if (typeof t === "number" && t >= 0) return { tarif: t, dariSetelan: true };
  return { tarif: TARIF_TRIP_BAWAAN, dariSetelan: false };
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
