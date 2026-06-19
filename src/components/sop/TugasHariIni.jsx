/**
 * TugasHariIni — Jadwal Kerja Harian Duta Tortoise
 * Menampilkan jadwal sesuai hari (Minggu vs Senin-Sabtu),
 * tugas berkala otomatis, suplemen/treatment hari ini, dan reminder timbang.
 * Setiap centang tercatat di MaintenanceLog (siapa, jam berapa).
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays, parseISO, differenceInCalendarDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CheckCircle2, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";

// ─────────────────────────────────────────────
// JADWAL TETAP
// ─────────────────────────────────────────────
const JADWAL_MINGGU = [
  { id: "abs_masuk",   label: "Absensi jam masuk",                           waktu: "07:00",        icon: "🏁" },
  { id: "cari_kaktus", label: "Cari kaktus untuk pakan kura",                waktu: "07:00–08:20",  icon: "🌵" },
  { id: "pakan_pagi",  label: "Pemberian pakan kura + cek kesehatan kura",   waktu: "08:20–09:00",  icon: "🐢", keterangan: "All kandang" },
  { id: "potong_bunga",label: "Potong bunga sepatu & rumput liar + aktivitas tambahan", waktu: "09:00–11:45", icon: "✂️" },
  { id: "istirahat",   label: "Istirahat",                                    waktu: "11:45–13:00",  icon: "☕", noCheck: true },
  { id: "bersih_kand", label: "Pembersihan kandang",                          waktu: "13:00–14:00",  icon: "🏠", keterangan: "All kandang" },
  { id: "aktiv_sore",  label: "Aktivitas tambahan lain",                      waktu: "14:00–16:00",  icon: "⚡" },
  { id: "abs_pulang",  label: "Absensi jam pulang",                           waktu: "16:00",        icon: "🏠" },
];

const JADWAL_SENIN_SABTU = [
  { id: "abs_masuk",   label: "Absensi jam masuk",                            waktu: "07:00",        icon: "🏁" },
  { id: "cuci_sayur1", label: "Cuci rumput / sayuran rempesan",               waktu: "07:00–08:20",  icon: "🥬" },
  { id: "pakan_pagi",  label: "Pemberian pakan kura + cek kesehatan",         waktu: "08:20–09:00",  icon: "🐢", keterangan: "All kandang" },
  { id: "aktiv_pagi",  label: "Aktivitas tambahan",                           waktu: "09:00–11:45",  icon: "⚡" },
  { id: "istirahat",   label: "Istirahat",                                    waktu: "11:45–13:00",  icon: "☕", noCheck: true },
  { id: "bersih_kand", label: "Pembersihan kandang",                          waktu: "13:00–14:00",  icon: "🏠", keterangan: "All kandang" },
  { id: "cuci_sayur2", label: "Cuci rumput / sayuran rempesan",               waktu: "14:00–14:30",  icon: "🥬" },
  { id: "pakan_sore",  label: "Pemberian pakan kura",                         waktu: "14:30–15:00",  icon: "🐢", keterangan: "All kandang" },
  { id: "cek_sore",    label: "Cek kesehatan kura + aktivitas tambahan lain", waktu: "15:00–16:00",  icon: "❤️" },
  { id: "abs_pulang",  label: "Absensi jam pulang",                           waktu: "16:00",        icon: "🏠" },
];

// Absensi masuk & pulang — handle via attendance, skip checkbox
const ABSENSI_IDS = new Set(["abs_masuk", "abs_pulang"]);

// ─────────────────────────────────────────────
// TUGAS BERKALA — logic berdasarkan tanggal
// ─────────────────────────────────────────────

// Epoch reference untuk perhitungan 2-hari-sekali & 2-minggu-sekali
const EPOCH_REFERENCE = new Date("2024-01-01"); // Senin

function daysSinceEpoch(dateStr) {
  return differenceInCalendarDays(parseISO(dateStr), EPOCH_REFERENCE);
}

function getTugasBerkala(today) {
  const date = parseISO(today);
  const dow = date.getDay(); // 0=Minggu, 1=Senin, ..., 6=Sabtu
  const days = daysSinceEpoch(today);
  const tasks = [];

  // 1. Ganti pupuk asola — 2 minggu sekali, setiap hari Senin
  if (dow === 1) {
    // Hitung minggu ke berapa sejak epoch (week index)
    const weekIndex = Math.floor(days / 7);
    if (weekIndex % 2 === 0) {
      tasks.push({
        id: "pupuk_asola",
        label: "Ganti pupuk asola",
        waktu: "Saat ada waktu",
        icon: "🌱",
        keterangan: "2 minggu sekali",
        badge: "2 mingguan",
        badgeColor: "bg-purple-100 text-purple-700",
      });
    }
  }

  // 2. Pembersihan kura — Senin, Rabu, Jumat (pagi & sore)
  if ([1, 3, 5].includes(dow)) {
    tasks.push({
      id: "bersih_kura_pagi",
      label: "Pembersihan kura (sesi pagi)",
      waktu: "Pagi",
      icon: "🛁",
      keterangan: "Senin / Rabu / Jumat",
      badge: "3x seminggu",
      badgeColor: "bg-blue-100 text-blue-700",
    });
    tasks.push({
      id: "bersih_kura_sore",
      label: "Pembersihan kura (sesi sore)",
      waktu: "Sore",
      icon: "🛁",
      keterangan: "Senin / Rabu / Jumat",
      badge: "3x seminggu",
      badgeColor: "bg-blue-100 text-blue-700",
    });
  }

  // 3. Pembersihan kaktus DT2 — 2 hari sekali
  if (days % 2 === 0) {
    tasks.push({
      id: "bersih_kaktus",
      label: "Pembersihan kaktus DT2",
      waktu: "Saat ada waktu",
      icon: "🌵",
      keterangan: "DT2",
      badge: "2 hari sekali",
      badgeColor: "bg-green-100 text-green-700",
    });
  }

  return tasks;
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function TugasHariIni({ user, showTeamView = false }) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const dow = now.getDay(); // 0=Minggu
  const todayLabel = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });
  const isMinggu = dow === 0;

  // Jadwal tetap sesuai hari
  const jadwalTetap = isMinggu ? JADWAL_MINGGU : JADWAL_SENIN_SABTU;
  // Tugas berkala hari ini
  const tugasBerkala = getTugasBerkala(today);

  // ── State centang (lokal, di-restore dari DB) ──
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [showTeam, setShowTeam] = useState(false);

  // ── Queries ──
  const { data: myLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["tugas-hari-ini-logs", user?.email, today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ done_by_email: user.email, period_key: today }),
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ["tugas-hari-ini-all-logs", today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ period_key: today }),
    enabled: showTeamView && showTeam,
    staleTime: 60 * 1000,
  });

  // Treatment terjadwal hari ini
  const { data: treatmentSchedules = [] } = useQuery({
    queryKey: ["treatment-schedules-active"],
    queryFn: () => base44.entities.TreatmentSchedule.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  // Reminder timbang jatuh hari ini
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-timbang-reminder", today],
    queryFn: () => base44.entities.Tortoise.list("-name", 500),
    staleTime: 10 * 60 * 1000,
  });

  // Attendance untuk absensi
  const { data: attendance } = useQuery({
    queryKey: ["attendance-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.Attendance.filter({ employee_email: user.email, date: today });
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  // Restore centang dari DB
  useEffect(() => {
    if (myLogs.length > 0) {
      const ids = new Set(myLogs.map(l => l.item_id).filter(Boolean));
      setCheckedIds(ids);
    }
  }, [myLogs.length]);

  // ── Treatment hari ini ──
  const todayDow = now.getDay();
  const treatmentHariIni = treatmentSchedules.filter(ts => {
    if (!ts.is_active) return false;
    if (ts.frequency === "harian") return true;
    if (ts.frequency === "mingguan" && Array.isArray(ts.weekly_days)) return ts.weekly_days.includes(todayDow);
    if (ts.frequency === "dua_mingguan" && Array.isArray(ts.weekly_days)) {
      if (!ts.weekly_days.includes(todayDow)) return false;
      // check apakah minggu ini adalah minggu treatment
      const days = daysSinceEpoch(today);
      const weekIdx = Math.floor(days / 7);
      return weekIdx % 2 === 0;
    }
    return false;
  });

  // ── Reminder timbang jatuh tempo hari ini ──
  const timbangToday = tortoises.filter(t => {
    if (!["aktif", "baby"].includes(t.status) || !t.last_weighed_date || !t.weighing_interval_days) return false;
    const daysSince = differenceInCalendarDays(now, parseISO(t.last_weighed_date));
    return daysSince >= t.weighing_interval_days;
  }).slice(0, 5);

  // ── Bangun daftar tugas lengkap ──
  const allTasks = [
    ...jadwalTetap,
    ...tugasBerkala,
    ...treatmentHariIni.map(ts => ({
      id: `treatment_${ts.id}`,
      label: ts.title,
      waktu: ts.deadline_time || "Saat ada waktu",
      icon: "💊",
      keterangan: ts.dose || ts.notes || "",
      badge: "Treatment",
      badgeColor: "bg-orange-100 text-orange-700",
      isTreatment: true,
    })),
    ...timbangToday.map(t => ({
      id: `timbang_${t.id}`,
      label: `Timbang: ${t.name}`,
      waktu: "Saat ada waktu",
      icon: "⚖️",
      keterangan: t.enclosure || "",
      badge: "Timbang",
      badgeColor: "bg-sky-100 text-sky-700",
    })),
  ];

  // Tasks yang bisa dicentang (bukan istirahat, bukan absensi)
  const checkableTasks = allTasks.filter(t => !t.noCheck && !ABSENSI_IDS.has(t.id));
  // Absensi handled by attendance
  const absChecked = {
    abs_masuk: !!attendance?.check_in,
    abs_pulang: !!attendance?.check_out,
  };

  // Hitung progress (absensi + checkable)
  const totalProgress = checkableTasks.length + 2; // +2 absensi
  const doneProgress = checkableTasks.filter(t => checkedIds.has(t.id)).length
    + (absChecked.abs_masuk ? 1 : 0)
    + (absChecked.abs_pulang ? 1 : 0);
  const progressPct = totalProgress > 0 ? Math.round((doneProgress / totalProgress) * 100) : 0;

  // ── Handler centang ──
  const handleCheck = async (task) => {
    if (task.noCheck || ABSENSI_IDS.has(task.id)) return;
    const alreadyDone = checkedIds.has(task.id);
    // Optimistic
    setCheckedIds(p => {
      const n = new Set(p);
      alreadyDone ? n.delete(task.id) : n.add(task.id);
      return n;
    });
    setSavingId(task.id);
    try {
      if (alreadyDone) {
        // Hapus log jika ada
        const existing = myLogs.find(l => l.item_id === task.id);
        if (existing) await base44.entities.MaintenanceLog.delete(existing.id);
      } else {
        // Simpan log baru
        await base44.entities.MaintenanceLog.create({
          check_key: `${user.email}__tugas__${task.id}__${today}`,
          enclosure_id: "tugas_harian",
          enclosure_name: "Tugas Harian",
          freq: "harian",
          item_id: task.id,
          item_label: task.label,
          period_key: today,
          is_done: true,
          done_at: format(new Date(), "HH:mm"),
          done_by: user.full_name || user.email,
          done_by_email: user.email,
          poin_earned: 10,
        });
      }
      refetchLogs();
    } catch {
      // revert on error
      setCheckedIds(p => {
        const n = new Set(p);
        alreadyDone ? n.add(task.id) : n.delete(task.id);
        return n;
      });
    } finally {
      setSavingId(null);
    }
  };

  // ── Tim view: siapa sudah centang apa ──
  const teamCheckMap = {};
  if (showTeam) {
    allLogs.forEach(l => {
      if (!teamCheckMap[l.item_id]) teamCheckMap[l.item_id] = [];
      teamCheckMap[l.item_id].push({ name: l.done_by, time: l.done_at });
    });
  }

  return (
    <div className="space-y-4 pb-4">
      {/* ── Header Progress ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-gray-800">
              📋 Tugas Hari Ini — {isMinggu ? "Minggu" : "Senin–Sabtu"}
            </p>
            <p className="text-xs text-gray-400 capitalize">{todayLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-700">{progressPct}%</p>
            <p className="text-xs text-gray-400">{doneProgress}/{totalProgress} selesai</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: progressPct === 100 ? "#16a34a" : "linear-gradient(90deg,#4ade80,#16a34a)",
            }}
          />
        </div>
        {progressPct === 100 && (
          <p className="text-center text-sm font-bold text-green-700 mt-2">🏆 Semua tugas selesai hari ini!</p>
        )}

        {/* Team toggle (kepala feeder) */}
        {showTeamView && (
          <button
            onClick={() => setShowTeam(v => !v)}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            {showTeam ? "Sembunyikan Tim" : "Lihat Progress Tim"}
            {showTeam ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* ── Daftar Tugas ── */}
      <div className="space-y-2">
        {allTasks.map((task, idx) => {
          const isAbsensi = ABSENSI_IDS.has(task.id);
          const isChecked = isAbsensi
            ? (task.id === "abs_masuk" ? absChecked.abs_masuk : absChecked.abs_pulang)
            : checkedIds.has(task.id);
          const isSaving = savingId === task.id;
          const isIstirahat = task.noCheck;
          const teamWho = showTeam ? (teamCheckMap[task.id] || []) : [];

          return (
            <div
              key={task.id}
              className={`rounded-2xl border-2 transition-all ${
                isIstirahat
                  ? "border-gray-100 bg-gray-50 opacity-60"
                  : isChecked
                  ? "border-green-300 bg-green-50"
                  : "border-gray-100 bg-white"
              } shadow-sm`}
            >
              <div
                className={`flex items-start gap-3 p-3.5 ${!isIstirahat && !isAbsensi ? "cursor-pointer active:scale-[0.99]" : ""}`}
                onClick={() => !isIstirahat && !isAbsensi && handleCheck(task)}
              >
                {/* Nomor */}
                <span className="text-xs font-bold text-gray-400 w-5 text-center pt-0.5 flex-shrink-0">
                  {idx + 1}
                </span>

                {/* Icon */}
                <span className="text-lg flex-shrink-0 leading-none">{task.icon}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${isChecked ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {task.label}
                    </p>
                    {task.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${task.badgeColor}`}>
                        {task.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> {task.waktu}
                    </span>
                    {task.keterangan && (
                      <span className="text-xs text-gray-400">· {task.keterangan}</span>
                    )}
                  </div>

                  {/* Absensi status */}
                  {isAbsensi && (
                    <p className="text-xs mt-1 font-medium">
                      {task.id === "abs_masuk"
                        ? attendance?.check_in
                          ? <span className="text-green-600">✓ Masuk {attendance.check_in}</span>
                          : <span className="text-gray-400">Belum check in</span>
                        : attendance?.check_out
                        ? <span className="text-green-600">✓ Pulang {attendance.check_out}</span>
                        : <span className="text-gray-400">Belum check out</span>
                      }
                    </p>
                  )}

                  {/* Team who did it */}
                  {showTeam && teamWho.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {teamWho.map((w, i) => (
                        <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                          {w.name} {w.time}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checkbox / status */}
                {!isIstirahat && !isAbsensi && (
                  <div
                    className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isChecked
                        ? "bg-green-500 border-green-500"
                        : "border-gray-300 hover:border-green-400"
                    } ${isSaving ? "opacity-50 animate-pulse" : ""}`}
                  >
                    {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                )}

                {isAbsensi && (
                  <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${
                    isChecked ? "bg-green-500 border-green-500" : "border-gray-200 bg-gray-50"
                  }`}>
                    {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Catatan hari ── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-3 text-xs text-gray-400 text-center">
        <p>✅ Centang tiap kegiatan setelah selesai · Reset otomatis setiap hari baru</p>
      </div>
    </div>
  );
}