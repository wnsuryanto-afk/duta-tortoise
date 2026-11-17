import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { daftarTray } from "@/lib/trayTelur";
import { warnaInduk } from "@/lib/warnaInduk";

/**
 * labelRingkas.js — SATU tata letak label ringkas kotak telur.
 *
 * ── Kenapa label ini ditata ulang (5 Okt 2026) ─────────────────────────────
 *
 * Label ditempel di kotak telur BENING di dalam inkubator, supaya telurnya bisa
 * dilihat tanpa membuka kotaknya. Label 100×50 mm menutupi hampir seluruh sisi
 * depan kotak — telurnya tidak kelihatan lagi. Ukuran yang benar adalah yang
 * kecil, dan karena ruangnya sedikit, setiap milimeter harus membawa keterangan
 * yang benar-benar dibaca orang sambil berdiri di depan rak.
 *
 * ── Apa yang DIBUANG, dan alasannya ────────────────────────────────────────
 *
 *   "Sulcata Breeding Farm · Probolinggo"  satu-satunya peternakan di rak itu
 *   "Centrochelys sulcata (African …)"     tidak ada yang membacanya di rak
 *   "dutatortoise.base44.app"              QR-nya sudah membawa alamat itu
 *   "F1 · Captive-bred"                    ada di layar yang dibuka QR
 *   "Pindai untuk info kura"               QR tidak perlu diterangkan
 *   "Inkubator 1"                          kotaknya sedang berada di dalamnya
 *   "KODE KOPLING K-011026-A36-A31"        tanggal + nama induk, keduanya sudah
 *                                          tercetak terpisah di label ini
 *   kandang induk (W3)                     keputusan kandang tidak diambil
 *                                          sambil berdiri di depan inkubator
 *   "Status: Bertelur"                     semua kotak di inkubator begitu
 *   "Suhu: ___ °C  Kelembapan: ___ %"      inkubatornya punya layar sendiri;
 *                                          pada label yang sudah terpasang
 *                                          baris ini KOSONG semua
 *   "Fertil: ___  Infertil: ___"           idem — kosong di semua label
 *
 * ── Apa yang DIBESARKAN ────────────────────────────────────────────────────
 *
 * Perkiraan menetas. Itu satu-satunya angka yang dicari orang saat melewati
 * rak, dan sebelumnya ia tercetak lebih kecil daripada nama induk — pada label
 * termal ringkas ia bahkan tidak ada sama sekali. Sekarang ia tulisan TERBESAR
 * di label, dan tanggal MULAI dipisahkan dari tanggal akhir: yang menentukan
 * kapan rak mulai ditengok adalah yang awal.
 *
 * ── Yang BARU: nomor tray ──────────────────────────────────────────────────
 *
 * Tray adalah satu-satunya hal yang membedakan telur induk A dari telur induk B
 * setelah keduanya masuk inkubator yang sama. Clutch yang BELUM punya tray
 * dicetak "?" dengan latar mencolok — bukan dikosongkan — supaya yang
 * menempelkannya melihat bahwa masih ada yang harus diisi. Pada 2 Okt 2026
 * ada 127 butir tanpa tray; label yang diam saja tidak akan pernah
 * memperbaikinya.
 *
 * ── Kenapa satu fungsi untuk dua printer ──────────────────────────────────
 *
 * Versi warna dan versi termal dulu ditulis terpisah di dua berkas, dan
 * isinya memang sudah berbeda: yang termal tidak punya perkiraan menetas.
 * Perbedaan nyata antara keduanya cuma warna, jadi tata letaknya satu di sini
 * dan yang dioper hanya paletnya. Dengan begitu tidak mungkin lagi satu versi
 * diperbaiki sementara yang lain tertinggal.
 */

export const PALET_WARNA = {
  bingkai: "#2D6A4F",
  kepalaBg: "linear-gradient(90deg,#1B4332,#2D6A4F)",
  kepalaFg: "#fff",
  kepalaRedup: "#95D5B2",
  trayAdaBg: "#FFFFFF",
  trayAdaFg: "#14532D",
  trayKosongBg: "#DC2626",
  trayKosongFg: "#FFFFFF",
  trayGaris: "transparent",
  // Lencana URUT: latar terang di kepala hijau, supaya angkanya terbaca dari
  // jarak rak tanpa bersaing dengan lencana TRAY yang putih penuh.
  pakaiWarnaInduk: true,
  urutBg: "#95D5B2",
  urutFg: "#1B4332",
  urutGaris: "transparent",
  kapsi: "#2D6A4F",
  besar: "#14532D",
  sampai: "#40916C",
  meta: "#1F2937",
  qrGaris: "#B7E4C7",
  qrLatar: "#F8FAF9",
  candBg: "#FEF3C7",
  candBgTelat: "#FEE2E2",
  candGaris: "#B45309",
  candGarisTelat: "#DC2626",
  candFg: "#78350F",
  candFgTelat: "#991B1B",
  candTgl: "#1F2937",
  candKotak: "#1F2937",
  bulat: true,
};

export const PALET_TERMAL = {
  bingkai: "#000",
  kepalaBg: "#000",
  kepalaFg: "#fff",
  kepalaRedup: "#fff",
  trayAdaBg: "#fff",
  trayAdaFg: "#000",
  trayKosongBg: "#000",
  trayKosongFg: "#fff",
  trayGaris: "#fff",
  kapsi: "#000",
  besar: "#000",
  sampai: "#000",
  meta: "#000",
  qrGaris: "#000",
  qrLatar: "#fff",
  candBg: "#fff",
  candBgTelat: "#000",
  candGaris: "#000",
  candGarisTelat: "#000",
  candFg: "#000",
  candFgTelat: "#fff",
  candTgl: "#000",
  candKotak: "#000",
  bulat: false,
  // Termal hanya hitam-putih: lencana urut memakai bingkai, bukan latar.
  urutBg: "#FFFFFF",
  urutFg: "#000",
  urutGaris: "#000",
};

/**
 * Tinggi MINIMUM kepala dan jalur candling. Bukan tinggi mati.
 *
 * ── Kenapa tidak dipatok ──────────────────────────────────────────────────
 *
 * Sebelumnya ketiga jalur diberi tinggi tetap dalam piksel, dan badan mengambil
 * sisanya — rapi di atas kertas, tetapi hanya selama tulisannya setinggi yang
 * dihitung. Di iPad tidak begitu: Safari membesarkan sendiri ukuran huruf di
 * blok yang lebar (`text-size-adjust`), dan karena `line-height` dinyatakan
 * tanpa satuan, kotak barisnya ikut membesar. Jalur yang tingginya dipatok
 * tidak ikut membesar — jadi baris TERAKHIR tiap jalur keluar dari jalurnya
 * dan dipotong: "24 butir · bertelur …" dan "3 Nov 2026".
 *
 * Sekarang kepala dan jalur candling memakai `flex:0 0 auto` dengan tinggi
 * MINIMUM, jadi mereka ikut membesar kalau isinya membesar; badan memakai
 * `flex:1 1 auto; min-height:0` sehingga ia yang mengalah. Badan punya ruang
 * lega paling banyak, jadi di situlah tekanan sebaiknya ditampung.
 *
 * `text-size-adjust:100%` di akar label menutup sumbernya sekalian — tapi
 * tata letak yang hanya benar kalau satu properti CSS dihormati bukan tata
 * letak yang benar. Keduanya dipasang.
 */
/*
 * 13 Nov 2026: jalur candling diturunkan dari 0,21 ke 0,17.
 *
 * Pemiliknya melaporkan: "Karena di labelling tulisannya candling, saya tidak
 * tahu pasti kapan perkiraan menetas." Kedua keterangan memang ada di label
 * ini — perkiraan menetas di badan, candling di jalur bawah — tetapi yang
 * bawah adalah pita berwarna selebar label dengan kotak centang sendiri,
 * sementara perkiraan menetas hanya tulisan di atas latar putih. Mata jatuh
 * ke pitanya.
 *
 * Yang dikembalikan ke badan adalah 4% tinggi label. Candling tetap ada dan
 * tetap berpita — ia tugas yang harus ditandai, dan tanggalnya tetap terbaca
 * — hanya tidak lagi memakai seperlima label untuk itu.
 */
export function tinggiJalur(hPx) {
  const kepala = Math.round(hPx * 0.20);
  const candling = Math.round(hPx * 0.16);
  return { kepala, candling, badan: hPx - kepala - candling };
}

/**
 * @param {object}  breeding   satu clutch
 * @param {object}  ukuran     { wPx, hPx } ukuran label dalam piksel
 * @param {string}  qrDataUrl  QR yang sudah dibangkitkan pemanggil
 * @param {object}  palet      PALET_WARNA atau PALET_TERMAL
 */
/**
 * Tumpukan huruf dipatok di labelnya sendiri.
 *
 * Label ini digambar html2canvas dari sepotong DOM yang ditempel ke halaman
 * aplikasi, jadi tanpa patokan ia MEWARISI huruf perangkatnya: Arial di satu
 * tempat, SF Pro di iPad, apa pun di tempat lain. Tinggi huruf ketiganya tidak
 * sama, dan yang menentukan apakah sebuah baris terpotong adalah tinggi
 * hurufnya terhadap kotak barisnya. Label yang mewarisi huruf berarti label
 * yang bentuknya berbeda di tiap perangkat — dan yang rusaknya baru ketahuan
 * setelah kertasnya keluar dari printer.
 */
const HURUF = "Arial, Helvetica, sans-serif";

/**
 * Gaya satu baris teks yang dipotong di ujungnya (…) tanpa terpotong di BAWAH.
 *
 * ── Kenapa angka-angka ini ada ────────────────────────────────────────────
 *
 * Setiap baris di label ini memakai `white-space:nowrap; overflow:hidden`
 * supaya nama panjang berakhir dengan "…" alih-alih mendorong lencana TRAY
 * keluar label. Tapi `overflow:hidden` memotong ke SEGALA arah: kalau kotak
 * barisnya (font-size × line-height) lebih pendek daripada huruf yang
 * digambar, bagian bawah hurufnya ikut hilang — dan yang hilang bukan ekor
 * huruf saja, melainkan separuh angka.
 *
 * Itu yang terjadi 5 Okt 2026: tata letak baru memakai line-height 1 sampai
 * 1,2 tanpa bantalan, dan di iPad "23 Des 2026" keluar terpotong separuh.
 * Penulis label sebelumnya sudah pernah menemukannya — tiap baris di versi
 * lama membawa `padding-bottom: 0,22 × font-size` — dan bantalan itulah yang
 * hilang saat tata letaknya ditulis ulang.
 *
 * line-height 1,35 + bantalan 0,18em memuat huruf setinggi ~1,7em. Arial
 * ~1,12em, SF Pro ~1,2em, DejaVu ~1,16em. cek-label.mjs mengukurnya sungguhan
 * di beberapa tumpukan huruf, bukan mempercayai hitungan ini.
 *
 * `flex-shrink:0` dipasang sebagai pengaman, bukan karena ada cacat yang
 * sedang diperbaiki olehnya. Anak flex boleh menyusut di bawah tinggi isinya
 * secara bawaan; kalau itu terjadi, kotak barisnya jadi lebih pendek daripada
 * hurufnya dan `overflow:hidden` memotong sedikit di SETIAP baris — luapan
 * yang tersebar seperti itu jauh lebih sulit dilihat daripada satu tempat yang
 * jelas meluap. Dengan ukuran huruf sekarang badan label punya ruang lega, jadi
 * mencabutnya TIDAK membuat cek-label.mjs merah; itu sudah dicoba. Ia menjaga
 * kalau isinya nanti bertambah.
 */
const LH = 1.35;
const BANTALAN = 0.18;
export function gayaBaris(fs) {
  return `font-size:${fs}px;line-height:${LH};padding-bottom:${Math.ceil(fs * BANTALAN)}px;flex-shrink:0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
}
/** Tinggi yang benar-benar dipakai satu baris teks. */
export function tinggiBaris(fs) {
  return Math.round(fs * LH) + Math.ceil(fs * BANTALAN);
}

/**
 * Berapa ruang badan yang boleh dipakai baris-barisnya.
 *
 * Sisanya sengaja dibiarkan kosong. Label ini digambar di perangkat yang
 * tidak bisa diukur dari sini — iPad, HP kiper, printer lewat aplikasi
 * pencetak — dan di sana tinggi sebuah baris tidak persis sama dengan yang
 * dihitung di peramban pengembang: huruf penggantinya lebih tinggi, atau
 * pembulatannya berbeda. Yang tidak boleh terjadi adalah baris terakhir
 * terpotong separuh, karena justru di situ jumlah butir dan tanggalnya
 * berada.
 */
const SISA_AMAN = 0.78;

/**
 * Faktor pengecil huruf badan, supaya SEMUA barisnya muat.
 *
 * Dihitung sebelum apa pun digambar: tinggi tiap baris sudah bisa diketahui
 * dari ukuran hurufnya lewat tinggiBaris(), jadi tidak perlu menunggu
 * peramban mengukurnya — dan tidak perlu menebak berapa besar perangkat lain
 * akan membesarkan hurufnya.
 *
 * Mengembalikan 1 bila sudah muat; lebih kecil dari 1 bila perlu dikecilkan.
 * Dipisah jadi fungsi sendiri supaya scripts/cek-label.mjs bisa memeriksanya
 * tanpa menjalankan peramban.
 *
 * @param {number[]} ukuranHuruf ukuran tiap baris badan, dalam px
 * @param {number}   tinggiBadan tinggi jalur badan, dalam px
 * @param {number}   bantalanTegak padding atas + bawah kolom teks, dalam px
 */
export function faktorMuat(ukuranHuruf = [], tinggiBadan = 0, bantalanTegak = 0) {
  const butuh = ukuranHuruf.reduce((s, f) => s + tinggiBaris(f), 0);
  const tersedia = (tinggiBadan - bantalanTegak) * SISA_AMAN;
  if (butuh <= 0 || tersedia <= 0 || butuh <= tersedia) return 1;
  return tersedia / butuh;
}

/**
 * @param {object} breeding   satu clutch
 * @param {object} ukuran     { wPx, hPx }
 * @param {string} qrDataUrl  QR yang sudah dibangkitkan pemanggil
 * @param {object} palet      PALET_WARNA atau PALET_TERMAL
 * @param {number|null} urutan  urutan menetas; null bila tidak diketahui
 */
export function labelRingkasHTML(breeding, { wPx, hPx }, qrDataUrl, palet, urutan = null, kode = null, inkubator = null) {
  const K = palet;
  const pad = Math.max(3, Math.round(wPx * 0.022));
  const { kepala: hdrH, candling: candH, badan: bodyH } = tinggiJalur(hPx);
  const qrKolom = Math.round(wPx * 0.3);
  /*
    QR DIBATASI, supaya ruang tulis tangan di bawahnya benar-benar bisa
    ditulisi.

    Sebelumnya QR mengambil selebar kolomnya: 151px pada 50 × 30 mm, yaitu
    12,8 mm. Isinya hanya "BREED:<id>" — pada cetakan 300 DPI, 10 mm sudah
    jauh di atas ambang baca ponsel untuk muatan sependek itu. Sisa 2,8 mm
    itu lebih berguna sebagai tempat menulis daripada sebagai QR yang
    lebih besar dari yang diperlukan.

    0,34 × tinggi label = 120px pada label 30 mm, yaitu 10,2 mm.
  */
  const qrSisi = Math.max(40, Math.min(qrKolom - pad * 2, bodyH - pad * 2, Math.round(hPx * 0.34)));
  const fs = (bagian) => Math.max(7, Math.round(hPx * bagian));
  const r = (n) => (K.bulat ? `${n}px` : "0");

  const tgl = (nilai, pola = "d MMM yyyy") => {
    if (!nilai) return null;
    const d = new Date(nilai);
    return Number.isNaN(d.getTime()) ? null : format(d, pola, { locale: idLocale });
  };

  const tray = daftarTray(breeding);
  const adaTray = tray.length > 0;
  const trayTeks = adaTray ? tray.join(" · ") : "?";
  const trayBg = adaTray ? K.trayAdaBg : K.trayKosongBg;
  const trayFg = adaTray ? K.trayAdaFg : K.trayKosongFg;

  const bertelur = tgl(breeding.egg_laying_date) || "—";

  /*
    Kotak telur retak, ditempel di baris keterangan yang sudah ada — bukan
    baris baru.

    Label ini 50 × 30 mm. Satu baris tambahan berarti satu jalur lagi yang
    harus muat, dan jalur yang tidak muat memotong tulisannya sendiri
    (lihat tinggiJalur di atas, yang lahir dari persis kejadian itu).
    Keterangannya pendek — "retak di R1" — jadi ia menumpang di baris butir
    dan tanggal bertelur, yang memang sudah ada.
  */
  const retakDi = String(breeding.tray_retak || "").trim();
  /*
    TAHUN DITULIS SEKALI SAJA, di ujung yang membutuhkannya.

    Baris tanggal buka dan tanggal tutup kini SATU baris (lihat di bawah),
    jadi lebarnya menentukan apakah ia terpotong mendatar. Jendela menetas
    lebarnya 25 hari, jadi tahun hanya perlu muncul satu kali:

      sejendela setahun   "3 Des 2026 s/d 28 Des"
      menyeberang tahun   "21 Des s/d 15 Jan 2027"

    Percobaan sebelumnya menulis tahun di KEDUA ujung dan langsung terpotong
    jadi "…" pada 40 × 30 mm untuk clutch yang menyeberang tahun — dan di
    kebun ini clutch semacam itu banyak.
  */
  const tahunDari = (nilai) => String(nilai || "").slice(0, 4);
  const bedaTahun =
    tahunDari(breeding.estimated_hatch_end) !== tahunDari(breeding.estimated_hatch_start) &&
    Boolean(breeding.estimated_hatch_end);
  const mulai = tgl(breeding.estimated_hatch_start, bedaTahun ? "d MMM" : "d MMM yyyy") || "—";

  /*
    Tahun pada tanggal TUTUP hanya ditulis bila berbeda dari tahun bukanya.

    Percobaan pertama menempelkan "s/d 28 Des 2026" utuh ke baris tanggal
    besar, dan baris itu langsung terpotong MENDATAR jadi "…" pada 40 × 30 mm
    — menukar pemotongan di bawah dengan pemotongan di samping, yang persis
    hal yang sedang diperbaiki.

    Jendela menetas lebarnya 25 hari, jadi hampir selalu berada di tahun yang
    sama dengan bukanya dan tahun kedua itu tidak menambah apa pun. Saat
    jendelanya memang menyeberang tahun — bertelur Oktober, menetas Desember
    sampai Januari — tahunnya tetap ditulis, karena di situlah ia berarti.
  */
  const sampai = tgl(breeding.estimated_hatch_end, bedaTahun ? "d MMM yyyy" : "d MMM");

  const cdDate = breeding.egg_laying_date ? new Date(breeding.egg_laying_date) : null;
  if (cdDate && !Number.isNaN(cdDate.getTime())) cdDate.setDate(cdDate.getDate() + 30);
  const cdStr = cdDate && !Number.isNaN(cdDate.getTime()) ? format(cdDate, "d MMM yyyy", { locale: idLocale }) : "—";
  const telat = Boolean(cdDate && !Number.isNaN(cdDate.getTime()) && cdDate < new Date() && !breeding.candling_day_30_done);

  const fTrayLbl = fs(0.034);
  const fTray = fs(0.056);
  /*
    Huruf badan dibesarkan sedikit, 17 Nov 2026 — DIUKUR, bukan dikira.

    Pemiliknya minta ruang kosong label dipakai. Setelah QR dibatasi dan
    pita bawah diisi keterangan lemari, kolom kiri masih menyisakan jarak
    kosong di atas dan di bawah tulisannya. Jadi hurufnya yang naik:
    tanggal 0,112 → 0,118 (40px → 42px pada label 30 mm), keterangan
    0,041 → 0,045, kapsi 0,036 → 0,038.

    Batas potongnya disapu di Chromium pada empat tumpukan huruf, naik
    ×0,05 demi ×0,05:

      sebelum   bersih sampai ×1,55
      sesudah   bersih sampai ×1,50 (50×30) dan ×1,55 (40×30)

    Penjaga cek-label mewajibkan bersih sampai ×1,25; label yang dulu
    dikeluhkan terpotong ada di ×1,30. Jadi yang dibelanjakan di sini 0,05
    dari margin, dan sisanya dua kali lipat dari yang pernah bermasalah.

    Mendatar juga diperiksa: pada 40 × 30 mm dengan jendela menyeberang
    tahun ("21 Des s/d 15 Jan 2027") tidak ada satu baris pun yang
    meluap di keempat tumpukan huruf. Satu langkah lebih besar lagi
    (0,125) membuat barisnya pas-pasan, jadi berhenti di 0,118.
  */
  const fKapsi = fs(0.038);
  const fBesar = fs(0.118);
  const fSampai = fs(0.05);
  const fMeta = fs(0.045);

  /*
    13 Nov 2026 — ruang badan dilonggarkan, dan kenapa BUKAN dengan
    menggabungkan baris.

    Pemiliknya mengirim foto label di iPad dengan baris terakhir terpotong di
    tepi bawah: "17 butir · bertelur 14 Sep 2026" terpangkas separuh. Diukur
    di peramban sungguhan pada 50 × 30 mm @ 300 dpi, keempat baris badan
    memakai 149 dari 204 px — 73% penuh — dan mulai terpotong begitu hurufnya
    membesar sekitar 30%, yang terjadi di perangkat lain.

    Percobaan pertama menempelkan "s/d <tanggal>" ke baris tanggal besar
    sebagai teks kecil. Secara tegak itu berhasil — satu baris penuh hilang
    tanpa biaya tinggi — tetapi barisnya lalu terlalu LEBAR dan dipotong
    mendatar jadi "…", bahkan pada ukuran huruf normal untuk clutch yang
    jendelanya menyeberang tahun ("21 Des 2026 s/d 15 Jan 2027"). Di kebun
    ini jendela semacam itu banyak. Menukar potongan di bawah dengan potongan
    di samping bukan perbaikan.

    Jadi barisnya tetap empat, dan ruangnya diambil dari tempat lain: huruf
    tanggal besar sedikit diturunkan, huruf keterangan diturunkan, dan jalur
    kepala serta candling masing-masing menyerahkan sedikit tingginya ke
    badan. Lihat tinggiJalur().
  */
  /*
    RUANG KOSONG DI BADAN ITU DISENGAJA — 16 Nov 2026.

    Pemiliknya meminta "banyak ruang kosong di label yang perlu bisa
    dimanfaatkan" dan "besar kecilnya efektif". Keduanya benar, tapi
    permintaan itu bertabrakan dengan keluhannya sendiri dua hari
    sebelumnya: baris terakhir label terpotong di iPad-nya.

    Diukur pada 50 × 30 mm @ 300 dpi, dengan tiga baris badan:

      huruf tanggal 0,105   badan 57% penuh   terpotong mulai ×1,6
      huruf tanggal 0,112   badan 59% penuh   terpotong mulai ×1,5
      huruf tanggal 0,118   badan 62% penuh   terpotong mulai ×1,4

    Baris yang terpotong di iPad itu dulu memakai 73% dan mulai terpotong
    pada ×1,3. Mengisi ruang kosongnya sampai habis berarti kembali ke
    keadaan yang dikeluhkan.

    Dipilih 0,112: tanggal menetas naik 7% dari ukuran kemarin, dan sisa
    ruangnya tetap dua kali lipat lebih longgar daripada bentuk yang
    terpotong. Sisa yang terlihat kosong itu bukan ruang terbuang — itu
    jarak amannya.
  */
  const fCandLbl = fs(0.04);
  const fCandTgl = fs(0.064);

  /*
    Keempat baris badan dikecilkan bersama-sama bila tidak muat.

    Sampai hari ini ukuran hurufnya dipatok sebagai pecahan tinggi label dan
    tidak pernah diperiksa apakah jumlahnya muat. Pada 50 × 30 mm mereka
    memakai 73% ruang badan — cukup di peramban pengembang, tetapi di iPad
    pemiliknya baris terakhir keluar terpotong separuh.

    Sekarang tingginya dihitung lebih dulu lewat tinggiBaris(), dan kalau
    jumlahnya melewati batas aman, SELURUH baris badan dikecilkan dengan
    faktor yang sama. Dikecilkan bersama supaya urutan besar-kecilnya tetap:
    tanggal menetas harus tetap yang paling besar, apa pun yang terjadi.

    Pada ukuran yang dipakai sekarang faktornya 1 — tidak ada yang berubah.
    Ia menjaga kalau nanti ada baris yang ditambahkan, atau ukuran label baru
    yang lebih pendek dipilih.
  */
  const bantalanTegak = Math.round(pad * 0.5) * 2;
  const faktor = faktorMuat([fKapsi, fBesar, sampai ? fSampai : 0, fMeta].filter(Boolean), bodyH, bantalanTegak);
  const kecil = (f) => Math.max(7, Math.round(f * faktor));
  const gKapsi = kecil(fKapsi);
  const gBesar = kecil(fBesar);
  const gSampai = kecil(fSampai);
  const gMeta = kecil(fMeta);

  /*
    LENCANA URUTAN MENETAS — 14 Nov 2026.

    "Alangkah baiknya kalau ada nomor urut. Jadi kita menaruh kotak telurnya,
    bisa lihat dari sisi labelnya urutan nomor berapa berdasarkan netasnya."

    ── Kenapa nomor tercetak di sini AMAN, padahal urutannya berubah ────

    Begitu clutch nomor 1 menetas, yang nomor 2 menjadi nomor 1, dan angka
    yang terlanjur tercetak di kotak-kotak lain jadi tidak lagi mulai dari
    satu. Itu terdengar seperti alasan untuk tidak mencetaknya sama sekali —
    dan memang itu alasan yang dipakai untuk TIDAK mencetak jumlah menetas.

    Bedanya: yang dipakai orang dari nomor ini bukan angkanya, melainkan
    URUTANNYA. Jendela menetas tiap clutch sama lebarnya, jadi dua clutch
    tidak pernah bertukar tempat; nomor yang tercetak boleh bergeser semua
    bersama-sama, tetapi susunan kotak di rak tetap benar selamanya. Jumlah
    menetas tidak punya sifat itu — angka 4 yang tercetak akan benar-benar
    salah begitu telur kelima menetas.

    Nomornya dihitung saat MENCETAK, dari clutch yang sedang dierami, dan
    diteruskan dari EggLabelGenerator. Label yang tidak tahu urutannya —
    misalnya dicetak dari layar lain — tidak menampilkan lencana ini sama
    sekali, bukan menampilkan "?" yang menggoda untuk dipercaya.
  */
  const fUrutLbl = fs(0.03);
  const fUrut = fs(0.072);
  const urutanHtml = Number.isFinite(Number(urutan)) && Number(urutan) > 0
    ? `<div style="flex-shrink:0;background:${K.urutBg};border:1.5px solid ${K.urutGaris};border-radius:${r(Math.round(hdrH * 0.16))};padding:${Math.round(hdrH * 0.04)}px ${Math.round(pad * 0.8)}px;text-align:center">
      <div style="font-weight:800;letter-spacing:1px;color:${K.urutFg};${gayaBaris(fUrutLbl)}">URUT</div>
      <div style="font-weight:900;color:${K.urutFg};${gayaBaris(fUrut)}">${Number(urutan)}</div>
    </div>`
    : "";

  /*
    KEPALA LABEL — ditata ulang 16 Nov 2026.

    Sebelumnya yang terbesar di kepala adalah nama pasangan, "A35 × A47".
    Diukur pada data hari itu: 12 dari 18 kotak aktif memakai nama pasangan
    yang juga dipakai kotak lain — A35 × A47 sendiri dipakai TIGA kotak.
    Jadi tulisan terbesar di label justru satu-satunya keterangan yang tidak
    membedakan, sementara pembedanya (tanggal bertelur) dicetak paling kecil
    di baris paling bawah.

    Sekarang yang terbesar adalah kode clutch — "A47-3", betina dan clutch
    keberapa miliknya — dengan tanggal bertelur dan nama pejantan sebagai
    baris kecil di bawahnya. Tidak ada keterangan yang hilang; yang berubah
    hanya mana yang dibaca lebih dulu.

    Warna kepala mengikuti induk betinanya, jadi kotak dari induk yang sama
    terlihat sekelompok dari jarak rak. Itu lapis kedua, bukan pembeda
    utama — tiga kotak A47 berwarna sama persis, dan justru ketiganya yang
    paling mungkin tertukar. Lihat lib/warnaInduk.js.
  */
  const wInduk = K.pakaiWarnaInduk ? warnaInduk(breeding.female_name) : null;
  const kepalaBg = wInduk ? wInduk.bg : K.kepalaBg;
  const kodeTampil = String(kode || "").trim() || `${breeding.male_name || "—"} × ${breeding.female_name || "—"}`;
  const fKode = fs(0.095);

  /*
    KEPALA TETAP SATU BARIS. Diukur, bukan dikira.

    Percobaan pertama menaruh tanggal bertelur dan nama pejantan sebagai
    baris kecil KEDUA di kepala. Badannya memang turun dari empat baris ke
    tiga — tapi kepalanya naik dari satu baris ke dua, dan kepala itu
    `flex:0 0 auto`: ia tidak pernah mengalah. Saat hurufnya membesar,
    kepala dua baris tumbuh dua kali lebih cepat dan memakan jatah badan.

    Terukur pada 50 × 30 mm: kepala 83px pada huruf normal menjadi 115px
    pada ×1,5, dan batas potong badan hanya bergerak dari ×1,30 ke ×1,35.
    Nyaris tidak ada perbaikan — hanya memindahkan barisnya dari satu jalur
    ke jalur lain.

    Jadi keterangan itu pindah ke baris kecil di BADAN, yang memang jalur
    yang boleh mengalah.
  */

  const kepalaHtml = `<div style="min-height:${hdrH}px;box-sizing:border-box;background:${kepalaBg};padding:${Math.round(pad * 0.3)}px ${pad}px;display:flex;align-items:center;gap:${pad}px;flex:0 0 auto">
    <div style="flex:1;min-width:0">
      <div style="font-weight:900;color:${K.kepalaFg};${gayaBaris(fKode)}">${kodeTampil}</div>
    </div>
    ${urutanHtml}
    <div style="flex-shrink:0;background:${trayBg};border:1.5px solid ${K.trayGaris};border-radius:${r(Math.round(hdrH * 0.16))};padding:${Math.round(hdrH * 0.04)}px ${Math.round(pad * 0.9)}px;text-align:center">
      <div style="font-weight:800;letter-spacing:1px;color:${trayFg};${gayaBaris(fTrayLbl)}">BAKI</div>
      <div style="font-weight:900;color:${trayFg};${gayaBaris(fTray)}">${trayTeks}</div>
    </div>
  </div>`;

  /*
    RUANG TULIS TANGAN — di bawah QR, di ruang yang memang sudah kosong.

    Pemiliknya minta satu tempat untuk mencatat dengan pulpen di labelnya
    sendiri. Baris badan sudah dipangkas sampai muat; menambah satu baris di
    sana berarti mengembalikan pemotongan tulisan yang baru saja dibereskan.

    Kolom QR tidak begitu. QR-nya dibatasi LEBAR kolom, bukan tingginya:
    pada 50 × 30 mm kolomnya 177px dan QR-nya 151px, sedangkan jalur badan
    226px — tersisa sekitar 75px kosong di bawah QR yang tidak dipakai apa
    pun. Garis tulis ini menempati ruang itu, jadi ia tidak mengambil
    setitik pun jatah tulisan yang dicetak.

    `flex:0 1 auto` + `overflow:hidden`: saat huruf membesar, inilah yang
    mengalah lebih dulu — ia ruang kosong, bukan keterangan.

    Dan di DALAMNYA, yang mengalah adalah GARISNYA (`flex:1 1`), bukan kata
    "CATATAN" (`flex:0 0`). Percobaan pertama memberi garis itu tinggi mati
    16px, dan penjaga cek-label langsung menangkapnya: pada huruf ×1,25
    isinya 8px lebih tinggi daripada kotaknya, jadi labelnya terpotong di
    pembesaran yang justru wajib bersih. Ruang tulis boleh menyempit;
    tulisan tercetak tidak boleh.
  */
  const fNota = fs(0.03);
  const notaGaris = Math.max(8, Math.round(hPx * 0.1));
  const notaHtml = `<div style="flex:0 1 auto;min-height:0;width:100%;box-sizing:border-box;padding:0 ${Math.round(pad * 0.8)}px;display:flex;flex-direction:column;overflow:hidden">
      <div style="flex:0 0 auto;font-weight:800;letter-spacing:0.6px;color:${K.kapsi};${gayaBaris(fNota)}">CATATAN</div>
      <div style="flex:1 1 ${notaGaris}px;min-height:0;border-bottom:1px solid ${K.qrGaris}"></div>
    </div>`;

  const badanHtml = `<div style="flex:1 1 auto;min-height:0;box-sizing:border-box;display:flex;flex-direction:row;overflow:hidden">
    <div style="flex:1 1 auto;min-width:0;padding:${Math.round(pad * 0.5)}px ${pad}px;display:flex;flex-direction:column;justify-content:center">
      <div style="font-weight:800;letter-spacing:1.2px;color:${K.kapsi};${gayaBaris(gKapsi)}">PERKIRAAN MENETAS &middot; 80&ndash;105 HARI</div>
      <div style="display:flex;align-items:baseline;gap:${Math.round(pad * 0.5)}px;min-width:0">
        <span style="font-weight:900;color:${K.besar};${gayaBaris(gBesar)}">${mulai}</span>
        ${sampai ? `<span style="font-weight:700;color:${K.sampai};${gayaBaris(gSampai)}">s/d ${sampai}</span>` : ""}
      </div>
      <div style="color:${K.meta};${gayaBaris(gMeta)}">${breeding.male_name ? `&male; ${breeding.male_name} &middot; ` : ""}<b>${breeding.egg_count || 0} butir</b> &middot; ${bertelur}${retakDi ? ` &middot; retak di ${retakDi}` : ""}</div>
    </div>
    <div style="width:${qrKolom}px;flex-shrink:0;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(pad * 0.4)}px;border-left:1px solid ${K.qrGaris};background:${K.qrLatar}">
      <img src="${qrDataUrl}" width="${qrSisi}" height="${qrSisi}" style="display:block;flex:0 0 auto"/>
      ${notaHtml}
    </div>
  </div>`;

  /*
    KETERANGAN LEMARI — 17 Nov 2026, mengisi ruang kosong di tengah pita.

    Pemiliknya meminta ruang kosong label dimanfaatkan dan keterangan lain
    ditambahkan. Pita bawah punya tulisan di kiri dan kotak centang di
    kanan; di antaranya selama ini kosong selebar hampir separuh label.

    Yang ditaruh di situ dipilih karena MENDATAR: ia tidak menambah satu
    baris pun, jadi tidak mengambil kembali jarak aman yang baru saja
    dibelikan dengan membuang satu baris badan.

    Isinya nama inkubator — kalau satu kotak terbawa ke lemari yang salah,
    labelnya sendiri yang memberi tahu — dan setelan suhu/kelembapan lemari
    itu bila datanya ikut dialirkan. Keduanya tidak berubah selama clutch
    hidup, jadi aman tercetak.
  */
  const namaLemari = String(breeding.incubator_name || "").trim();
  const suhu = Number(inkubator?.temp_setting);
  const lembap = Number(inkubator?.humidity_setting);
  const setelan = [
    Number.isFinite(suhu) && suhu > 0 ? `${suhu}&deg;C` : "",
    Number.isFinite(lembap) && lembap > 0 ? `${lembap}%` : "",
  ].filter(Boolean).join(" &middot; ");
  const isiLemari = [namaLemari, setelan].filter(Boolean).join(" &middot; ");
  const fLemari = fs(0.038);
  const lemariHtml = isiLemari
    ? `<div style="flex:1 1 auto;min-width:0;text-align:right;color:${telat ? K.candFgTelat : K.candFg};${gayaBaris(fLemari)}">${isiLemari}</div>`
    : `<div style="flex:1 1 auto"></div>`;

  const candlingHtml = `<div style="min-height:${candH}px;box-sizing:border-box;background:${telat ? K.candBgTelat : K.candBg};border-top:2px solid ${telat ? K.candGarisTelat : K.candGaris};padding:${Math.round(pad * 0.3)}px ${pad}px;display:flex;align-items:center;gap:${pad}px;flex:0 0 auto">
    <div style="flex:0 0 auto;min-width:0">
      <div style="font-weight:800;letter-spacing:0.8px;color:${telat ? K.candFgTelat : K.candFg};${gayaBaris(fCandLbl)}">TEROPONG H+30${telat ? " · TERLAMBAT" : ""}</div>
      <div style="font-weight:900;color:${telat ? K.candFgTelat : K.candTgl};${gayaBaris(fCandTgl)}">${cdStr}</div>
    </div>
    ${lemariHtml}
    <div style="width:${Math.round(candH * 0.42)}px;height:${Math.round(candH * 0.42)}px;border:2px solid ${telat ? K.candFgTelat : K.candKotak};background:#fff;border-radius:${r(3)};flex-shrink:0"></div>
  </div>`;

  return `<div style="width:${wPx}px;height:${hPx}px;background:#fff;font-family:${HURUF};-webkit-text-size-adjust:100%;text-size-adjust:100%;border:2px solid ${K.bingkai};border-radius:${r(Math.round(hPx * 0.03))};box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden">${kepalaHtml}${badanHtml}${candlingHtml}</div>`;
}
