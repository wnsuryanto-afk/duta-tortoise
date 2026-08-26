/**
 * tren.js — mengubah daftar catatan bertanggal menjadi deret mingguan.
 *
 * Lapis "Arah" di beranda tidak boleh menampilkan angka tunggal. Satu angka
 * hanya memberi tahu keadaan sekarang; yang menentukan tindakan adalah ke mana
 * keadaan itu bergerak. Semua perhitungan arah memakai satu fungsi ini supaya
 * definisi "minggu ini" tidak berbeda antar kartu.
 *
 * Ember dihitung mundur dari hari ini, bukan dari hari Senin: beranda dibuka
 * tiap hari, dan menunggu pergantian minggu berarti tren baru terbaca sekali
 * seminggu saja.
 */

const SEHARI = 86400000;

/**
 * Bagi catatan ke dalam ember 7-harian yang berurutan.
 *
 * @param {Array} items daftar catatan
 * @param {object} opsi
 * @param {(item:any)=>string} opsi.tanggal pengambil tanggal (string ISO / yyyy-MM-dd)
 * @param {(item:any)=>number} [opsi.nilai] pengambil nilai; bawaannya menghitung jumlah catatan
 * @param {number} [opsi.jumlahEmber=8] berapa minggu ke belakang
 * @param {(item:any)=>boolean} [opsi.saring] penyaring tambahan
 *
 * @returns {{
 *   deret: number[], terkini: number, sebelumnya: number,
 *   selisih: number, persen: number|null, cukupData: boolean
 * }}
 *   `persen` bernilai null bila minggu pembanding nol — kenaikan dari nol
 *   bukan persentase yang berarti. `cukupData` false bila deretnya kosong
 *   atau hanya terisi satu minggu; menggambar garis dari data sesedikit itu
 *   memberi kesan tren yang belum tentu ada.
 */
export function deretMingguan(items = [], opsi = {}) {
  const {
    tanggal,
    nilai = () => 1,
    jumlahEmber = 8,
    saring = () => true,
  } = opsi;

  const deret = new Array(jumlahEmber).fill(0);

  // Batas akhir hari ini, supaya catatan bertanggal hari ini ikut terhitung.
  const akhir = new Date();
  akhir.setHours(23, 59, 59, 999);
  const akhirMs = akhir.getTime();

  items.forEach((item) => {
    if (!saring(item)) return;

    const mentah = tanggal(item);
    if (!mentah) return;
    const waktu = Date.parse(mentah);
    if (!Number.isFinite(waktu)) return;

    const selisihHari = Math.floor((akhirMs - waktu) / SEHARI);
    if (selisihHari < 0) return; // tanggal di masa depan — abaikan

    const ember = Math.floor(selisihHari / 7);
    if (ember >= jumlahEmber) return;

    const n = Number(nilai(item));
    if (!Number.isFinite(n)) return;

    // Ember 0 = paling lama, ember terakhir = 7 hari terakhir
    deret[jumlahEmber - 1 - ember] += n;
  });

  const terkini = deret[jumlahEmber - 1];
  const sebelumnya = deret[jumlahEmber - 2] ?? 0;
  const selisih = terkini - sebelumnya;
  const persen = sebelumnya !== 0 ? (selisih / Math.abs(sebelumnya)) * 100 : null;

  const emberTerisi = deret.filter((v) => v !== 0).length;

  return { deret, terkini, sebelumnya, selisih, persen, cukupData: emberTerisi >= 2 };
}

/**
 * Kalimat arah yang siap tampil.
 *
 * `naikItuBaik` sengaja wajib diisi pemanggil: naik pada "telur baru" itu kabar
 * baik, naik pada "biaya pakan" tidak. Menyimpulkan sendiri dari tanda angkanya
 * akan mewarnai separuh kartu dengan arti terbalik.
 */
export function bacaArah({ selisih, persen, cukupData }, { naikItuBaik = true } = {}) {
  if (!cukupData) return { nada: "sunyi", teks: "belum cukup data", arah: "datar" };
  if (selisih === 0) return { nada: "sunyi", teks: "sama seperti minggu lalu", arah: "datar" };

  const naik = selisih > 0;
  const besaran = persen === null
    ? `${Math.abs(selisih).toLocaleString("id-ID")}`
    : `${Math.abs(persen).toFixed(0)}%`;

  return {
    nada: naik === naikItuBaik ? "membaik" : "perlu dilihat",
    arah: naik ? "naik" : "turun",
    teks: `${naik ? "naik" : "turun"} ${besaran} dari minggu lalu`,
  };
}
