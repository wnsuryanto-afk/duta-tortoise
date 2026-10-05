import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { daftarTray } from "@/lib/trayTelur";

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
export function tinggiJalur(hPx) {
  const kepala = Math.round(hPx * 0.22);
  const candling = Math.round(hPx * 0.21);
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

export function labelRingkasHTML(breeding, { wPx, hPx }, qrDataUrl, palet) {
  const K = palet;
  const pad = Math.max(3, Math.round(wPx * 0.022));
  const { kepala: hdrH, candling: candH, badan: bodyH } = tinggiJalur(hPx);
  const qrKolom = Math.round(wPx * 0.3);
  const qrSisi = Math.max(40, Math.min(qrKolom - pad * 2, bodyH - pad * 2));
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
  const mulai = tgl(breeding.estimated_hatch_start) || "—";
  const sampai = tgl(breeding.estimated_hatch_end);

  const cdDate = breeding.egg_laying_date ? new Date(breeding.egg_laying_date) : null;
  if (cdDate && !Number.isNaN(cdDate.getTime())) cdDate.setDate(cdDate.getDate() + 30);
  const cdStr = cdDate && !Number.isNaN(cdDate.getTime()) ? format(cdDate, "d MMM yyyy", { locale: idLocale }) : "—";
  const telat = Boolean(cdDate && !Number.isNaN(cdDate.getTime()) && cdDate < new Date() && !breeding.candling_day_30_done);

  const fNama = fs(0.075);
  const fTrayLbl = fs(0.034);
  const fTray = fs(0.056);
  const fKapsi = fs(0.036);
  const fBesar = fs(0.115);
  const fSampai = fs(0.05);
  const fMeta = fs(0.042);
  const fCandLbl = fs(0.04);
  const fCandTgl = fs(0.064);

  const kepalaHtml = `<div style="min-height:${hdrH}px;box-sizing:border-box;background:${K.kepalaBg};padding:${Math.round(pad * 0.3)}px ${pad}px;display:flex;align-items:center;gap:${pad}px;flex:0 0 auto">
    <div style="flex:1;min-width:0;display:flex;align-items:center;gap:${Math.round(pad * 0.7)}px">
      <span style="font-weight:900;color:${K.kepalaFg};${gayaBaris(fNama)}">${breeding.male_name || "—"}</span>
      <span style="font-size:${Math.round(fNama * 0.6)}px;color:${K.kepalaRedup};line-height:1">&times;</span>
      <span style="font-weight:900;color:${K.kepalaFg};${gayaBaris(fNama)}">${breeding.female_name || "—"}</span>
    </div>
    <div style="flex-shrink:0;background:${trayBg};border:1.5px solid ${K.trayGaris};border-radius:${r(Math.round(hdrH * 0.16))};padding:${Math.round(hdrH * 0.04)}px ${Math.round(pad * 0.9)}px;text-align:center">
      <div style="font-weight:800;letter-spacing:1px;color:${trayFg};${gayaBaris(fTrayLbl)}">TRAY</div>
      <div style="font-weight:900;color:${trayFg};${gayaBaris(fTray)}">${trayTeks}</div>
    </div>
  </div>`;

  const badanHtml = `<div style="flex:1 1 auto;min-height:0;box-sizing:border-box;display:flex;flex-direction:row;overflow:hidden">
    <div style="flex:1 1 auto;min-width:0;padding:${Math.round(pad * 0.5)}px ${pad}px;display:flex;flex-direction:column;justify-content:center">
      <div style="font-weight:800;letter-spacing:1.2px;color:${K.kapsi};${gayaBaris(fKapsi)}">PERKIRAAN MENETAS</div>
      <div style="font-weight:900;color:${K.besar};${gayaBaris(fBesar)}">${mulai}</div>
      ${sampai ? `<div style="font-weight:700;color:${K.sampai};${gayaBaris(fSampai)}">s/d ${sampai}</div>` : ""}
      <div style="color:${K.meta};${gayaBaris(fMeta)}"><b>${breeding.egg_count || 0} butir</b> &middot; bertelur ${bertelur}</div>
    </div>
    <div style="width:${qrKolom}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-left:1px solid ${K.qrGaris};background:${K.qrLatar}">
      <img src="${qrDataUrl}" width="${qrSisi}" height="${qrSisi}" style="display:block"/>
    </div>
  </div>`;

  const candlingHtml = `<div style="min-height:${candH}px;box-sizing:border-box;background:${telat ? K.candBgTelat : K.candBg};border-top:2px solid ${telat ? K.candGarisTelat : K.candGaris};padding:${Math.round(pad * 0.3)}px ${pad}px;display:flex;align-items:center;gap:${pad}px;flex:0 0 auto">
    <div style="flex:1;min-width:0">
      <div style="font-weight:800;letter-spacing:0.8px;color:${telat ? K.candFgTelat : K.candFg};${gayaBaris(fCandLbl)}">CANDLING H+30${telat ? " · TERLAMBAT" : ""}</div>
      <div style="font-weight:900;color:${telat ? K.candFgTelat : K.candTgl};${gayaBaris(fCandTgl)}">${cdStr}</div>
    </div>
    <div style="width:${Math.round(candH * 0.42)}px;height:${Math.round(candH * 0.42)}px;border:2px solid ${telat ? K.candFgTelat : K.candKotak};background:#fff;border-radius:${r(3)};flex-shrink:0"></div>
  </div>`;

  return `<div style="width:${wPx}px;height:${hPx}px;background:#fff;font-family:${HURUF};-webkit-text-size-adjust:100%;text-size-adjust:100%;border:2px solid ${K.bingkai};border-radius:${r(Math.round(hPx * 0.03))};box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden">${kepalaHtml}${badanHtml}${candlingHtml}</div>`;
}
