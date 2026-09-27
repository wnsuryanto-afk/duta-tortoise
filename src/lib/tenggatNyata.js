/**
 * tenggatNyata.js — membandingkan tenggat yang DITULIS dengan jam kerja yang
 * SEBENARNYA terjadi.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Diukur pada 296 pencentangan sepanjang 28 Agustus – 27 September 2026:
 * 83% lewat tenggat. Angka itu terbaca seperti masalah kedisiplinan, dan
 * jawaban yang wajar adalah menambah tekanan — peringatan, pemotongan poin,
 * teguran.
 *
 * Tapi sebaran jamnya mengatakan hal yang berbeda. Lihat "Cuci rumput /
 * sayuran rempesan (pagi)": median 08:28, dan delapan dari sepuluh hari
 * selesai sebelum 08:32. Empat menit sebaran dalam 26 hari. Itu bukan tim
 * yang kacau; itu tim yang bekerja pada irama yang sangat tetap — hanya saja
 * tenggatnya ditulis 08:20, delapan menit di depan iramanya.
 *
 * Yang lebih jelas lagi: "Beri makan iguana" bertenggat 07:30 dan lewat
 * tenggat 31 dari 31 kali. Seratus persen. Jam masuk 07:00, dan tugas itu
 * dikerjakan median 08:36. Tenggat yang dilanggar 31 dari 31 kali bukan
 * aturan yang dilanggar — ia aturan yang MUSTAHIL, dan orang yang
 * menghadapinya belajar satu hal: tenggat di aplikasi ini tidak usah
 * dipedulikan. Pelajaran itu lalu terbawa ke tenggat yang benar-benar
 * penting, seperti jam pemberian obat.
 *
 * Maka yang pertama dinaikkan bukan tekanannya, melainkan KEBENARAN
 * tenggatnya. Setelah tenggat menggambarkan pekerjaan yang memang bisa
 * dilakukan, angka keterlambatan kembali berarti sesuatu — dan dua puluh
 * persen yang benar-benar terlambat akhirnya kelihatan.
 *
 * Berkas ini TIDAK mengubah apa pun sendiri. Ia hanya menghitung dan
 * mengusulkan; yang memutuskan tetap pemilik.
 */

/**
 * "HH:mm" → menit sejak tengah malam. null bila tidak terbaca.
 *
 * Nilai kosong dijaga di depan. `String("").split(":")` menghasilkan [""],
 * dan `Number("")` adalah 0 — angka yang lolos Number.isFinite dan lolos
 * pemeriksaan jangkauan 0-23. Tanpa baris ini, tugas TANPA tenggat terbaca
 * bertenggat pukul 00:00, jadi setiap kali ia dikerjakan tercatat terlambat,
 * dan daftar "tenggat yang mustahil" penuh oleh tugas yang memang tidak
 * pernah punya tenggat.
 */
export function keMenit(hm) {
  if (hm === null || hm === undefined) return null;
  const teks = String(hm).trim();
  if (!/^\d{1,2}:\d{1,2}$/.test(teks)) return null;
  const [h, m] = teks.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Menit sejak tengah malam → "HH:mm". */
export function keJam(menit) {
  const n = Math.max(0, Math.min(24 * 60 - 1, Math.round(menit)));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

/** Persentil ke-p dari daftar angka yang SUDAH diurutkan. */
function persentil(urut, p) {
  if (urut.length === 0) return null;
  const i = Math.min(urut.length - 1, Math.floor((urut.length * p) / 100));
  return urut[i];
}

/** Data uji tidak ikut menentukan tenggat orang lain. */
function nyata(l) {
  return l && l.is_test_data !== true && l.excluded_from_reports !== true;
}

/**
 * Dibulatkan ke kelipatan lima menit ke ATAS.
 *
 * Ke atas, bukan ke terdekat: tenggat usulan tidak boleh jatuh lebih awal
 * daripada jam yang dipakai menghitungnya, karena itu akan langsung
 * menghasilkan keterlambatan pada hari yang sebenarnya normal.
 */
function bulatkanLima(menit) {
  return Math.ceil(menit / 5) * 5;
}

/** Berapa menit kelonggaran di atas p80. Dipisah supaya bisa diuji. */
export const KELONGGARAN_MENIT = 10;

/**
 * Bandingkan tenggat tiap tugas dengan jam pengerjaan yang sungguh tercatat.
 *
 * @param {Array} sopTasks  SOPTask aktif
 * @param {Array} logs      MaintenanceLog bertanda enclosure_id "tugas_harian"
 * @param {object} opsi     { minData } jumlah catatan minimum sebelum diusulkan
 * @returns {Array} satu baris per tugas, terurut dari yang paling sering lewat
 */
export function bandingkanTenggat(sopTasks = [], logs = [], opsi = {}) {
  const minData = Number.isFinite(opsi.minData) ? opsi.minData : 5;

  const jamPerTugas = new Map();
  for (const l of logs) {
    if (!nyata(l)) continue;
    const id = String(l.item_id || "");
    if (!id.startsWith("sop_")) continue;
    const menit = keMenit(l.done_at);
    if (menit === null) continue;
    const kunci = id.slice(4);
    if (!jamPerTugas.has(kunci)) jamPerTugas.set(kunci, []);
    jamPerTugas.get(kunci).push(menit);
  }

  const hasil = [];
  for (const t of sopTasks) {
    if (!t || t.is_active === false) continue;
    const batas = keMenit(t.deadline_time);
    if (batas === null) continue;
    const jam = (jamPerTugas.get(t.id) || []).slice().sort((a, b) => a - b);
    if (jam.length === 0) continue;

    const telat = jam.filter((x) => x > batas).length;
    const p80 = persentil(jam, 80);
    // Usulan hanya diberikan bila datanya cukup DAN tenggatnya memang lebih
    // sering dilanggar daripada dipenuhi. Menggeser tenggat yang 70% terpenuhi
    // berarti menurunkan standar pada pekerjaan yang sebenarnya sudah jalan.
    const cukupData = jam.length >= minData;
    const seringTelat = telat / jam.length > 0.5;
    const usul =
      cukupData && seringTelat ? keJam(bulatkanLima(p80 + KELONGGARAN_MENIT)) : null;

    hasil.push({
      id: t.id,
      judul: t.title || "(tanpa nama)",
      tenggat: t.deadline_time,
      median: keJam(persentil(jam, 50)),
      p80: keJam(p80),
      jumlah: jam.length,
      telat,
      persenTelat: Math.round((telat / jam.length) * 100),
      usul,
      // Tenggat yang TIDAK PERNAH dipenuhi adalah kasusnya sendiri: ia bukan
      // aturan yang sesekali dilanggar, melainkan aturan yang mustahil.
      mustahil: cukupData && telat === jam.length,
    });
  }

  return hasil.sort((a, b) => b.persenTelat - a.persenTelat || b.jumlah - a.jumlah);
}

/** Ringkasan sekali lihat dari hasil bandingkanTenggat. */
export function ringkasTenggat(baris = []) {
  const total = baris.reduce((n, b) => n + b.jumlah, 0);
  const telat = baris.reduce((n, b) => n + b.telat, 0);
  return {
    total,
    telat,
    persenTelat: total > 0 ? Math.round((telat / total) * 100) : 0,
    perluDisetel: baris.filter((b) => b.usul).length,
    mustahil: baris.filter((b) => b.mustahil).length,
  };
}
