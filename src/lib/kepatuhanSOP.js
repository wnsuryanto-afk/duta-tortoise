import { masukLaporan } from "./laporan";
/**
 * kepatuhanSOP.js — berapa persen tugas terjadwal yang benar-benar dikerjakan.
 *
 * Kenapa ukuran ini ada (B4):
 *
 * Target bonus dihitung dalam POIN ABSOLUT. Poin ikut bergeser setiap kali
 * peternakan berubah: tiga tugas berskala per-kandang dikalikan jumlah kandang,
 * jadi menambah satu kandang menaikkan poin semua orang tanpa mereka bekerja
 * lebih keras. Target yang ditetapkan hari ini pelan-pelan menjadi lebih mudah,
 * dan tidak ada yang menyadarinya.
 *
 * Persentase kebal terhadap itu: menambah kandang menaikkan pembilang DAN
 * penyebutnya sekaligus.
 *
 * ── Dua angka, bukan satu ──
 *
 * Godaan terbesar di sini adalah menggabungkan semuanya menjadi satu persen
 * yang terlihat rapi. Itu akan menyembunyikan tebakan: tugas per-kandang
 * dicatat dengan penanda tersendiri (`kebersihan_kandang_N2`), sedangkan tugas
 * harian biasa dicatat sebagai `sop_<id>`. Mencampur keduanya berarti menebak
 * pemetaan yang belum tentu benar.
 *
 * Jadi dikembalikan dua angka yang masing-masing benar:
 *   - kepatuhan tugas harian (pemetaannya pasti)
 *   - kandang yang dibersihkan dari total kandang (pemetaannya juga pasti)
 *
 * ── Ini ukuran TIM, bukan per orang ──
 *
 * Sebagian besar tugas berskala "bersama": sekali dikerjakan siapa pun,
 * selesai untuk semua. Membagi persentasenya per orang membuat angka seseorang
 * jatuh hanya karena rekannya lebih dulu mengerjakan — bukan karena ia lalai.
 * Karena itu kepatuhan dihitung untuk tim, dan penilaian perorangan tetap
 * memakai poin.
 */

/** Apakah task terjadwal pada tanggal tertentu? Aturan yang sama dengan daftar tugas. */
export function terjadwalPada(t, tanggal) {
  if (!t || t.is_active !== true) return false;

  const d = new Date(tanggal + "T00:00:00");
  const bulanAktif = Array.isArray(t.bulan_aktif) ? t.bulan_aktif : [];
  if (bulanAktif.length > 0 && !bulanAktif.includes(d.getMonth() + 1)) return false;

  if (t.frequency === "harian") return true;
  if (t.frequency === "mingguan") {
    const hari = Array.isArray(t.weekly_days) ? t.weekly_days : [];
    return hari.length === 0 || hari.includes(d.getDay());
  }
  if (t.frequency === "bulanan") {
    const tgl = Array.isArray(t.monthly_dates) ? t.monthly_dates : [];
    return tgl.includes(d.getDate());
  }
  return false;
}

/**
 * Tugas yang HARI ITU benar-benar dituntut dari tim.
 *
 * Tiga hal dikeluarkan, dan masing-masing punya alasan yang sudah dibayar
 * mahal sekali:
 *
 *   di_ubin_kandang — dikerjakan di layar Kandang, dicatat sebagai
 *     `kebersihan_kandang_<kode>`, bukan `sop_<id>`. Dihitung terpisah.
 *
 *   di_luar_persen — task WADAH yang isinya berubah tiap hari. Rotasi timbang
 *     mekar jadi baris `ukur_rotasi_<id_kura>` dan bisa NOL baris pada hari
 *     tanpa kura yang perlu ditimbang. Sebelum ditandai, ia tercatat gagal 14
 *     dari 14 hari — termasuk pada hari yang jawaban benarnya "tidak ada yang
 *     perlu ditimbang" — dan menekan angka kepatuhan 5 poin setiap hari.
 *
 *   terkunci_bahan — bahannya nol. Menuntut pekerjaan yang bahannya tidak ada
 *     lalu menurunkan angka karenanya adalah menghukum tim untuk keadaan
 *     gudang.
 */
export function tugasWajib(sopTasks = [], tanggal) {
  return (sopTasks || []).filter(
    (t) =>
      t.di_ubin_kandang !== true &&
      t.di_luar_persen !== true &&
      t.terkunci_bahan !== true &&
      terjadwalPada(t, tanggal),
  );
}

/** id task yang punya log `sop_<id>` sah pada tanggal itu. */
export function idSelesaiPada(logs = [], tanggal) {
  return new Set(
    (logs || [])
      .filter((l) => l?.period_key === tanggal && masukLaporan(l))
      .map((l) => String(l?.item_id || ""))
      .filter((id) => id.startsWith("sop_"))
      .map((id) => id.slice(4)),
  );
}

/** Tugas yang hari itu dituntut tetapi tidak ada log-nya. */
export function tugasBelum(sopTasks = [], logs = [], tanggal) {
  const sudah = idSelesaiPada(logs, tanggal);
  return tugasWajib(sopTasks, tanggal).filter((t) => !sudah.has(String(t.id)));
}

/**
 * Kepatuhan satu hari — dua angka, bukan satu.
 *
 * Godaan terbesarnya adalah melebur tugas harian dan kebersihan kandang jadi
 * satu persen yang rapi. Itu menyembunyikan tebakan: keduanya dicatat dengan
 * penanda yang berbeda, dan satu angka rapi yang separuhnya tebakan lebih
 * berbahaya daripada dua angka jujur.
 *
 * @param {string} tanggal       YYYY-MM-DD
 * @param {Array}  sopTasks      seluruh SOPTask
 * @param {Array}  logs          MaintenanceLog (boleh seluruhnya, disaring di sini)
 * @param {number} jumlahKandang jumlah kandang yang wajib dikunjungi
 */
export function kepatuhanHari(tanggal, sopTasks = [], logs = [], jumlahKandang = 0) {
  const wajib = tugasWajib(sopTasks, tanggal);
  const idSelesai = idSelesaiPada(logs, tanggal);
  const selesai = wajib.filter((t) => idSelesai.has(String(t.id))).length;

  const kandangSelesai = new Set(
    (logs || [])
      .filter((l) => l?.period_key === tanggal && masukLaporan(l))
      .map((l) => String(l?.item_id || ""))
      .filter((id) => id.startsWith("kebersihan_kandang_")),
  ).size;

  // Kandang dituntut bila ADA tugas ubin yang terjadwal hari itu. Sejak D12
  // satu ubin mencakup beberapa tugas dengan jadwal berbeda: kebersihan
  // Senin-Sabtu, pemberian pakan tiap hari. Jadi Minggu tetap menuntut
  // kunjungan kandang meski tanpa pembersihan.
  const adaTugasUbin = (sopTasks || []).some(
    (t) => t.di_ubin_kandang === true && terjadwalPada(t, tanggal),
  );

  return {
    tanggal,
    selesai,
    terjadwal: wajib.length,
    persen: wajib.length > 0 ? Math.round((selesai / wajib.length) * 100) : null,
    kandangSelesai,
    kandangTotal: adaTugasUbin ? jumlahKandang : 0,
  };
}

/**
 * Hari yang sudah selesai — hari berjalan dibuang.
 *
 * Kenapa ini ada (18-09-2026): rata-rata 14 hari memasukkan HARI INI, yang
 * pada pukul 08.00 baru 0% karena kiper belum mulai. Akibatnya kartu selalu
 * menampilkan angka lebih rendah dari kenyataan sepanjang pagi, dan naik
 * sendiri menjelang sore. Yang terbaca oleh pemilik bukan "hari baru mulai"
 * melainkan "tim memburuk". Pada data 5-18 Sep selisihnya 5 poin penuh
 * (63% vs 68%).
 *
 * Hari ini tidak hilang — ia ditampilkan terpisah sebagai angka berjalan.
 * Yang dibuang hanyalah perannya dalam rata-rata, karena hari yang belum
 * selesai bukan hari yang gagal.
 */
export function hariSelesai(daftar = []) {
  return (daftar || []).slice(0, -1);
}

/** Kepatuhan untuk N hari terakhir, terurut dari yang paling lama ke hari ini. */
export function kepatuhanBeberapaHari(hariTerakhir, sopTasks, logs, jumlahKandang, sampai = new Date()) {
  const hasil = [];
  for (let i = hariTerakhir - 1; i >= 0; i--) {
    const d = new Date(sampai);
    d.setDate(d.getDate() - i);
    const tanggal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    hasil.push(kepatuhanHari(tanggal, sopTasks, logs, jumlahKandang));
  }
  return hasil;
}

/** Rata-rata persen dari sekumpulan hari, mengabaikan hari tanpa kewajiban. */
export function rataRataPersen(daftar = []) {
  const angka = daftar.map((h) => h.persen).filter((p) => p !== null && p !== undefined);
  if (!angka.length) return null;
  return Math.round(angka.reduce((a, b) => a + b, 0) / angka.length);
}

/**
 * Lantai target kepatuhan — SATU angka, dipakai kartu maupun grafik.
 *
 * Ditetapkan Iwan pada 18-09-2026 di 85%, menggantikan 90%. Alasannya bukan
 * pelonggaran: setelah dua kebocoran alat ukur ditutup (tugas rotasi timbang
 * yang mustahil dicentang, dan hari berjalan yang ikut dirata-rata), angka
 * sebenarnya 73%. Garis 90% membuat kiper melihat merah berbulan-bulan dan
 * berhenti mempercayainya.
 *
 * Ini LANTAI TETAP, bukan rata-rata bergerak. Goal "di atas rata-rata" akan
 * mengejar ekornya sendiri: setiap kenaikan menaikkan targetnya sendiri, dan
 * angkanya bisa naik tanpa satu pun pekerjaan tambahan — cukup dengan
 * menghapus tugas yang sering gagal dari SOP.
 *
 * Kalau lantainya diubah, ubah DI SINI saja.
 */
export const AMBANG_BAIK = 85;
export const AMBANG_PERHATIAN = 70;

/** Status yang diucapkan, bukan hanya warna. */
export function statusKepatuhan(persen) {
  if (persen === null || persen === undefined) return { label: "Belum ada data", nada: "netral" };
  if (persen >= AMBANG_BAIK) return { label: "Baik", nada: "baik" };
  if (persen >= AMBANG_PERHATIAN) return { label: "Perlu perhatian", nada: "sedang" };
  return { label: "Rendah", nada: "buruk" };
}
