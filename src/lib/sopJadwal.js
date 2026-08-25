/**
 * sopJadwal.js — konstanta dan logika jadwal Jadwal Kerja Harian.
 *
 * Dipisahkan dari TugasHariIni.jsx supaya aturan carry-over bisa diuji
 * langsung. Aturan inilah yang menentukan apakah sebuah tugas masih
 * terhitung tertunda atau sudah dikerjakan pada siklus jatuh temponya,
 * dan salah di sini berarti keeper dituntut mengerjakan ulang tugas yang
 * sudah selesai — atau sebaliknya, tugas yang terlewat tidak pernah muncul.
 */
import { format } from "date-fns";

// ── STRUKTURAL (bukan SOPTask: absensi & istirahat) ──
export const STRUCTURAL = [
  { id: "abs_masuk",  label: "Absensi jam masuk",  waktu: "07:00",      icon: "🏁", structural: true },
  { id: "istirahat",  label: "Istirahat",          waktu: "11:45–13:00", icon: "☕", noCheck: true },
  { id: "abs_pulang", label: "Absensi jam pulang", waktu: "16:00",      icon: "🏠", structural: true },
];
export const ABSENSI_IDS = new Set(["abs_masuk", "abs_pulang"]);

export const CATEGORY_ICON = {
  pakan: "🐢", kebersihan: "🏠", pemeriksaan: "❤️",
  breeding: "🥚", administrasi: "📝", suplemen: "💊", lainnya: "✅",
};
export const CATEGORY_BADGE = {
  pakan: "bg-green-100 text-green-700",
  kebersihan: "bg-blue-100 text-blue-700",
  pemeriksaan: "bg-amber-100 text-amber-700",
  breeding: "bg-purple-100 text-purple-700",
  administrasi: "bg-gray-100 text-gray-700",
  suplemen: "bg-teal-100 text-teal-700",
  lainnya: "bg-muted text-muted-foreground",
};

// ── Carry-over: tanggal jatuh tempo terakhir (terbaru <= hari ini) ──
export function computeLastDueDate(t, todayStr) {
  const today = new Date(todayStr + "T00:00:00");
  const freq = String(t.frequency || "").toLowerCase();
  if (freq === "harian") return todayStr;
  if (freq === "mingguan") {
    const days = Array.isArray(t.weekly_days) ? t.weekly_days : [];
    if (!days.length) return null;
    for (let i = 0; i < 10; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (days.includes(d.getDay())) return format(d, "yyyy-MM-dd");
    }
    return null;
  }
  if (freq === "bulanan") {
    const dates = Array.isArray(t.monthly_dates) ? t.monthly_dates : [];
    if (!dates.length) return null;
    for (let i = 0; i < 35; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (dates.includes(d.getDate())) return format(d, "yyyy-MM-dd");
    }
    return null;
  }
  return null;
}

// Cek apakah task sudah dikerjakan di hari sebelumnya (dalam siklus jatuh tempo ini).
// Log test (is_test_data) diabaikan agar mode uji owner tidak memengaruhi keeper asli.
export function isCompletedPrevCycle(itemKey, lastDueDate, todayStr, scope, userEmail, recentLogs) {
  const logs = (recentLogs || []).filter(l =>
    l.item_id === itemKey && l.is_done && l.period_key &&
    !l.is_test_data &&
    l.period_key >= lastDueDate && l.period_key < todayStr
  );
  if (scope === "pribadi") return logs.some(l => l.done_by_email === userEmail);
  return logs.length > 0;
}
