/**
 * targetTahunan.js — kemajuan target tahunan, DIBANDINGKAN DENGAN WAKTU.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Target 2026 sudah lama tersimpan di entitas AnnualGoal — 500 telur dan omzet
 * Rp 300 juta, ditetapkan 21 Mei 2026. Tetapi satu-satunya tempat yang
 * menampilkannya ada di baris 1332 dari 1579 di beranda Owner: untuk melihat
 * apakah targetnya tercapai, pemiliknya harus menggulir melewati seluruh
 * halaman. Yang terlihat di kepala halaman justru "Laba 2026 Rp 42.301.151"
 * berwarna hijau — angka yang tidak dibandingkan dengan apa pun.
 *
 * ── Persentase saja menyesatkan ─────────────────────────────────────────────
 *
 * Widget lama menghitung `capai / target` lalu menggambar satu bilah. Diukur
 * 11 Okt 2026, itu berbunyi "21%" untuk omzet — dan 21% terdengar seperti awal
 * yang pelan, bukan seperti masalah.
 *
 * Yang hilang adalah WAKTU. Pada 11 Oktober, 78% tahun sudah lewat. Target
 * yang baru 21% pada titik itu tidak pelan; ia tertinggal 57 poin, dan untuk
 * mengejarnya perlu Rp 2,94 juta per hari selama 81 hari sisa — tiga belas
 * kali rata-rata yang benar-benar terjadi sepanjang tahun ini.
 *
 * Karena itu setiap angka di sini selalu membawa pasangannya: berapa yang
 * sudah dicapai, DAN di mana seharusnya berada kalau lajunya rata. Tanpa yang
 * kedua, bilah kemajuan hanya memberi rasa tenang yang tidak dibayar apa pun.
 *
 * ── Kenapa dipisah jadi fungsi murni ────────────────────────────────────────
 *
 * Angka ini akan tampil di DUA tempat: ringkas di kepala beranda, dan lengkap
 * di AnnualGoalWidget. Dua tempat yang menghitung sendiri-sendiri adalah dua
 * angka yang pelan-pelan berselisih — persis yang pernah terjadi antara
 * lencana "Kura di peternakan" (194) dan kartu "Kawanan hari ini" (200) di
 * layar yang sama. Satu fungsi, dua pembaca.
 */

/** Hari ke berapa dalam tahun, 1 untuk 1 Januari. */
function hariKe(tanggal) {
  const awal = Date.UTC(tanggal.getUTCFullYear(), 0, 1);
  const kini = Date.UTC(tanggal.getUTCFullYear(), tanggal.getUTCMonth(), tanggal.getUTCDate());
  return Math.floor((kini - awal) / 86400000) + 1;
}

/** Jumlah hari dalam satu tahun — 366 di tahun kabisat. */
export function hariSetahun(tahun) {
  return (tahun % 4 === 0 && tahun % 100 !== 0) || tahun % 400 === 0 ? 366 : 365;
}

/**
 * Satu sasaran: berapa yang dicapai, di mana seharusnya, dan apa artinya.
 *
 * `persenWaktu` sengaja TIDAK dipotong di 100: pada 31 Desember ia tepat 100,
 * dan itulah yang membuat bilahnya jujur di hari terakhir.
 *
 * `persen` DIPOTONG di 100 untuk menggambar bilah, tetapi `persenAsli`
 * dibiarkan apa adanya — melampaui target adalah kabar yang layak dibaca,
 * bukan dibulatkan jadi "pas".
 */
function sasaran(capai, target, persenWaktu, sisaHari) {
  const c = Number(capai) || 0;
  const t = Number(target) || 0;
  if (t <= 0) return null;

  const persenAsli = (c / t) * 100;
  const kurang = Math.max(0, t - c);

  return {
    capai: c,
    target: t,
    persen: Math.min(100, Math.round(persenAsli)),
    persenAsli: Math.round(persenAsli),
    /** Selisih terhadap waktu, dalam poin persen. Negatif = tertinggal. */
    selisihPoin: Math.round(persenAsli - persenWaktu),
    kurang,
    /** Berapa per hari yang dibutuhkan untuk menutup sisanya. */
    perluPerHari: sisaHari > 0 ? kurang / sisaHari : kurang,
    status: tingkat(persenAsli, persenWaktu),
  };
}

/**
 * Tiga tingkat, bukan dua.
 *
 * Ambang 10 poin bukan angka yang dipilih supaya hijau: ia kira-kira satu
 * setengah bulan dari dua belas. Tertinggal sebanyak itu masih bisa dikejar
 * dalam satu musim bertelur; lebih dari itu menuntut perubahan cara kerja,
 * bukan sekadar bekerja lebih rajin.
 */
function tingkat(persenAsli, persenWaktu) {
  if (persenAsli >= persenWaktu) return "aman";
  if (persenAsli >= persenWaktu - 10) return "waspada";
  return "tertinggal";
}

/**
 * Kemajuan target satu tahun.
 *
 * @param {object} p
 * @param {object} p.goal            satu baris AnnualGoal (boleh null)
 * @param {number} p.telur           telur yang sudah tercatat tahun ini
 * @param {number} p.omzet           omzet yang sudah tercatat tahun ini
 * @param {Date}   [p.hariIni]       disuntikkan supaya bisa diuji
 * @returns {null|{tahun, persenWaktu, sisaHari, telur, omzet}}
 *   `null` bila belum ada target — yang memanggil lalu menawarkan
 *   penetapannya, bukan menggambar bilah kosong yang berarti "nol".
 */
export function kemajuanTarget({ goal, telur = 0, omzet = 0, hariIni = new Date() } = {}) {
  if (!goal) return null;

  const tahun = Number(goal.year) || hariIni.getUTCFullYear();
  const total = hariSetahun(tahun);
  const lewat = Math.min(total, Math.max(0, hariKe(hariIni)));
  const sisaHari = Math.max(0, total - lewat);
  const persenWaktu = Math.round((lewat / total) * 100);

  return {
    tahun,
    hariLewat: lewat,
    sisaHari,
    persenWaktu,
    telur: sasaran(telur, goal.egg_production_target, persenWaktu, sisaHari),
    omzet: sasaran(omzet, goal.revenue_target, persenWaktu, sisaHari),
  };
}

/**
 * Kalimat pendek untuk satu sasaran — dipakai di panel sempit.
 *
 * Yang dikatakan adalah TINDAKANNYA, bukan keadaannya: "perlu 1,9/hari" bisa
 * dikerjakan, "tertinggal 9 poin" hanya bisa dirasakan.
 */
export function kalimatSasaran(s, satuan = "", format) {
  if (!s) return "";
  if (s.kurang <= 0) return "tercapai";
  /*
    `format` dioper pemanggil supaya angka uang tetap ditulis dengan aturan
    rupiah yang satu itu (lib/rupiah.js). Tanpa itu baris omzetnya berbunyi
    "perlu 2.940.478/hari" — angka telanjang yang bisa dibaca sebagai jumlah
    apa pun, dan di panel yang sebelahnya menulis "1,9 telur/hari" ia terbaca
    seperti satuan yang sama.
  */
  const tulis = typeof format === "function"
    ? format
    : (n) => (n >= 10 ? Math.round(n).toLocaleString("id-ID") : n.toFixed(1).replace(".", ","));
  if (s.perluPerHari <= 0) return `kurang ${tulis(s.kurang)}${satuan}`;
  return `perlu ${tulis(s.perluPerHari)}${satuan}/hari`;
}
