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
 * Hitung kepatuhan satu hari.
 *
 * @param {string} tanggal    YYYY-MM-DD
 * @param {Array}  sopTasks   seluruh SOPTask
 * @param {Array}  logs       MaintenanceLog (boleh seluruhnya, disaring di sini)
 * @param {number} jumlahKandang jumlah kandang aktif
 * @returns {{ tanggal, selesai, terjadwal, persen, kandangSelesai, kandangTotal }}
 */
export function kepatuhanHari(tanggal, sopTasks = [], logs = [], jumlahKandang = 0) {
  const logHariIni = (logs || []).filter((l) => l.period_key === tanggal && !l.is_test_data);

  // ── Tugas harian biasa (bukan per-kandang) ──
  const terjadwalList = (sopTasks || []).filter(
    (t) => t.task_scope !== "per_kandang" && terjadwalPada(t, tanggal),
  );
  // Tugas yang bahannya sedang habis tidak dihitung sebagai kewajiban: menuntut
  // pekerjaan yang bahannya nol lalu menurunkan angka kepatuhan karenanya
  // menghukum tim untuk keadaan gudang.
  const wajib = terjadwalList.filter((t) => t.terkunci_bahan !== true);

  const idSelesai = new Set(
    logHariIni
      .map((l) => String(l.item_id || ""))
      .filter((id) => id.startsWith("sop_"))
      .map((id) => id.slice(4)),
  );
  const selesai = wajib.filter((t) => idSelesai.has(t.id)).length;

  // ── Kebersihan per kandang ──
  const kandangSelesai = new Set(
    logHariIni
      .map((l) => String(l.item_id || ""))
      .filter((id) => id.startsWith("kebersihan_kandang_")),
  ).size;

  // Kandang dihitung sebagai kewajiban bila ADA tugas ubin yang terjadwal hari
  // itu. Sejak D12 satu ubin mencakup beberapa tugas dengan jadwal berbeda:
  // kebersihan Senin-Sabtu, pemberian pakan tiap hari. Jadi hari Minggu tetap
  // menuntut kunjungan kandang meski tanpa pembersihan.
  //
  // Penandanya kolom di_ubin_kandang, bukan pencocokan judul: judul berubah
  // saat SOP dirapikan, dan pencocokan judul yang meleset diam-diam membuat
  // seluruh kewajiban kandang hilang dari hitungan tanpa satu pun peringatan.
  const adaTugasUbin = (sopTasks || []).some(
    (t) => t.di_ubin_kandang === true && terjadwalPada(t, tanggal),
  );
  const kandangTotal = adaTugasUbin ? jumlahKandang : 0;

  return {
    tanggal,
    selesai,
    terjadwal: wajib.length,
    persen: wajib.length > 0 ? Math.round((selesai / wajib.length) * 100) : null,
    kandangSelesai,
    kandangTotal,
  };
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

/** Status yang diucapkan, bukan hanya warna. */
export function statusKepatuhan(persen) {
  if (persen === null || persen === undefined) return { label: "Belum ada data", nada: "netral" };
  if (persen >= 90) return { label: "Baik", nada: "baik" };
  if (persen >= 70) return { label: "Perlu perhatian", nada: "sedang" };
  return { label: "Rendah", nada: "buruk" };
}
