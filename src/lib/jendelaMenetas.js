/**
 * jendelaMenetas.js — SATU tempat untuk "kapan clutch ini menetas".
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 13 Nov 2026 pemiliknya bertanya kenapa labelnya tidak memberi tahu kapan
 * telurnya menetas. Jawabannya: ada EMPAT angka untuk satu pertanyaan.
 *
 *   breedingCalendarUtils.js   HATCH_MIN_DAYS 80 / HATCH_MAX_DAYS 105
 *   BreedingForm.jsx           addDays(..., 80) dan addDays(..., 105)
 *                              ditulis telanjang di dalam penangan tanggal
 *   labelRingkas.js            membaca kolom estimated_hatch_start/_end
 *   labelUtils.js              bertelur + 90 hari, TETAP
 *
 * Yang terakhir itu salah, dan salahnya diam. 90 bukan 80 dan bukan 105 —
 * ia tidak cocok dengan ujung mana pun. Jadi dua label untuk KOTAK YANG SAMA
 * menyebut dua tanggal berbeda:
 *
 *   clutch A35 × A46, bertelur 4 Sep 2026
 *     label ringkas (50×30)  "23 Nov s/d 18 Des"   ← jendela sebenarnya
 *     label besar   (80 mm)  "3 Desember 2026"     ← bertelur + 90
 *
 * Tidak ada yang salah ketik. Keempatnya ditulis dengan niat benar, pada
 * waktu yang berbeda, oleh orang yang tidak tahu tiga lainnya ada.
 *
 * ── Kenapa jendela, bukan satu tanggal ───────────────────────────────
 *
 * Sulcata menetas 80–105 hari sesudah bertelur. Itu rentang 26 hari, dan
 * rentangnya nyata — bukan ketidaktahuan yang bisa dipersempit dengan
 * mencatat lebih rajin. Satu tanggal tunggal akan terbaca sebagai janji,
 * dan janji yang meleset dua minggu membuat orang berhenti mempercayai
 * seluruh angkanya.
 *
 * Yang dipakai untuk MENGURUTKAN adalah ujung BUKA-nya: clutch yang
 * jendelanya terbuka lebih dulu memang menetas lebih dulu, karena jendela
 * setiap clutch sama lebarnya. Lihat urutanMenetas.js.
 *
 * ── Kolom tersimpan menang atas hitungan ─────────────────────────────
 *
 * `estimated_hatch_start` / `_end` disimpan saat clutch dicatat. Keduanya
 * dipakai lebih dulu bila ada, dan hanya dihitung ulang bila kosong —
 * supaya clutch lama yang jendelanya pernah disetel tangan tidak berubah
 * diam-diam saat berkas ini dipasang.
 */

/** Hari tercepat sebuah telur sulcata menetas sesudah dikeluarkan induknya. */
export const HARI_MENETAS_MIN = 80;

/** Hari terlama. Selisihnya 25 hari, dan selisih itu memang ada. */
export const HARI_MENETAS_MAX = 105;

/** Teks "YYYY-MM-DD" → angka hari UTC, atau null. Bebas zona waktu. */
function hariDari(nilai) {
  if (nilai instanceof Date) {
    if (Number.isNaN(nilai.getTime())) return null;
    return Date.UTC(nilai.getFullYear(), nilai.getMonth(), nilai.getDate());
  }
  const m = String(nilai ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Angka hari UTC → "YYYY-MM-DD". */
function keTeks(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/**
 * Tanggal bertelur + n hari, sebagai "YYYY-MM-DD".
 *
 * Dihitung dalam hari UTC, bukan `new Date(teks)` lalu `addDays`: yang kedua
 * membaca "2026-09-04" sebagai tengah malam UTC lalu menambahkannya dalam
 * waktu setempat, dan di WIB hasilnya bisa bergeser sehari saat dicetak
 * ulang di sore hari. Lihat hitungMundur.js, yang memakai cara yang sama.
 */
export function tanggalTambahHari(tglBertelur, hari) {
  const awal = hariDari(tglBertelur);
  if (awal === null) return null;
  return keTeks(awal + hari * 86400000);
}

/**
 * Jendela menetas sebuah clutch.
 *
 * @returns {{ mulai: string|null, sampai: string|null, dihitung: boolean }}
 *   `dihitung` true bila jendelanya diturunkan dari tanggal bertelur, false
 *   bila diambil dari kolom yang tersimpan. Dipakai layar yang ingin
 *   mengatakan "perkiraan" dengan jujur.
 */
export function jendelaMenetas(breeding) {
  const tersimpanMulai = breeding?.estimated_hatch_start;
  const tersimpanSampai = breeding?.estimated_hatch_end;
  if (hariDari(tersimpanMulai) !== null) {
    return {
      mulai: String(tersimpanMulai).slice(0, 10),
      sampai: hariDari(tersimpanSampai) !== null ? String(tersimpanSampai).slice(0, 10) : null,
      dihitung: false,
    };
  }
  const bertelur = breeding?.egg_laying_date;
  if (hariDari(bertelur) === null) return { mulai: null, sampai: null, dihitung: false };
  return {
    mulai: tanggalTambahHari(bertelur, HARI_MENETAS_MIN),
    sampai: tanggalTambahHari(bertelur, HARI_MENETAS_MAX),
    dihitung: true,
  };
}

/**
 * Jendela untuk sebuah tanggal bertelur yang BELUM jadi clutch.
 *
 * Dipakai formulir saat orang baru mengetik tanggalnya dan belum menyimpan.
 */
export function jendelaDariBertelur(tglBertelur) {
  return {
    mulai: tanggalTambahHari(tglBertelur, HARI_MENETAS_MIN),
    sampai: tanggalTambahHari(tglBertelur, HARI_MENETAS_MAX),
  };
}
