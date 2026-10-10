/**
 * dpiPng.js — menuliskan UKURAN CETAK ke dalam berkas PNG-nya sendiri.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Label kotak telur diunduh sebagai PNG, lalu dicetak dari aplikasi lain —
 * Word, Google Docs, galeri foto, dialog cetak bawaan. Semua aplikasi itu
 * menanyakan satu hal yang PNG biasa tidak bisa menjawab: "gambar ini sebesar
 * apa di kertas?"
 *
 * PNG tanpa jawaban itu diperlakukan 96 DPI. Label 1.152 piksel jadi 305 mm —
 * lebih lebar dari kertas A4 — sehingga aplikasinya mengecilkannya sendiri
 * supaya muat margin. Ukuran yang keluar dari printer lalu bergantung pada
 * aplikasi mana yang dipakai dan margin apa yang kebetulan disetel, bukan pada
 * apa pun yang diputuskan di sini. Itulah sebabnya "labelnya terlalu besar"
 * tidak pernah bisa dibetulkan hanya dengan mengubah jumlah pikselnya:
 * pikselnya memang tidak pernah dibaca sebagai milimeter.
 *
 * PNG punya tempat resmi untuk jawaban itu: potongan `pHYs`, berisi berapa
 * piksel per meter. Begitu ada, aplikasi-aplikasi di atas menempatkan gambarnya
 * pada ukuran fisik yang SAMA, dan "80 mm" jadi pernyataan yang benar di
 * printer, bukan harapan.
 *
 * ── Kenapa ditulis sendiri ──────────────────────────────────────────────────
 *
 * `canvas.toBlob` tidak punya pilihan DPI, dan tidak ada pustaka di proyek ini
 * yang bisa menambahkannya. Yang dibutuhkan cuma menyisipkan satu potongan
 * 21 byte sesudah IHDR — jauh lebih kecil daripada menambah pustaka pengolah
 * gambar hanya untuk itu.
 */

const TANDA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** CRC-32 seperti yang diwajibkan spesifikasi PNG (polinomial 0xEDB88320). */
const TABEL_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

export function crc32(bytes) {
  let c = -1;
  for (let i = 0; i < bytes.length; i += 1) c = TABEL_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Piksel per meter untuk satu nilai DPI — satuan yang dipakai `pHYs`. */
export function pxPerMeter(dpi) {
  return Math.round(dpi / 0.0254);
}

/** Kebalikannya, dipakai untuk membaca kembali apa yang sudah tertulis. */
export function dpiDariPxPerMeter(ppm) {
  return Math.round(ppm * 0.0254);
}

function bacaU32(bytes, i) {
  return ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
}

function tulisU32(bytes, i, nilai) {
  bytes[i] = (nilai >>> 24) & 0xff;
  bytes[i + 1] = (nilai >>> 16) & 0xff;
  bytes[i + 2] = (nilai >>> 8) & 0xff;
  bytes[i + 3] = nilai & 0xff;
}

function tipeChunk(bytes, i) {
  return String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
}

/**
 * Baca ukuran cetak yang tertulis di dalam PNG.
 *
 * Mengembalikan `null` bila berkasnya tidak punya `pHYs` — yaitu persis
 * keadaan yang membuat ukurannya ditentukan aplikasi lain.
 */
export function bacaDpiPng(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 8 || TANDA_PNG.some((v, i) => b[i] !== v)) return null;
  let i = 8;
  while (i + 8 <= b.length) {
    const panjang = bacaU32(b, i);
    const tipe = tipeChunk(b, i + 4);
    if (tipe === "pHYs" && panjang >= 9) {
      const d = i + 8;
      return {
        x: dpiDariPxPerMeter(bacaU32(b, d)),
        y: dpiDariPxPerMeter(bacaU32(b, d + 4)),
        satuanMeter: b[d + 8] === 1,
      };
    }
    if (tipe === "IEND") return null;
    i += 12 + panjang;
  }
  return null;
}

/**
 * Kembalikan salinan PNG yang menyatakan dirinya dicetak pada `dpi`.
 *
 * `pHYs` yang sudah ada diganti, bukan ditumpuk: dua potongan `pHYs` membuat
 * berkasnya tidak sah, dan pembaca yang berbeda akan memilih yang berbeda.
 * Berkas yang bukan PNG dikembalikan apa adanya — unduhan yang tetap jalan
 * dengan ukuran yang tidak dinyatakan masih lebih baik daripada unduhan gagal.
 */
export function setelDpiPng(bytes, dpi) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 8 || TANDA_PNG.some((v, i) => b[i] !== v)) return b;

  const ppm = pxPerMeter(dpi);
  const pHYs = new Uint8Array(21);
  tulisU32(pHYs, 0, 9);
  pHYs[4] = 0x70; pHYs[5] = 0x48; pHYs[6] = 0x59; pHYs[7] = 0x73; // "pHYs"
  tulisU32(pHYs, 8, ppm);
  tulisU32(pHYs, 12, ppm);
  pHYs[16] = 1; // satuannya meter
  tulisU32(pHYs, 17, crc32(pHYs.subarray(4, 17)));

  // Potongan disusun ulang: IHDR, pHYs baru, lalu sisanya tanpa pHYs lama.
  const bagian = [b.subarray(0, 8)];
  let i = 8;
  let sudah = false;
  while (i + 8 <= b.length) {
    const panjang = bacaU32(b, i);
    const tipe = tipeChunk(b, i + 4);
    const akhir = i + 12 + panjang;
    if (akhir > b.length) break;
    if (tipe !== "pHYs") bagian.push(b.subarray(i, akhir));
    if (tipe === "IHDR" && !sudah) { bagian.push(pHYs); sudah = true; }
    i = akhir;
  }
  // Tanpa IHDR tidak ada tempat yang sah untuk menyisipkannya; biarkan utuh.
  if (!sudah) return b;

  const total = bagian.reduce((n, p) => n + p.length, 0);
  const hasil = new Uint8Array(total);
  let o = 0;
  for (const p of bagian) { hasil.set(p, o); o += p.length; }
  return hasil;
}
