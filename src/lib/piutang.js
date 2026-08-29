/**
 * piutang.js — uang yang belum dibayar pembeli, dihitung dari sumber yang benar.
 *
 * Beranda pemilik menampilkan bagian "Piutang" dengan membaca
 * `remaining_balance` dari **BuyerProfile**. Field itu tidak ada di sana —
 * BuyerProfile hanya menyimpan `total_purchases` dan `total_spent`. Yang punya
 * `remaining_balance`, `total_paid`, dan `dp_amount` adalah **Sale**.
 *
 * Akibatnya daftar penunggak selalu kosong, total piutang selalu Rp 0, dan
 * peringatan piutang tidak pernah sekali pun muncul — berapa pun uang yang
 * sebenarnya belum masuk. Tidak ada pesan galat: bagiannya hanya diam.
 *
 * Tiga field lain di bagian yang sama juga tidak ada di BuyerProfile:
 * `buyer_name`, `full_name` (skemanya memakai `name`), dan `payment_due_date` —
 * yang bahkan tidak ada di entitas mana pun di seluruh aplikasi. Karena tanggal
 * jatuh tempo memang tidak pernah dicatat, gantinya di sini adalah UMUR
 * piutang: berapa hari sejak penjualannya. Itu bisa dihitung dari data yang
 * benar-benar ada, dan justru itu yang menentukan mana yang perlu ditagih.
 */

/** Berapa hari antara dua tanggal "YYYY-MM-DD". */
function selisihHari(dari, sampai) {
  if (!dari) return 0;
  const a = new Date(dari + "T00:00:00");
  const b = new Date(sampai + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * Sisa tagihan satu penjualan.
 *
 * `remaining_balance` dipakai bila memang sudah dihitung saat bukti bayar
 * dicatat. Bila belum pernah tersentuh alur itu, sisanya dihitung dari harga
 * dikurangi yang sudah masuk — DP dipakai bila `total_paid` belum terisi.
 */
export function sisaTagihan(sale) {
  if (!sale) return 0;
  if (sale.payment_status === "lunas") return 0;
  const tercatat = Number(sale.remaining_balance);
  if (Number.isFinite(tercatat) && tercatat > 0) return tercatat;
  const harga = Number(sale.price) || 0;
  const dibayar = Number(sale.total_paid) || Number(sale.dp_amount) || 0;
  return Math.max(0, harga - dibayar);
}

/**
 * Piutang dikelompokkan per pembeli, terbesar lebih dulu.
 *
 * @param {Array} sales     seluruh penjualan yang layak masuk laporan
 * @param {string} hariIni  "YYYY-MM-DD"
 * @returns {{ daftar: Array, total: number }}
 *   Tiap baris: { kunci, nama, sisa, jumlahNota, terlamaHari, terakhirTanggal }
 */
export function piutangPerPembeli(sales = [], hariIni) {
  const hari = hariIni || new Date().toISOString().split("T")[0];
  const perPembeli = new Map();

  sales.forEach((s) => {
    const sisa = sisaTagihan(s);
    if (sisa <= 0) return;
    // Nomor WhatsApp adalah pengenal pembeli yang paling stabil; nama dipakai
    // bila nomornya belum diisi.
    const kunci = String(s.hp_whatsapp || s.buyer_profile_id || s.buyer_name || s.id);
    const ada = perPembeli.get(kunci) || {
      kunci, nama: s.buyer_name || "(tanpa nama)", sisa: 0, jumlahNota: 0,
      terlamaHari: 0, terakhirTanggal: null,
    };
    ada.sisa += sisa;
    ada.jumlahNota += 1;
    ada.terlamaHari = Math.max(ada.terlamaHari, selisihHari(s.sale_date, hari));
    if (!ada.terakhirTanggal || (s.sale_date || "") > ada.terakhirTanggal) {
      ada.terakhirTanggal = s.sale_date || null;
    }
    if (s.buyer_name) ada.nama = s.buyer_name;
    perPembeli.set(kunci, ada);
  });

  const daftar = [...perPembeli.values()].sort((a, b) => b.sisa - a.sisa);
  return { daftar, total: daftar.reduce((s, d) => s + d.sisa, 0) };
}
