/**
 * kandang.js — menyambungkan kura ke kandangnya lewat nomor, bukan nama.
 *
 * Selama ini kura menunjuk kandangnya dengan menyimpan NAMANYA sebagai teks,
 * dan sepuluh entitas lain ikut menyalin nama yang sama. Nama bukan tautan:
 * begitu diubah, semua yang menyalinnya menunjuk sesuatu yang tidak ada lagi,
 * tanpa satu pun peringatan.
 *
 * Perpindahan ini dibuat BERTAHAP dan AMAN, bukan sekali potong:
 *
 *   - `enclosure_id` ditambahkan DI SAMPING `enclosure`, tidak menggantikannya.
 *   - Penulisan mengisi keduanya, jadi data lama dan baru sama-sama utuh.
 *   - Pembacaan mengutamakan nomor dan jatuh ke nama bila nomornya belum ada.
 *
 * Artinya aplikasi tetap berjalan penuh sebelum, selama, dan sesudah pemindahan
 * data — dan bila pemindahannya tidak pernah dijalankan sekalipun, tidak ada
 * yang rusak. Nama tetap disimpan sebagai keterangan yang bisa dibaca manusia
 * di layar dan laporan; yang berubah adalah nama tidak lagi menjadi tautannya.
 */

/** Samakan bentuk nama sebelum dibandingkan: spasi tepi dan besar-kecil huruf. */
export function normalkanNama(nama) {
  return String(nama || "").trim().toLowerCase();
}

/**
 * Cari kandang milik sebuah kura.
 *
 * Nomor didahulukan karena ia tidak berubah saat kandang diganti nama. Nama
 * hanya dipakai bila nomornya belum terisi — yaitu untuk data yang belum
 * dipindahkan.
 *
 * @returns {{ kandang: object|null, lewat: "nomor"|"nama"|null, gandaNama: boolean }}
 *   `gandaNama` true bila pencocokan lewat nama menemukan lebih dari satu
 *   kandang bernama sama; dalam keadaan itu tidak ada yang dikembalikan,
 *   karena menebak salah satunya bisa memindahkan kura ke kandang yang keliru.
 */
export function cariKandang(kura, enclosures = []) {
  if (!kura) return { kandang: null, lewat: null, gandaNama: false };

  if (kura.enclosure_id) {
    const lewatNomor = enclosures.find((e) => e.id === kura.enclosure_id);
    if (lewatNomor) return { kandang: lewatNomor, lewat: "nomor", gandaNama: false };
    // Nomor terisi tapi kandangnya tidak ada — kandang terhapus. Jatuh ke nama
    // agar kura tidak langsung dianggap tanpa kandang.
  }

  const nama = normalkanNama(kura.enclosure);
  if (!nama) return { kandang: null, lewat: null, gandaNama: false };

  const cocok = enclosures.filter((e) => normalkanNama(e.name) === nama);
  if (cocok.length === 1) return { kandang: cocok[0], lewat: "nama", gandaNama: false };
  if (cocok.length > 1) return { kandang: null, lewat: null, gandaNama: true };

  return { kandang: null, lewat: null, gandaNama: false };
}

/** Nama kandang yang layak ditampilkan, dari nomor bila ada. */
export function namaKandang(kura, enclosures = []) {
  const { kandang } = cariKandang(kura, enclosures);
  return kandang?.name || kura?.enclosure || "";
}

/**
 * Nilai yang harus ditulis saat kura ditempatkan di sebuah kandang.
 *
 * Keduanya diisi bersamaan — nomor sebagai tautan, nama sebagai keterangan
 * yang tetap terbaca di layar dan laporan lama.
 */
export function tulisKandang(kandang) {
  if (!kandang) return { enclosure_id: "", enclosure: "" };
  return { enclosure_id: kandang.id || "", enclosure: kandang.name || "" };
}

/** Nilai untuk mengosongkan kandang, mis. saat kura terjual atau mati. */
export function kosongkanKandang() {
  return { enclosure_id: "", enclosure: "" };
}

/**
 * Cari kandang berdasarkan nama yang diketik pengguna.
 * Mengembalikan null bila tidak ada atau bila ada lebih dari satu yang cocok.
 */
export function kandangDariNama(nama, enclosures = []) {
  const n = normalkanNama(nama);
  if (!n) return null;
  const cocok = enclosures.filter((e) => normalkanNama(e.name) === n);
  return cocok.length === 1 ? cocok[0] : null;
}

/**
 * Periksa kesiapan pemindahan data, tanpa mengubah apa pun.
 *
 * Dijalankan lebih dulu supaya pemilik tahu persis apa yang akan terjadi —
 * termasuk yang TIDAK bisa dipindahkan otomatis dan kenapa. Memindahkan data
 * tanpa laporan seperti ini berarti menemukan masalahnya setelah terlambat.
 *
 * @returns {{
 *   sudah: Array, siap: Array, ganda: Array, takDikenal: Array, tanpaKandang: Array,
 *   namaGanda: string[]
 * }}
 */
export function periksaPemindahan(tortoises = [], enclosures = []) {
  const sudah = [];
  const siap = [];
  const ganda = [];
  const takDikenal = [];
  const tanpaKandang = [];

  // Nama kandang yang dipakai lebih dari satu catatan — sumber utama
  // ketidakpastian, dan harus dibereskan manusia lebih dulu.
  const jumlahPerNama = {};
  enclosures.forEach((e) => {
    const n = normalkanNama(e.name);
    if (!n) return;
    jumlahPerNama[n] = (jumlahPerNama[n] || 0) + 1;
  });
  const namaGanda = Object.entries(jumlahPerNama)
    .filter(([, n]) => n > 1)
    .map(([nama]) => nama);

  tortoises.forEach((t) => {
    if (t.enclosure_id) {
      sudah.push(t);
      return;
    }
    const nama = normalkanNama(t.enclosure);
    if (!nama) {
      tanpaKandang.push(t);
      return;
    }
    const cocok = enclosures.filter((e) => normalkanNama(e.name) === nama);
    if (cocok.length === 1) siap.push({ kura: t, kandang: cocok[0] });
    else if (cocok.length > 1) ganda.push({ kura: t, kandidat: cocok });
    else takDikenal.push(t);
  });

  return { sudah, siap, ganda, takDikenal, tanpaKandang, namaGanda };
}
