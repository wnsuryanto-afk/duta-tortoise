/**
 * TugasHariIni — Jadwal Kerja Harian Duta Tortoise
 *
 * SUMBER TUNGGAL & SEGAR: SOPTask (is_active=true). Hormati frequency,
 * weekly_days, monthly_dates, points, dan title terkini. Task nonaktif
 * TIDAK muncul. TreatmentSchedule TIDAK diinjeksi di sini (anti dobel
 * dengan WidgetSuplemen) — suplemen/vitamin hanya muncul via Suplemen.
 *
 * Anti-dobel: penambahan task dicek terhadap log hari ini (item_id unik);
 * tombol centang kebal double-tap (disabled saat proses).
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CheckCircle2, Clock, Users, ChevronDown, ChevronUp,
  Camera, Plus, Loader2, Check, X, Star, Salad
} from "lucide-react";
import ExtraTaskForm from "./ExtraTaskForm";
import { compressImage } from "@/lib/useImageCompression";
import { syncPhotoToChecklist } from "@/lib/syncPhotoToChecklist";
import PhotoPreviewModal from "./PhotoPreviewModal";
import PakanHarianForm from "@/components/pakan/PakanHarianForm";

// ── STRUKTURAL (bukan SOPTask: absensi & istirahat) ──
const STRUCTURAL = [
  { id: "abs_masuk",  label: "Absensi jam masuk",  waktu: "07:00",      icon: "🏁", structural: true },
  { id: "istirahat",  label: "Istirahat",          waktu: "11:45–13:00", icon: "☕", noCheck: true },
  { id: "abs_pulang", label: "Absensi jam pulang", waktu: "16:00",      icon: "🏠", structural: true },
];
const ABSENSI_IDS = new Set(["abs_masuk", "abs_pulang"]);

const CATEGORY_ICON = {
  pakan: "🐢", kebersihan: "🏠", pemeriksaan: "❤️",
  breeding: "🥚", administrasi: "📝", lainnya: "✅",
};
const CATEGORY_BADGE = {
  pakan: "bg-green-100 text-green-700",
  kebersihan: "bg-blue-100 text-blue-700",
  pemeriksaan: "bg-amber-100 text-amber-700",
  breeding: "bg-purple-100 text-purple-700",
  administrasi: "bg-gray-100 text-gray-700",
  lainnya: "bg-muted text-muted-foreground",
};

// ── MAIN ──
export default function TugasHariIni({ user, showTeamView = false }) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const dow = now.getDay();
  const dom = now.getDate();
  const todayLabel = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });
  const isMinggu = dow === 0;

  const [checkedIds, setCheckedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [showTeam, setShowTeam] = useState(false);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showPakanForm, setShowPakanForm] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const canCatatPakan = ["keeper", "kepala_feeder", "owner", "admin", "manajer"].includes(user?.role);

  // ── SOPTask: SUMBER TUNGGAL (baca langsung, is_active=true) ──
  const { data: sopTasks = [] } = useQuery({
    queryKey: ["sop-tasks-active-tugas-hari-ini"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 30 * 1000,
  });

  const { data: myLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["tugas-hari-ini-logs", user?.email, today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ done_by_email: user.email, period_key: today }),
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  const { data: allLogsToday = [], refetch: refetchAllLogs } = useQuery({
    queryKey: ["tugas-hari-ini-all-logs", today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ period_key: today }),
    enabled: showTeamView,
    staleTime: 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-timbang-reminder", today],
    queryFn: () => base44.entities.Tortoise.list("-name", 500),
    staleTime: 10 * 60 * 1000,
  });

  const { data: attendance } = useQuery({
    queryKey: ["attendance-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.Attendance.filter({ employee_email: user.email, date: today });
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  const { data: myChecklistStatus } = useQuery({
    queryKey: ["my-checklist-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.DailyChecklist.filter({ employee_email: user.email, date: today });
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  // Photo map: item_id → photo_url
  const photoMap = useMemo(() => {
    const map = {};
    myLogs.forEach(l => { if (l.photo_url) map[l.item_id] = l.photo_url; });
    return map;
  }, [myLogs]);

  // Set item_id yang sudah ada log hari ini (anti-dobel)
  const existingLogItemIds = useMemo(() => new Set(myLogs.map(l => l.item_id).filter(Boolean)), [myLogs]);

  // Extra tasks
  const extraTasks = useMemo(() => {
    const source = showTeamView ? allLogsToday : myLogs;
    return source.filter(l => l.is_extra);
  }, [showTeamView, allLogsToday, myLogs]);

  // Restore checks
  useEffect(() => {
    if (myLogs.length > 0) {
      setCheckedIds(new Set(myLogs.map(l => l.item_id).filter(Boolean)));
    }
  }, [myLogs.length]);

  // ── Bangun task dari SOPTask (hormati frequency + weekly_days + monthly_dates) ──
  const sopTaskItems = useMemo(() => {
    return sopTasks
      .filter(t => {
        if (!t.is_active) return false;
        const freq = t.frequency;
        if (freq === "harian") return true;
        if (freq === "mingguan") return Array.isArray(t.weekly_days) && t.weekly_days.includes(dow);
        if (freq === "bulanan") return Array.isArray(t.monthly_dates) && t.monthly_dates.includes(dom);
        return false;
      })
      .map(t => ({
        id: `sop_${t.id}`,
        label: t.title,
        waktu: t.deadline_time ? `≤ ${t.deadline_time}` : "Saat ada waktu",
        icon: CATEGORY_ICON[t.category] || "✅",
        keterangan: t.description || "",
        points: t.points || 0,
        badge: t.category,
        badgeColor: CATEGORY_BADGE[t.category] || "bg-muted text-muted-foreground",
        require_photo: t.require_photo || false,
      }));
  }, [sopTasks, dow, dom]);

  // Reminder timbang
  const timbangToday = tortoises.filter(t => {
    if (!["aktif", "baby"].includes(t.status) || !t.last_weighed_date || !t.weighing_interval_days) return false;
    return differenceInCalendarDays(now, parseISO(t.last_weighed_date)) >= t.weighing_interval_days;
  }).slice(0, 5);

  const timbangItems = timbangToday.map(t => ({
    id: `timbang_${t.id}`, label: `Timbang: ${t.name}`, waktu: "Saat ada waktu",
    icon: "⚖️", keterangan: t.enclosure || "", points: 5,
    badge: "Timbang", badgeColor: "bg-sky-100 text-sky-700",
  }));

  // Full task list: struktural + SOPTask + timbang
  const allTasks = [...STRUCTURAL, ...sopTaskItems, ...timbangItems];

  const checkableTasks = allTasks.filter(t => !t.noCheck && !ABSENSI_IDS.has(t.id));
  const absChecked = { abs_masuk: !!attendance?.check_in, abs_pulang: !!attendance?.check_out };
  const totalProgress = checkableTasks.length + 2;
  const doneProgress = checkableTasks.filter(t => checkedIds.has(t.id)).length + (absChecked.abs_masuk ? 1 : 0) + (absChecked.abs_pulang ? 1 : 0);
  const progressPct = totalProgress > 0 ? Math.round((doneProgress / totalProgress) * 100) : 0;

  // Team view map
  const teamCheckMap = useMemo(() => {
    if (!showTeam) return {};
    const m = {};
    allLogsToday.forEach(l => {
      if (!m[l.item_id]) m[l.item_id] = [];
      m[l.item_id].push({ name: l.done_by, time: l.done_at, photo: l.photo_url });
    });
    return m;
  }, [showTeam, allLogsToday]);

  // ── Handlers ──
  const handleCheck = async (task) => {
    if (task.noCheck || ABSENSI_IDS.has(task.id)) return;
    if (savingId) return; // anti double-tap

    const alreadyDone = checkedIds.has(task.id);

    if (alreadyDone) {
      // Uncheck - hapus log
      setCheckedIds(p => { const n = new Set(p); n.delete(task.id); return n; });
      setSavingId(task.id);
      try {
        const existing = myLogs.find(l => l.item_id === task.id);
        if (existing) await base44.entities.MaintenanceLog.delete(existing.id);
        refetchLogs();
      } catch {
        setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
      } finally {
        setSavingId(null);
      }
      return;
    }

    // ANTI-DOBEL: jika sudah ada log untuk item_id ini hari ini, jangan tambah lagi
    if (existingLogItemIds.has(task.id)) {
      setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
      return;
    }

    setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
    setSavingId(task.id);
    try {
      await base44.entities.MaintenanceLog.create({
        check_key: `${user.email}__tugas__${task.id}__${today}`,
        enclosure_id: "tugas_harian", enclosure_name: "Tugas Harian",
        freq: "harian", item_id: task.id, item_label: task.label,
        period_key: today, is_done: true,
        done_at: format(new Date(), "HH:mm"),
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: task.points || 0,
      });
      refetchLogs();
    } catch {
      setCheckedIds(p => { const n = new Set(p); n.delete(task.id); return n; });
    } finally {
      setSavingId(null);
    }
  };

  const handlePhotoUpload = async (taskId, file) => {
    setUploadingPhotoId(taskId);
    try {
      const compressed = await compressImage(file);
      if (!compressed) { setUploadingPhotoId(null); return; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      const takenAt = format(new Date(), "HH:mm");
      const existing = myLogs.find(l => l.item_id === taskId);
      if (existing) {
        await base44.entities.MaintenanceLog.update(existing.id, { photo_url: file_url });
        syncPhotoToChecklist({
          employeeEmail: user.email, date: today,
          taskTitle: existing.item_label, enclosure: existing.enclosure_name || "Tugas Harian",
          photoUrl: file_url, takenAt,
        });
      }
      refetchLogs();
    } catch {}
    setUploadingPhotoId(null);
  };

  const handlePhotoCheck = async (task, file) => {
    if (savingId) return;
    setSavingId(task.id);
    try {
      const compressed = await compressImage(file);
      if (!compressed) { setSavingId(null); return; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      const takenAt = format(new Date(), "HH:mm");
      await base44.entities.MaintenanceLog.create({
        check_key: `${user.email}__tugas__${task.id}__${today}`,
        enclosure_id: "tugas_harian", enclosure_name: "Tugas Harian",
        freq: "harian", item_id: task.id, item_label: task.label,
        period_key: today, is_done: true,
        done_at: takenAt,
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: task.points || 0,
        photo_url: file_url,
      });
      setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
      refetchLogs();
      syncPhotoToChecklist({
        employeeEmail: user.email, date: today,
        taskTitle: task.label, enclosure: "Tugas Harian",
        photoUrl: file_url, takenAt,
      });
    } catch {
    } finally {
      setSavingId(null);
    }
  };

  const handleApproveExtra = async (log, poin) => {
    await base44.entities.MaintenanceLog.update(log.id, {
      approval_status: "approved",
      approved_by: user.full_name || user.email,
      approved_at: format(new Date(), "yyyy-MM-dd HH:mm"),
      poin_earned: poin,
    });
    refetchAllLogs();
    refetchLogs();
  };

  // ── RENDER ──
  return (
    <div className="space-y-4 pb-4">
      {/* Progress Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-gray-800">📋 Tugas Hari Ini — {isMinggu ? "Minggu" : "Senin–Sabtu"}</p>
            <p className="text-xs text-gray-400 capitalize">{todayLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-700">{progressPct}%</p>
            <p className="text-xs text-gray-400">{doneProgress}/{totalProgress} selesai</p>
            <p className="text-xs font-bold text-amber-600 flex items-center gap-0.5 justify-end mt-0.5">
              <Star className="w-3 h-3 fill-current" />{myLogs.reduce((s, l) => s + (l.poin_earned || 0), 0)} poin
            </p>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: progressPct === 100 ? "#16a34a" : "linear-gradient(90deg,#4ade80,#16a34a)" }} />
        </div>
        {progressPct === 100 && <p className="text-center text-sm font-bold text-green-700 mt-2">🏆 Semua tugas selesai!</p>}

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {showTeamView && (
            <button onClick={() => setShowTeam(v => !v)} className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5">
              <Users className="w-3.5 h-3.5" /> {showTeam ? "Sembunyikan Tim" : "Lihat Progress Tim"}
              {showTeam ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button onClick={() => setShowExtraForm(true)} className="flex items-center gap-1.5 text-xs font-medium text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-50">
            <Plus className="w-3.5 h-3.5" /> Tambah Pekerjaan
          </button>
          {canCatatPakan && (
            <button onClick={() => setShowPakanForm(true)} className="flex items-center gap-1.5 text-xs font-medium text-green-700 border border-green-300 rounded-lg px-3 py-1.5 hover:bg-green-50">
              <Salad className="w-3.5 h-3.5" /> Catat Pengambilan Pakan
            </button>
          )}
        </div>
      </div>

      {/* Status approval checklist keeper */}
      {myChecklistStatus && myChecklistStatus.status === "submitted" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Menunggu persetujuan owner</p>
            <p className="text-xs text-amber-700">Checklist hari ini sudah dikirim — poin dihitung setelah disetujui.</p>
          </div>
        </div>
      )}
      {myChecklistStatus && myChecklistStatus.status === "approved" && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-3 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Disetujui: {myChecklistStatus.approved_points || 0} poin</p>
            {myChecklistStatus.approved_by && <p className="text-xs text-green-700">oleh {myChecklistStatus.approved_by}</p>}
          </div>
        </div>
      )}
      {myChecklistStatus && myChecklistStatus.status === "rejected" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 flex items-center gap-2.5">
          <X className="w-4 h-4 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Checklist ditolak</p>
            {myChecklistStatus.rejection_reason && <p className="text-xs text-red-700">{myChecklistStatus.rejection_reason}</p>}
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {allTasks.map((task, idx) => (
          <TaskRow
            key={task.id}
            task={task}
            idx={idx}
            isChecked={ABSENSI_IDS.has(task.id) ? (task.id === "abs_masuk" ? absChecked.abs_masuk : absChecked.abs_pulang) : checkedIds.has(task.id)}
            isAbsensi={ABSENSI_IDS.has(task.id)}
            isSaving={savingId === task.id}
            attendance={attendance}
            photoUrl={photoMap[task.id]}
            uploadingPhoto={uploadingPhotoId === task.id}
            teamWho={showTeam ? (teamCheckMap[task.id] || []) : []}
            showTeam={showTeam}
            requirePhoto={task.require_photo}
            onCheck={() => handleCheck(task)}
            onPhotoUpload={(file) => handlePhotoUpload(task.id, file)}
            onPhotoCheck={(file) => handlePhotoCheck(task, file)}
          />
        ))}
        {sopTaskItems.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-6">
            Belum ada SOPTask aktif untuk hari ini. Tambah/aktifkan task di menu SOP.
          </div>
        )}
      </div>

      {/* Extra Tasks */}
      {extraTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">Pekerjaan Tambahan</p>
          {extraTasks.map(log => (
            <ExtraTaskRow key={log.id} log={log} showTeamView={showTeamView} user={user} onApprove={handleApproveExtra} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-3 text-xs text-gray-400 text-center">
        ✅ Centang tiap kegiatan setelah selesai · 📷 Lampirkan foto dokumentasi · Reset otomatis setiap hari baru
      </div>

      <ExtraTaskForm
        open={showExtraForm}
        onClose={() => setShowExtraForm(false)}
        user={user}
        today={today}
        onSaved={() => { refetchLogs(); refetchAllLogs(); }}
      />

      {canCatatPakan && (
        <PakanHarianForm
          open={showPakanForm}
          onClose={() => setShowPakanForm(false)}
          user={user}
          onSaved={() => qc.invalidateQueries({ queryKey: ["pakan-harian-today"] })}
        />
      )}
    </div>
  );
}

// ── Task Row Component ──
function TaskRow({ task, idx, isChecked, isAbsensi, isSaving, attendance, photoUrl, uploadingPhoto, teamWho, showTeam, requirePhoto, onCheck, onPhotoUpload, onPhotoCheck }) {
  const isIstirahat = task.noCheck;
  const poin = task.points || 0;
  const cameraRef = useRef(null);
  const [showPhoto, setShowPhoto] = useState(false);

  const handleClick = () => {
    if (isIstirahat || isAbsensi || isSaving) return;
    if (requirePhoto && !isChecked) {
      cameraRef.current?.click();
    } else {
      onCheck();
    }
  };

  return (
    <div className={`rounded-2xl border-2 transition-all ${isIstirahat ? "border-gray-100 bg-gray-50 opacity-60" : isChecked ? "border-green-300 bg-green-50" : "border-gray-100 bg-white"} shadow-sm`}>
      <div className={`flex items-start gap-3 p-3.5 ${!isIstirahat && !isAbsensi ? "cursor-pointer active:scale-[0.99]" : ""}`} onClick={handleClick}>
        <span className="text-xs font-bold text-gray-400 w-5 text-center pt-0.5 flex-shrink-0">{idx + 1}</span>
        <span className="text-lg flex-shrink-0 leading-none">{task.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${isChecked ? "line-through text-gray-400" : "text-gray-800"}`}>{task.label}</p>
            {requirePhoto && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">📷 Wajib Foto</span>
            )}
            {task.badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${task.badgeColor}`}>{task.badge}</span>}
            {!isIstirahat && !isAbsensi && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">+{poin} poin</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" /> {task.waktu}</span>
            {task.keterangan && <span className="text-xs text-gray-400">· {task.keterangan}</span>}
          </div>

          {isAbsensi && (
            <p className="text-xs mt-1 font-medium">
              {task.id === "abs_masuk"
                ? attendance?.check_in ? <span className="text-green-600">✓ Masuk {attendance.check_in}</span> : <span className="text-gray-400">Belum check in</span>
                : attendance?.check_out ? <span className="text-green-600">✓ Pulang {attendance.check_out}</span> : <span className="text-gray-400">Belum check out</span>
              }
            </p>
          )}

          {/* Photo thumbnail — clickable to enlarge */}
          {photoUrl && (
            <button onClick={(e) => { e.stopPropagation(); setShowPhoto(true); }} className="mt-1.5 block">
              <img src={photoUrl} alt="Dokumentasi" className="w-16 h-12 rounded-lg object-cover border border-green-200 hover:opacity-80 transition-opacity" />
            </button>
          )}
          {showPhoto && (
            <PhotoPreviewModal open={showPhoto} onClose={() => setShowPhoto(false)} photoUrl={photoUrl} taskTitle={task.label} />
          )}

          {/* Team view */}
          {showTeam && teamWho.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {teamWho.map((w, i) => (
                <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{w.name} {w.time}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {/* Optional photo button (non-require_photo, checked, no photo yet) — camera or gallery */}
          {!requirePhoto && !isIstirahat && !isAbsensi && isChecked && !photoUrl && (
            <label className={`w-7 h-7 rounded-xl border-2 border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all ${uploadingPhoto ? "opacity-50" : ""}`}>
              {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-gray-400" />}
              <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) onPhotoUpload(e.target.files[0]); e.target.value = ""; }} className="hidden" />
            </label>
          )}

          {/* Checkbox */}
          {!isIstirahat && (
            <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${isChecked ? "bg-green-500 border-green-500" : isAbsensi ? "border-gray-200 bg-gray-50" : requirePhoto ? "border-red-300 hover:border-red-400" : "border-gray-300 hover:border-green-400"} ${isSaving ? "opacity-50 animate-pulse" : ""}`} onClick={e => { e.stopPropagation(); if (!isIstirahat && !isAbsensi && !isSaving) handleClick(); }}>
              {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
          )}
        </div>
      </div>

      {/* Hidden camera input for require_photo tasks (camera only, no gallery) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) onPhotoCheck(e.target.files[0]); e.target.value = ""; }}
      />
    </div>
  );
}

// ── Extra Task Row ──
function ExtraTaskRow({ log, showTeamView, user, onApprove }) {
  const [poinInput, setPoinInput] = useState("10");
  const isAdmin = ["owner", "admin", "manajer", "kepala_feeder"].includes(user?.role);
  const isPending = log.approval_status === "pending" || !log.approval_status;
  const isApproved = log.approval_status === "approved";

  return (
    <div className={`rounded-2xl border-2 shadow-sm ${isApproved ? "border-green-300 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <span className="text-lg leading-none">📌</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">{log.item_label}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Tambahan</span>
              {isApproved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Approved +{log.poin_earned}p</span>}
              {isPending && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Menunggu Approval</span>}
            </div>
            {log.extra_description && <p className="text-xs text-gray-500 mt-0.5">{log.extra_description}</p>}
            <p className="text-xs text-gray-400 mt-0.5">oleh {log.done_by} · {log.done_at}</p>
            {log.photo_url && <img src={log.photo_url} alt="Foto" className="w-16 h-12 rounded-lg object-cover border mt-1.5" />}
          </div>

          {isApproved && (
            <div className="flex items-center gap-1 text-green-600">
              <Star className="w-4 h-4 fill-green-500" />
              <span className="text-sm font-bold">+{log.poin_earned}</span>
            </div>
          )}
        </div>

        {/* Approval actions for admin */}
        {showTeamView && isAdmin && isPending && (
          <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2">
            <input type="number" value={poinInput} onChange={e => setPoinInput(e.target.value)} className="w-16 h-8 rounded-lg border border-gray-300 text-center text-sm" min="0" max="100" />
            <span className="text-xs text-gray-500">poin</span>
            <button onClick={() => onApprove(log, parseInt(poinInput) || 0)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">
              <Check className="w-3 h-3" /> Approve
            </button>
            <button onClick={() => onApprove(log, 0)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300">
              <X className="w-3 h-3" /> Tolak
            </button>
          </div>
        )}
      </div>
    </div>
  );
}