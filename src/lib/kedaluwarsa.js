/**
 * kedaluwarsa.js — SATU aturan "apakah barang ini sudah / akan kedaluwarsa?".
 *
 * Kenapa berkas ini ada:
 *
 * Aplikasi ini punya delapan layar yang memperingatkan barang kedaluwarsa —
 * UrgentAlerts, ExpiredItemAlert, DashboardStokPage, beranda Owner, beranda
 * Admin, StokInventoryTab, ringkasanPenyimpangan, dan autoNotifications —
 * ditambah pemindai foto kemasan yang membaca tanggalnya dengan AI.
 *
 * Kedelapannya diam. Pada 7 September 2026, dari 64 barang berkategori obat dan
 * vitamin, `expired_date` KOSONG di semuanya. Seluruh infrastruktur peringatan
 * itu belum pernah diberi satu tanggal pun untuk diperingatkan.
 *
 * ── Dua umur yang berbeda ────────────────────────────────────────────────────
 *
 * Ada dua cara obat menjadi tidak layak, dan hanya satu yang selama ini dilihat:
 *
 *   1. Tanggal kedaluwarsa pada kemasan — berlaku selama botolnya TERSEGEL.
 *   2. Masa pakai setelah botol DIBUKA — untuk vial injeksi multi-dosis
 *      umumnya sekitar 28 hari sejak tutup karetnya ditembus jarum, berapa pun
 *      dosis yang tersisa.
 *
 * Yang kedua inilah yang paling sering menghabiskan uang di peternakan ini,
 * karena stok dicatat dalam DOSIS, bukan botol. Pembelian 27 Agustus 2026
 * mencatat "INJEKVIT B PLEX — 5 botol 100 ml @100 dosis" sebagai 505 ampul.
 * Aplikasi lalu yakin ada 505 dosis di gudang. Kenyataannya ada lima botol,
 * dan begitu satu ditusuk, sembilan puluh sekian dosis di dalamnya punya batas
 * waktu yang sama sekali tidak terlihat di layar mana pun.
 *
 * Hal yang sama berlaku untuk Oxytocin: 2 botol 10 ml tercatat 20 ampul.
 */

import { differenceInCalendarDays, parseISO } from "date-fns";

/** Peringatan kedaluwarsa kemasan mulai muncul sejak sekian hari sebelumnya. */
export const HARI_PERINGATAN_SEGEL = 30;

/** Masa pakai bawaan vial multi-dosis setelah ditusuk, bila tidak disetel. */
export const HARI_PAKAI_SETELAH_DIBUKA = 28;

function keTanggal(nilai) {
  if (!nilai) return null;
  try {
    const d = typeof nilai === "string" ? parseISO(nilai) : new Date(nilai);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Sisa hari sampai tanggal kedaluwarsa kemasan; null bila tanggalnya kosong. */
export function sisaHariSegel(item, sekarang = new Date()) {
  const d = keTanggal(item?.expired_date);
  return d ? differenceInCalendarDays(d, sekarang) : null;
}

/**
 * Sisa hari botol yang sedang terbuka; null bila tidak ada botol terbuka atau
 * tanggal bukanya tidak dicatat.
 */
export function sisaHariBotolTerbuka(item, sekarang = new Date()) {
  if (!item || Number(item.botol_terbuka || 0) <= 0) return null;
  const dibuka = keTanggal(item.tanggal_botol_dibuka);
  if (!dibuka) return null;
  const masa = Number(item.hari_pakai_setelah_dibuka || HARI_PAKAI_SETELAH_DIBUKA);
  return masa - differenceInCalendarDays(sekarang, dibuka);
}

/**
 * Keadaan satu barang, dengan alasan yang bisa dibaca manusia.
 *
 * `tingkat` salah satu dari: "aman", "segera_pakai", "lewat".
 * `sebab` menyebut umur mana yang menentukan — kemasan atau botol terbuka —
 * supaya peringatannya bisa ditindaklanjuti, bukan sekadar berwarna merah.
 */
export function periksaKedaluwarsa(item, sekarang = new Date()) {
  const segel = sisaHariSegel(item, sekarang);
  const terbuka = sisaHariBotolTerbuka(item, sekarang);

  const calon = [];
  if (segel !== null) calon.push({ sisa: segel, sebab: "kemasan" });
  if (terbuka !== null) calon.push({ sisa: terbuka, sebab: "botol_terbuka" });

  if (calon.length === 0) {
    return { tingkat: "tidak_diketahui", sisa: null, sebab: null };
  }

  // Yang menentukan adalah umur yang habis LEBIH DULU.
  const paling = calon.reduce((a, b) => (b.sisa < a.sisa ? b : a));
  const tingkat =
    paling.sisa < 0 ? "lewat" : paling.sisa <= HARI_PERINGATAN_SEGEL ? "segera_pakai" : "aman";
  return { tingkat, sisa: paling.sisa, sebab: paling.sebab };
}

/** Apakah barang ini perlu tanggal kedaluwarsa tetapi belum punya? */
export function butuhTanggalKedaluwarsa(item) {
  if (!item) return false;
  if (!["obat", "vitamin"].includes(item.category)) return false;
  if (Number(item.current_stock || 0) <= 0) return false;
  return !item.expired_date;
}

/**
 * Daftar barang yang perlu diisi tanggalnya, diurutkan dari yang paling
 * banyak stoknya — di situlah kerugian terbesar bila terlewat.
 */
export function barangTanpaTanggal(daftar = []) {
  return (daftar || [])
    .filter(butuhTanggalKedaluwarsa)
    .slice()
    .sort((a, b) => Number(b.current_stock || 0) - Number(a.current_stock || 0));
}
