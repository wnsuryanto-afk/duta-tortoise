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
 * Tinggi ketiga jalur dijumlahkan PERSIS setinggi label.
 *
 * Bukan kerapian: label lama menyisakan pita kosong karena tiap bagian memakai
 * jarak tetap dari atas, dan sisanya menganga di bawah. Di sini kepala dan
 * jalur candling dihitung dari tinggi label, dan badan mengambil SISANYA —
 * jadi tidak ada piksel yang tidak dipakai, berapa pun ukurannya.
 */
export function tinggiJalur(hPx) {
  const kepala = Math.round(hPx * 0.17);
  const candling = Math.round(hPx * 0.19);
  return { kepala, candling, badan: hPx - kepala - candling };
}

/**
 * @param {object}  breeding   satu clutch
 * @param {object}  ukuran     { wPx, hPx } ukuran label dalam piksel
 * @param {string}  qrDataUrl  QR yang sudah dibangkitkan pemanggil
 * @param {object}  palet      PALET_WARNA atau PALET_TERMAL
 */
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

  const potong = "min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";

  const kepalaHtml = `<div style="height:${hdrH}px;box-sizing:border-box;background:${K.kepalaBg};padding:0 ${pad}px;display:flex;align-items:center;gap:${pad}px;flex-shrink:0">
    <div style="flex:1;min-width:0;display:flex;align-items:center;gap:${Math.round(pad * 0.7)}px">
      <span style="font-weight:900;font-size:${fs(0.09)}px;color:${K.kepalaFg};line-height:1;${potong}">${breeding.male_name || "—"}</span>
      <span style="font-size:${fs(0.055)}px;color:${K.kepalaRedup};line-height:1">&times;</span>
      <span style="font-weight:900;font-size:${fs(0.09)}px;color:${K.kepalaFg};line-height:1;${potong}">${breeding.female_name || "—"}</span>
    </div>
    <div style="flex-shrink:0;background:${trayBg};border:1.5px solid ${K.trayGaris};border-radius:${r(Math.round(hdrH * 0.18))};padding:${Math.round(hdrH * 0.08)}px ${Math.round(pad * 0.9)}px;text-align:center;line-height:1">
      <div style="font-size:${fs(0.038)}px;font-weight:800;letter-spacing:1px;color:${trayFg}">TRAY</div>
      <div style="font-size:${fs(0.072)}px;font-weight:900;color:${trayFg};margin-top:1px">${trayTeks}</div>
    </div>
  </div>`;

  const badanHtml = `<div style="height:${bodyH}px;box-sizing:border-box;display:flex;flex-direction:row;flex-shrink:0;overflow:hidden">
    <div style="flex:1 1 auto;min-width:0;padding:${Math.round(pad * 0.8)}px ${pad}px;display:flex;flex-direction:column;justify-content:center">
      <div style="font-size:${fs(0.042)}px;font-weight:800;letter-spacing:1.2px;color:${K.kapsi};line-height:1">PERKIRAAN MENETAS</div>
      <div style="font-size:${fs(0.135)}px;font-weight:900;color:${K.besar};line-height:1.05;margin-top:${Math.round(hPx * 0.012)}px;${potong}">${mulai}</div>
      ${sampai ? `<div style="font-size:${fs(0.062)}px;font-weight:700;color:${K.sampai};line-height:1.1;${potong}">s/d ${sampai}</div>` : ""}
      <div style="font-size:${fs(0.05)}px;color:${K.meta};line-height:1.2;margin-top:${Math.round(hPx * 0.016)}px;${potong}"><b>${breeding.egg_count || 0} butir</b> &middot; bertelur ${bertelur}</div>
    </div>
    <div style="width:${qrKolom}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-left:1px solid ${K.qrGaris};background:${K.qrLatar}">
      <img src="${qrDataUrl}" width="${qrSisi}" height="${qrSisi}" style="display:block"/>
    </div>
  </div>`;

  const candlingHtml = `<div style="height:${candH}px;box-sizing:border-box;background:${telat ? K.candBgTelat : K.candBg};border-top:2px solid ${telat ? K.candGarisTelat : K.candGaris};padding:0 ${pad}px;display:flex;align-items:center;gap:${pad}px;flex-shrink:0">
    <div style="flex:1;min-width:0;line-height:1.1">
      <span style="font-size:${fs(0.042)}px;font-weight:800;letter-spacing:0.8px;color:${telat ? K.candFgTelat : K.candFg}">CANDLING H+30${telat ? " · TERLAMBAT" : ""}</span>
      <div style="font-size:${fs(0.075)}px;font-weight:900;color:${telat ? K.candFgTelat : K.candTgl};${potong}">${cdStr}</div>
    </div>
    <div style="width:${Math.round(candH * 0.5)}px;height:${Math.round(candH * 0.5)}px;border:2px solid ${telat ? K.candFgTelat : K.candKotak};background:#fff;border-radius:${r(3)};flex-shrink:0"></div>
  </div>`;

  return `<div style="width:${wPx}px;height:${hPx}px;background:#fff;border:2px solid ${K.bingkai};border-radius:${r(Math.round(hPx * 0.03))};box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden">${kepalaHtml}${badanHtml}${candlingHtml}</div>`;
}
