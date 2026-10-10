/**
 * lembarLabel.js — ukuran label kotak telur, dan berapa yang muat di satu A4.
 *
 * ── Kenapa angkanya tinggal di sini, bukan di layarnya ─────────────────────
 *
 * "Berapa label per lembar" dulu ada DUA kali: dihitung di dalam penggambar
 * lembar A4, dan ditulis tetap di keterangan bawah tombolnya — "2 kolom × 5
 * baris = maks. 10 label 100×50 mm". Dua angka untuk satu hal, dan yang
 * tertulis di layar tidak ikut berubah saat ukurannya diganti.
 *
 * Sekarang satu fungsi, dipakai tombol pemilih ukuran, keterangannya, DAN
 * penggambar lembarnya. Karena ia murni (tidak menyentuh DOM maupun React),
 * cek-label.mjs bisa menjalankannya langsung.
 */

/**
 * Ukuran fisik label, dalam milimeter.
 *
 * Mode cetaknya satu: Epson L385 di kertas A4, dipotong tangan. Kertas bisa
 * dipotong seukuran apa pun, jadi di sini tidak ada batasan gulungan.
 *
 * `untuk` bukan hiasan: yang memilih sedang memegang kotak telurnya, dan
 * "40 × 30 mm" tidak memberi tahu apa pun tentang apakah ukuran itu menutupi
 * telurnya atau tidak.
 */
export const UKURAN_LABEL_TELUR = [
  { id: "50x30", label: "50 × 30 mm", w: 50, h: 30, full: false, untuk: "Muat di kotak telur tanpa menutupi telurnya" },
  { id: "40x30", label: "40 × 30 mm", w: 40, h: 30, full: false, untuk: "Paling kecil — untuk kotak mungil" },
  { id: "100x50", label: "100 × 50 mm", w: 100, h: 50, full: true, untuk: "Besar — menutupi hampir seluruh sisi kotak" },
];

export const UKURAN_TELUR_BAWAAN = "50x30";

/**
 * Daerah A4 yang boleh dipakai, dalam milimeter.
 *
 * A4 = 210 × 297 mm. Sisa 10 mm mendatar dan 16 mm tegak adalah tepi yang
 * tidak dicetak printer inkjet rumahan — bukan selera tata letak. Memakai
 * seluruh 210 × 297 membuat baris terluar terpotong printernya sendiri.
 */
export const A4_PAKAI_MM = { w: 200, h: 281 };

export function cariUkuranTelur(id) {
  return (
    UKURAN_LABEL_TELUR.find((u) => u.id === id) ||
    UKURAN_LABEL_TELUR.find((u) => u.id === UKURAN_TELUR_BAWAAN)
  );
}

/** @returns {{kolom:number, baris:number, muat:number}} */
export function rencanaLembarA4(sizeDef) {
  const def = sizeDef || cariUkuranTelur(UKURAN_TELUR_BAWAAN);
  const kolom = Math.max(1, Math.floor(A4_PAKAI_MM.w / def.w));
  const baris = Math.max(1, Math.floor(A4_PAKAI_MM.h / def.h));
  return { kolom, baris, muat: kolom * baris };
}

/** A4 digambar 300 DPI; angka ini menentukan ketajaman, bukan ukuran cetaknya. */
export const DPI_LEMBAR = 300;
export const mmKePx = (mm) => Math.round((mm * DPI_LEMBAR) / 25.4);

/**
 * Susun satu lembar A4 dari label-label yang SUDAH digambar.
 *
 * ── Kenapa fungsi ini dipisah dari layarnya ────────────────────────────────
 *
 * 10 Okt 2026 pemiliknya mengirim foto lembar A4: dua belas label di atas,
 * lalu dua pertiga halaman berisi kotak-kotak kosong bergaris potong. Ia
 * hanya ingin mencetak sebagian, dan yang keluar adalah seluruh clutch aktif.
 *
 * Penyusunan lembarnya dulu tinggal di dalam komponen React, dan di sana ia
 * tidak bisa diperiksa: penjaga tidak bisa mengimpor berkas yang menarik
 * Radix dan seluruh pustaka antarmuka. Jadi satu-satunya hal yang pernah
 * diperiksa tentang lembar A4 adalah jumlah megapikselnya. Berapa label yang
 * benar-benar mendarat di kertas tidak pernah dihitung siapa pun.
 *
 * Sekarang fungsi ini murni — masuk sebagai untaian HTML, keluar sebagai
 * untaian HTML — jadi cek-label.mjs menghitungnya sendiri.
 *
 * ── Garis potong hanya di bagian yang berisi ───────────────────────────────
 *
 * Dulu garisnya digambar untuk SELURUH kisi, berisi atau tidak. Itu yang
 * membuat foto tadi penuh kotak kosong: tinta terpakai untuk memandu
 * pemotongan yang tidak ada apa-apanya.
 *
 * @param {string[]} labelHtmls label yang sudah digambar, berurutan.
 * @returns {{html:string, wA4:number, hA4:number, dipakai:number, terbuang:number, kolom:number, baris:number}}
 *   `terbuang` = label yang TIDAK muat di lembar ini. Dikembalikan, bukan
 *   dibuang diam-diam: yang menekan tombolnya berhak tahu bahwa sebagian
 *   pesanannya tidak ikut tercetak.
 */
export function susunLembarA4HTML(labelHtmls, sizeDef) {
  const def = sizeDef || cariUkuranTelur(UKURAN_TELUR_BAWAAN);
  const wA4 = mmKePx(210);
  const hA4 = mmKePx(297);
  const lw = mmKePx(def.w);
  const lh = mmKePx(def.h);
  const { kolom, baris, muat } = rencanaLembarA4(def);

  const isi = (labelHtmls || []).slice(0, muat);
  const terbuang = (labelHtmls || []).length - isi.length;

  const marginX = Math.round((wA4 - kolom * lw) / 2);
  const marginY = Math.round((hA4 - baris * lh) / 2);

  const sel = isi.map((label, i) => {
    const kol = i % kolom;
    const bar = Math.floor(i / kolom);
    const x = marginX + kol * lw;
    const y = marginY + bar * lh;
    return `<div style="position:absolute;left:${x}px;top:${y}px;width:${lw}px;height:${lh}px;overflow:hidden">${label}</div>`;
  });

  const potong = [];
  if (isi.length > 0) {
    const barisTerpakai = Math.ceil(isi.length / kolom);
    // Berapa label di baris terakhir — hanya baris itu yang bisa separuh.
    const diBarisAkhir = isi.length - (barisTerpakai - 1) * kolom;
    //
    // Sekat hanya digambar di ANTARA dua label. Tepi luar tidak: label
    // membawa bingkainya sendiri, jadi garis di sana cuma menggandakan
    // tepi yang sudah terlihat — dan satu label sendirian tidak boleh
    // membawa kisi apa pun.
    for (let c = 1; c < kolom; c++) {
      // Sekat di kiri kolom c memisahkan kolom c-1 dari kolom c. Di baris
      // terakhir keduanya berisi hanya bila c < jumlah label di baris itu.
      const sampai = c < diBarisAkhir ? barisTerpakai : barisTerpakai - 1;
      if (sampai < 1) continue;
      potong.push(`<div style="position:absolute;left:${marginX + c * lw}px;top:${marginY}px;border-left:1px dashed #999;height:${sampai * lh}px;width:0"></div>`);
    }
    for (let r = 1; r < barisTerpakai; r++) {
      // Baris di ATAS sekat ini selalu penuh — hanya baris terakhir yang bisa
      // separuh. Jadi di sekat terakhir, lebarnya berhenti di label terakhir.
      const kolomSekat = r === barisTerpakai - 1 ? diBarisAkhir : kolom;
      potong.push(`<div style="position:absolute;left:${marginX}px;top:${marginY + r * lh}px;border-top:1px dashed #999;width:${kolomSekat * lw}px;height:0"></div>`);
    }
  }

  const html = `<div style="width:${wA4}px;height:${hA4}px;background:#fff;position:relative;font-family:Arial,Helvetica,sans-serif;overflow:hidden">${potong.join("")}${sel.join("")}</div>`;
  return { html, wA4, hA4, dipakai: isi.length, terbuang, kolom, baris };
}

/**
 * ── Siapa yang dicetak ─────────────────────────────────────────────────────
 *
 * Keputusan ini sempat tinggal di dalam komponen React sebagai satu baris:
 *
 *   const daftar = allActiveBreedings.length ? allActiveBreedings : breedings;
 *
 * Halaman clutch SELALU mengoper allActiveBreedings, jadi cabang pertamanya
 * selalu menang — mengetuk satu clutch lalu menekan "Unduh Lembar A4" tetap
 * mencetak seluruh clutch aktif. Baris itu terbaca seperti cadangan yang masuk
 * akal, dan tidak ada penjaga yang bisa melihatnya karena ia terkunci di dalam
 * berkas yang menarik Radix.
 *
 * Ketiga fungsi di bawah ini murni, jadi cek-label.mjs memeriksanya langsung.
 */

/** Pengenal satu clutch; tetap bekerja untuk catatan yang belum punya id. */
export function kunciClutch(b) {
  return b?.id || `${b?.male_name}-${b?.female_name}-${b?.egg_laying_date}`;
}

/**
 * Semua clutch yang BOLEH dicetak: yang diminta pemanggil lebih dulu, lalu
 * sisanya yang masih aktif supaya bisa ditambahkan tanpa menutup layar.
 */
export function kandidatLabel(breedings = [], allActiveBreedings = []) {
  const peta = new Map();
  for (const b of [...breedings, ...allActiveBreedings]) if (b) peta.set(kunciClutch(b), b);
  return [...peta.values()];
}

/**
 * Centang awalnya: PERSIS yang dioper pemanggil, bukan semua yang aktif.
 *
 * Mengetuk satu clutch mencentang satu; menekan "Unduh Label Aktif"
 * mencentang semuanya. Inilah baris yang dulu salah.
 */
export function centangAwal(breedings = []) {
  return new Set(breedings.filter(Boolean).map(kunciClutch));
}
