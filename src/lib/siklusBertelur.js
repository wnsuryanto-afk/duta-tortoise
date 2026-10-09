/**
 * siklusBertelur.js — "bulan depan dia bertelur lagi, atau tidak?"
 *
 * ── Pengamatan pemilik, dan apakah datanya mendukungnya ─────────────────────
 *
 * Pemilik menyebutnya lebih dulu: "ada kecenderungan kura yang sudah bertelur
 * akan bertelur lagi pada bulan berikutnya, tapi tidak selalu."
 *
 * Data kebun ini mendukungnya, dan cukup rapat. Sampai 9 Oktober 2026 ada LIMA
 * jarak antar-clutch yang benar-benar terukur:
 *
 *   C23   12 Agu -> 9 Sep -> 2 Okt      jarak 28 dan 23 hari
 *   A46    4 Sep -> 4 Okt               jarak 30 hari
 *   A31    4 Sep -> 1 Okt               jarak 27 hari
 *   C24    9 Mar -> 8 Apr               jarak 30 hari
 *
 *   semuanya: 23, 27, 28, 30, 30   — median 28 hari
 *
 * Tidak ada satu pun yang di bawah 23 atau di atas 30. Itu dasar yang cukup
 * untuk menyiapkan sarang, dan TIDAK cukup untuk menjanjikan tanggal.
 *
 * ── Karena itu yang dikembalikan jendela, bukan tanggal ─────────────────────
 *
 * Lima angka bukan statistik, ia pengamatan. Maka:
 *
 *   · perkiraannya selalu berupa RENTANG (jendela ±7 hari), bukan satu hari;
 *   · dari mana jarak itu diambil selalu ikut disebut — dari betina itu
 *     sendiri, atau dari median kebun — karena keduanya bukan bukti yang
 *     sama kuat;
 *   · betina yang baru sekali bertelur TIDAK punya jaraknya sendiri. Ia
 *     dipinjami median kebun, dan layarnya harus mengatakan itu pinjaman.
 *
 * Yang salah bukan menebak; yang salah menebak tanpa mengatakan bahwa itu
 * tebakan, karena orang lalu menyiapkan sarang untuk tanggal yang tidak pernah
 * dijanjikan siapa pun.
 *
 * ── "Berhenti" dibedakan dari "telat" ───────────────────────────────────────
 *
 * Dua betina di kebun ini diam jauh lebih lama daripada jaraknya sendiri:
 * C24 (184 hari sejak 8 April) dan C14 (207 hari sejak 16 Maret). Keduanya
 * PERNAH produktif — C24 bahkan 92% menetas. Menyebut mereka "telat" bersama
 * betina yang lewat tiga hari akan menenggelamkan dua kejadian terpenting di
 * halaman itu: indukan terbukti yang berhenti.
 */

/** Jarak yang dipakai bila kebun ini belum punya satu pun jarak terukur. */
export const JARAK_BAWAAN = 28;

/** Separuh lebar jendela perkiraan, dalam hari. */
export const LEBAR_JENDELA = 7;

/**
 * Berapa kali jarak normal sampai sebuah betina disebut BERHENTI, bukan telat.
 *
 * 2,5× dan bukan 2×: jarak terukur paling panjang di kebun ini 30 hari, jadi
 * 2× hanya 60 hari — satu betina yang melewatkan dua siklus berturut-turut
 * karena musim sudah akan disebut berhenti. 2,5× memberi 75 hari, dan kedua
 * kejadian nyata (184 dan 207 hari) tetap tertangkap dengan jarak jauh.
 */
export const KALI_BERHENTI = 2.5;

const HARI_MS = 86400000;

/** Tanggal "YYYY-MM-DD" -> Date tengah hari UTC, aman dari geser zona waktu. */
function keTanggal(s) {
  if (!s) return null;
  const t = new Date(`${String(s).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(t.getTime()) ? null : t;
}

function selisihHari(a, b) {
  return Math.round((keTanggal(a) - keTanggal(b)) / HARI_MS);
}

function tambahHari(s, n) {
  const t = keTanggal(s);
  if (!t) return null;
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** Median bilangan bulat; null bila kosong. */
export function median(angka = []) {
  const urut = (angka || []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!urut.length) return null;
  const tengah = Math.floor(urut.length / 2);
  return urut.length % 2 ? urut[tengah] : Math.round((urut[tengah - 1] + urut[tengah]) / 2);
}

/**
 * Jarak hari antar clutch berurutan untuk SATU betina.
 *
 * Tanggal diurutkan sebagai TEKS lebih dulu. "YYYY-MM-DD" terurut benar
 * sebagai teks, dan mengurutkannya lewat new Date() membuka pintu pada
 * pergeseran zona waktu yang memindahkan tanggal 1 ke bulan sebelumnya.
 */
export function jarakClutch(tanggal = []) {
  const urut = [...new Set((tanggal || []).filter(Boolean).map((t) => String(t).slice(0, 10)))].sort();
  const jarak = [];
  for (let i = 1; i < urut.length; i++) jarak.push(selisihHari(urut[i], urut[i - 1]));
  return jarak.filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Jarak khas kebun ini: median dari SEMUA jarak antar clutch semua betina.
 *
 * Dihitung per betina lebih dulu, bukan dari seluruh tanggal yang dicampur.
 * Mencampurnya akan menghitung jarak antara clutch C23 dan clutch A46 sebagai
 * sebuah siklus, padahal itu dua ekor yang berbeda.
 */
export function jarakKebun(breedings = []) {
  const perBetina = new Map();
  for (const b of breedings || []) {
    const kunci = b?.female_id || b?.female_name;
    if (!kunci || !b?.egg_laying_date) continue;
    if (!perBetina.has(kunci)) perBetina.set(kunci, []);
    perBetina.get(kunci).push(b.egg_laying_date);
  }
  const semua = [];
  for (const tanggal of perBetina.values()) semua.push(...jarakClutch(tanggal));
  return { jarak: semua.sort((a, b) => a - b), median: median(semua), jumlah: semua.length };
}

/**
 * Siklus satu betina: kapan kira-kira bertelur lagi, dan seberapa kuat dasarnya.
 *
 * @param {string[]} tanggal   tanggal bertelur betina ini
 * @param {object}   opsi
 * @param {string}   opsi.hariIni       "YYYY-MM-DD"
 * @param {number}   opsi.jarakKebun    median jarak kebun; null bila belum ada
 *
 * @returns {{
 *   status: "belum-pernah"|"menunggu"|"jendela"|"telat"|"berhenti",
 *   jarakDipakai: number|null, sumberJarak: "sendiri"|"sendiri-sekali"|"kebun"|"bawaan"|null,
 *   keyakinan: "kuat"|"sedang"|"lemah"|null,
 *   terakhir: string|null, hariDiam: number|null,
 *   perkiraan: string|null, jendelaAwal: string|null, jendelaAkhir: string|null,
 *   sisaHari: number|null, jumlahClutch: number, jarakSendiri: number[]
 * }}
 */
export function siklusBetina(tanggal = [], { hariIni, jarakKebun: jarakKbn = null } = {}) {
  const hari = String(hariIni || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const urut = [...new Set((tanggal || []).filter(Boolean).map((t) => String(t).slice(0, 10)))].sort();
  const jarakSendiri = jarakClutch(urut);
  const kosong = {
    status: "belum-pernah",
    jarakDipakai: null,
    sumberJarak: null,
    keyakinan: null,
    terakhir: null,
    hariDiam: null,
    perkiraan: null,
    jendelaAwal: null,
    jendelaAkhir: null,
    sisaHari: null,
    jumlahClutch: 0,
    jarakSendiri: [],
  };
  if (!urut.length) return kosong;

  const terakhir = urut[urut.length - 1];
  const hariDiam = selisihHari(hari, terakhir);

  /*
    Tiga sumber jarak, tiga kekuatan bukti yang berbeda — dan layarnya
    menyebut yang mana. Betina dengan dua jarak sendiri (C23) berdiri di
    atas pengamatan tentang DIRINYA; betina yang baru sekali bertelur (C6)
    berdiri di atas rata-rata delapan ekor lain.
  */
  let jarakDipakai;
  let sumberJarak;
  let keyakinan;
  if (jarakSendiri.length >= 2) {
    jarakDipakai = median(jarakSendiri);
    sumberJarak = "sendiri";
    keyakinan = "kuat";
  } else if (jarakSendiri.length === 1) {
    jarakDipakai = jarakSendiri[0];
    sumberJarak = "sendiri-sekali";
    keyakinan = "sedang";
  } else if (Number.isFinite(jarakKbn) && jarakKbn > 0) {
    jarakDipakai = jarakKbn;
    sumberJarak = "kebun";
    keyakinan = "lemah";
  } else {
    jarakDipakai = JARAK_BAWAAN;
    sumberJarak = "bawaan";
    keyakinan = "lemah";
  }

  const perkiraan = tambahHari(terakhir, jarakDipakai);
  const sisaHari = selisihHari(perkiraan, hari);

  let status;
  if (hariDiam > jarakDipakai * KALI_BERHENTI) status = "berhenti";
  else if (sisaHari > LEBAR_JENDELA) status = "menunggu";
  else if (sisaHari >= -LEBAR_JENDELA) status = "jendela";
  else status = "telat";

  return {
    status,
    jarakDipakai,
    sumberJarak,
    keyakinan,
    terakhir,
    hariDiam,
    perkiraan,
    jendelaAwal: tambahHari(perkiraan, -LEBAR_JENDELA),
    jendelaAkhir: tambahHari(perkiraan, LEBAR_JENDELA),
    sisaHari,
    jumlahClutch: urut.length,
    jarakSendiri,
  };
}

/** Urutan tampil: yang paling perlu disiapkan lebih dulu. */
const URUTAN_STATUS = { jendela: 0, telat: 1, menunggu: 2, berhenti: 3, "belum-pernah": 4 };

/**
 * Siklus untuk sekumpulan betina, terurut siap-siap lebih dulu.
 *
 * `berhenti` ditaruh SESUDAH `menunggu` dan bukan di antara yang mendesak:
 * ia bukan pekerjaan minggu ini melainkan pemeriksaan yang perlu dijadwalkan.
 * Tetapi ia tetap di daftar yang sama, karena indukan terbukti yang berhenti
 * adalah kehilangan produksi terbesar yang dimiliki kebun ini.
 */
export function urutkanSiklus(daftar = []) {
  return [...(daftar || [])].sort((a, b) => {
    const sa = URUTAN_STATUS[a?.siklus?.status] ?? 9;
    const sb = URUTAN_STATUS[b?.siklus?.status] ?? 9;
    if (sa !== sb) return sa - sb;
    if (sa === 3) return (b?.siklus?.hariDiam ?? 0) - (a?.siklus?.hariDiam ?? 0);
    return (a?.siklus?.sisaHari ?? 0) - (b?.siklus?.sisaHari ?? 0);
  });
}

/** Kalimat siap tampil untuk satu siklus. */
export function kalimatSiklus(s) {
  if (!s || s.status === "belum-pernah") return "";
  if (s.status === "berhenti") {
    return `Berhenti — ${s.hariDiam} hari sejak terakhir, padahal jaraknya biasanya ${s.jarakDipakai} hari.`;
  }
  if (s.status === "telat") return `Lewat ${Math.abs(s.sisaHari)} hari dari perkiraan.`;
  if (s.status === "jendela") {
    return s.sisaHari >= 0
      ? `Perkiraan ${s.sisaHari} hari lagi — siapkan sarangnya.`
      : `Sedang di dalam jendela, lewat ${Math.abs(s.sisaHari)} hari.`;
  }
  return `Perkiraan ${s.sisaHari} hari lagi.`;
}

/** Dari mana jaraknya diambil — ditulis apa adanya, tidak disamarkan. */
export function kalimatSumber(s) {
  if (!s || !s.sumberJarak) return "";
  if (s.sumberJarak === "sendiri") {
    return `jarak dia sendiri (${s.jarakSendiri.join(", ")} hari)`;
  }
  if (s.sumberJarak === "sendiri-sekali") {
    return `satu jarak dia sendiri (${s.jarakSendiri[0]} hari) — baru sekali terukur`;
  }
  if (s.sumberJarak === "kebun") return `median kebun ${s.jarakDipakai} hari — dia sendiri baru sekali bertelur`;
  return `${JARAK_BAWAAN} hari, angka bawaan — kebun ini belum punya jarak terukur`;
}
