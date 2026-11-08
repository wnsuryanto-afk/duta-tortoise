/**
 * isyaratTampil.js — memberi tahu pembungkus preview bahwa aplikasi sudah tampil.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 8 Nov 2026 pemiliknya melaporkan pil "Loading preview" berputar tanpa henti
 * di setiap halaman, di preview Base44 maupun aplikasi terbit, sementara isi
 * halamannya tergambar lengkap dan benar. Memuat ulang tidak menolong.
 *
 * Pil itu hilang ketika halaman mengirim satu pesan ke jendela induknya:
 *
 *     window.parent.postMessage({ type: "sandbox:onMounted" }, "*")
 *
 * Dua skrip bawaan @base44/vite-plugin bisa mengirimnya —
 * injections/sandbox-mount-observer.js dan injections/ssr-mount-signal.js —
 * dan keduanya bersyarat sama:
 *
 *     if (!doc.body.querySelector("[data-source-location], [data-dynamic-content]"))
 *       return false;
 *
 * `data-source-location` disisipkan pengolah JSX Base44 HANYA saat kode
 * diproses untuk editornya. Dihitung pada hasil build 8 Nov 2026:
 *
 *     data-source-location di dist/assets/*.js   →  0 kemunculan
 *     skrip pengamat di dist/index.html          →  tidak disuntikkan
 *
 * Jadi pada aplikasi yang sudah dibangun syarat itu tidak mungkin terpenuhi,
 * pesannya tidak pernah terkirim, dan pembungkusnya menunggu selamanya.
 *
 * ── Kenapa boleh dikirim dari sini ───────────────────────────────────
 *
 * Yang dikirim adalah pernyataan yang BENAR: isyarat ini baru berangkat
 * sesudah akar React benar-benar berisi sesuatu. Jadi aplikasi ini tidak
 * mengaku tampil padahal belum — ia mengatakan hal yang sama dengan skrip
 * bawaan tadi, hanya tanpa bergantung pada atribut yang memang tidak ada di
 * hasil build.
 *
 * Yang perlu diketahui orang berikutnya: `sandbox:onMounted` adalah pesan
 * dalaman Base44, bukan antarmuka yang dijanjikan ke siapa pun. Ia bisa
 * berubah atau hilang tanpa pemberitahuan. Kalau suatu hari pil itu muncul
 * lagi, berkas ini tempat pertama yang diperiksa — dan mencabutnya tidak
 * merusak apa pun di aplikasi, karena tidak ada satu pun bagian aplikasi
 * yang bergantung padanya.
 *
 * Tidak mengirim apa pun saat aplikasi dibuka langsung (bukan di dalam
 * bingkai): di luar pembungkus preview, tidak ada yang mendengarkan.
 */

/** Pesan dalaman Base44 yang menghentikan pil "Loading preview". */
const PESAN = { type: "sandbox:onMounted" };

/** Akar tempat React menggambar; isinya yang menentukan "sudah tampil". */
const AKAR = "root";

/** Benar bila akar React sudah berisi sesuatu yang digambar. */
function sudahTampil(doc) {
  const akar = doc.getElementById(AKAR);
  return !!akar && akar.childElementCount > 0;
}

/**
 * Memasang pelapor. Aman dipanggil berkali-kali; yang kedua tidak berbuat apa-apa.
 *
 * @param {Window} win
 * @param {Document} doc
 * @returns {boolean} true bila pelapornya benar-benar dipasang.
 */
export function pasangIsyaratTampil(win = globalThis.window, doc = globalThis.document) {
  if (!win || !doc) return false;
  // Di luar bingkai tidak ada pembungkus yang mendengarkan.
  if (win.self === win.top) return false;
  if (win.__isyaratTampilTerpasang) return false;
  win.__isyaratTampilTerpasang = true;

  const lapor = () => {
    if (!sudahTampil(doc)) return false;
    try {
      win.parent?.postMessage(PESAN, "*");
    } catch {
      // Pembungkus dari asal lain yang menolak pesan bukan alasan untuk
      // menjatuhkan aplikasinya. Diam.
    }
    return true;
  };

  /*
    Dikirim ulang pada setiap perpindahan halaman, bukan sekali saja.

    Pembungkusnya menyalakan pil itu lagi tiap kali alamatnya berubah —
    pemiliknya melihatnya di /area/kura maupun /breeding.

    TIDAK dengan menumpangi history.pushState. Percobaan pertama saya begitu,
    dan isyaratnya tidak pernah berangkat: impor ES dievaluasi sebelum baris
    mana pun di main.jsx berjalan, jadi react-router sudah memegang fungsi
    aslinya saat pembungkus saya dipasang — pembungkusnya terpasang di
    window.history, tetapi yang dipanggil router bukan itu. Diuji di
    peramban: isyarat tetap 2 sebelum dan sesudah pindah halaman.

    Yang dipakai sekarang: satu pengamat DOM yang TIDAK dilepas, persis
    seperti sandbox-mount-observer.js bawaan. Perpindahan halaman selalu
    mengubah DOM, jadi alamatnya ikut diperiksa di situ.
  */
  let alamatTerakhir = null;
  const laporBilaPerlu = () => {
    if (!sudahTampil(doc)) return;
    const alamat = win.location?.href;
    if (alamat === alamatTerakhir) return;
    alamatTerakhir = alamat;
    lapor();
  };

  const Pengamat = win.MutationObserver;
  if (!Pengamat) {
    laporBilaPerlu();
    win.addEventListener("load", laporBilaPerlu, { once: true });
    return true;
  }
  new Pengamat(laporBilaPerlu).observe(doc.documentElement, { childList: true, subtree: true });
  laporBilaPerlu();
  // Halaman yang sudah selesai sebelum pengamatnya sempat melihat apa pun.
  win.addEventListener("load", laporBilaPerlu, { once: true });
  return true;
}
