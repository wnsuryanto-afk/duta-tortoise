import { lazy } from "react";

/**
 * muatHalaman.js — satu kegagalan unduh tidak boleh mengunci halamannya.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 9 Nov 2026 pemiliknya membuka /area/kura dan mendapat layar merah:
 *
 *     Failed to fetch dynamically imported module:
 *     https://preview-sandbox--6a049ab0....base44.app/src/pages/HubPage.jsx
 *
 * Sejak halaman dipecah per rute (App.jsx, 8 Nov 2026), tiap halaman
 * diunduh sendiri saat pertama dibuka. Itu yang memangkas bundel dari
 * 4605 KB menjadi 1056 KB — dan itu juga yang menambah satu cara baru untuk
 * gagal: satu unduhan meleset, satu halaman mati. Sebelum dipecah, seluruh
 * aplikasi sudah ada di satu berkas, jadi jaringan yang tersendat tidak bisa
 * menghilangkan satu halaman saja.
 *
 * ── Yang membuatnya tidak bisa pulih ─────────────────────────────────
 *
 * Diukur di peramban sungguhan terhadap dev server aplikasi ini, dengan
 * permintaan ke HubPage.jsx diblokir sekali lalu dibuka lagi:
 *
 *   1. blokir menyala                    → GAGAL   (1 permintaan terkirim)
 *   2. blokir DIMATIKAN, impor URL sama  → GAGAL   (tetap 1 permintaan)
 *   3. URL dibedakan "?coba=2"           → BERHASIL
 *
 * Baris kedua itu intinya: percobaan ulang tidak mengirim permintaan baru
 * sama sekali. Peta modul peramban menyimpan KEGAGALAN sebuah URL selama
 * halaman itu hidup, dan setiap `import()` berikutnya ke URL yang sama
 * langsung ditolak dari ingatan. React.lazy menyimpan penolakan itu lagi di
 * sisinya.
 *
 * Akibatnya tombol "Coba Lagi" di layar error — yang hanya mengosongkan
 * batas error lalu menggambar ulang — TIDAK MUNGKIN menolong. Ia memanggil
 * import yang sama, mendapat penolakan yang sama dari ingatan, dan layar
 * merahnya kembali seketika. Satu-satunya yang menolong adalah memuat ulang
 * seluruh halaman, karena itu yang mengosongkan peta modulnya.
 *
 * ── Yang dilakukan berkas ini ────────────────────────────────────────
 *
 * Tiga lapis, dari yang paling murah:
 *
 *   1. Coba sekali seperti biasa.
 *   2. Gagal → tunggu sebentar, lalu impor LAGI dengan URL yang dibedakan
 *      (`?muat=1`). URL berbeda berarti peta modulnya belum punya catatan
 *      apa-apa, jadi permintaannya benar-benar dikirim. Tanda tanya tidak
 *      mengubah jalurnya, jadi berkas yang diambil sama dan impor di
 *      dalamnya tetap mengarah ke tempat yang sama.
 *   3. Masih gagal → muat ulang halaman SATU KALI, ditandai di
 *      sessionStorage supaya tidak berputar. Sesudah dimuat ulang, kegagalan
 *      berikutnya dibiarkan sampai ke layar error — kalau berkasnya memang
 *      tidak ada, memuat ulang terus hanya membuat orang menatap layar
 *      berkedip tanpa pernah diberi tahu apa yang salah.
 *
 * URL untuk percobaan kedua diambil dari pesan galatnya sendiri, karena
 * nama berkas hasil build ("/assets/HubPage-a1b2c3.js") tidak diketahui dari
 * dalam kode sumber. Bila URL-nya tidak bisa dibaca dari pesan itu, lapis
 * kedua dilewati dan langsung ke lapis ketiga.
 */

/** Jeda sebelum percobaan kedua: cukup untuk sendatan sesaat, tak terasa oleh orang. */
const JEDA_MS = 400;

/** Penanda bahwa halaman sudah pernah dimuat ulang karena kegagalan unduh. */
const KUNCI_MUAT_ULANG = "muatHalaman:sudahMuatUlang";

/**
 * URL modul yang gagal, dibaca dari pesan galatnya.
 *
 * Peramban menulis pesannya berbeda-beda — Chrome "Failed to fetch
 * dynamically imported module: <url>", Firefox "error loading dynamically
 * imported module: <url>" — tetapi ketiganya menaruh URL-nya apa adanya di
 * dalam pesan. Yang dicari cuma URL-nya, bukan kalimatnya.
 */
export function urlModulGagal(galat) {
  const pesan = String(galat?.message || "");
  const cocok = /https?:\/\/[^\s"')]+/.exec(pesan);
  return cocok ? cocok[0] : "";
}

/** Benar bila galat ini memang kegagalan mengunduh modul, bukan galat di dalam halamannya. */
export function gagalUnduhModul(galat) {
  const pesan = String(galat?.message || "").toLowerCase();
  return (
    pesan.includes("dynamically imported module") ||
    pesan.includes("failed to fetch dynamically") ||
    pesan.includes("error loading dynamically") ||
    // Chunk hasil build yang hilang setelah penerbitan baru.
    pesan.includes("loading chunk") ||
    pesan.includes("importing a module script failed")
  );
}

function sudahPernahMuatUlang(simpanan) {
  try {
    return simpanan?.getItem(KUNCI_MUAT_ULANG) === "1";
  } catch {
    // Peramban yang menolak sessionStorage (mode privat, cookie dimatikan)
    // tidak boleh membuat pemuatan halaman gagal. Dianggap belum pernah.
    return false;
  }
}

function tandaiMuatUlang(simpanan) {
  try {
    simpanan?.setItem(KUNCI_MUAT_ULANG, "1");
  } catch {
    // Sama: diam. Tanpa penanda, lapis ketiga hanya akan dicoba sekali lagi
    // pada pemuatan berikutnya, dan itu masih lebih baik daripada gagal.
  }
}

/**
 * Melupakan penanda itu.
 *
 * Dipanggil setiap kali sebuah halaman BERHASIL dimuat. Tanpa ini, penanda
 * sekali pasang berlaku sampai tab-nya ditutup: sendatan jaringan kedua di
 * sesi yang sama akan langsung melompat ke layar error tanpa pernah mencoba
 * memuat ulang. Tiap kejadian berhak atas satu pemuatan ulangnya sendiri.
 */
export function lupakanMuatUlang(simpanan = globalThis.sessionStorage) {
  try {
    simpanan?.removeItem(KUNCI_MUAT_ULANG);
  } catch {
    /* diam */
  }
}

/**
 * Memuat satu modul halaman, dengan ketiga lapis di atas.
 *
 * Murni dari React supaya bisa diuji sendiri: seluruh yang disentuhnya —
 * penunda, sessionStorage, dan cara memuat ulang — bisa diganti lewat `alat`.
 *
 * @param {() => Promise<any>} impor  `() => import("@/pages/Anu")`
 * @param {object} [alat]
 * @returns {Promise<any>} modul halamannya
 */
export async function muatModul(impor, alat = {}) {
  const {
    tunggu = (ms) => new Promise((r) => setTimeout(r, ms)),
    imporUrl = (u) => import(/* @vite-ignore */ u),
    simpanan = globalThis.sessionStorage,
    muatUlang = () => globalThis.location?.reload(),
    jeda = JEDA_MS,
  } = alat;

  try {
    const modul = await impor();
    lupakanMuatUlang(simpanan);
    return modul;
  } catch (galat) {
    // Galat DI DALAM halamannya (misalnya salah tulis saat modulnya
    // dijalankan) bukan urusan berkas ini: memuat ulang tidak akan
    // memperbaikinya, dan menyembunyikannya di balik dua percobaan hanya
    // menunda layar error yang memang perlu dilihat.
    if (!gagalUnduhModul(galat)) throw galat;

    const url = urlModulGagal(galat);
    if (url) {
      await tunggu(jeda);
      try {
        // Pemisah yang benar: URL hasil build sudah bisa membawa tanda tanya.
        const pemisah = url.includes("?") ? "&" : "?";
        const modul = await imporUrl(`${url}${pemisah}muat=1`);
        lupakanMuatUlang(simpanan);
        return modul;
      } catch {
        // Jatuh ke lapis ketiga.
      }
    }

    if (!sudahPernahMuatUlang(simpanan)) {
      tandaiMuatUlang(simpanan);
      muatUlang();
      // Memuat ulang tidak menghentikan kode ini seketika. Janji yang tidak
      // pernah selesai menahan <Suspense> tetap pada pemuatnya sampai
      // halamannya benar-benar berganti — lebih baik daripada layar merah
      // yang berkedip sepersekian detik sebelum hilang.
      return await new Promise(() => {});
    }

    // Sudah pernah dimuat ulang dan tetap gagal: berkasnya memang tidak ada.
    // Biarkan sampai ke layar error, lengkap dengan URL-nya.
    throw galat;
  }
}

/**
 * Pengganti React.lazy untuk halaman yang dimuat per rute.
 *
 * Dipakai di App.jsx untuk SELURUH halaman — penjaga scripts/cek-muat.mjs
 * menolak `lazy(` telanjang di sana, karena satu halaman yang terlewat
 * adalah satu halaman yang mengunci dirinya sendiri saat unduhannya meleset.
 */
export function muatHalaman(impor) {
  return lazy(() => muatModul(impor));
}
