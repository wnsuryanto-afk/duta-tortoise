/**
 * lembarUrutan.js — lembar tempel A4: urutan menetas untuk pintu inkubator.
 *
 * ── Permintaannya ────────────────────────────────────────────────────
 *
 * 16 Nov 2026, dipilih pemiliknya sendiri dari beberapa usulan: "lembar
 * tempel: daftar urutan untuk ditempel di pintu inkubator... supaya bisa
 * dicocokkan tanpa membuka HP."
 *
 * Itu permintaan yang masuk akal di tempat kerjanya. Tangan sedang memegang
 * kotak telur, sarung tangan basah, dan yang dibutuhkan hanya satu
 * pertanyaan terjawab: kotak ini yang keberapa, dan mana berikutnya.
 *
 * ── Kenapa KERTAS, padahal aplikasinya ada ───────────────────────────
 *
 * Layar "Urutan menetas" di tab Inkubator menjawab pertanyaan yang sama dan
 * selalu mutakhir. Kertas ini bukan penggantinya — ia salinan beku yang
 * menempel di pintu, dan nilainya justru pada hal yang membuatnya kalah:
 * ia tidak perlu dibuka, tidak perlu sinyal, dan tidak mati karena baterai.
 *
 * Konsekuensinya ditulis di lembarnya sendiri: tanggal cetak dicantumkan
 * besar-besar, supaya yang membacanya tahu seberapa tua kertas yang sedang
 * ia percayai.
 *
 * ── Kenapa fungsi murni ──────────────────────────────────────────────
 *
 * Sama seperti susunLembarA4HTML di lembarLabel.js, dan untuk alasan yang
 * sama: penyusunan yang tinggal di dalam komponen React tidak bisa diperiksa
 * penjaga, karena penjaga tidak bisa mengimpor berkas yang menarik seluruh
 * pustaka antarmuka. Masuk sebagai data, keluar sebagai untaian HTML.
 */

import { A4_PAKAI_MM, mmKePx } from "@/lib/lembarLabel";

/** Baris yang muat di satu lembar, dihitung dari tinggi barisnya. */
const TINGGI_BARIS_MM = 9;
const TINGGI_KEPALA_MM = 22;
const TINGGI_JUDUL_KELOMPOK_MM = 8;

/**
 * Berapa baris yang muat di satu lembar A4.
 *
 * Dihitung, bukan ditebak: tiap kelompok inkubator membawa satu baris judul
 * sendiri, jadi dua inkubator memakan dua baris sebelum satu pun clutch
 * tercetak. Dipakai layar untuk mengatakan lebih dulu bila daftarnya tidak
 * muat, alih-alih memotongnya diam-diam.
 *
 * @param {number} jumlahKelompok banyaknya inkubator yang punya isi
 * @returns {number} baris clutch yang muat
 */
export function barisMuat(jumlahKelompok = 1) {
  const tersedia =
    A4_PAKAI_MM.h - TINGGI_KEPALA_MM - Math.max(0, jumlahKelompok) * TINGGI_JUDUL_KELOMPOK_MM;
  return Math.max(0, Math.floor(tersedia / TINGGI_BARIS_MM));
}

const esc = (teks) =>
  String(teks ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Susun lembar tempel.
 *
 * @param {Array<{nama:string, baris:Array}>} kelompok hasil urutanPerInkubator
 * @param {object} opsi
 * @param {string} opsi.tanggalCetak teks tanggal, sudah diformat pemanggil
 * @param {(b:any)=>string} opsi.kode  kode clutch tiap baris
 * @param {(iso:string)=>string} opsi.tgl  pemformat tanggal
 * @returns {{ html:string, wA4:number, hA4:number, dicetak:number, tidakMuat:number }}
 */
export function susunLembarUrutanHTML(kelompok = [], opsi = {}) {
  const { tanggalCetak = "", kode = () => "", tgl = (x) => x || "—" } = opsi;
  const isi = (kelompok || []).filter((k) => k && (k.baris || []).length > 0);
  const muat = barisMuat(isi.length);

  const wA4 = mmKePx(210);
  const hA4 = mmKePx(297);
  const tepiX = mmKePx((210 - A4_PAKAI_MM.w) / 2);
  const tepiY = mmKePx((297 - A4_PAKAI_MM.h) / 2);
  const px = (mm) => mmKePx(mm);

  let sisa = muat;
  let dicetak = 0;
  let tidakMuat = 0;
  const bagian = [];

  for (const k of isi) {
    const ambil = Math.max(0, Math.min(sisa, k.baris.length));
    tidakMuat += k.baris.length - ambil;
    if (ambil === 0) continue;
    sisa -= ambil;
    dicetak += ambil;

    const baris = k.baris.slice(0, ambil).map((b, i) => {
      const trayTeks = (b.tray || []).length > 0 ? (b.tray || []).join(", ") : "—";
      const tanpaTray = (b.tray || []).length === 0;
      const latar = i % 2 === 1 ? "#F3F4F6" : "#FFFFFF";
      return `<tr style="background:${latar}">
        <td style="padding:${px(1.6)}px ${px(2)}px;font-weight:900;font-size:${px(4.6)}px;text-align:center;width:${px(13)}px">${b.urutan}</td>
        <td style="padding:${px(1.6)}px ${px(2)}px;font-weight:900;font-size:${px(4.6)}px">${esc(kode(b))}</td>
        <td style="padding:${px(1.6)}px ${px(2)}px;font-weight:${tanpaTray ? 900 : 700};font-size:${px(4.2)}px;text-align:center;width:${px(22)}px;color:${tanpaTray ? "#B91C1C" : "#111827"}">${tanpaTray ? "BELUM" : esc(trayTeks)}</td>
        <td style="padding:${px(1.6)}px ${px(2)}px;font-size:${px(4.2)}px;white-space:nowrap">${esc(tgl(b.mulai))}${b.sampai ? ` <span style="color:#6B7280">s/d ${esc(tgl(b.sampai))}</span>` : ""}</td>
        <td style="padding:${px(1.6)}px ${px(2)}px;font-size:${px(4.2)}px;text-align:right;width:${px(18)}px">${Number(b.clutch?.egg_count) || 0}</td>
      </tr>`;
    }).join("");

    bagian.push(`<div style="margin-top:${px(3)}px">
      <div style="font-weight:900;font-size:${px(5)}px;color:#065F46;border-bottom:2px solid #065F46;padding-bottom:${px(1)}px;margin-bottom:${px(1.5)}px">${esc(k.nama)} <span style="font-weight:600;color:#6B7280;font-size:${px(3.8)}px">— ${k.baris.length} kotak</span></div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif">
        <thead><tr style="color:#6B7280;font-size:${px(3.4)}px;text-align:left">
          <th style="padding:0 ${px(2)}px ${px(1)}px;text-align:center">URUT</th>
          <th style="padding:0 ${px(2)}px ${px(1)}px">KODE</th>
          <th style="padding:0 ${px(2)}px ${px(1)}px;text-align:center">TRAY</th>
          <th style="padding:0 ${px(2)}px ${px(1)}px">PERKIRAAN MENETAS</th>
          <th style="padding:0 ${px(2)}px ${px(1)}px;text-align:right">BUTIR</th>
        </tr></thead>
        <tbody>${baris}</tbody>
      </table>
    </div>`);
  }

  const peringatan = tidakMuat > 0
    ? `<div style="margin-top:${px(3)}px;font-size:${px(3.6)}px;color:#B91C1C;font-weight:700">${tidakMuat} kotak tidak muat di lembar ini.</div>`
    : "";

  const html = `<div style="width:${wA4}px;height:${hA4}px;background:#fff;box-sizing:border-box;padding:${tepiY}px ${tepiX}px;font-family:Arial,Helvetica,sans-serif;color:#111827;overflow:hidden">
    <div style="border-bottom:3px solid #065F46;padding-bottom:${px(2)}px">
      <div style="font-weight:900;font-size:${px(7)}px;color:#065F46">URUTAN MENETAS</div>
      <div style="font-size:${px(3.8)}px;color:#374151;margin-top:${px(1)}px">Dari yang paling dekat menetas. Dicetak ${esc(tanggalCetak)} — urutannya bergeser setiap kali ada yang menetas, tetapi susunannya tetap.</div>
    </div>
    ${bagian.join("")}
    ${peringatan}
  </div>`;

  return { html, wA4, hA4, dicetak, tidakMuat };
}
