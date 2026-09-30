/**
 * rupiah.js — SATU cara meringkas angka rupiah supaya muat di kotak kecil.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Kartu "Total Nilai Stok" di halaman Stok & Gudang mencetak nilainya penuh —
 * `Rp 9.385.201` dengan huruf text-2xl — di dalam kolom selebar kira-kira
 * 150px. Hasilnya di layar: "Rp" di satu baris, "9.385.201,3" di baris
 * berikutnya, terpotong tepi kartu. Angka terpenting di halaman itu justru
 * satu-satunya yang tidak bisa dibaca utuh.
 *
 * Memperkecil hurufnya bisa juga, tapi itu memperbaiki gejalanya: nilai
 * persediaan sembilan juta rupiah tidak perlu disebut sampai satuan rupiah
 * untuk bisa dipakai. "Rp 9,4 jt" menjawab pertanyaan yang sedang ditanyakan
 * ("kira-kira berapa nilai gudang kita") dalam empat karakter, dan angka
 * persisnya tetap ada di tooltip dan di halaman rinciannya.
 *
 * Bentuk ringkas ini sebelumnya hidup sebagai salinan lokal di
 * components/ui/grafik-uang.jsx — dipakai untuk label sumbu grafik. Dua
 * salinan aturan yang sama adalah cara paling pasti membuat sumbu grafik dan
 * kartu di atasnya kelak menyebut angka yang sama dengan bentuk berbeda.
 */

/** Rupiah penuh, dengan pemisah ribuan Indonesia. */
export function rupiah(n) {
  return "Rp " + angkaRibuan(n);
}

/**
 * Angkanya saja, tanpa awalan "Rp".
 *
 * Untuk tempat yang sudah menulis "Rp" sendiri di markup — biasanya karena
 * "Rp" dan angkanya diberi ukuran huruf berbeda, atau karena awalannya
 * "-Rp" / "+Rp". Memaksa tempat-tempat itu memakai `rupiah()` lalu memotong
 * tiga huruf pertama jauh lebih rapuh daripada menyediakan bentuk ini.
 */
export function angkaRibuan(n) {
  return Math.round(Number(n) || 0).toLocaleString("id-ID");
}

/**
 * Rupiah penuh, tetapi kosong ditulis "—" alih-alih "Rp 0".
 *
 * Bedanya penting di tabel harga: sel yang belum diisi dan sel yang benar
 * -benar berharga nol adalah dua keadaan berbeda, dan "Rp 0" membuat
 * keduanya terlihat sama. Nol yang sungguhan tetap tampil "Rp 0".
 */
export function rupiahAtauStrip(n) {
  if (n === null || n === undefined || n === "") return "—";
  return rupiah(n);
}

/**
 * Rupiah ringkas: `Rp 9,4 jt`, `Rp 1,2 M`, `Rp 450 rb`.
 *
 * Tanda minus ikut terbawa apa adanya — `-Rp` tidak dipakai karena di aplikasi
 * ini rugi ditandai warna dan kata ("Rugi"), bukan tanda minus di depan angka.
 *
 * @param {number} n
 * @param {object} opsi
 * @param {boolean} opsi.denganRp  sertakan awalan "Rp" (default true)
 */
export function rupiahSingkat(n, { denganRp = true } = {}) {
  const v = Number(n) || 0;
  const besar = Math.abs(v);
  const awalan = denganRp ? "Rp " : "";
  const angka = (x, satuan) =>
    awalan + x.toLocaleString("id-ID", { maximumFractionDigits: 1 }) + satuan;

  if (besar >= 1e9) return angka(v / 1e9, " M");
  if (besar >= 1e6) return angka(v / 1e6, " jt");
  // Di bawah seratus ribu angkanya masih pendek dan ribuannya berarti —
  // "Rp 18.000" lebih berguna daripada "Rp 18 rb" untuk kas kecil.
  if (besar >= 1e5) return awalan + Math.round(v / 1e3).toLocaleString("id-ID") + " rb";
  return awalan + Math.round(v).toLocaleString("id-ID");
}
