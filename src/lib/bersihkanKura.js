/**
 * bersihkanKura.js — kolom angka dan tanggal tidak boleh dikirim sebagai
 * teks kosong.
 *
 * ── Cacat yang ditemukan 18 Oktober 2026 ────────────────────────────────────
 *
 * Pemiliknya membeli Sulcata Albino dan tidak bisa memasukkannya: tombol
 * Simpan berputar terus, tanpa pesan, selamanya. Tidak satu pun kura baru
 * tercatat sejak 14 Juli — jadi bukan "kadang gagal", melainkan tidak pernah
 * berhasil sama sekali lewat formulir itu.
 *
 * Sebabnya satu baris di keadaan awal formulir:
 *
 *     proven_year: ""
 *
 * `proven_year` bertipe ANGKA di skema Tortoise. Selama kura yang dimasukkan
 * bukan proven breeder, kolom itu tidak pernah disentuh, jadi teks kosong
 * itulah yang ikut terkirim — dan server menolak seluruh permintaan:
 *
 *     422 Error in field proven_year: Input should be a valid number,
 *         unable to parse string as a number
 *
 * Dibuktikan dengan mengirim muatan yang sama persis dengan yang dikirim
 * formulir: dengan `proven_year: ""` ditolak 422, tanpa baris itu — muatan
 * yang selebihnya identik, termasuk `gender: ""` — tersimpan.
 *
 * `weight_grams` dan `shell_length_cm` sudah lama diubah ke angka sebelum
 * dikirim, jadi keduanya selamat. Yang tiga lagi tidak pernah ikut.
 *
 * ── Kenapa `null`, bukan dihapus dari muatannya ─────────────────────────────
 *
 * Membuang kuncinya memang membuat CREATE lolos, tetapi merusak EDIT: kunci
 * yang tidak dikirim berarti "jangan ubah", sehingga MENGOSONGKAN tanggal
 * lahir yang sudah terisi diam-diam tidak terjadi. `null` berarti "kosongkan",
 * dan itu yang dimaksud orang saat ia menghapus isi sebuah kotak.
 *
 * ── Kenapa daftarnya ditulis tegas ──────────────────────────────────────────
 *
 * Bukan "tebak dari nama kolom". Kolom bertipe angka yang kebetulan berakhiran
 * `_date`, atau kolom teks yang namanya mengandung `price`, akan tertukar.
 * Daftar ini diambil dari skema Tortoise dan hanya berubah kalau skemanya
 * berubah — dan penjaganya (cek-kolom-hantu) menolak nama yang tidak ada di
 * skema, jadi salah ketik tidak lolos diam-diam.
 */

/** Kolom bertipe `number` di skema Tortoise. */
export const KOLOM_ANGKA = [
  "proven_year",
  "purchase_price",
  "shell_length_cm",
  "weight_grams",
  "weighing_interval_days",
];

/** Kolom bertipe `string` berformat `date` di skema Tortoise. */
export const KOLOM_TANGGAL = [
  "birth_date",
  "purchase_date",
  "death_date",
  "last_status_change",
  "last_weighed_date",
  "quarantine_start_date",
];

const kosong = (v) => v === "" || v === undefined || (typeof v === "string" && !v.trim());

/**
 * Siapkan data kura untuk dikirim ke server.
 *
 * - kolom angka: teks kosong → `null`; teks berisi angka → angka;
 *   teks yang bukan angka → `null` (bukan `NaN`, yang ditolak server dengan
 *   pesan yang sama membingungkannya);
 * - kolom tanggal: teks kosong → `null`;
 * - `gender` kosong → `"belum_diketahui"`.
 *
 *   Formulir hanya MEWAJIBKAN jenis kelamin pada kura ≥ 20 cm, karena kura
 *   kecil memang belum bisa dibedakan. Tetapi yang tersimpan lalu berupa teks
 *   kosong — nilai yang tidak ada di enum dan tidak dikenali satu pun pembaca,
 *   sehingga kolomnya tampil melompong alih-alih "belum diketahui". Anakan
 *   yang ditulis EggGrid selalu memakai `belum_diketahui`, dan kura dari
 *   formulir ini sekarang sama.
 *
 * Kunci yang memang tidak ada di `data` dibiarkan tidak ada — fungsi ini tidak
 * menambahkan kolom yang tidak dikirim pemanggilnya.
 */
export function bersihkanKura(data = {}) {
  const hasil = { ...data };

  for (const k of KOLOM_ANGKA) {
    if (!(k in hasil)) continue;
    if (hasil[k] === null) continue;
    if (kosong(hasil[k])) { hasil[k] = null; continue; }
    const angka = Number(hasil[k]);
    hasil[k] = Number.isFinite(angka) ? angka : null;
  }

  for (const k of KOLOM_TANGGAL) {
    if (!(k in hasil)) continue;
    if (hasil[k] === null) continue;
    if (kosong(hasil[k])) hasil[k] = null;
  }

  if ("gender" in hasil && kosong(hasil.gender)) hasil.gender = "belum_diketahui";

  return hasil;
}
