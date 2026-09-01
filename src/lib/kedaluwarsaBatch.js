/**
 * kedaluwarsaBatch.js — SATU definisi kapan isi sebuah botol tidak boleh dipakai lagi.
 *
 * Tanggal yang tercetak di kemasan berlaku selama botolnya masih tersegel.
 * Begitu tutupnya ditusuk, isinya punya jam pasirnya sendiri: sterilitasnya
 * hilang, pengawetnya mulai bekerja, dan pada botol multi-dosis batas itu
 * biasanya jauh lebih pendek daripada angka yang tercetak.
 *
 * Contoh nyata di gudang ini: satu botol INJEKVIT B PLEX berisi 100 dosis dan
 * Wonder Oxytocin 10 dosis. Dengan 92 betina, satu botol B Plex bisa terbuka
 * berbulan-bulan sebelum habis. Kalau yang dilihat cuma tanggal cetak, botol
 * itu akan terus terlihat "aman" sampai jauh setelah isinya tidak layak.
 *
 * ANGKA HARINYA BUKAN MILIK APLIKASI. Berkas ini tidak memuat satu pun angka
 * bawaan, dan sengaja: batas pakai setelah dibuka berbeda per obat dan itu
 * urusan dokter hewan. Selama `hari_pakai_setelah_dibuka` pada barangnya belum
 * diisi, aturan ini diam dan hanya tanggal cetak yang berlaku. Menebak di sini
 * berarti aplikasi menyuruh membuang obat yang masih baik, atau — jauh lebih
 * buruk — menyatakan aman obat yang sudah tidak.
 */

/**
 * Berapa hari sebelum jatuh tempo sebuah botol mulai diperingatkan.
 *
 * Lebih pendek daripada HARI_PERINGATAN_KADALUARSA (30 hari) di
 * lib/stokMenipis.js, dan itu disengaja: angka 30 hari itu untuk memutuskan
 * KAPAN MEMBELI pengganti, sedangkan angka ini untuk memperingatkan orang yang
 * sedang memegang botolnya. Dua pertanyaan berbeda, dua ambang berbeda.
 */
export const HARI_PERINGATAN_BATCH = 14;

function keTanggal(nilai) {
  if (!nilai) return null;
  const d = new Date(nilai);
  return Number.isNaN(d.getTime()) ? null : d;
}

function tambahHari(tanggal, hari) {
  const d = new Date(tanggal.getTime());
  d.setDate(d.getDate() + hari);
  return d;
}

/** YYYY-MM-DD dari sebuah Date, tanpa pergeseran zona waktu. */
export function keTeksTanggal(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const bl = String(d.getMonth() + 1).padStart(2, "0");
  const tg = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${bl}-${tg}`;
}

/**
 * Kapan isi botol ini benar-benar jatuh tempo.
 *
 * Yang menang adalah yang LEBIH DULU tiba antara tanggal cetak dan
 * (tanggal buka + hari pakai setelah dibuka).
 *
 * @param {object} batch  satu BatchBarang
 * @param {object} item   WarehouseItem barangnya (untuk hari_pakai_setelah_dibuka)
 * @returns {{ tanggal: Date|null, sebab: "cetak"|"buka"|null }}
 */
export function kedaluwarsaEfektif(batch, item) {
  const cetak = keTanggal(batch?.tanggal_expired);

  const dibuka = keTanggal(batch?.tanggal_buka);
  const hari = Number(item?.hari_pakai_setelah_dibuka);
  const setelahBuka =
    dibuka && Number.isFinite(hari) && hari > 0 ? tambahHari(dibuka, hari) : null;

  if (cetak && setelahBuka) {
    return setelahBuka < cetak
      ? { tanggal: setelahBuka, sebab: "buka" }
      : { tanggal: cetak, sebab: "cetak" };
  }
  if (setelahBuka) return { tanggal: setelahBuka, sebab: "buka" };
  if (cetak) return { tanggal: cetak, sebab: "cetak" };
  return { tanggal: null, sebab: null };
}

/**
 * Keadaan satu batch hari ini.
 *
 * @returns {{ tanggal, sebab, sisaHari, keadaan }} keadaan:
 *   "lewat" | "segera" | "aman" | "tidak_tahu"
 */
export function statusKedaluwarsaBatch(batch, item, sekarang = new Date()) {
  const { tanggal, sebab } = kedaluwarsaEfektif(batch, item);
  if (!tanggal) return { tanggal: null, sebab: null, sisaHari: null, keadaan: "tidak_tahu" };

  const hariIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  const jatuh = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate());
  const sisaHari = Math.round((jatuh - hariIni) / 86400000);

  let keadaan = "aman";
  if (sisaHari < 0) keadaan = "lewat";
  else if (sisaHari <= HARI_PERINGATAN_BATCH) keadaan = "segera";
  return { tanggal, sebab, sisaHari, keadaan };
}

/** Kalimat siap tampil yang menjelaskan KENAPA tanggalnya segitu. */
export function alasanKedaluwarsaBatch(batch, item, sekarang = new Date()) {
  const { tanggal, sebab, sisaHari, keadaan } = statusKedaluwarsaBatch(batch, item, sekarang);
  if (keadaan === "tidak_tahu") return "Tanggal kedaluwarsa belum diisi.";

  const teks = keTeksTanggal(tanggal);
  const dasar =
    sebab === "buka"
      ? `${teks} — dihitung dari tanggal botol dibuka (${batch.tanggal_buka} + ${item.hari_pakai_setelah_dibuka} hari), lebih cepat daripada tanggal cetaknya`
      : `${teks} — tanggal cetak di kemasan`;

  if (keadaan === "lewat") return `SUDAH LEWAT ${Math.abs(sisaHari)} hari: ${dasar}.`;
  if (keadaan === "segera") return `Tinggal ${sisaHari} hari: ${dasar}.`;
  return `Masih ${sisaHari} hari: ${dasar}.`;
}

/**
 * Urutan pengambilan: yang paling dekat jatuh tempo lebih dulu (FEFO).
 * Batch tanpa tanggal ditaruh paling belakang — bukan karena ia aman,
 * melainkan karena tidak ada dasar untuk mendahulukannya.
 */
export function urutFEFO(batches = [], item) {
  return [...batches].sort((a, b) => {
    const ta = kedaluwarsaEfektif(a, item).tanggal;
    const tb = kedaluwarsaEfektif(b, item).tanggal;
    if (ta && tb) return ta - tb;
    if (ta) return -1;
    if (tb) return 1;
    return 0;
  });
}
