/**
 * gambarLabel.js — SATU penggambar label untuk seluruh aplikasi.
 *
 * Sebelum ini ada dua, dan keduanya berselisih:
 *
 *   · `NiimbotLabelGenerator` (Stok Pakan)   — punya 3 pilihan ukuran
 *   · `WarehouseLabelModal` (Gudang & Stok)  — tanpa pilihan, 400×240 mati
 *
 * Keduanya menggambar hal yang sama — QR, nama, SKU — dengan angka yang
 * berbeda, dan keduanya memutuskan tata letak lewat percabangan per ID ukuran
 * (`size.id === "30x15" ? 32 : 52`). Bentuk seperti itu membuat "pilihan
 * ukuran" mustahil benar: ukuran yang tidak disebut di percabangan akan
 * digambar memakai angka milik ukuran lain.
 *
 * Penggambar ini tidak tahu apa-apa tentang ID. Ia menerima rencana dari
 * lib/ukuranLabel.js dan mengikutinya. Menambah ukuran cukup dilakukan di
 * daftar sana.
 *
 * Hasilnya MONOKROM — hitam putih. Printer termal Niimbot memang tidak bisa
 * mencetak warna, jadi apa pun yang berwarna di pratinjau hanya akan jadi
 * abu-abu kotor di stikernya.
 */

import QRCode from "qrcode";
import { rencanaLabel } from "@/lib/ukuranLabel";

const KODE_KATEGORI = {
  obat: "OBT",
  vitamin: "VIT",
  suplemen: "SPL",
  alat_kerja: "ALT",
  peralatan: "PRL",
  pakan: "PKN",
  rumput: "RPT",
  sayuran: "SYR",
  lainnya: "LNN",
};

/** Kode strip: dari awalan SKU bila ada, kalau tidak dari kategorinya. */
export function kodeStrip(item) {
  const sku = String(item?.sku || item?.code || "");
  const awalan = (sku.split("-")[0] || "").toUpperCase();
  if (awalan) return awalan;
  return KODE_KATEGORI[item?.category] || "LNN";
}

/** Potong teks dengan elipsis supaya pas di lebar tertentu. */
function potong(ctx, teks, lebar) {
  const t = String(teks ?? "");
  if (ctx.measureText(t).width <= lebar) return t;
  let s = t;
  while (s.length > 0 && ctx.measureText(s + "…").width > lebar) s = s.slice(0, -1);
  return s + "…";
}

/**
 * Pecah teks jadi maksimal `maks` baris selebar `lebar`.
 *
 * Bila ada kata yang tidak kebagian baris, baris terakhir SELALU diberi
 * elipsis — walaupun secara lebar ia masih muat. Tanpa itu nama panjang
 * berhenti diam-diam: "RACIKAN Duta Daily Boost — Kapsul Harian" tercetak
 * sebagai "RACIKAN Duta Daily Boost —", dan yang memegang stikernya tidak
 * punya cara tahu bahwa namanya masih ada lanjutannya.
 */
function bungkus(ctx, teks, lebar, maks) {
  const kata = String(teks ?? "").trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return ["—"];
  const baris = [];
  let kini = "";
  let terpakai = 0;
  for (const k of kata) {
    const coba = kini ? `${kini} ${k}` : k;
    if (ctx.measureText(coba).width > lebar && kini) {
      baris.push(kini);
      kini = k;
      if (baris.length === maks) break;
    } else {
      kini = coba;
    }
    terpakai++;
  }
  if (baris.length < maks && kini) {
    baris.push(kini);
    kini = "";
  }
  if (baris.length > maks) baris.length = maks;

  const akhir = baris.length - 1;
  if (akhir < 0) return ["—"];

  // Masih ada kata yang belum tertampung — baik yang tertahan di `kini` maupun
  // yang belum sempat dibaca sama sekali.
  const adaSisa = Boolean(kini) || terpakai < kata.length;
  baris[akhir] = potong(ctx, adaSisa ? `${baris[akhir]} …` : baris[akhir], lebar);
  return baris;
}

/**
 * Gambar satu label ke canvas.
 *
 * `ukuran` berupa `{ mmW, mmH }`. Seluruh penempatan diambil dari rencana —
 * tidak ada angka ajaib di fungsi ini.
 */
export async function gambarLabel(canvas, item, ukuran) {
  const r = rencanaLabel(ukuran.mmW, ukuran.mmH);
  canvas.width = r.w;
  canvas.height = r.h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, r.w, r.h);

  // ── Strip kategori ────────────────────────────────────────────────────────
  const strip = kodeStrip(item);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, r.w, r.stripH);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `bold ${Math.round(r.stripH * 0.62)}px Arial`;
  ctx.fillText(strip, r.pad, r.stripH / 2);

  // Nama peternakan hanya dicetak bila masih tersisa ruang di strip; di label
  // kecil ia hanya akan bertabrakan dengan kode kategorinya.
  const fMerek = Math.round(r.stripH * 0.42);
  ctx.font = `${fMerek}px Arial`;
  const lebarStrip = ctx.measureText("DUTA TORTOISE").width;
  ctx.font = `bold ${Math.round(r.stripH * 0.62)}px Arial`;
  const lebarKode = ctx.measureText(strip).width;
  if (lebarKode + lebarStrip + r.pad * 3 < r.w) {
    ctx.font = `${fMerek}px Arial`;
    ctx.textAlign = "right";
    ctx.fillText("DUTA TORTOISE", r.w - r.pad, r.stripH / 2);
  }

  // ── QR ────────────────────────────────────────────────────────────────────
  const isiQr = item?.sku || item?.code || "";
  ctx.textAlign = "left";
  if (isiQr) {
    const qc = document.createElement("canvas");
    await QRCode.toCanvas(qc, String(isiQr), {
      width: r.qr.ukuran,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
    ctx.drawImage(qc, r.qr.x, r.qr.y, r.qr.ukuran, r.qr.ukuran);
  } else {
    // Barang tanpa SKU tetap dapat label — tetapi dikatakan apa adanya,
    // bukan diberi QR kosong yang gagal dipindai di gudang.
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(r.qr.x, r.qr.y, r.qr.ukuran, r.qr.ukuran);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const f = Math.max(8, Math.round(r.qr.ukuran * 0.13));
    ctx.font = `bold ${f}px Arial`;
    ctx.fillText("BELUM", r.qr.x + r.qr.ukuran / 2, r.qr.y + r.qr.ukuran / 2 - f);
    ctx.fillText("ADA SKU", r.qr.x + r.qr.ukuran / 2, r.qr.y + r.qr.ukuran / 2 + f * 0.2);
  }

  // ── Kolom teks ────────────────────────────────────────────────────────────
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000000";
  let y = r.teks.y;

  ctx.font = `bold ${r.font.nama}px Arial`;
  const namaBaris = bungkus(ctx, item?.name || "—", r.teks.w, r.muat.namaBaris);
  for (const baris of namaBaris) {
    ctx.fillText(baris, r.teks.x, y);
    // Rapat: dua baris ini satu kalimat. Jedanya ditambahkan sekali saja,
    // sesudah seluruh namanya selesai.
    y += r.tinggiBaris.nama;
  }
  y += r.jeda;

  if (r.muat.sku) {
    ctx.font = `${r.font.sku}px monospace`;
    ctx.fillText(potong(ctx, isiQr ? `SKU ${isiQr}` : "SKU —", r.teks.w), r.teks.x, y);
    y += r.tinggiBaris.sku + r.jeda;
  }

  if (r.muat.exp) {
    ctx.font = `${r.font.kecil}px monospace`;
    ctx.fillText(potong(ctx, "Exp: ____________", r.teks.w), r.teks.x, y);
    y += r.tinggiBaris.kecil + r.jeda;
  }

  if (r.muat.catatan && item?.notes) {
    ctx.font = `${r.font.kecil}px Arial`;
    ctx.fillText(potong(ctx, item.notes, r.teks.w), r.teks.x, y);
  }

  return r;
}

/** Nama berkas PNG untuk satu barang. */
export function namaBerkasLabel(item, ukuranId) {
  const dasar = String(item?.sku || item?.name || "item").replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `label-${dasar}-${ukuranId}.png`;
}
