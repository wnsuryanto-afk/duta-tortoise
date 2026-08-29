/**
 * transaksiKembar.js — menemukan catatan keuangan yang tercatat lebih dari sekali.
 *
 * Sampai perbaikan pada modul Uang, pemasukan sebuah penjualan bisa ditulis dua
 * kali: sekali oleh otomatisasi server saat Sale dibuat, sekali lagi oleh
 * SaleWizard beberapa langkah kemudian. Keduanya memakai `reference_id` yang
 * sama, tetapi tidak ada yang pernah membandingkannya. Perbaikan itu mencegah
 * yang baru; catatan lama yang terlanjur kembar masih ada dan masih menaikkan
 * pemasukan di setiap laporan.
 *
 * Yang PASTI kembar dan yang RAGU dipisah tegas:
 *
 *   PASTI  — `reference_id` sama, DAN jenis, jumlah, serta tanggalnya sama
 *            persis. Dua baris seperti ini tidak mungkin dua peristiwa berbeda.
 *   RAGU   — `reference_id` sama tetapi salah satu dari ketiganya berbeda.
 *            Itu bisa saja dua catatan yang memang berbeda (mis. satu catatan
 *            kesehatan dengan dua jenis biaya), dan menghapusnya berarti
 *            menghilangkan uang yang benar-benar keluar.
 *
 * Yang DISIMPAN adalah yang paling BARU, bukan yang paling lama. Delapan
 * entitas menyimpan `finance_tx_id` yang menunjuk ke satu transaksi, dan setiap
 * alur menyetel penunjuk itu tepat setelah membuat transaksinya — jadi penunjuk
 * selalu mengarah ke yang terakhir dibuat. Menyimpan yang terlama akan membuat
 * penunjuk itu menggantung, dan layar yang memakainya (sunting kas kecil, hapus
 * entri, sunting biaya obat) akan gagal saat dibuka. Kebetulan yang paling baru
 * juga yang keterangannya paling lengkap — punya SaleWizard memuat labanya.
 */

/** Kunci yang harus sama persis agar dua baris disebut pasti kembar. */
function sidikJari(tx) {
  return [tx.type || "", Number(tx.amount) || 0, tx.date || ""].join("|");
}

/** Yang paling baru menang. `created_date` didahulukan; id dipakai bila seri. */
function lebihBaru(a, b) {
  const ta = a.created_date || "";
  const tb = b.created_date || "";
  if (ta !== tb) return ta > tb ? a : b;
  return String(a.id) > String(b.id) ? a : b;
}

/**
 * Periksa seluruh transaksi, tanpa mengubah apa pun.
 *
 * @returns {{
 *   diperiksa: number, tanpaRujukan: number,
 *   kembar: Array<{ reference_id, simpan, hapus: Array, nilai: number }>,
 *   ragu: Array<{ reference_id, daftar: Array }>,
 *   totalHapus: number, nilaiPemasukan: number, nilaiPengeluaran: number
 * }}
 */
export function periksaTransaksiKembar(transactions = []) {
  const perRujukan = new Map();
  let tanpaRujukan = 0;

  transactions.forEach((tx) => {
    if (!tx?.id) return;
    const ref = String(tx.reference_id || "").trim();
    if (!ref) { tanpaRujukan += 1; return; }
    if (!perRujukan.has(ref)) perRujukan.set(ref, []);
    perRujukan.get(ref).push(tx);
  });

  const kembar = [];
  const ragu = [];
  let nilaiPemasukan = 0;
  let nilaiPengeluaran = 0;

  perRujukan.forEach((daftar, ref) => {
    if (daftar.length < 2) return;

    // Kelompokkan lagi per sidik jari: hanya yang sidik jarinya sama yang pasti.
    const perSidik = new Map();
    daftar.forEach((tx) => {
      const k = sidikJari(tx);
      if (!perSidik.has(k)) perSidik.set(k, []);
      perSidik.get(k).push(tx);
    });

    let adaYangPasti = false;
    perSidik.forEach((sekelompok) => {
      if (sekelompok.length < 2) return;
      adaYangPasti = true;
      const simpan = sekelompok.reduce(lebihBaru);
      const hapus = sekelompok.filter((t) => t.id !== simpan.id);
      const nilai = hapus.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      if (simpan.type === "pemasukan") nilaiPemasukan += nilai;
      else nilaiPengeluaran += nilai;
      kembar.push({ reference_id: ref, simpan, hapus, nilai });
    });

    // Sisanya — beda jenis/jumlah/tanggal — tidak pernah disentuh otomatis.
    if (perSidik.size > 1 || !adaYangPasti) {
      ragu.push({ reference_id: ref, daftar });
    }
  });

  return {
    diperiksa: transactions.length,
    tanpaRujukan,
    kembar,
    ragu,
    totalHapus: kembar.reduce((s, k) => s + k.hapus.length, 0),
    nilaiPemasukan,
    nilaiPengeluaran,
  };
}
