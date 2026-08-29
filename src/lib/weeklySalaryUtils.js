import { format, subWeeks } from "date-fns";
import { id } from "date-fns/locale";

// Minggu pertama slip mingguan diluncurkan: 12 Juli 2026 (Minggu)
export const WEEK_LAUNCH_START = "2026-07-12";

// Cek apakah nilai adalah Date valid
export function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

// Parse aman — return Date atau null (untuk undefined/null/"null"/teks invalid)
export function safeParseDate(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && (value === "null" || value === "undefined")) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isValidDate(d) ? d : null;
}

// Format aman — return string terformat atau fallback "—" jika tanggal invalid
export function safeFormatDate(value, pattern, fallback = "—") {
  const d = safeParseDate(value);
  if (!d) return fallback;
  try {
    return format(d, pattern, { locale: id });
  } catch {
    return fallback;
  }
}

// Cek apakah string berformat YYYY-MM (periode bulanan lama)
export function isMonthPeriod(str) {
  return typeof str === "string" && /^\d{4}-\d{2}$/.test(str);
}

// Ambil tanggal Minggu (awal minggu) dari suatu tanggal
export function getWeekStart(date) {
  const d = safeParseDate(date) || new Date();
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay(); // 0 = Minggu
  result.setDate(result.getDate() - day);
  return result;
}

// Ambil tanggal Sabtu (akhir minggu) dari awal minggu
export function getWeekEnd(startDate) {
  const d = safeParseDate(startDate);
  if (!d) return new Date(NaN);
  const result = new Date(d);
  result.setDate(result.getDate() + 6);
  return result;
}

// Format label periode mingguan: "Minggu, 12 Juli – Sabtu, 18 Juli 2026"
// Aman terhadap input invalid — return "—" bukan crash
export function formatWeekLabel(startDate) {
  const start = safeParseDate(startDate);
  if (!start) return "—";
  const end = getWeekEnd(start);
  if (!isValidDate(end)) return "—";
  try {
    return `Minggu, ${format(start, "d MMMM", { locale: id })} – Sabtu, ${format(end, "d MMMM yyyy", { locale: id })}`;
  } catch {
    return "—";
  }
}

// Daftar opsi minggu dari minggu berjalan mundur hingga minggu peluncuran.
// Selalu minimal mengandung minggu peluncuran agar tidak pernah kosong.
export function getWeekOptions(maxWeeks = 12) {
  const launchStart = safeParseDate(WEEK_LAUNCH_START);
  if (!launchStart) return [];
  const currentStart = getWeekStart(new Date());
  // Jika minggu berjalan sebelum peluncuran, pakai minggu peluncuran sebagai opsi pertama
  const cursor0 = currentStart < launchStart ? new Date(launchStart) : currentStart;
  const options = [];
  let cursor = cursor0;
  let count = 0;
  while (cursor >= launchStart && count < maxWeeks) {
    try {
      options.push({
        value: format(cursor, "yyyy-MM-dd"),
        label: formatWeekLabel(cursor),
      });
    } catch {
      // skip invalid
    }
    cursor = subWeeks(cursor, 1);
    count++;
  }
  return options;
}

// Hitung jam kerja dari catatan check-in/check-out (format "HH:mm").
export function attendanceHours(att) {
  if (!att?.check_in || !att?.check_out) return 0;
  const [ih, im] = String(att.check_in).split(":").map(Number);
  const [oh, om] = String(att.check_out).split(":").map(Number);
  if (Number.isNaN(ih) || Number.isNaN(im) || Number.isNaN(oh) || Number.isNaN(om)) return 0;
  return Math.max(0, (oh * 60 + om - ih * 60 - im) / 60);
}

// Lembur mingguan: dihitung PER HARI (kelebihan jam di atas 8 jam hari itu).
// Hari dengan jam ≤ 8 → lembur 0. Dijumlahkan ke total mingguan lalu dibulatkan
// KE BAWAH ke jam penuh (kelebihan < 1 jam tidak dihitung setengah jam).
export function calcWeeklyOvertime(attendances, dayDateStrings) {
  let total = 0;
  for (const ds of dayDateStrings) {
    const att = attendances.find((a) => a.date === ds);
    if (!att) continue;
    const present = att.status === "hadir" || (att.check_in && !att.status);
    if (!present) continue;
    const h = attendanceHours(att);
    if (h > 8) total += (h - 8);
  }
  return Math.floor(total);
}