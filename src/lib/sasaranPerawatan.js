/*
  Impor relatif ber-ekstensi, bukan "@/lib/umurKura": penjaga
  cek-kelamin.mjs memuat berkas ini langsung dengan node, dan node tidak
  mengenal alias "@". Dengan ini aturan penerima obat bisa diuji tanpa
  menjalankan seluruh aplikasi.
*/
import { golonganUmur } from "./umurKura.js";

/**
 * sasaranPerawatan.js — siapa yang benar-benar menerima sebuah jadwal
 * perawatan.
 *
 * ── Kolom yang disimpan tapi tidak pernah dibaca ────────────────────────────
 *
 * TreatmentSchedule punya DUA saringan: `gender_filter` dan `age_filter`.
 * Keduanya bisa dipilih di formulir, keduanya tersimpan, dan keduanya
 * ditampilkan di tabel syarat-ketentuan. Tetapi sampai 8 Nov 2026 hanya SATU
 * yang pernah dipakai memilih kura:
 *
 *     pool = tortoises.filter(t => t.gender === schedule.gender_filter)
 *
 * `age_filter` tidak muncul di satu pun baris kode yang memilih penerima.
 * Jadi jadwal "Kapsul DUTA FEMALE PLUS Harian (Betina)" — yang pemiliknya
 * tandai `age_filter: "dewasa"` — menyasar SETIAP kura berkelamin betina,
 * berapa pun umurnya. Tandanya terbaca di layar, terbaca di tabel, dan tidak
 * mengerjakan apa pun.
 *
 * Yang membuatnya berbahaya adalah pasangannya: jenis kelamin dulu bisa
 * ditebak sejak hari penetasan (lihat kelaminKura.js). Tebakan di hari nol,
 * ditambah saringan umur yang diam, berarti bayi 50 gram bisa masuk daftar
 * vitamin reproduksi betina dewasa — dan tidak ada layar mana pun yang akan
 * menyebutkan keganjilannya.
 *
 * ── Kenapa juvenile tidak ikut "dewasa" ─────────────────────────────────────
 *
 * Enum age_filter hanya punya "semua", "baby", dan "dewasa", sedangkan
 * golonganUmur mengenal "juvenile" di antaranya. Kura juvenile karena itu
 * tidak masuk ke mana pun kecuali "semua" — dan untuk jadwal reproduksi,
 * itulah yang benar: belum dewasa berarti belum perlu.
 *
 * Umur yang benar-benar tidak diketahui (tanggal lahir kosong dan
 * age_category kosong) juga tidak masuk "baby" maupun "dewasa". Memasukkannya
 * ke "dewasa" berarti menebak, dan menebak di daftar penerima obat adalah
 * persis kesalahan yang berkas ini ada untuk mencegahnya.
 */

/**
 * Saring daftar kura menurut saringan sebuah jadwal.
 *
 * Murni — tidak menyentuh jaringan — supaya bisa diuji dan dipakai di layar.
 *
 * @param {object[]} tortoises daftar kura
 * @param {object}   jadwal    { gender_filter, age_filter }
 * @param {Date}     pada      acuan tanggal, untuk pengujian
 */
export function saringTarget(tortoises = [], jadwal = {}, pada = new Date()) {
  const kelamin = jadwal?.gender_filter || "semua";
  const umur = jadwal?.age_filter || "semua";

  return (tortoises || []).filter((t) => {
    if (!t) return false;
    if (kelamin !== "semua" && t.gender !== kelamin) return false;
    if (umur !== "semua" && golonganUmur(t, pada) !== umur) return false;
    return true;
  });
}
