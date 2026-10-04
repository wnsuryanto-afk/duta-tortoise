/**
 * hitungMundur.js — berapa hari lagi satu clutch diperkirakan menetas.
 *
 * ── Kenapa ini jadi satu berkas sendiri ───────────────────────────────────
 *
 * Hitung mundur yang sama sudah ada di tab "Telur & Inkubasi", ditulis
 * langsung di dalam JSX halaman BreedingAndEggs — belasan baris yang
 * menghitung `daysToStart`, `daysToEnd`, `inHatchRange` dan warnanya. Tab
 * "Pembiakan" yang dipakai sehari-hari TIDAK punya angka itu sama sekali.
 *
 * Menyalin belasan baris itu ke tab kedua akan membuat dua salinan aturan
 * yang sama persis — dan aturan yang punya dua salinan selalu berakhir
 * berselisih. Jadi aturannya dipindahkan ke sini sekali, dan kedua tab
 * memanggilnya.
 *
 * ── Kenapa tanggalnya tidak dipakai lewat `new Date(...)` langsung ────────
 *
 * `egg_laying_date` dan kawan-kawannya disimpan sebagai teks "YYYY-MM-DD".
 * `new Date("2026-12-21")` dibaca sebagai tengah malam UTC, lalu selisihnya
 * dihitung terhadap jam sekarang yang LOKAL. Di WIB (UTC+7) sisa harinya
 * bisa terbaca satu hari lebih sedikit sepanjang sore — hitung mundur yang
 * berubah angka saat jam 17:00 tanpa ada yang menyentuhnya.
 *
 * Di sini kedua sisi diturunkan ke "hari" lebih dulu: teks dibaca apa adanya
 * (angka tahun-bulan-tanggalnya), dan `Date` dibaca memakai tanggal LOKAL-nya.
 * Selisihnya kemudian selalu bilangan bulat hari, jam berapa pun dibukanya.
 */

const HARI = 86400000;

/** Jadikan satu nilai sebagai "hari", bebas dari zona waktu. */
function hariDari(nilai) {
  if (nilai instanceof Date) {
    if (Number.isNaN(nilai.getTime())) return null;
    return Date.UTC(nilai.getFullYear(), nilai.getMonth(), nilai.getDate());
  }
  const m = String(nilai ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Hitung mundur satu clutch.
 *
 * @returns null bila tidak ada yang bisa dihitung mundur, atau:
 *   { jenis, hari, nada }
 *
 *   jenis "selesai"  — sudah difinalisasi
 *   jenis "menetas"  — sudah menetas
 *   jenis "gagal"    — gagal
 *   jenis "menuju"   — `hari` hari lagi masuk perkiraan menetas
 *   jenis "masa"     — SEDANG di dalam rentang perkiraan; `hari` = sisa
 *   jenis "lewat"    — `hari` hari melewati perkiraan, belum ada hasil
 *
 *   nada "hijau" | "oranye" | "merah" | "netral" — hanya warna, bukan aturan.
 */
export function hitungMundur(breeding, hariIni = new Date()) {
  if (!breeding) return null;
  if (breeding.status === "selesai") return { jenis: "selesai", hari: null, nada: "hijau" };
  if (breeding.status === "menetas") return { jenis: "menetas", hari: null, nada: "hijau" };
  if (breeding.status === "gagal") return { jenis: "gagal", hari: null, nada: "netral" };

  const kini = hariDari(hariIni);
  const mulai = hariDari(breeding.estimated_hatch_start);
  /*
   * `estimated_hatch_date` dipakai sebagai cadangan untuk tanggal AKHIR,
   * bukan untuk tanggal mulai.
   *
   * Halaman lama memakainya sebagai cadangan `daysToStart`. Di data yang ada
   * ia berisi tanggal yang sama dengan `estimated_hatch_end` pada 12 dari 13
   * baris — jadi ia memang tanggal tutupnya jendela, bukan bukanya. Cadangan
   * yang salah arti tidak pernah ketahuan selama kolom aslinya terisi, dan
   * `estimated_hatch_start` terisi di seluruh 13 baris.
   */
  const akhir = hariDari(breeding.estimated_hatch_end ?? breeding.estimated_hatch_date);

  if (kini === null) return null;
  if (mulai === null && akhir === null) return null;

  if (mulai !== null && kini < mulai) {
    const hari = Math.round((mulai - kini) / HARI);
    return {
      jenis: "menuju",
      hari,
      nada: hari <= 7 ? "merah" : hari <= 30 ? "oranye" : "hijau",
    };
  }

  // Sudah sampai/melewati tanggal mulai (atau tanggal mulainya tidak ada).
  if (akhir === null) {
    // Jendelanya terbuka, tutupnya tidak diketahui — tetap "masa menetas",
    // tanpa mengarang sisa hari.
    return { jenis: "masa", hari: null, nada: "merah" };
  }
  if (kini <= akhir) {
    return { jenis: "masa", hari: Math.round((akhir - kini) / HARI), nada: "merah" };
  }
  return { jenis: "lewat", hari: Math.round((kini - akhir) / HARI), nada: "merah" };
}

/** Berapa hari sebelum perkiraan menetas sebuah clutch mulai disebut "segera". */
export const HARI_SEGERA = 7;

/**
 * Clutch yang perlu diperhatikan sekarang, dikelompokkan per tingkat desakan.
 *
 * Dipakai beranda Owner. Sebelum ini beranda sama sekali tidak menyebut
 * penetasan: pemilik baru tahu ada telur yang mau menetas kalau kebetulan
 * membuka halaman Breeding. Penetasan pertama diperkirakan 31 Okt 2026, dan
 * kura menetas berhari-hari — melewatkan hari pertamanya berarti bayi yang
 * baru keluar menunggu di inkubator tanpa ada yang tahu.
 *
 * Urutannya adalah urutan mendesaknya, dan itu disengaja: `lewat` lebih
 * mendesak daripada `masa`, karena perkiraan yang sudah terlampaui berarti
 * ada yang perlu DIPERIKSA, bukan sekadar ditunggu.
 *
 * @returns {{ lewat: Array, masa: Array, segera: Array, total: number }}
 */
export function clutchMendesak(breedings = [], hariIni = new Date()) {
  const lewat = [];
  const masa = [];
  const segera = [];

  for (const b of breedings || []) {
    const m = hitungMundur(b, hariIni);
    if (!m) continue;
    if (m.jenis === "lewat") lewat.push({ breeding: b, mundur: m });
    else if (m.jenis === "masa") masa.push({ breeding: b, mundur: m });
    else if (m.jenis === "menuju" && m.hari !== null && m.hari <= HARI_SEGERA) {
      segera.push({ breeding: b, mundur: m });
    }
  }

  // Yang paling dekat lebih dulu di tiap kelompok.
  const urut = (a, b) => (a.mundur.hari ?? 0) - (b.mundur.hari ?? 0);
  segera.sort(urut);
  masa.sort(urut);
  lewat.sort((a, b) => (b.mundur.hari ?? 0) - (a.mundur.hari ?? 0));

  return { lewat, masa, segera, total: lewat.length + masa.length + segera.length };
}
