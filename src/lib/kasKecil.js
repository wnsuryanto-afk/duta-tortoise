/**
 * kasKecil.js — SATU cara menentukan saldo kas kecil yang berlaku.
 *
 * Saldo tidak disimpan di satu tempat. Setiap baris buku kas menyimpan
 * `balance_after`, yaitu saldo SETELAH baris itu. Saldo yang berlaku karena itu
 * adalah `balance_after` milik baris TERAKHIR — dan "terakhir" harus ditentukan
 * dengan aturan yang sama persis di semua tempat.
 *
 * Sebelum berkas ini ada, tiga layar menjawabnya dengan dua cara berbeda:
 *
 *   - Halaman Kas Kecil mengurutkan sendiri: entry_date menurun, lalu
 *     created_date menurun. Ini yang benar.
 *   - Widget Kas Kecil dan Ringkasan Pagi mengambil `ledger[0]` apa adanya,
 *     yaitu baris pertama dari `list("-entry_date", 200)`.
 *
 * Bedanya nyata karena `entry_date` berformat TANGGAL saja, tanpa jam. Dua
 * transaksi di hari yang sama punya entry_date yang identik, dan urutan di
 * antara keduanya ditentukan sekehendak basis data. Pada hari mana pun yang
 * punya lebih dari satu transaksi — hal biasa untuk kas kecil — widget bisa
 * menampilkan saldo TENGAH HARI sementara halaman Kas Kecil menampilkan saldo
 * akhir. Dua angka berbeda untuk satu kas, pada saat yang sama.
 *
 * Aturan di bawah ini disalin dari fungsi recalculatePettyCashBalance, yang
 * menghitung ulang seluruh `balance_after`. Kalau layar memakai urutan yang
 * berbeda dari yang dipakai saat menghitung, angkanya tidak akan pernah cocok.
 */

/**
 * Kunci urut sebuah baris buku kas.
 *
 * `entry_date` dipakai bila terisi dan masuk akal; bila tidak, `created_date`
 * yang dipakai. Baris tanpa tanggal sama sekali tidak boleh dianggap paling
 * baru hanya karena tanggalnya kosong.
 */
export function kunciUrut(baris) {
  const tanggal = baris?.entry_date;
  if (tanggal && tanggal !== "null" && tanggal !== "undefined") {
    const d = new Date(tanggal);
    if (!Number.isNaN(d.getTime())) return tanggal;
  }
  return baris?.created_date || "";
}

/**
 * Bandingkan dua baris secara kronologis (yang lebih lama lebih dulu).
 * `created_date` jadi pemutus saat tanggalnya sama — tanpa itu, dua transaksi
 * di hari yang sama tidak punya urutan yang pasti.
 */
export function bandingkanBaris(a, b) {
  const ka = kunciUrut(a);
  const kb = kunciUrut(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  const ca = a?.created_date || "";
  const cb = b?.created_date || "";
  if (ca !== cb) return ca < cb ? -1 : 1;
  return String(a?.id || "") < String(b?.id || "") ? -1 : 1;
}

/** Buku kas terurut dari yang paling baru ke yang paling lama. */
export function urutTerbaruDulu(ledger = []) {
  return [...ledger].sort((a, b) => bandingkanBaris(b, a));
}

/**
 * Saldo kas kecil yang berlaku sekarang.
 *
 * @param {Array} ledger baris-baris PettyCashLedger
 * @returns {number} dibulatkan ke rupiah penuh, 0 bila buku kas masih kosong
 */
export function saldoTerkini(ledger = []) {
  if (!ledger.length) return 0;
  const terbaru = ledger.reduce((a, b) => (bandingkanBaris(a, b) > 0 ? a : b));
  return Math.round(terbaru?.balance_after || 0);
}
