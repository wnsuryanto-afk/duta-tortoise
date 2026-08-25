/**
 * guidedUtils.js — utilitas murni untuk layar Guided (keeper & kepala feeder).
 *
 * Dipisahkan dari GuidedHariIni.jsx agar bisa diuji tanpa merender React,
 * dan agar berkas layarnya tidak terus membengkak.
 */
import { format } from "date-fns";

/** Jam sekarang dalam format HH:mm. */
export function nowStr() {
  return format(new Date(), "HH:mm");
}

/** Sapaan sesuai jam: pagi, siang, sore, atau malam. */
export function getSalam(sekarang = new Date()) {
  const h = sekarang.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

/**
 * Lama bekerja sejak jam check-in "HH:mm", dibaca manusia.
 * Mengembalikan null bila jam check-in tidak ada atau tidak terbaca.
 */
export function workDuration(checkIn, sekarang = new Date()) {
  if (typeof checkIn !== "string") return null;
  // Cocokkan bentuknya secara utuh. Memakai split(":") saja tidak cukup:
  // "::" menghasilkan potongan kosong yang diam-diam menjadi angka 0,
  // sehingga jam check-in cacat terbaca sebagai tengah malam.
  const cocok = /^(\d{1,2}):(\d{2})$/.exec(checkIn.trim());
  if (!cocok) return null;
  const h = Number(cocok[1]);
  const m = Number(cocok[2]);
  if (h > 23 || m > 59) return null;
  const start = new Date(sekarang);
  start.setHours(h, m, 0, 0);
  const diff = Math.floor((sekarang - start) / 60000);
  if (diff < 0) return null;
  if (diff < 60) return `${diff} menit`;
  return `${Math.floor(diff / 60)} jam ${diff % 60} menit`;
}
