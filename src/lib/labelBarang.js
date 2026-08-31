/**
 * labelBarang.js — satu penggambar label 50×30mm untuk printer thermal Niimbot.
 *
 * Ada dua macam label yang beredar di rak peternakan ini:
 *
 *   Label barang  — QR berisi SKU. Menempel di rak, umurnya panjang.
 *   Label batch   — QR berisi kode batch. Menempel di botol/kemasan yang
 *                   datang bersama satu pesanan, dan membawa tanggal
 *                   kedaluwarsanya sendiri.
 *
 * Keduanya harus terlihat sama dan terbaca oleh pemindai yang sama. Menyalin
 * penggambar kanvasnya jadi dua akan membuat keduanya perlahan berbeda —
 * ukuran QR bergeser, strip menyempit — dan label yang tidak seragam adalah
 * label yang diragukan orang di lapangan.
 */
import QRCode from "qrcode";

// 50×30mm @ ~8px/mm (≈203 DPI)
export const LEBAR = 400;
export const TINGGI = 240;

export function potongTeks(ctx, teks, lebarMaks) {
  if (ctx.measureText(teks).width <= lebarMaks) return teks;
  let t = teks;
  while (t.length > 0 && ctx.measureText(t + "…").width > lebarMaks) t = t.slice(0, -1);
  return t + "…";
}

export function bungkusTeks(ctx, teks, lebarMaks, maksBaris) {
  const kata = String(teks).split(/\s+/);
  const baris = [];
  let satu = "";
  for (const k of kata) {
    const uji = satu ? satu + " " + k : k;
    if (ctx.measureText(uji).width > lebarMaks && satu) {
      baris.push(satu);
      satu = k;
      if (baris.length >= maksBaris - 1) break;
    } else {
      satu = uji;
    }
  }
  if (satu) baris.push(satu);
  if (baris.length > maksBaris) baris.length = maksBaris;
  if (baris.length === maksBaris) {
    let akhir = baris[maksBaris - 1];
    while (akhir.length > 0 && ctx.measureText(akhir + "…").width > lebarMaks) akhir = akhir.slice(0, -1);
    if (akhir !== baris[maksBaris - 1]) baris[maksBaris - 1] = akhir + "…";
  }
  return baris;
}

/**
 * Gambar satu label.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} isi
 * @param {string} isi.strip     kode pendek di strip hitam (OBT/VIT/ALT/BATCH)
 * @param {string} isi.qrText    isi QR. Kosong → kotak "BELUM ADA KODE".
 * @param {string} isi.judul     nama barang (maks 2 baris)
 * @param {string} isi.mono      baris kode (monospace), mis. "SKU: OBT-0102"
 * @param {string} isi.kecil     keterangan kecil opsional
 * @param {string} isi.bawah     baris paling bawah, mis. tanggal kedaluwarsa
 */
export async function gambarLabel(canvas, isi = {}) {
  canvas.width = LEBAR;
  canvas.height = TINGGI;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LEBAR, TINGGI);

  const stripH = 26;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, LEBAR, stripH);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "bold 15px Arial";
  ctx.fillText(isi.strip || "LNN", 10, stripH / 2);
  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.fillText("DUTA TORTOISE", LEBAR - 8, stripH / 2);

  const padY = stripH + 10;
  const qrSize = 108;
  const qrX = 10;
  const qrY = padY;

  if (isi.qrText) {
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, isi.qrText, {
      width: qrSize,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  } else {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 12px Arial";
    ctx.fillText("BELUM", qrX + qrSize / 2, qrY + qrSize / 2 - 18);
    ctx.fillText("ADA KODE", qrX + qrSize / 2, qrY + qrSize / 2);
    ctx.font = "9px Arial";
    ctx.fillText("(tanpa QR)", qrX + qrSize / 2, qrY + qrSize / 2 + 18);
  }

  const tx = qrX + qrSize + 12;
  const tw = LEBAR - tx - 10;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000000";

  ctx.font = "bold 17px Arial";
  let y = padY;
  for (const baris of bungkusTeks(ctx, isi.judul || "—", tw, 2)) {
    ctx.fillText(baris, tx, y);
    y += 20;
  }

  ctx.font = "13px monospace";
  ctx.fillText(potongTeks(ctx, isi.mono || "", tw), tx, padY + 52);

  if (isi.kecil) {
    ctx.font = "11px Arial";
    ctx.fillText(potongTeks(ctx, isi.kecil, tw), tx, padY + 72);
  }

  ctx.font = "12px monospace";
  ctx.fillText(potongTeks(ctx, isi.bawah || "", tw), tx, padY + 92);
}

/** Strip diambil dari awalan SKU — awalan itulah kode kategorinya. */
export function stripDariSku(sku, kategori) {
  const awalan = String(sku || "").split("-")[0].toUpperCase();
  if (awalan) return awalan;
  return { obat: "OBT", vitamin: "VIT", suplemen: "SPL", habis_pakai: "ALT", alat_kerja: "ALT", peralatan: "PRL" }[kategori] || "LNN";
}

export function namaBerkasLabel(dasar) {
  const bersih = String(dasar || "label").replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `label-${bersih}.png`;
}
