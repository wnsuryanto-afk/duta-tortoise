/**
 * silsilah.js — menyambungkan kura ke induknya.
 *
 * `parent_male` dan `parent_female` menyimpan TIGA hal berbeda, tergantung layar
 * mana yang mencatat penetasannya:
 *
 *   - Dialog "Catat Hasil Menetas" menulis  ID kura induk.
 *   - Kartu telur di EggGrid menulis         NAMA kura induk.
 *   - Data lama sebagian menyimpan           KODE kura induk.
 *
 * Setiap pembacanya menebak satu bentuk saja, dan menebak yang berbeda-beda:
 * panel silsilah mencari kode lalu id (nama tidak pernah ketemu), daftar
 * keturunan di kartu clutch mencocokkan nama (yang ber-ID tidak ketemu),
 * pengaman hapus mencari nama (yang ber-ID lolos tanpa peringatan), dan paspor
 * kura mencetak nilainya mentah-mentah — sehingga paspor yang dibawa pembeli
 * bisa memuat ID basis data di tempat nama ayahnya.
 *
 * Di sini bentuknya diselesaikan sekali: pembacaan menerima ketiganya,
 * penulisan mulai sekarang selalu memakai ID. ID dipilih karena hanya itu yang
 * tidak ikut berubah saat kura diganti nama atau kodenya diperbaiki — nama dan
 * kode adalah keterangan, bukan tautan.
 *
 * Tidak ada perubahan skema dan tidak ada pemindahan data: data lama yang
 * menyimpan nama atau kode tetap terbaca apa adanya lewat fungsi di bawah.
 */

/** Samakan bentuk sebelum dibandingkan: spasi tepi dan besar-kecil huruf. */
function normal(nilai) {
  return String(nilai || "").trim().toLowerCase();
}

/**
 * Susun peta pencarian sekali untuk dipakai berulang.
 *
 * Nama yang dipakai lebih dari satu kura sengaja ditandai dan TIDAK dipetakan:
 * menebak salah satunya berarti menggambar silsilah yang salah, dan silsilah
 * yang salah menuntun ke perkawinan sedarah.
 */
export function petaKura(tortoises = []) {
  const perId = new Map();
  const perKode = new Map();
  const perNama = new Map();
  const namaGanda = new Set();

  tortoises.forEach((t) => {
    if (!t) return;
    if (t.id) perId.set(String(t.id), t);
    if (t.code) {
      const k = normal(t.code);
      if (k) perKode.set(k, t);
    }
    if (t.name) {
      const n = normal(t.name);
      if (!n) return;
      if (perNama.has(n)) namaGanda.add(n);
      else perNama.set(n, t);
    }
  });

  return { perId, perKode, perNama, namaGanda, semua: tortoises };
}

/**
 * Cari kura dari sebuah rujukan induk, apa pun bentuk penyimpanannya.
 *
 * Urutannya id → kode → nama, dari yang paling pasti ke yang paling mudah
 * bertabrakan.
 *
 * @returns {object|null} null bila tidak ketemu atau namanya ganda.
 */
export function cariInduk(rujukan, peta) {
  if (!rujukan || !peta) return null;
  const r = String(rujukan).trim();
  if (!r) return null;

  const lewatId = peta.perId.get(r);
  if (lewatId) return lewatId;

  const n = normal(r);
  const lewatKode = peta.perKode.get(n);
  if (lewatKode) return lewatKode;

  if (peta.namaGanda.has(n)) return null;
  return peta.perNama.get(n) || null;
}

/**
 * Apakah nilai ini tampak seperti rujukan mesin (ID), bukan sesuatu yang layak
 * dibaca manusia?
 *
 * Ini SEKADAR PERKIRAAN dari bentuknya, dan hanya dipakai untuk memutuskan
 * apakah sebuah rujukan yang tidak ketemu masih pantas dicetak di layar. Nama
 * kura ("Bimo", "Si Gendut") dan kode kura ("K-001", "BB-2025001") jauh lebih
 * pendek dan memuat huruf di luar heksadesimal atau spasi.
 */
export function adalahRujukanMesin(nilai) {
  const r = String(nilai || "").trim();
  return r.length >= 20 && /^[0-9a-f-]+$/i.test(r);
}

/**
 * Keterangan induk yang layak ditampilkan.
 *
 * @returns {{ kura: object|null, teks: string, hilang: boolean }}
 *   `teks` kosong berarti tidak ada yang pantas ditampilkan — rujukannya ada
 *   tapi berupa ID yang kuranya sudah tidak ada, jadi mencetaknya hanya
 *   menampilkan deretan karakter yang tidak berarti bagi siapa pun.
 */
export function keteranganInduk(rujukan, peta) {
  if (!rujukan) return { kura: null, teks: "", hilang: false };
  const kura = cariInduk(rujukan, peta);
  if (kura) return { kura, teks: kura.name || kura.code || "", hilang: false };
  if (adalahRujukanMesin(rujukan)) return { kura: null, teks: "", hilang: true };
  return { kura: null, teks: String(rujukan), hilang: true };
}

/**
 * Nilai yang harus ditulis saat mencatat induk seekor kura.
 *
 * ID bila ada; nama hanya sebagai jalan terakhir, supaya penetasan tetap bisa
 * dicatat walau induknya belum terdaftar sebagai kura.
 */
export function tulisInduk(indukAtauId, namaCadangan) {
  if (!indukAtauId) return namaCadangan || null;
  if (typeof indukAtauId === "object") return indukAtauId.id || indukAtauId.name || namaCadangan || null;
  return String(indukAtauId) || namaCadangan || null;
}

/**
 * Semua kura yang induknya adalah kura ini — lewat bentuk rujukan apa pun.
 *
 * Pembacaan lama hanya mencocokkan kode, sehingga tidak satu pun bayi hasil
 * penetasan pernah muncul sebagai keturunan: tidak ada layar yang menulis kode
 * ke sana.
 */
export function cariKeturunan(kura, tortoises = [], peta) {
  if (!kura?.id) return [];
  const p = peta || petaKura(tortoises);
  return (p.semua || tortoises).filter((t) => {
    if (!t || t.id === kura.id) return false;
    const ayah = t.parent_male ? cariInduk(t.parent_male, p) : null;
    const ibu = t.parent_female ? cariInduk(t.parent_female, p) : null;
    return ayah?.id === kura.id || ibu?.id === kura.id;
  });
}

/**
 * Apakah kura ini keturunan dari sebuah clutch?
 *
 * Tiga tautan diperiksa berurutan karena ketiganya dipakai oleh jalur pencatatan
 * yang berbeda, dan tidak ada satu pun yang selalu terisi:
 * nomor telur → clutch terakhir → pasangan induknya.
 */
export function dariClutch(kura, breeding, peta) {
  if (!kura || !breeding) return false;

  const idTerdaftar = (breeding.egg_records || []).filter((e) => e.tortoise_id).map((e) => e.tortoise_id);
  if (idTerdaftar.includes(kura.id)) return true;
  if (kura.last_breeding_id && kura.last_breeding_id === breeding.id) return true;

  if (kura.source !== "hasil_sendiri") return false;
  const ayah = kura.parent_male ? cariInduk(kura.parent_male, peta) : null;
  const ibu = kura.parent_female ? cariInduk(kura.parent_female, peta) : null;
  const ayahClutch = cariInduk(breeding.male_id || breeding.male_name, peta);
  const ibuClutch = cariInduk(breeding.female_id || breeding.female_name, peta);
  if (!ayah || !ibu || !ayahClutch || !ibuClutch) return false;
  return ayah.id === ayahClutch.id && ibu.id === ibuClutch.id;
}

/**
 * Apakah `kandidat` merupakan keturunan dari `leluhur`?
 *
 * Dipakai untuk mencegah lingkaran saat induk diisi manual: menetapkan cucu
 * sebagai kakek membuat silsilahnya berputar tanpa ujung, dan setiap layar yang
 * menelusurinya ikut berputar bersamanya.
 *
 * Penelusuran dibatasi kedalamannya sebagai jaring pengaman terakhir, untuk
 * data yang sudah terlanjur berputar sebelum pemeriksaan ini ada.
 */
export function adalahKeturunanDari(kandidat, leluhur, peta, kedalaman = 12) {
  if (!kandidat?.id || !leluhur?.id) return false;
  if (kandidat.id === leluhur.id) return true;
  if (kedalaman <= 0) return false;
  const ayah = kandidat.parent_male ? cariInduk(kandidat.parent_male, peta) : null;
  const ibu = kandidat.parent_female ? cariInduk(kandidat.parent_female, peta) : null;
  return (
    adalahKeturunanDari(ayah, leluhur, peta, kedalaman - 1) ||
    adalahKeturunanDari(ibu, leluhur, peta, kedalaman - 1)
  );
}

/**
 * Kura yang boleh dipilih sebagai induk bagi seekor kura.
 *
 * Yang dikeluarkan: dirinya sendiri, dan seluruh keturunannya — keduanya
 * membuat silsilah berputar. Jenis kelamin disaring bila diminta; kura yang
 * belum diketahui kelaminnya tetap ditawarkan, karena induk yang sudah lama
 * mati sering tidak pernah tercatat kelaminnya.
 */
export function calonInduk(kura, tortoises = [], jenisKelamin, peta) {
  const p = peta || petaKura(tortoises);
  return (p.semua || tortoises).filter((t) => {
    if (!t?.id) return false;
    if (jenisKelamin && t.gender && t.gender !== jenisKelamin) return false;
    if (!kura?.id) return true;
    return !adalahKeturunanDari(t, kura, p);
  });
}
