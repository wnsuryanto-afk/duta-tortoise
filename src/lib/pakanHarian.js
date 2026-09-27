/**
 * pakanHarian.js — SATU cara membaca jumlah pakan yang dicatat.
 *
 * ── Kenapa ini tidak boleh jadi satu angka ─────────────────────────────────
 *
 * Sampai 27-09-2026 PakanHarian hanya punya `basket_count`, dan empat layar
 * menjumlahkannya begitu saja menjadi "N keranjang". Tapi yang sungguh
 * dilakukan di lapangan adalah MENIMBANG: catatan 8 September berbunyi
 * Mentimun 64,97 — enam puluh lima kilogram, tersimpan dan ditampilkan
 * sebagai enam puluh lima keranjang.
 *
 * Sejak ada `weight_kg`, menjumlahkan keduanya menjadi satu angka adalah
 * kesalahan yang sama sekali baru: 65 kg + 7 keranjang bukan 72 apa pun.
 * Keduanya dihitung terpisah dan ditulis terpisah.
 *
 * ── Baris penanda trip ─────────────────────────────────────────────────────
 *
 * Tombol "Trip sayur" di layar harian menulis PakanHarian dengan
 * `basket_count: 0` dan tanpa foto — yang dibayar perjalanannya, bukan
 * isinya. Baris seperti itu BUKAN pencatatan pakan, jadi ia tidak boleh
 * membuat layar mengumumkan "pakan hari ini sudah dicatat".
 */

/** Data uji dan baris yang sengaja dikecualikan tidak ikut dihitung. */
function nyata(l) {
  return l && l.is_test_data !== true && l.excluded_from_reports !== true;
}

/**
 * Apakah baris ini benar-benar membawa jumlah pakan?
 *
 * Baris penanda trip (jumlahnya nol di kedua satuan) tidak.
 */
export function adaJumlah(l) {
  return Number(l?.weight_kg) > 0 || Number(l?.basket_count) > 0;
}

/** Jumlah pakan per satuan: { kg, keranjang, jumlahCatatan }. */
export function totalPakan(logs = []) {
  let kg = 0;
  let keranjang = 0;
  let jumlahCatatan = 0;
  for (const l of logs) {
    if (!nyata(l) || !adaJumlah(l)) continue;
    kg += Number(l.weight_kg) || 0;
    keranjang += Number(l.basket_count) || 0;
    jumlahCatatan += 1;
  }
  return { kg, keranjang, jumlahCatatan };
}

/** Angka tanpa nol di belakang koma yang tidak perlu: 64,97 dan 7, bukan 64,97 dan 7,00. */
function angka(n) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

/**
 * Jumlah pakan sebagai kalimat pendek. "" bila memang belum ada yang dicatat.
 *
 * Dua satuan ditulis berdampingan ("64,97 kg · 7 keranjang"), tidak
 * dijumlahkan dan tidak dipilih salah satunya.
 */
export function teksJumlah(logs = []) {
  const { kg, keranjang } = totalPakan(logs);
  const bagian = [];
  if (kg > 0) bagian.push(`${angka(kg)} kg`);
  if (keranjang > 0) bagian.push(`${angka(keranjang)} keranjang`);
  return bagian.join(" · ");
}

/** Jumlah satu baris sebagai kalimat pendek, untuk daftar riwayat. */
export function teksBaris(l) {
  const bagian = [];
  if (Number(l?.weight_kg) > 0) bagian.push(`${angka(l.weight_kg)} kg`);
  if (Number(l?.basket_count) > 0) bagian.push(`${angka(l.basket_count)} keranjang`);
  return bagian.join(" · ") || "jumlah tidak dicatat";
}

/** Apakah pakan hari ini sudah benar-benar dicatat (bukan sekadar penanda trip)? */
export function sudahDicatat(logs = []) {
  return logs.some((l) => nyata(l) && adaJumlah(l));
}
