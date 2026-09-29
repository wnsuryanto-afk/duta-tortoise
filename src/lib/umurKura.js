/**
 * umurKura.js — SATU aturan golongan umur, dan satu tempat yang tahu umurnya.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Skema `Tortoise.age_category` menuliskan aturannya sendiri dengan jelas:
 *
 *   "Kategori umur: baby (0-12 bln), juvenile (1-3 thn), dewasa (>3 thn).
 *    Auto-calculated dari birth_date."
 *
 * Kalimat terakhir itu tidak benar. Diperiksa 29 September 2026: dari 136 kura
 * AKTIF, kolom itu terisi pada 16 — semuanya baby hasil penetasan, yang
 * ditulis tangan oleh EggGrid saat menetas. Pada 120 sisanya nilainya NULL.
 * Tidak ada satu pun kode, di layar maupun di server, yang pernah
 * menghitungnya dari `birth_date`.
 *
 * Rumusnya sendiri sebenarnya sudah ditulis — `calcAgeCategory` di
 * components/tortoise/AgeDisplay.jsx — tetapi hanya dipakai untuk mewarnai
 * satu lencana di kartu kura. Yang mengambil KEPUTUSAN tidak pernah
 * memanggilnya.
 *
 * ── Akibatnya, dan ini nyata ───────────────────────────────────────────────
 *
 * `jadwalTimbang.golonganRutin()` menentukan siapa masuk jadwal timbang
 * 14-harian. Ia memeriksa dua hal: `age_category` baby/juvenile, atau panjang
 * cangkang di bawah 20 cm sebagai cadangan. Kura yang gagal DUA-DUANYA
 * diperlakukan sebagai dewasa sehat — dan kura dewasa sehat tidak pernah masuk
 * daftar timbang sama sekali.
 *
 * Kolom cadangan itu justru yang paling sering kosong: 53 kura tidak punya
 * panjang cangkang. Jadi kura muda yang `age_category`-nya tidak pernah
 * dihitung DAN panjang cangkangnya belum diisi menghilang dari jadwal
 * pertumbuhan — tepat pada umur ketika pertumbuhannya paling perlu diikuti.
 *
 * Pada data hari ini yang terselamatkan oleh perbaikan ini tepat SATU: H3,
 * umur 2 tahun 9 bulan. Satu lagi, 8 KECIL (umur sama), sudah selamat lebih
 * dulu karena panjang cangkangnya kebetulan terisi 15 cm.
 *
 * Saya sempat menulis di sini bahwa ada tiga — Yuwono dan Red Foot - 02 ikut
 * disebut. Ujinya yang membetulkan: keduanya lahir Mei 2023, jadi umurnya
 * 3 tahun 4 bulan, dan menurut aturan skema ini sendiri (">3 thn = dewasa")
 * mereka memang dewasa. Keduanya tetap tidak pernah masuk jadwal timbang, dan
 * itu SISA MASALAH yang belum terjawab, bukan sesuatu yang diperbaiki di sini:
 * menggeser batas "dewasa" untuk sulcata — yang sebenarnya baru matang pada
 * umur belasan tahun — adalah keputusan pemeliharaan, bukan keputusan kode.
 *
 * Nilai sebenarnya bukan pada satu kura itu, melainkan pada enam belas
 * tukik 2026: ketika `age_category` mereka tidak lagi cocok dengan umurnya,
 * sekarang ada yang menghitungnya ulang.
 *
 * ── Yang dikerjakan di sini ────────────────────────────────────────────────
 *
 * Tidak ada data yang diubah. `golonganUmur()` menjawab pertanyaan yang sama
 * dengan `age_category`, tetapi menghitungnya dari `birth_date`.
 *
 * URUTANNYA: tanggal lahir DULU, kolom tersimpan belakangan — kebalikan dari
 * yang biasanya benar, dan itu disengaja. Golongan umur adalah fungsi dari
 * umur; ia tidak pernah merupakan keputusan manusia yang perlu dilindungi.
 * Nilai yang tersimpan hari ini pun bukan keputusan: ia ditulis SEKALI saat
 * menetas dan tidak pernah diperbarui. Kalau kolom tersimpan didahulukan,
 * enam belas tukik 2026 akan terbaca "baby" selamanya — masih ditimbang tiap
 * 14 hari pada umur sepuluh tahun. Kolom tersimpan tetap dipakai ketika
 * tanggal lahirnya tidak ada, karena di situ ia satu-satunya yang tahu.
 */

/** Golongan umur dari tanggal lahir saja. Null bila tanggalnya tidak ada. */
export function calcAgeCategory(birthDate, pada = new Date()) {
  if (!birthDate) return null;
  const lahir = new Date(birthDate);
  const acuan = pada instanceof Date ? pada : new Date(pada);
  if (Number.isNaN(lahir.getTime()) || Number.isNaN(acuan.getTime())) return null;
  const tahun = (acuan - lahir) / (365.25 * 24 * 3600 * 1000);
  if (tahun < 0) return null;
  if (tahun < 1) return "baby";
  if (tahun < 3) return "juvenile";
  return "dewasa";
}

/**
 * Golongan umur kura: kolom tersimpan dulu, hitungan dari tanggal lahir
 * belakangan.
 *
 * @returns "baby" | "juvenile" | "dewasa" | null (benar-benar tidak diketahui)
 */
export function golonganUmur(kura, pada = new Date()) {
  const dihitung = calcAgeCategory(kura?.birth_date, pada);
  if (dihitung) return dihitung;
  const tersimpan = kura?.age_category;
  if (tersimpan === "baby" || tersimpan === "juvenile" || tersimpan === "dewasa") {
    return tersimpan;
  }
  return null;
}

/** Apakah kura ini masih tumbuh — baby atau juvenile. */
export function masihTumbuh(kura, pada = new Date()) {
  const g = golonganUmur(kura, pada);
  return g === "baby" || g === "juvenile";
}

/** Umur terbaca manusia: "3 tahun 4 bulan". Null bila tidak diketahui. */
export function formatAge(birthDate, pada = new Date()) {
  if (!birthDate) return null;
  const lahir = new Date(birthDate);
  const acuan = pada instanceof Date ? pada : new Date(pada);
  if (Number.isNaN(lahir.getTime()) || Number.isNaN(acuan.getTime())) return null;
  let tahun = acuan.getFullYear() - lahir.getFullYear();
  let bulan = acuan.getMonth() - lahir.getMonth();
  if (bulan < 0) { tahun--; bulan += 12; }
  if (tahun < 0) return null;
  if (tahun === 0) return `${bulan} bulan`;
  if (bulan === 0) return `${tahun} tahun`;
  return `${tahun} tahun ${bulan} bulan`;
}
