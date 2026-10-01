/**
 * jadwalPerawatan.js - SATU DEFINISI kapan sebuah jadwal perawatan berlaku.
 *
 * Sebelum berkas ini ada, layar kiper menyaring jadwal dengan aturan pendek:
 * tampilkan yang "harian", dan yang "mingguan" bila hari ini ada di dalam
 * weekly_days. Aturan itu diam-diam membuang SEPULUH dari empat belas jadwal:
 *
 *   - Enam jadwal mingguan punya weekly_days KOSONG. Daftar kosong tidak
 *     pernah memuat hari apa pun, jadi keenamnya tidak pernah tampil. Padahal
 *     di tugas SOP (lib/kepatuhanSOP.js) daftar kosong berarti kebalikannya:
 *     "berlaku setiap hari". Satu bentuk data, dua arti yang bertolak belakang.
 *
 *   - Empat frekuensi lain - musiman, bulanan, dua_mingguan, quarterly -
 *     tidak pernah ditangani sama sekali, jadi selalu jatuh ke "tidak".
 *
 * Yang paling mahal dari kesepuluh itu: "Boost Kalsium Betina (Musim Bertelur)"
 * dan "Cek Kloaka Betina (Tanda Mau Bertelur)", keduanya musiman. Catatan pada
 * jadwal itu sendiri berbunyi "Defisiensi kalsium saat gravid = risiko egg
 * binding" - dan B119 mati karena egg binding pada 24 Juni 2026. Pencegahannya
 * ada di aplikasi, tertulis lengkap, dan tidak pernah sampai ke tangan kiper.
 *
 * Jadwal yang menyala tetapi tidak pernah muncul lebih buruk daripada jadwal
 * yang mati: yang mati terlihat mati, yang seperti ini terlihat sudah beres.
 */

/** Hari ini dalam angka 0-6 (0 = Minggu), dari objek Date. */
function hariMinggu(d) {
  return d.getDay();
}

// Selisih hari memakai tengah malam lokal — supaya jam pemberian tidak
// menggeser hitungan. Aturannya sekarang di lib/safeDate.js, satu untuk
// seluruh aplikasi.
import { selisihHari as hariAntara } from "@/lib/safeDate";

const selisihHari = (dari, sampai) => hariAntara(dari, sampai) ?? 0;

/**
 * Apakah jadwal ini berlaku pada tanggal tertentu?
 *
 * @param {object} jadwal   satu TreatmentSchedule
 * @param {object} keadaan  { hari, musimBertelur, racikanTersedia, mulai }
 *   - hari            Date yang diperiksa (bawaan: hari ini)
 *   - musimBertelur   apakah musim bertelur sedang dinyatakan aktif oleh pemilik
 *   - racikanTersedia apakah racikan Duta Repro sedang ada stoknya
 *   - mulai           titik hitung untuk frekuensi berinterval (bawaan: 1 Jan tahun berjalan)
 */
export function berlakuHariIni(jadwal, keadaan = {}) {
  if (!jadwal || jadwal.is_active !== true) return false;

  const hari = keadaan.hari instanceof Date ? keadaan.hari : new Date();

  // ATURAN MUNDUR RACIKAN TIDAK LAGI DI SINI.
  //
  // Aturannya sekarang ada di sesuaikanMundurRacikan() di bawah, karena ia
  // perlu MENGUBAH jadwal (mempersempit ke jantan), bukan sekadar menjawab
  // ya/tidak. jadwalBerlaku() memanggilnya lebih dulu, jadi pemakai pustaka
  // ini tidak perlu tahu bedanya. Kalau Anda memanggil berlakuHariIni()
  // langsung, jalankan sesuaikanMundurRacikan() lebih dulu.

  const f = jadwal.frequency;

  if (f === "harian") return true;

  if (f === "dua_harian") {
    const n = Number(jadwal.frequency_interval_days) || 2;
    const mulai = keadaan.mulai instanceof Date ? keadaan.mulai : new Date(hari.getFullYear(), 0, 1);
    return selisihHari(mulai, hari) % n === 0;
  }

  if (f === "mingguan") {
    const daftar = Array.isArray(jadwal.weekly_days) ? jadwal.weekly_days : [];
    // Daftar kosong = berlaku setiap hari dalam seminggu. Arti yang sama dengan
    // tugas SOP; sebelumnya di sini artinya "tidak pernah".
    return daftar.length === 0 || daftar.includes(hariMinggu(hari));
  }

  if (f === "dua_mingguan") {
    const n = Number(jadwal.frequency_interval_days) || 14;
    const mulai = keadaan.mulai instanceof Date ? keadaan.mulai : new Date(hari.getFullYear(), 0, 1);
    return selisihHari(mulai, hari) % n === 0;
  }

  if (f === "bulanan") {
    const tgl = Array.isArray(jadwal.monthly_dates) ? jadwal.monthly_dates : [];
    // Tanpa tanggal yang ditentukan, jatuh ke tanggal 1 - satu hari yang pasti,
    // bukan setiap hari. Jadwal bulanan yang muncul tiap hari akan diabaikan.
    return tgl.length === 0 ? hari.getDate() === 1 : tgl.includes(hari.getDate());
  }

  if (f === "quarterly") {
    const n = Number(jadwal.frequency_interval_days) || 90;
    const mulai = keadaan.mulai instanceof Date ? keadaan.mulai : new Date(hari.getFullYear(), 0, 1);
    return selisihHari(mulai, hari) % n === 0;
  }

  if (f === "tahunan") {
    const tgl = Array.isArray(jadwal.monthly_dates) ? jadwal.monthly_dates : [];
    return hari.getMonth() === 0 && (tgl.length === 0 ? hari.getDate() === 1 : tgl.includes(hari.getDate()));
  }

  if (f === "musiman") {
    // Musim bertelur tidak dihitung dari kalender.
    //
    // Yang menentukan bukan bulan, melainkan tanda di lapangan - betina mulai
    // gelisah, menggali, mencari tempat. Pemilik yang melihatnya, bukan
    // aplikasi. Maka jadwal musiman mengikuti satu sakelar yang dinyalakan
    // manusia (CompanySettings.musim_bertelur_aktif), dan selama sakelar itu
    // menyala ia berlaku setiap hari.
    return keadaan.musimBertelur === true;
  }

  return false;
}


/**
 * Sesuaikan satu jadwal terhadap keberadaan racikan Duta Repro.
 *
 * KENAPA ADA: racikan Duta Repro HANYA diberikan kepada betina - 15 g/ekor,
 * dan tugas SOP-nya memang tertulis "SEMUA kura BETINA". Tetapi jadwal kalsium
 * dan vitamin E yang mundur karenanya berlaku untuk SEMUA kura. Aturan lama
 * mematikan jadwal itu seluruhnya begitu racikan ada stoknya, sehingga 28 kura
 * JANTAN berhenti menerima 10 g kalsium per hari - tanpa satu pun layar yang
 * memberi tahu, karena dari luar jadwalnya terlihat "sudah tergantikan".
 *
 * Kura jantan tidak pernah menerima racikan itu. Tidak ada yang menggantikan
 * apa pun untuk mereka.
 *
 * @returns jadwal yang berlaku (kadang dipersempit ke jantan), atau null bila
 *   isinya memang sudah seluruhnya digantikan racikan.
 */
// Keputusan Iwan 01-09-2026: pilihan A — aturan mundur dibuat sadar jenis
// kelamin, bukan dipecah jadi dua jadwal terpisah. Satu jadwal tetap satu
// baris di layar kiper.
export function sesuaikanMundurRacikan(jadwal, racikanTersedia) {
  if (!jadwal) return null;
  if (jadwal.nonaktif_bila_racikan_ada !== true) return jadwal;
  if (racikanTersedia !== true) return jadwal;

  const untuk = jadwal.gender_filter || "semua";

  // Khusus betina: isinya benar-benar sudah ada di racikan. Mundur seluruhnya.
  if (untuk === "betina") return null;

  // Khusus jantan: racikan tidak menyentuh mereka sama sekali. Tetap jalan.
  if (untuk === "jantan") return jadwal;

  // Untuk semua kura: yang tergantikan hanya bagian betinanya. Sisakan jantan.
  return { ...jadwal, gender_filter: "jantan" };
}

/** Saring satu daftar jadwal untuk hari tertentu. */
export function jadwalBerlaku(daftar = [], keadaan = {}) {
  return (daftar || [])
    .map((j) => sesuaikanMundurRacikan(j, keadaan.racikanTersedia === true))
    .filter((j) => j && berlakuHariIni(j, keadaan));
}

/**
 * Jadwal yang MENGATAKAN satu irama tetapi DIJALANKAN dengan irama lain.
 *
 * ── Kenapa fungsi ini ada ───────────────────────────────────────────
 *
 * Sebuah jadwal berjudul "Vitamin E IPI Selang-Seling (2 Hari Sekali)",
 * dengan seluruh takarannya dihitung untuk empat kali pemberian per
 * minggu, punya `frequency: "harian"` — tampil tujuh kali seminggu, dua
 * kali lipat dari rancangannya.
 *
 * Cacatnya sudah DIKETAHUI dan ditulis di catatan jadwal itu sendiri:
 * "perbaiki frekuensinya lebih dulu bila kelak dihidupkan lagi tanpa
 * racikan". Tetapi peringatan itu sebuah KOMENTAR, sedangkan yang
 * menghidupkannya kembali adalah KODE: jadwal ini MUNDUR selama racikan
 * Duta Repro ada stoknya, dan "hidup lagi dengan sendirinya" begitu
 * racikan habis. Pada 01-10-2026 racikan habis, tiga jadwal hidup
 * kembali sendiri, dan tidak ada satu pun yang memberi tahu siapa pun.
 *
 * Catatan yang menunggu dibaca manusia tidak bisa menjaga sesuatu yang
 * dihidupkan mesin. Jadi ketidakcocokannya sekarang dihitung dari
 * datanya sendiri dan bisa ditampilkan.
 *
 * Yang diperiksa hanya yang benar-benar bisa dibaca dari teksnya, dan
 * hanya ke arah yang berbahaya: teks menyebut jeda beberapa hari,
 * sementara kolomnya berbunyi "harian". Sebaliknya — kolom berjeda
 * sementara teks menyebut harian — TIDAK dilaporkan, karena memberi
 * lebih jarang daripada tertulis tidak menggandakan dosis siapa pun.
 *
 * @param {object} jadwal satu TreatmentSchedule
 * @returns {{tertulisHari: number} | null} null bila cocok atau tidak terbaca
 */
export function iramaTakCocok(jadwal) {
  if (!jadwal || jadwal.is_active !== true) return null;
  if (jadwal.frequency !== "harian") return null;

  const teks = [jadwal.title, jadwal.sop_task_title, jadwal.treatment_name, jadwal.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // "2 hari sekali", "tiap 3 hari", "setiap dua hari sekali"
  const ANGKA = { dua: 2, tiga: 3, empat: 4 };
  const m =
    teks.match(/(?:tiap|setiap)\s+(\d+|dua|tiga|empat)\s+hari/) ||
    teks.match(/(\d+|dua|tiga|empat)\s+hari\s+sekali/);
  if (!m) return null;

  const n = ANGKA[m[1]] ?? Number(m[1]);
  if (!Number.isFinite(n) || n <= 1) return null;

  return { tertulisHari: n };
}
