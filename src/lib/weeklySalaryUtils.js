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

export const SHIFT_BAWAAN = { mulai: "07:00", selesai: "16:00" };

// Menit sejak tengah malam dari "HH:mm"; null bila tidak terbaca.
export function keMenit(hm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || "").trim());
  if (!m) return null;
  const jam = Number(m[1]);
  const menit = Number(m[2]);
  if (jam > 23 || menit > 59) return null;
  return jam * 60 + menit;
}

/**
 * SATU aturan lembur untuk seluruh aplikasi: menit yang dilewati SETELAH jam
 * selesai shift, dibulatkan ke 0,5 jam terdekat.
 *
 * Sebelum ini ada tiga aturan yang berbeda untuk hal yang sama:
 *
 *   a. `calcOvertimeHours` di layar check-out — lewat jam selesai shift,
 *      dibulatkan 0,5 jam. Inilah yang tersimpan ke OvertimeLog, dan OvertimeLog
 *      inilah yang dibayar rekap bulanan.
 *   b. `calcWeeklyOvertime` di slip mingguan — jam kerja di atas 8, dijumlahkan
 *      seminggu, dibulatkan ke bawah. Konstanta 8 itu ditulis mati di kode dan
 *      mengabaikan shift 07:00–16:00 yang disetel di SalaryConfig — panjangnya
 *      9 jam. Akibatnya siapa pun yang bekerja shift penuh mengumpulkan sekitar
 *      1 jam "lembur" setiap hari tanpa pernah tinggal lebih lama.
 *   c. `autoAttendance` di server — lewat jam selesai shift, tanpa pembulatan.
 *
 * Selisihnya nyata. Minggu 23–29 Agustus 2026, dengan tarif Rp 10.000/jam:
 *   Sholehuddin  aturan (b) 5 jam = Rp 50.000   ·  aturan (a) 0 jam = Rp 0
 *   Angsolo      aturan (b) 1 jam = Rp 10.000   ·  aturan (a) 0,5 jam = Rp 5.000
 *
 * Aturan (a) yang dipakai — keputusan pemilik, dan satu-satunya yang menghormati
 * jam shift yang benar-benar disetel.
 */
export function jamLembur(jamPulang, jamSelesaiShift = SHIFT_BAWAAN.selesai) {
  const pulang = keMenit(jamPulang);
  const selesai = keMenit(jamSelesaiShift) ?? keMenit(SHIFT_BAWAAN.selesai);
  if (pulang === null || selesai === null) return 0;
  if (pulang <= selesai) return 0;
  return Math.round(((pulang - selesai) / 60) * 2) / 2;
}

// Tugas absensi bukan bukti kerja: mencentang "Absensi jam pulang" pukul 16:15
// hanya membuktikan bahwa orangnya mencentang absensi, bukan bahwa ia bekerja.
const JUDUL_BUKAN_KERJA = /absensi/i;

/** Jam-jam tugas yang tercatat pada satu checklist, "HH:mm", sudah terurut. */
export function jamTugasTercatat(checklist) {
  const tugas = Array.isArray(checklist?.completed_tasks) ? checklist.completed_tasks : [];
  return tugas
    .filter((t) => !JUDUL_BUKAN_KERJA.test(String(t?.task_title || "")))
    .map((t) => String(t?.recorded_at || t?.photo_taken_at || "").trim())
    .filter((j) => keMenit(j) !== null)
    .sort();
}

/**
 * Apakah lembur hari ini punya bukti kerja?
 *
 * Kekhawatiran pemilik, dengan kata-katanya sendiri: "kalau tidak bekerja,
 * tetapi dia hanya duduk-duduk diam, apakah dia juga dapat lembur?" Dengan
 * aturan jam murni jawabannya ya — tinggal lebih lama saja sudah dibayar.
 *
 * Jadi lembur baru dihitung bila ada tugas yang TERCATAT pada atau setelah jam
 * selesai shift. Tiga keadaan, dan yang ketiga yang paling perlu dijaga:
 *
 *   · Ada tugas tercatat >= jam selesai shift → ada bukti, lembur dihitung.
 *   · Ada tugas tercatat, tetapi semuanya sebelum jam selesai shift
 *                                             → bukti bahwa tidak ada pekerjaan
 *                                               setelah jam pulang, lembur nol.
 *   · TIDAK ADA satu pun tugas yang punya jam
 *                                             → aplikasi tidak tahu, bukan tahu
 *                                               bahwa orangnya diam. Catatan lama
 *                                               (sebelum `recorded_at` mulai
 *                                               ditulis) semuanya begini. Lembur
 *                                               tetap dihitung — kekosongan data
 *                                               kami sendiri tidak boleh memotong
 *                                               upah orang secara surut.
 *
 * Diuji pada data sungguhan Angsolo:
 *   29 Agu 2026 — pulang 16:16, tugas terakhir 14:43        → 0 jam (dulu 0,5)
 *   23 Jul 2026 — pulang 16:16, pakan siang tercatat 16:14  → 0,5 jam (tetap)
 *   16 Jul 2026 — pulang 16:32, tidak ada jam tercatat      → 0,5 jam (tetap)
 */
export function adaBuktiKerjaLembur(checklist, jamSelesaiShift = SHIFT_BAWAAN.selesai) {
  const jam = jamTugasTercatat(checklist);
  if (jam.length === 0) return true; // tidak tahu bukan berarti tahu tidak bekerja
  const batas = keMenit(jamSelesaiShift) ?? keMenit(SHIFT_BAWAAN.selesai);
  return jam.some((j) => keMenit(j) >= batas);
}

/** Lembur satu hari, sudah disaring oleh bukti kerja. */
export function jamLemburBerbukti(att, checklist) {
  const kasar = jamLembur(att?.check_out, att?.shift_end || SHIFT_BAWAAN.selesai);
  if (kasar <= 0) return 0;
  return adaBuktiKerjaLembur(checklist, att?.shift_end || SHIFT_BAWAAN.selesai) ? kasar : 0;
}

// Lembur mingguan: jumlah lembur harian, dengan aturan yang sama persis seperti
// yang dipakai saat check-out. Tidak ada pembulatan kedua di tingkat minggu —
// membulatkan ke bawah sekali lagi akan membuang setengah jam yang sudah sah.
export function calcWeeklyOvertime(attendances, dayDateStrings, checklists = []) {
  let total = 0;
  for (const ds of dayDateStrings) {
    const att = attendances.find((a) => a.date === ds);
    if (!att) continue;
    const present = att.status === "hadir" || (att.check_in && !att.status);
    if (!present) continue;
    const cl = (checklists || []).find(
      (c) => c.date === ds && c.employee_email === att.employee_email,
    );
    total += jamLemburBerbukti(att, cl);
  }
  return total;
}