/**
 * transaksiPenjualan.js — satu pintu untuk catatan keuangan sebuah penjualan.
 *
 * Pemasukan dari penjualan ditulis oleh DUA pihak yang tidak saling tahu:
 *
 *   1. SaleWizard, langsung dari browser sesudah Sale dibuat.
 *   2. Otomatisasi `onSaleCreated` di server, yang menyala saat Sale dibuat.
 *
 * Otomatisasi server memang memeriksa dulu apakah sudah ada transaksi dengan
 * `reference_id` yang sama — tetapi pemeriksaan itu berjalan beberapa saat
 * SETELAH `Sale.create`, sementara SaleWizard baru menulis transaksinya
 * beberapa langkah kemudian (memperbarui kura, lalu menghitung ulang seluruh
 * kandang). Pada saat server memeriksa, transaksi dari browser belum ada; saat
 * browser menulis, transaksi dari server sudah ada. Keduanya lolos, dan satu
 * penjualan tercatat sebagai pemasukan DUA KALI.
 *
 * Akibatnya menjalar: laporan keuangan, laba/rugi, dan beranda investor
 * semuanya melaporkan pemasukan lebih besar dari yang benar-benar diterima.
 *
 * Yang memperparah, pembatalan penjualan menghapus transaksi lewat
 * `Sale.finance_tx_id` — satu id, satu transaksi. Yang kembar tertinggal
 * selamanya. Penjualan yang dibuat lewat SaleForm bahkan tidak pernah
 * menyimpan `finance_tx_id` sama sekali, sehingga pembatalannya tidak menghapus
 * apa pun dan pemasukannya menggantung sebagai pemasukan hantu.
 *
 * Di sini `reference_id` diperlakukan sebagai tautannya — bukan
 * `finance_tx_id`. Kedua penulis sudah mengisinya, jadi satu penjualan selalu
 * bisa ditemukan kembali seluruh transaksinya, berapa pun jumlahnya dan dari
 * jalur mana pun ia dibuat.
 */
import { base44 } from "@/api/base44Client";

/** Semua transaksi keuangan milik satu penjualan. */
export async function transaksiMilikPenjualan(saleId) {
  if (!saleId) return [];
  try {
    const hasil = await base44.entities.FinanceTransaction.filter({ reference_id: saleId });
    return hasil || [];
  } catch {
    return [];
  }
}

/**
 * Catat pemasukan sebuah penjualan — sekali saja, berapa pun kali dipanggil.
 *
 * Bila transaksinya sudah ada (dibuat otomatisasi server lebih dulu),
 * keterangannya diperbarui alih-alih dibuat yang kedua. Keterangan dari browser
 * lebih lengkap karena memuat labanya, jadi ia yang menang.
 *
 * @returns {Promise<object|null>} transaksi yang berlaku untuk penjualan ini.
 */
export async function catatPemasukanPenjualan(saleId, data) {
  if (!saleId) return null;
  const adaSebelumnya = await transaksiMilikPenjualan(saleId);

  if (adaSebelumnya.length > 0) {
    const utama = adaSebelumnya[0];
    // Yang kembar dibersihkan di sini juga, supaya penjualan lama yang sudah
    // terlanjur tercatat dua kali ikut beres saat disentuh lagi.
    for (const kembar of adaSebelumnya.slice(1)) {
      try { await base44.entities.FinanceTransaction.delete(kembar.id); } catch { /* biarkan */ }
    }
    try {
      await base44.entities.FinanceTransaction.update(utama.id, {
        amount: data.amount,
        date: data.date,
        description: data.description,
      });
    } catch { /* transaksinya sudah ada; gagal memperkaya keterangan tidak fatal */ }
    return { ...utama, ...data };
  }

  return base44.entities.FinanceTransaction.create({ ...data, reference_id: saleId });
}

/**
 * Hapus SELURUH catatan keuangan sebuah penjualan, dipakai saat penjualan
 * dibatalkan.
 *
 * Dicari lewat `reference_id`, bukan `finance_tx_id`, supaya yang kembar dan
 * yang dibuat otomatisasi server ikut terhapus — keduanya tidak pernah
 * tersentuh oleh pembatalan versi lama.
 *
 * @returns {Promise<{terhapus: number, gagal: number}>}
 */
export async function hapusTransaksiPenjualan(saleId) {
  const daftar = await transaksiMilikPenjualan(saleId);
  let terhapus = 0;
  let gagal = 0;
  for (const tx of daftar) {
    try {
      await base44.entities.FinanceTransaction.delete(tx.id);
      terhapus += 1;
    } catch {
      gagal += 1;
    }
  }
  return { terhapus, gagal };
}
