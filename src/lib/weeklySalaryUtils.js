import { format, subWeeks } from "date-fns";
import { id } from "date-fns/locale";

// Minggu pertama slip mingguan diluncurkan: 12 Juli 2026 (Minggu)
export const WEEK_LAUNCH_START = "2026-07-12";

// Ambil tanggal Minggu (awal minggu) dari suatu tanggal
export function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Minggu
  d.setDate(d.getDate() - day);
  return d;
}

// Ambil tanggal Sabtu (akhir minggu) dari awal minggu
export function getWeekEnd(startDate) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + 6);
  return d;
}

// Format label periode mingguan: "Minggu, 12 Juli – Sabtu, 18 Juli 2026"
export function formatWeekLabel(startDate) {
  const start = new Date(startDate);
  const end = getWeekEnd(start);
  return `Minggu, ${format(start, "d MMMM", { locale: id })} – Sabtu, ${format(end, "d MMMM yyyy", { locale: id })}`;
}

// Daftar opsi minggu dari minggu berjalan mundur hingga minggu peluncuran
export function getWeekOptions(maxWeeks = 12) {
  const launchStart = new Date(WEEK_LAUNCH_START);
  const currentStart = getWeekStart(new Date());
  const options = [];
  let cursor = currentStart;
  let count = 0;
  while (cursor >= launchStart && count < maxWeeks) {
    options.push({
      value: format(cursor, "yyyy-MM-dd"),
      label: formatWeekLabel(cursor),
    });
    cursor = subWeeks(cursor, 1);
    count++;
  }
  return options;
}