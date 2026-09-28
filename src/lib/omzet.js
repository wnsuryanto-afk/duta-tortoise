import { masukLaporan } from "@/lib/laporan";

/**
 * omzet.js — omzet, pengeluaran, dan laba bulan berjalan dari satu hitungan.
 *
 * ── Kenapa omzet dipisahkan dari "pemasukan" ───────────────────────────────
 *
 * Di data peternakan ini keduanya sama: ketiga puluh delapan baris bertipe
 * `pemasukan` berkategori `penjualan_tortoise` — seluruhnya penjualan kura.
 * Jadi hari ini menjumlahkan semua pemasukan dan menyebutnya "omzet"
 * kebetulan benar.
 *
 * Kebetulan itu tidak akan bertahan. Begitu ada satu baris pemasukan yang
 * BUKAN penjualan — suntikan modal, pinjaman, penjualan aset — angka yang
 * disebut "omzet" diam-diam berhenti berarti omzet, dan tidak ada yang akan
 * menyadarinya karena labelnya tidak ikut berubah.
 *
 * Maka omzet dihitung dari kategori penjualan saja, dan pemasukan lain
 * dilaporkan TERPISAH. Selama belum ada, `pemasukanLain` bernilai nol dan
 * tampilannya sama saja dengan sekarang.
 */

/** Kategori yang berarti uang masuk dari menjual sesuatu. */
export function kategoriPenjualan(kategori) {
  return String(kategori || "").toLowerCase().startsWith("penjualan");
}

/**
 * Hitung omzet, pengeluaran, dan laba untuk satu rentang tanggal.
 *
 * @param {Array} finances FinanceTransaction
 * @param {object} opsi    { dari, sampai } "YYYY-MM-DD", inklusif
 */
export function hitungOmzet(finances = [], { dari, sampai } = {}) {
  const dalamRentang = (f) =>
    f?.date && (!dari || f.date >= dari) && (!sampai || f.date <= sampai);

  const baris = (finances || []).filter((f) => dalamRentang(f) && masukLaporan(f));

  let omzet = 0;
  let pemasukanLain = 0;
  let pengeluaran = 0;
  let jumlahPenjualan = 0;

  for (const f of baris) {
    const nilai = Number(f.amount) || 0;
    if (f.type === "pemasukan") {
      if (kategoriPenjualan(f.category)) {
        omzet += nilai;
        jumlahPenjualan += 1;
      } else {
        pemasukanLain += nilai;
      }
    } else if (f.type === "pengeluaran") {
      pengeluaran += nilai;
    }
  }

  // Laba memakai SELURUH pemasukan, bukan omzet saja: uang masuk tetap uang
  // masuk, dari mana pun asalnya. Yang dipisahkan hanya penyebutannya.
  const totalMasuk = omzet + pemasukanLain;
  return {
    omzet,
    pemasukanLain,
    totalMasuk,
    pengeluaran,
    laba: totalMasuk - pengeluaran,
    jumlahPenjualan,
    jumlahBaris: baris.length,
  };
}
