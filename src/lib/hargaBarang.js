/**
 * hargaBarang.js — SATU definisi "barang ini belum ada harga belinya".
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * 18 Okt 2026, 53 dari 87 barang bergudang punya stok tetapi harga belinya
 * Rp 0 — 18 di antaranya alat kerja (cangkul, clurit, palu, mesin giling).
 * Modal alat di beranda karena itu praktis hanya lampu UVB.
 *
 * Aturannya dipakai di DUA tempat: layar isian massal, dan saringan "Data
 * Belum Lengkap". Dua salinan yang sedikit berbeda akan membuat barang
 * muncul di satu layar tetapi tidak di layar yang lain — cacat yang tidak
 * menimbulkan error apa pun dan hanya terlihat kalau ada yang membandingkan
 * dua daftar itu baris demi baris.
 *
 * ── Dua hal yang ditentukan di sini ─────────────────────────────────────────
 *
 * 1. HANYA barang yang MASIH ADA STOKNYA yang dihitung. Barang habis tidak
 *    menyumbang modal apa pun, jadi memintanya diberi harga menambah 44
 *    baris kerja yang tidak mengubah satu angka pun hari ini. Ia akan
 *    ditanyakan saat dibeli lagi, lewat formulir barang masuk.
 *
 * 2. Rp 0 DIANGGAP BELUM DIISI, bukan "barangnya memang gratis". Ini berbeda
 *    dari harga beli kura, yang nol-nya sah (hadiah, warisan, anakan sendiri).
 *    Bedanya: kolom harga barang bawaannya 0 di skema, jadi nol adalah apa
 *    yang tertulis ketika tidak ada yang mengisinya — bukan pernyataan
 *    siapa pun. Barang yang benar-benar gratis memang akan terus ditandai;
 *    itu harga yang murah untuk tidak diam-diam menghitung 53 barang
 *    sebagai tak bernilai.
 */

/** Nama golongan yang terbaca manusia, untuk mengelompokkan layar isian. */
export const GOLONGAN_BARANG = {
  alat_kerja: "Alat kerja",
  peralatan: "Alat kerja",
  alat: "Alat kerja",
  obat: "Obat",
  vitamin: "Vitamin & suplemen",
  suplemen: "Vitamin & suplemen",
  habis_pakai: "Habis pakai",
  lainnya: "Lain-lain",
};

const angka = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Barang ini punya harga beli yang pernah diisi seseorang. */
export function adaHargaBarang(item) {
  return angka(item?.purchase_price) > 0;
}

/** Barang yang masih ada stoknya tetapi belum ada harga belinya. */
export function barangTanpaHarga(items = []) {
  return (items || []).filter((b) => b && angka(b.current_stock) > 0 && !adaHargaBarang(b));
}

/** Ringkasan kelengkapan harga barang bergudang. */
export function kelengkapanHargaBarang(items = []) {
  const berstok = (items || []).filter((b) => b && angka(b.current_stock) > 0);
  const berharga = berstok.filter(adaHargaBarang);
  return {
    berstok: berstok.length,
    berharga: berharga.length,
    kosong: berstok.length - berharga.length,
    persen: berstok.length > 0 ? Math.round((berharga.length / berstok.length) * 100) : 0,
  };
}
