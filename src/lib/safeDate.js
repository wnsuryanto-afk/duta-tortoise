import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * safeDate.js — SATU pembaca tanggal yang tidak pernah melempar
 * "Invalid time value".
 *
 * ── Kenapa ini berbahaya sebelum disatukan ─────────────────────────────────
 *
 * Ada dua `safeFormatDate` di aplikasi ini, dan argumen ketiganya berarti
 * HAL YANG BERBEDA:
 *
 *   lib/safeDate.js          (value, pola, locale)
 *   lib/weeklySalaryUtils.js (value, pola, fallback)
 *
 * Keduanya bernama sama, menerima jumlah argumen yang sama, dan mengembalikan
 * string. Jadi salah impor tidak menghasilkan error: ia menghasilkan
 * `format(d, pola, { locale: "-" })`, yang melempar di dalam, tertangkap
 * `catch`, dan mengembalikan "—". Seluruh tanggal di layar itu berubah jadi
 * garis — diam-diam, tanpa satu pun pesan di konsol.
 *
 * Sekarang argumen ketiganya `fallback` di kedua tempat, karena itu yang
 * benar-benar dipakai: locale-nya selalu Indonesia, dan tidak ada satu pun
 * pemanggil yang pernah mengirim locale lain.
 */

/** Apakah ini benar-benar Date yang sah? */
export function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Baca tanggal, kembalikan Date atau null.
 *
 * Teks "null" dan "undefined" ikut ditolak: keduanya sungguh tersimpan di data
 * lama, dan `new Date("null")` menghasilkan Invalid Date yang kalau lolos akan
 * muncul di layar sebagai "Invalid Date".
 */
export function safeParseDate(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && (value === "null" || value === "undefined")) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isValidDate(d) ? d : null;
}

/**
 * Tanggal terformat, atau `fallback` bila tanggalnya tidak terbaca.
 *
 * Fallback-nya bisa diisi karena tidak semua layar ingin garis: slip gaji
 * memakai nama periodenya sendiri, dan sebagian tempat justru ingin kosong
 * supaya tidak ada "—" menggantung di tengah kalimat.
 */
export function safeFormatDate(value, pola = "d MMM yyyy", fallback = "—") {
  const d = safeParseDate(value);
  if (!d) return fallback;
  try {
    return format(d, pola, { locale: id });
  } catch {
    return fallback;
  }
}

/** Selisih hari penuh dari `dateStr` sampai hari ini. null bila tidak terbaca. */
export function safeDaysSince(dateStr) {
  const d = safeParseDate(dateStr);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

/**
 * Selisih hari KALENDER antara dua tanggal. null bila salah satunya tak terbaca.
 *
 * ── Kenapa ini perlu satu tempat ───────────────────────────────────────────
 *
 * Ada empat `selisihHari` di aplikasi ini, masing-masing ditulis ulang di
 * berkasnya sendiri, dan keempatnya berbeda dalam hal yang tidak terlihat dari
 * namanya:
 *
 *   lib/hppKura.js         bulat terdekat, dipaksa ≥ 0, 0 bila tak terbaca
 *   lib/jadwalTimbang.js   dibulatkan ke bawah, boleh negatif, null bila tak terbaca
 *   lib/jadwalPerawatan.js hanya menerima objek Date, tengah malam LOKAL
 *   lib/piutang.js         hanya menerima "YYYY-MM-DD", tengah malam LOKAL
 *
 * Yang paling mahal bukan bulat-ke-atas atau ke-bawahnya, melainkan ZONA
 * WAKTUNYA. Dua yang pertama membaca "2026-09-27" lewat `new Date(...)`, yang
 * berarti tengah malam UTC — pukul 07:00 di Jakarta. Dua yang terakhir membaca
 * tengah malam lokal. Selama kedua sisinya sama-sama teks tanggal, selisihnya
 * saling meniadakan dan tidak ada yang salah. Tapi `bulanDiFarm` di hppKura
 * membandingkan teks tanggal (UTC) dengan `new Date()` (waktu lokal sekarang),
 * dan tujuh jam yang tergeser itu bisa menjadi satu hari penuh saat dibulatkan
 * — diam-diam, pada sebagian kura saja, tergantung jam berapa halamannya
 * dibuka.
 *
 * Di sini keduanya diturunkan ke tengah malam LOKAL lebih dulu, jadi yang
 * dihitung benar-benar jarak antar hari di kalender — bukan jarak antar
 * detik yang kebetulan dibulatkan.
 *
 * Pembulatan dan penjepitan ke nol TIDAK ikut ditentukan di sini: "mundur dua
 * hari" adalah keadaan yang sah untuk jadwal, dan mustahil untuk lama
 * pemeliharaan. Yang memanggil yang tahu bedanya.
 */
export function selisihHari(dari, sampai) {
  const a = pagiLokal(dari);
  const b = pagiLokal(sampai);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86400000);
}

/**
 * Tengah malam LOKAL dari sebuah tanggal, sebagai milidetik. null bila tak terbaca.
 *
 * Teks "YYYY-MM-DD" dirakit dari angkanya sendiri, TIDAK lewat `new Date(teks)`.
 * `new Date("2026-09-27")` berarti tengah malam UTC, dan di zona waktu barat
 * itu jatuh pada tanggal 26 — tanggal yang tertulis di layar berubah hanya
 * karena peramban yang membacanya berada di tempat lain.
 */
export function pagiLokal(nilai) {
  const teks = typeof nilai === "string" ? nilai.trim() : "";
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(teks);
  if (cocok) {
    return new Date(Number(cocok[1]), Number(cocok[2]) - 1, Number(cocok[3])).getTime();
  }
  const d = safeParseDate(nilai);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Hari ini dalam "YYYY-MM-DD", menurut jam SETEMPAT.
 *
 * Bukan `new Date().toISOString().slice(0,10)`, yang memberi tanggal UTC: di
 * Jakarta setiap hari sebelum pukul tujuh pagi, cara itu masih menyebut
 * tanggal kemarin — dan pekerjaan di peternakan ini dimulai pukul tujuh.
 *
 * Tinggal di sini, bukan di lib/hariBolong.js tempat ia lahir: itu pustaka
 * fitur, ini pustaka tanggal. hariBolong.js meneruskannya supaya pemanggil
 * lama tetap bekerja.
 */
export function tanggalHariIni(sekarang = new Date()) {
  const d = sekarang instanceof Date && !isNaN(sekarang.getTime()) ? sekarang : new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Tanggal sebuah Date dalam "YYYY-MM-DD", menurut jam SETEMPAT.
 *
 * Dipakai untuk tanggal TURUNAN — hasil hitungan, bukan "hari ini":
 * tujuh hari terakhir di grafik beranda, daftar tanggal di laporan gaji,
 * tanggal kedaluwarsa pelet, batas waktu penilaian. Semuanya dirakit dengan
 * `new Date(tahun, bulan, hari)`, yang berarti tengah malam SETEMPAT — dan
 * `toISOString()` pada tengah malam setempat di Jakarta jatuh pada pukul
 * 17:00 hari SEBELUMNYA. Jadi tiap tanggal turunan bergeser satu hari,
 * selalu, bukan cuma sebelum pukul tujuh pagi.
 *
 * Mengembalikan "" bila nilainya tidak terbaca sebagai tanggal — bukan
 * tanggal hari ini, karena pemanggil yang menyangka punya tanggal padahal
 * tidak sebaiknya melihat kekosongan itu, bukan angka yang menenangkan.
 */
export function tanggalLokal(nilai) {
  // Teks yang SUDAH berbentuk tanggal dikembalikan apa adanya: melewatkannya
  // lewat `new Date(teks)` berarti tengah malam UTC, dan di zona waktu barat
  // itu jatuh pada tanggal sebelumnya — tanggal yang tertulis berubah hanya
  // karena dibaca ulang.
  if (typeof nilai === "string") {
    const cocok = /^\d{4}-\d{2}-\d{2}/.exec(nilai.trim());
    if (cocok) return cocok[0];
  }
  const d = nilai instanceof Date ? nilai : safeParseDate(nilai);
  if (!isValidDate(d)) return "";
  return tanggalHariIni(d);
}

/**
 * Bulan ini dalam "YYYY-MM", menurut jam SETEMPAT.
 *
 * `new Date().toISOString().slice(0, 7)` benar selama 30 hari dari 31, lalu
 * salah pada yang satu itu: setiap tanggal 1 sebelum pukul tujuh pagi ia
 * masih menyebut bulan LALU. Yang membacanya adalah rekap bulanan kas kecil,
 * target penjualan, dan biaya per kura — tiga layar yang justru dibuka pagi
 * hari di awal bulan, saat orang ingin tahu bulan baru dimulai dari mana.
 */
export function bulanHariIni(sekarang = new Date()) {
  return tanggalHariIni(sekarang).slice(0, 7);
}

/**
 * Saat ini dalam "YYYY-MM-DDTHH:mm", menurut jam SETEMPAT.
 *
 * Bentuk yang diminta `<input type="datetime-local">`. Isian itu TIDAK
 * mengenal zona waktu: apa pun yang ditulis di situ dibaca sebagai jam
 * setempat. Jadi mengisinya dengan `new Date().toISOString().slice(0, 16)`
 * memberi jam UTC yang lalu dibaca sebagai jam setempat — di Jakarta
 * pembacaan inkubator pukul 14:00 muncul sebagai 07:00, tujuh jam yang
 * hilang tanpa ada yang salah ketik.
 */
export function waktuLokalSekarang(sekarang = new Date()) {
  const d = isValidDate(sekarang) ? sekarang : new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${tanggalHariIni(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
