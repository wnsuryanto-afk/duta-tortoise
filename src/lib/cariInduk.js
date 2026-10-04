/**
 * cariInduk.js — mencari riwayat bertelur seekor kura di modul pembiakan.
 *
 * ── Pertanyaan yang dijawab ────────────────────────────────────────────────
 *
 * "Kura A31 ini sudah pernah bertelur berapa kali, kapan terakhir, berapa yang
 * menetas?" Sebelum ini jawabannya hanya bisa didapat dengan menggulir seluruh
 * daftar clutch dan menghitung sendiri. Pada data 2 Okt 2026 A31 punya dua
 * catatan yang terpisah hampir sebulan (4 Sep dan 1 Okt) — dua baris yang
 * berjauhan di layar, dan tidak ada satu tempat pun yang menjumlahkannya.
 *
 * ── Kenapa pencocokannya tidak sekadar `includes` ──────────────────────────
 *
 * Nama kura di kebun ini tidak rapi, dan datanya membuktikan:
 *
 *   "RD besar "   <- berspasi ekor, dari impor awal
 *   "8 BESAR"     <- berspasi tengah dan huruf besar semua
 *   "Red Foot - 02"
 *
 * Mengetik "rd besar" harus menemukan "RD besar ", dan mengetik "8  besar"
 * (dua spasi, mudah terjadi di ponsel) harus menemukan "8 BESAR". Jadi kedua
 * sisi dirapikan lebih dulu: huruf kecil semua, spasi ganda menjadi satu,
 * spasi depan-belakang dibuang.
 *
 * ── Kenapa ikut mencocokkan PEJANTAN ──────────────────────────────────────
 *
 * Yang diminta adalah riwayat bertelur induk betina, dan ringkasannya memang
 * dihitung per BETINA. Tetapi kartu di layar berbunyi "A36 × A31": orang yang
 * mengetik "A36" sedang mencari kartu yang dilihatnya, bukan sedang menyatakan
 * bahwa A36 seekor betina. Pencarian yang menolak nama pejantan akan terasa
 * rusak. Jadi penyaringan mengenali keduanya, sementara ringkasannya tetap
 * dikelompokkan per induk betina — satu baris per betina, berapa pun jantan
 * yang terlibat.
 */

/** Rapikan teks untuk dibandingkan: huruf kecil, spasi tunggal, tanpa ujung. */
export function rapikan(teks) {
  return String(teks ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Apakah satu catatan pembiakan cocok dengan kata yang dicari?
 *
 * Kata kosong berarti TIDAK MENYARING — mengembalikan true untuk semuanya.
 * Ini disengaja supaya layar tidak perlu menulis `if (cari) ... else ...`
 * di tiga tempat; daftar tanpa pencarian adalah daftar utuh.
 */
export function cocokInduk(breeding, kata) {
  const k = rapikan(kata);
  if (!k) return true;
  if (!breeding) return false;
  return (
    rapikan(breeding.female_name).includes(k) ||
    rapikan(breeding.male_name).includes(k)
  );
}

/** Saring daftar pembiakan dengan kata pencarian. */
export function saringBreeding(daftar = [], kata) {
  const k = rapikan(kata);
  if (!k) return daftar || [];
  return (daftar || []).filter((b) => cocokInduk(b, k));
}

/**
 * Kelompokkan hasil pencarian per INDUK BETINA, terurut dari yang paling
 * banyak bertelur.
 *
 * Dikelompokkan lewat nama yang sudah dirapikan, bukan `female_id`: sebagian
 * catatan lama hanya punya nama. Nama aslinya yang dipakai untuk ditampilkan
 * diambil dari catatan pertama, supaya layar tidak menampilkan versi yang
 * sudah dirapikan ("rd besar" alih-alih "RD besar").
 *
 * @returns {Array<{ kunci, nama, clutch: Array }>}
 */
export function kelompokkanPerInduk(daftar = []) {
  const peta = new Map();
  for (const b of daftar || []) {
    const kunci = rapikan(b?.female_name);
    if (!kunci) continue;
    if (!peta.has(kunci)) {
      peta.set(kunci, { kunci, nama: String(b.female_name).trim(), clutch: [] });
    }
    peta.get(kunci).clutch.push(b);
  }
  return [...peta.values()].sort((a, b) => b.clutch.length - a.clutch.length);
}

/**
 * Tanggal bertelur paling akhir dari sekumpulan clutch, dan berapa hari lalu.
 *
 * Clutch tanpa `egg_laying_date` dilewati, bukan dianggap nol: catatan yang
 * baru dibuat dan belum diisi tanggalnya akan membuat "terakhir bertelur"
 * melompat ke 1970 kalau ikut dihitung.
 */
export function terakhirBertelur(clutch = [], hariIni = new Date()) {
  const tanggal = (clutch || [])
    .map((b) => b?.egg_laying_date)
    .filter(Boolean)
    .sort();
  if (tanggal.length === 0) return { tanggal: null, hariLalu: null };
  const terakhir = tanggal[tanggal.length - 1];
  const acuan = hariIni instanceof Date ? hariIni : new Date(hariIni);
  const selisih = Math.floor((acuan - new Date(terakhir)) / 86400000);
  return { tanggal: terakhir, hariLalu: Number.isFinite(selisih) ? selisih : null };
}

/* ── Mencari per BULAN: induk mana saja yang bertelur ─────────────────────
 *
 * Pertanyaan yang dijawab: "bulan September kemarin, induk mana saja yang
 * bertelur?" Pencarian per nama hanya menjawab satu kura sekaligus, dan
 * daftar clutch tersusun per catatan, bukan per bulan.
 *
 * Bulannya diambil dengan MEMOTONG TEKS tanggalnya, bukan lewat `new Date`.
 * `egg_laying_date` tersimpan sebagai "YYYY-MM-DD"; `new Date("2026-10-01")`
 * dibaca tengah malam UTC, dan di zona waktu barat Greenwich tanggal itu
 * jatuh ke 30 September — catatan paling awal tiap bulan akan terhitung di
 * bulan sebelumnya. Lima karakter pertama tidak bisa salah baca.
 */

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-09-04" -> "2026-09". Nilai yang tidak berbentuk tanggal -> null. */
export function kunciBulan(tanggal) {
  const m = String(tanggal ?? "").match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** "2026-09" -> "September 2026". */
export function labelBulan(kunci) {
  const m = String(kunci ?? "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  const nama = NAMA_BULAN[Number(m[2]) - 1];
  return nama ? `${nama} ${m[1]}` : "";
}

/**
 * Daftar bulan yang PUNYA catatan bertelur, terbaru dulu.
 *
 * Hanya bulan yang ada isinya — pilihan bulan kosong hanya membuat orang
 * mengira datanya hilang. Clutch tanpa `egg_laying_date` tidak masuk mana
 * pun; ia tidak punya bulan, dan menaruhnya di bulan mana saja akan salah.
 *
 * @returns {Array<{ kunci, label, clutch, telur, induk }>}
 */
export function daftarBulanBertelur(daftar = []) {
  const peta = new Map();
  for (const b of daftar || []) {
    const kunci = kunciBulan(b?.egg_laying_date);
    if (!kunci) continue;
    if (!peta.has(kunci)) peta.set(kunci, { kunci, label: labelBulan(kunci), clutch: 0, telur: 0, induk: new Set() });
    const baris = peta.get(kunci);
    baris.clutch += 1;
    baris.telur += Number(b?.egg_count) || 0;
    const nama = rapikan(b?.female_name);
    if (nama) baris.induk.add(nama);
  }
  return [...peta.values()]
    .map((b) => ({ ...b, induk: b.induk.size }))
    .sort((a, b) => (a.kunci < b.kunci ? 1 : a.kunci > b.kunci ? -1 : 0));
}

/**
 * Saring clutch pada satu bulan.
 *
 * Bulan kosong berarti TIDAK MENYARING — sama seperti `saringBreeding`,
 * supaya layar tidak perlu menulis cabang "kalau belum dipilih".
 */
export function saringBulan(daftar = [], kunci) {
  const k = String(kunci ?? "").trim();
  if (!k) return daftar || [];
  return (daftar || []).filter((b) => kunciBulan(b?.egg_laying_date) === k);
}
