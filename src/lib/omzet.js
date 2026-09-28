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

/** Nama bulan pendek, dipakai sebagai label sumbu grafik. */
export const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

/** Rentang satu tahun penuh, siap dipakai hitungOmzet. */
export function rentangTahun(tahun) {
  return { dari: `${tahun}-01-01`, sampai: `${tahun}-12-31` };
}

/**
 * Omzet, pengeluaran, dan laba per bulan sepanjang satu tahun.
 *
 * ── Kenapa bulan yang belum terjadi tidak digambar ─────────────────────────
 *
 * Kalau seluruh dua belas bulan selalu digambar, Oktober sampai Desember 2026
 * akan berdiri sebagai batang nol di sebelah September. Mata membaca itu
 * sebagai omzet yang jatuh ke nol dan bertahan di sana — padahal bulannya
 * memang belum datang. Maka untuk tahun berjalan grafiknya berhenti di bulan
 * sekarang; untuk tahun yang sudah lewat, dua belas bulan semuanya nyata.
 *
 * Kunci `masuk` dan `keluar` sengaja dipakai supaya hasilnya bisa langsung
 * diberikan ke <GrafikUang> tanpa dipetakan ulang di komponen.
 *
 * @param {Array}  finances FinanceTransaction
 * @param {number} tahun    misal 2026
 * @param {number} hinggaBulan 1-12; bulan terakhir yang ikut digambar
 */
export function omzetPerBulan(finances = [], tahun, hinggaBulan = 12) {
  // `Number(x) || 12` TIDAK dipakai di sini, dan itu disengaja: nol adalah
  // nilai palsu, jadi hinggaBulan = 0 akan diam-diam berubah jadi dua belas —
  // meminta "jangan gambar apa pun" malah menggambar setahun penuh. Jebakan
  // yang sama ada di lib/tenggatNyata.js (keMenit) dan sudah dua kali lolos.
  const n = typeof hinggaBulan === "number" && Number.isFinite(hinggaBulan)
    ? Math.trunc(hinggaBulan)
    : 12;
  const batas = Math.max(1, Math.min(12, n));
  return Array.from({ length: batas }, (_, i) => {
    const bulan = String(i + 1).padStart(2, "0");
    const kunci = `${tahun}-${bulan}`;
    // Akhir bulan tidak perlu dihitung: semua tanggal bulan itu berawalan
    // "YYYY-MM-", jadi rentangnya cukup dari "-01" sampai "-32" — di atas
    // tanggal mana pun yang mungkin ada, dan masih di bawah bulan berikutnya.
    const b = hitungOmzet(finances, { dari: `${kunci}-01`, sampai: `${kunci}-32` });
    return {
      kunci,
      label: NAMA_BULAN[i],
      omzet: b.omzet,
      pengeluaran: b.pengeluaran,
      laba: b.laba,
      jumlahPenjualan: b.jumlahPenjualan,
      // untuk <GrafikUang>
      masuk: b.totalMasuk,
      keluar: b.pengeluaran,
    };
  });
}

/**
 * Berapa bulan terakhir berturut-turut yang rugi.
 *
 * ── Kenapa ini ada ─────────────────────────────────────────────────────────
 *
 * Omzet setahun yang besar bisa menutupi dua bulan terakhir yang merugi —
 * persis kebalikan dari masalah yang dulu: laba sebulan tanpa omzet di
 * sebelahnya. Angka tahunan menjawab "sudah sejauh mana", bukan "sedang ke
 * mana". Yang kedua itu yang menentukan keputusan belanja minggu depan.
 *
 * Bulan tanpa transaksi apa pun berlaba nol, jadi ia memutus rentetan dengan
 * sendirinya — dan memang seharusnya begitu: tidak ada catatan bukan kerugian.
 */
export function bulanRugiBeruntun(daftar = []) {
  const hasil = [];
  for (let i = daftar.length - 1; i >= 0; i--) {
    if (!(daftar[i]?.laba < 0)) break;
    hasil.unshift(daftar[i]);
  }
  return hasil;
}
