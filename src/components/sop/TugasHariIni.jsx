/**
 * TugasHariIni — Jadwal Kerja Harian Duta Tortoise
 *
 * SEDERHANA & STABIL: ambil checklist hari ini milik user → tampilkan daftar
 * task → centang → simpan. Tidak ada perhitungan lintas-karyawan saat render.
 *
 * Penguncian task "bersama" dilakukan SAAT SIMPAN (bukan saat render):
 * saat user menekan centang, sistem query DB untuk cek apakah task itu
 * sudah dikerjakan orang lain pada tanggal yang sama. Jika ya → tolak simpan.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, differenceInCalendarDays, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CheckCircle2, Clock, Users, ChevronDown, ChevronUp,
  Camera, Plus, Loader2, Check, X, Star, Salad, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import ExtraTaskForm from "./ExtraTaskForm";
import { compressImage } from "@/lib/useImageCompression";
import { syncPhotoToChecklist } from "@/lib/syncPhotoToChecklist";
import { detectPhotoAge, checkDeadlineTime, runPhotoVerificationInBackground } from "@/lib/photoVerification";
import AICatatanCard from "./AICatatanCard";
import { useCompanySettings } from "@/lib/useCompanySettings";
import { useCurrentUser } from "@/lib/useCurrentUser";
import PhotoPreviewModal from "./PhotoPreviewModal";
import UkurFormDialog from "./UkurFormDialog";
import TimbangBabyDialog from "./TimbangBabyDialog";
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
  breeding: "🥚", administrasi: "📝", suplemen: "💊", lainnya: "✅",
};
const CATEGORY_BADGE = {
  pakan: "bg-green-100 text-green-700",
  kebersihan: "bg-blue-100 text-blue-700",
  pemeriksaan: "bg-amber-100 text-amber-700",
  breeding: "bg-purple-100 text-purple-700",
  administrasi: "bg-muted text-foreground",
  suplemen: "bg-teal-100 text-teal-700",
  lainnya: "bg-muted text-muted-foreground",
};

// ── Carry-over: tanggal jatuh tempo terakhir (terbaru <= hari ini) ──
function computeLastDueDate(t, todayStr) {
  const today = new Date(todayStr + "T00:00:00");
  const freq = String(t.frequency || "").toLowerCase();

  // Pekerjaan yang jadwalnya lebih jarang daripada bulanan — mis. tiap dua
  // bulan, atau musiman — tidak bisa dinyatakan lewat harian/mingguan/bulanan
  // saja. Sebelum kolom ini ada, "2 bulan sekali" hanya tertulis di judul task
  // sementara sistem tetap menjalankannya tiap bulan.
  const bulanAktif = Array.isArray(t.bulan_aktif) ? t.bulan_aktif : [];
  const bulanCocok = (d) => bulanAktif.length === 0 || bulanAktif.includes(d.getMonth() + 1);

  if (freq === "harian") return bulanCocok(today) ? todayStr : null;
  if (freq === "mingguan") {
    const days = Array.isArray(t.weekly_days) ? t.weekly_days : [];
    if (!days.length) return null;
    for (let i = 0; i < 10; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (days.includes(d.getDay()) && bulanCocok(d)) return format(d, "yyyy-MM-dd");
    }
    return null;
  }
  if (freq === "bulanan") {
    const dates = Array.isArray(t.monthly_dates) ? t.monthly_dates : [];
    if (!dates.length) return null;
    for (let i = 0; i < 35; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (dates.includes(d.getDate()) && bulanCocok(d)) return format(d, "yyyy-MM-dd");
    }
    return null;
  }
  return null;
}

// Cek apakah task sudah dikerjakan di hari sebelumnya (dalam siklus jatuh tempo ini).
// Log test (is_test_data) diabaikan agar mode uji owner tidak memengaruhi keeper asli.
function isCompletedPrevCycle(itemKey, lastDueDate, todayStr, scope, userEmail, recentLogs) {
  const logs = (recentLogs || []).filter(l =>
    l.item_id === itemKey && l.is_done && l.period_key &&
    !l.is_test_data &&
    l.period_key >= lastDueDate && l.period_key < todayStr
  );
  if (scope === "pribadi") return logs.some(l => l.done_by_email === userEmail);
  return logs.length > 0;
}

// ── MAIN ──
export default function TugasHariIni({ user, showTeamView = false }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { isOwnerTestSave } = useCurrentUser();
  const testTag = isOwnerTestSave ? { is_test_data: true } : {};
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
  const [ukurTarget, setUkurTarget] = useState(null);
  const [timbangBabyTask, setTimbangBabyTask] = useState(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const [photoSavedIds, setPhotoSavedIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // ── Jeda minimum 60 detik antar pencentangan tugas SOP (anti centang beruntun) ──
  // Pengecualian: absensi, baris istirahat, dan tugas tambahan keeper (tidak konsumsi jeda).
  const lastCheckAtRef = useRef(0);
  const getCooldownRemaining = () => {
    if (!lastCheckAtRef.current) return 0;
    const elapsedMs = Date.now() - lastCheckAtRef.current;
    return elapsedMs >= 60000 ? 0 : Math.ceil((60000 - elapsedMs) / 1000);
  };
  const registerCheckTime = () => { lastCheckAtRef.current = Date.now(); };

  const canCatatPakan = ["keeper", "kepala_feeder", "owner", "admin", "manajer"].includes(user?.role);
  const companySettings = useCompanySettings();
  const aiSaranEnabled = companySettings.ai_saran_enabled !== false;

  // ── SOPTask: SUMBER TUNGGAL (baca langsung, is_active=true) ──
  const { data: sopTasks = [] } = useQuery({
    queryKey: ["sop-tasks-active-tugas-hari-ini"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }, "title", 200),
    staleTime: 30 * 1000,
  });

  // ── Log hari ini MILIK USER (bukan lintas-karyawan) ──
  const { data: myLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["tugas-hari-ini-logs", user?.email, today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ done_by_email: user.email, period_key: today }),
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  // ── Semua log hari ini (semua karyawan) — untuk team view & deteksi "sudah dikerjakan rekan" ──
  const { data: allLogsToday = [], refetch: refetchAllLogs } = useQuery({
    queryKey: ["tugas-hari-ini-all-logs", today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ period_key: today }),
    staleTime: 30 * 1000,
  });

  // ── Peta "sudah dikerjakan rekan" (item_id → {name, time}) — scope bukan pribadi ──
  const doneByOtherMap = useMemo(() => {
    const m = {};
    (allLogsToday || []).forEach(l => {
      if (!l.is_done || l.is_test_data) return;
      if ((l.done_by_email || "") === user?.email) return;
      if (!l.item_id) return;
      if (!m[l.item_id]) m[l.item_id] = { name: l.done_by || "karyawan lain", time: l.done_at || "" };
    });
    return m;
  }, [allLogsToday, user?.email]);

  // ── Log 35 hari terakhir (semua user) — untuk deteksi carry-over task terlambat ──
  const carryStart = format(subDays(now, 35), "yyyy-MM-dd");
  const { data: recentLogs = [] } = useQuery({
    queryKey: ["tugas-carryover-logs", carryStart],
    queryFn: async () => {
      try {
        const res = await base44.entities.MaintenanceLog.filter({ period_key: { $gte: carryStart } }, "-period_key", 2000);
        return res || [];
      } catch { return []; }
    },
    staleTime: 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-timbang-reminder", today],
    queryFn: () => base44.entities.Tortoise.list("-name", 500),
    staleTime: 10 * 60 * 1000,
  });

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures-kebersihan", today],
    queryFn: () => base44.entities.Enclosure.filter({ is_active: true }, "name", 50),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rotasiUkur = { babies: [], dewasa: [] } } = useQuery({
    queryKey: ["rotasi-ukur", today],
    queryFn: async () => {
      const res = await base44.functions.invoke("getRotasiUkur", { date: today });
      return { babies: res.data?.babies || [], dewasa: res.data?.dewasa || [] };
    },
    staleTime: 5 * 60 * 1000,
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

  // ── Map saran AI dari checklist hari ini (keyed by normalized task title) ──
  const aiSaranMap = useMemo(() => {
    const map = {};
    const tasks = myChecklistStatus?.completed_tasks || [];
    tasks.forEach(t => {
      const key = (t.task_title || "").trim().toLowerCase();
      if (key && (t.ai_apresiasi || t.ai_saran || t.owner_note)) {
        map[key] = {
          apresiasi: t.ai_apresiasi || "",
          saran: t.ai_saran || "",
          keyakinan: t.ai_confidence,
          ownerNote: t.owner_note || "",
        };
      }
    });
    return map;
  }, [myChecklistStatus]);

  // ── Derived data (semua setelah myLogs dideklarasikan) ──
  const photoMap = useMemo(() => {
    const map = {};
    myLogs.forEach(l => { if (l.photo_url) map[l.item_id] = l.photo_url; });
    return map;
  }, [myLogs]);

  const photoNotesMap = useMemo(() => {
    const m = {};
    myLogs.forEach(l => { if (l.notes) m[l.item_id] = l.notes; });
    return m;
  }, [myLogs]);

  const existingLogItemIds = useMemo(() => new Set(myLogs.map(l => l.item_id).filter(Boolean)), [myLogs]);

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

  // Sinkron jeda: ambil timestamp centang tugas (non-extra) terakhir dari log sendiri
  useEffect(() => {
    if (!myLogs.length) return;
    let maxMs = 0;
    myLogs.forEach(l => {
      if (l.is_extra) return; // tugas tambahan tidak mengganti jeda
      const ms = l.created_date ? new Date(l.created_date).getTime() : 0;
      if (ms > maxMs) maxMs = ms;
    });
    if (maxMs > 0) lastCheckAtRef.current = Math.max(lastCheckAtRef.current, maxMs);
  }, [myLogs]);

  // ── Bangun task dari SOPTask (hormati frequency + weekly_days + monthly_dates) ──
  const sopTaskItems = useMemo(() => {
    const items = [];
    // D12 - Ubin kandang mencakup beberapa tugas sekaligus (kebersihan + pakan +
    // cek kesehatan). Baris pengantar di daftar SOP harus menyebut TOTAL poinnya,
    // bukan poin kebersihan saja, kalau tidak kiper melihat angka yang lebih kecil
    // dari yang sebenarnya ia dapat.
    const tugasUbin = sopTasks.filter(t => t.is_active && t.di_ubin_kandang === true);
    const kebersihanAnchor = tugasUbin[0] || null;
    const kebersihanPoints = tugasUbin.reduce((n, t) => n + (Number(t.points) || 0), 0);

    sopTasks
      .filter(t => t.is_active)
      .forEach(t => {
        const titleLower = (t.title || "").toLowerCase();

        // ── Carry-over: task terlambat tetap tampil sampai selesai ──
        const lastDue = computeLastDueDate(t, today);
        if (!lastDue) return;
        const isOverdue = lastDue < today;
        if (isOverdue) {
          const prevDone = isCompletedPrevCycle(`sop_${t.id}`, lastDue, today, t.task_scope || "bersama", user?.email, recentLogs);
          if (prevDone) return; // sudah dikerjakan di hari sebelumnya → sembunyikan
        }
        const terlambat = isOverdue && !existingLogItemIds.has(`sop_${t.id}`);
        if (t.di_ubin_kandang === true || titleLower.includes("all kandang") || titleLower.includes("semua kandang")) {
          if (t.id === kebersihanAnchor?.id) {
            // SATU PINTU: kebersihan per-kandang hanya dikerjakan di layar ubin (GuidedHariIni)
            // yang mewajibkan foto + jeda 60 dtk. Di daftar SOP tampilkan satu baris pengantar.
            items.push({
              id: `kebersihan_kandang_intro`,
              label: `Kunjungan kandang — dikerjakan di layar Kandang`,
              waktu: t.deadline_time ? `≤ ${t.deadline_time}` : "Saat ada waktu",
              icon: "🏠",
              keterangan: "",
              points: kebersihanPoints,
              badge: "kebersihan",
              badgeColor: CATEGORY_BADGE.kebersihan,
              require_photo: tugasUbin.some(x => x.require_photo === true),
              terlambat,
              isKebersihanIntro: true,
              noCheck: true,
            });
          }
          return;
        }

        if (titleLower.includes("rotasi otomatis")) {
          (rotasiUkur.babies || []).forEach(tor => {
            items.push({
              id: `ukur_rotasi_${tor.id}`,
              label: `Timbang & ukur ${tor.code} (BABY)`,
              waktu: t.deadline_time ? `≤ ${t.deadline_time}` : "Saat ada waktu",
              icon: "⚖️",
              keterangan: tor.species || "",
              points: t.points || 0,
              badge: "Ukur Rotasi Baby",
              badgeColor: "bg-pink-100 text-pink-700",
              isUkurRotasi: true,
              tortoiseId: tor.id,
              tortoiseCode: tor.code,
              tortoiseName: tor.name,
              tortoiseEnclosure: tor.enclosure,
              terlambat,
            });
          });
          (rotasiUkur.dewasa || []).forEach(tor => {
            items.push({
              id: `ukur_rotasi_${tor.id}`,
              label: `Timbang & ukur ${tor.code} (${tor.enclosure})`,
              waktu: t.deadline_time ? `≤ ${t.deadline_time}` : "Saat ada waktu",
              icon: "⚖️",
              keterangan: tor.species || "",
              points: t.points || 0,
              badge: "Ukur Rotasi",
              badgeColor: "bg-sky-100 text-sky-700",
              isUkurRotasi: true,
              tortoiseId: tor.id,
              tortoiseCode: tor.code,
              tortoiseName: tor.name,
              tortoiseEnclosure: tor.enclosure,
              terlambat,
            });
          });
          return;
        }
        if (titleLower.includes("semua baby")) {
          items.push({
            id: `sop_${t.id}`,
            label: t.title,
            waktu: t.deadline_time ? `≤ ${t.deadline_time}` : "Saat ada waktu",
            icon: "⚖️",
            keterangan: t.description || "",
            points: t.points || 0,
            badge: "Timbang Baby",
            badgeColor: "bg-pink-100 text-pink-700",
            require_photo: t.require_photo || false,
            ai_check_points: t.ai_check_points || "",
            task_scope: t.task_scope || "bersama",
            assigned_to_email: t.assigned_to_email || "",
            assigned_to_name: t.assigned_to_name || "",
            isTimbangBaby: true,
            terlambat,
          });
          return;
        }
        items.push({
          id: `sop_${t.id}`,
          label: t.title,
          waktu: t.deadline_time ? `≤ ${t.deadline_time}` : "Saat ada waktu",
          icon: CATEGORY_ICON[t.category] || "✅",
          keterangan: t.description || "",
          points: t.points || 0,
          badge: t.category,
          badgeColor: CATEGORY_BADGE[t.category] || "bg-muted text-muted-foreground",
          require_photo: t.require_photo || false,
          // A9 — ditandai otomatis oleh fungsi kunciBahanSOP saat bahan yang
          // dibutuhkan task ini habis, supaya tidak ada poin yang dibayar untuk
          // pekerjaan yang bahannya memang tidak ada.
          terkunci_bahan: t.terkunci_bahan || false,
          terkunci_alasan: t.terkunci_alasan || "",
          ai_check_points: t.ai_check_points || "",
          task_scope: t.task_scope || "bersama",
          assigned_to_email: t.assigned_to_email || "",
          assigned_to_name: t.assigned_to_name || "",
          terlambat,
        });
      });
    return items;
  }, [sopTasks, today, rotasiUkur, enclosures, existingLogItemIds, recentLogs, user?.email]);

  // Reminder timbang
  const timbangToday = tortoises.filter(t => {
    // Baby ditangani oleh task tunggal "Timbang, ukur & foto SEMUA baby (2 minggu sekali)"
    // — jangan buat task per-baby di sini.
    if (t.age_category === "baby" || t.status === "baby") return false;
    if (!["aktif", "baby"].includes(t.status) || !t.last_weighed_date || !t.weighing_interval_days) return false;
    try { return differenceInCalendarDays(now, parseISO(t.last_weighed_date)) >= t.weighing_interval_days; }
    catch { return false; }
  }).slice(0, 5);

  const timbangItems = timbangToday.map(t => ({
    id: `timbang_${t.id}`, label: `Timbang: ${t.name}`, waktu: "Saat ada waktu",
    icon: "⚖️", keterangan: t.enclosure || "", points: 5,
    badge: "Timbang", badgeColor: "bg-sky-100 text-sky-700",
  }));

  // Daftar baby untuk task "Timbang semua baby (2 minggu sekali)"
  const babyTortoises = useMemo(() => tortoises.filter(t =>
    (t.age_category === "baby" || t.status === "baby") && t.status !== "mati" && t.status !== "terjual"
  ), [tortoises]);

  // Full task list: struktural + SOPTask + timbang
  const allTasks = [...STRUCTURAL, ...sopTaskItems, ...timbangItems];

  // Kemajuan kebersihan kandang (dari log hari ini, format kanonik) — untuk baris pengantar
  const kebersihanProgress = useMemo(() => {
    const activeEnclosures = enclosures.filter(e => !e.is_archived);
    const total = activeEnclosures.length;
    const doneSet = new Set();
    (allLogsToday || []).forEach(l => {
      if (!l.is_done || l.is_test_data) return;
      if (l.item_id && l.item_id.startsWith("kebersihan_kandang_")) {
        doneSet.add(l.item_id.replace("kebersihan_kandang_", ""));
      }
    });
    return { total, done: doneSet.size };
  }, [allLogsToday, enclosures]);

  const checkableTasks = allTasks.filter(t => !t.noCheck && !ABSENSI_IDS.has(t.id));
  const absChecked = { abs_masuk: !!attendance?.check_in, abs_pulang: !!attendance?.check_out };
  const totalProgress = checkableTasks.length + 2;
  // Selesai = dikerjakan sendiri ATAU dikerjakan rekan (scope bukan pribadi) — tidak menggandakan poin & tidak menurunkan persentase
  const isTaskSettled = (t) => {
    if (checkedIds.has(t.id)) return true;
    if ((t.task_scope || "bersama") === "pribadi") return false;
    if (t.assigned_to_email && t.assigned_to_email !== user?.email) return false;
    return !!(doneByOtherMap[t.id]);
  };
  const doneProgress = checkableTasks.filter(isTaskSettled).length + (absChecked.abs_masuk ? 1 : 0) + (absChecked.abs_pulang ? 1 : 0);
  const progressPct = totalProgress > 0 ? Math.round((doneProgress / totalProgress) * 100) : 0;

  // Team view map (hanya untuk owner/manajer — allLogsToday hanya fetch saat showTeamView)
  const teamCheckMap = useMemo(() => {
    if (!showTeam) return {};
    const m = {};
    (allLogsToday || []).forEach(l => {
      if (!m[l.item_id]) m[l.item_id] = [];
      m[l.item_id].push({ name: l.done_by, time: l.done_at, photo: l.photo_url });
    });
    return m;
  }, [showTeam, allLogsToday]);

  // ── Umpan balik visual foto tersimpan (tahan 3 dtk) ──
  const markPhotoSaved = (taskId) => {
    setPhotoSavedIds(p => { const n = new Set(p); n.add(taskId); return n; });
    setTimeout(() => {
      setPhotoSavedIds(p => { const n = new Set(p); n.delete(taskId); return n; });
    }, 3000);
  };

  // ── Refresh manual: muat ulang data checklist terbaru ──
  const handleRefresh = async () => {
    setRefreshing(true);
    qc.invalidateQueries({ queryKey: ["tugas-hari-ini-logs"] });
    qc.invalidateQueries({ queryKey: ["tugas-hari-ini-all-logs"] });
    qc.invalidateQueries({ queryKey: ["sop-tasks-active-tugas-hari-ini"] });
    qc.invalidateQueries({ queryKey: ["my-checklist-today"] });
    qc.invalidateQueries({ queryKey: ["attendance-today"] });
    qc.invalidateQueries({ queryKey: ["rotasi-ukur"] });
    qc.invalidateQueries({ queryKey: ["tortoises-timbang-reminder"] });
    qc.invalidateQueries({ queryKey: ["enclosures-kebersihan"] });
    await Promise.all([refetchLogs(), refetchAllLogs()]);
    setTimeout(() => setRefreshing(false), 600);
  };

  // ── PENGUNCIAN SAAT SIMPAN (bukan saat render) ──
  // Query DB saat user menekan centang untuk cek apakah task sudah dikerjakan orang lain
  const checkTaskLock = async (task) => {
    // Structural tasks (absensi) tidak pernah terkunci
    if (task.structural || ABSENSI_IDS.has(task.id) || task.noCheck) return null;
    // Penugasan khusus: hanya orang yang ditugaskan yang bisa centang
    if (task.assigned_to_email && task.assigned_to_email !== user?.email) {
      return { type: "assigned", name: task.assigned_to_name || task.assigned_to_email };
    }
    // Task "bersama": cek DB apakah sudah dikerjakan orang lain hari ini
    const scope = task.task_scope || "bersama";
    if (scope === "bersama") {
      try {
        const existing = await base44.entities.MaintenanceLog.filter({
          item_id: task.id, period_key: today, is_done: true,
        });
        const byOther = existing.find(l => l.done_by_email !== user?.email && !l.is_test_data);
        if (byOther) {
          return { type: "done", name: byOther.done_by || "karyawan lain", time: byOther.done_at || "" };
        }
      } catch { /* jika query gagal, izinkan simpan */ }
    }
    return null;
  };

  // ── Handlers ──
  const handleCheck = async (task) => {
    if (task.noCheck || ABSENSI_IDS.has(task.id)) return false;
    if (savingId) return false; // anti double-tap

    const alreadyDone = checkedIds.has(task.id);

    if (alreadyDone) {
      // Uncheck - hapus log
      setCheckedIds(p => { const n = new Set(p); n.delete(task.id); return n; });
      setSavingId(task.id);
      try {
        const existing = myLogs.find(l => l.item_id === task.id);
        if (existing) await base44.entities.MaintenanceLog.delete(existing.id);
        refetchLogs();
        return true;
      } catch {
        setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
        return false;
      } finally {
        setSavingId(null);
      }
    }

    // ANTI-DOBEL: jika sudah ada log milik user untuk item_id ini hari ini
    if (existingLogItemIds.has(task.id)) {
      setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
      return true;
    }

    // ── CEK PENGUNCIAN SAAT AKAN SIMPAN ──
    setSavingId(task.id);
    try {
      const lock = await checkTaskLock(task);
      if (lock) {
        // sudah dikerjakan/ditugaskan rekan — ditampilkan sebagai selesai di baris, jangan simpan & jangan tolak dengan error
        refetchAllLogs();
        refetchLogs();
        return true;
      }

      // Simpan
      setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
      await base44.entities.MaintenanceLog.create({
        check_key: `${user.email}__tugas__${task.id}__${today}`,
        enclosure_id: "tugas_harian", enclosure_name: "Tugas Harian",
        freq: "harian", item_id: task.id, item_label: task.label,
        period_key: today, is_done: true,
        done_at: format(new Date(), "HH:mm"),
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: task.points || 0,
        ...testTag,
      });
      registerCheckTime();
      refetchLogs();
      return true;
    } catch {
      setCheckedIds(p => { const n = new Set(p); n.delete(task.id); return n; });
      return false;
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
      markPhotoSaved(taskId);
    } catch {}
    setUploadingPhotoId(null);
  };

  const handlePhotoNotes = async (taskId, photoNotes) => {
    const existing = myLogs.find(l => l.item_id === taskId);
    if (!existing) return;
    try {
      await base44.entities.MaintenanceLog.update(existing.id, { notes: photoNotes });
      syncPhotoToChecklist({
        employeeEmail: user.email, date: today,
        taskTitle: existing.item_label, enclosure: existing.enclosure_name || "Tugas Harian",
        photoNotes,
      });
    } catch {}
  };

  const handlePhotoCheck = async (task, file) => {
    if (savingId) return false;
    setSavingId(task.id);
    try {
      // ── CEK PENGUNCIAN SEBELUM SIMPAN ──
      const lock = await checkTaskLock(task);
      if (lock) {
        refetchAllLogs();
        refetchLogs();
        return true;
      }

      const compressed = await compressImage(file);
      if (!compressed) return false;
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      const takenAt = format(new Date(), "HH:mm");
      const existing = myLogs.find(l => l.item_id === task.id);
      if (existing) {
        // Ganti foto bukti (tugas sudah dicentang sebelumnya) — perbarui tautan, jangan buat log dobel
        await base44.entities.MaintenanceLog.update(existing.id, { photo_url: file_url });
      } else {
        await base44.entities.MaintenanceLog.create({
          check_key: `${user.email}__tugas__${task.id}__${today}`,
          enclosure_id: "tugas_harian", enclosure_name: "Tugas Harian",
          freq: "harian", item_id: task.id, item_label: task.label,
          period_key: today, is_done: true,
          done_at: takenAt,
          done_by: user.full_name || user.email,
          done_by_email: user.email,
          poin_earned: task.points || 0,
          ...testTag,
          photo_url: file_url,
        });
        registerCheckTime();
      }
      setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
      refetchLogs();
      markPhotoSaved(task.id);
      syncPhotoToChecklist({
        employeeEmail: user.email, date: today,
        taskTitle: task.label, enclosure: "Tugas Harian",
        photoUrl: file_url, takenAt,
      });

      // ── BACKGROUND: AI Vision + deteksi foto lama (non-blocking, jangan tunggu keeper) ──
      const ageInfo = detectPhotoAge(file);
      const deadlineTime = task.waktu?.startsWith("≤ ") ? task.waktu.replace("≤ ", "") : null;
      const timeWarning = checkDeadlineTime(deadlineTime, new Date());
      runPhotoVerificationInBackground({
        photoUrl: file_url, task, user, today,
        ageWarning: ageInfo.warning || "",
        timeWarning: timeWarning || "",
        onSuggestionReady: (result) => {
          if (!aiSaranEnabled) return;
          if (result.keyakinan >= 60 && (result.apresiasi || result.saran)) {
            toast("💬 Catatan baru untuk kamu", {
              description: result.apresiasi || result.saran,
            });
          }
        },
      });
      return true;
    } catch {
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const handleUkurSubmit = async ({ weight_grams, length_cm }) => {
    if (!ukurTarget || savingId) return;
    const task = ukurTarget;
    setSavingId(task.id);
    try {
      // ── CEK PENGUNCIAN SEBELUM SIMPAN ──
      const lock = await checkTaskLock(task);
      if (lock) {
        refetchAllLogs();
        refetchLogs();
        setUkurTarget(null);
        return;
      }

      // 1. Simpan MeasurementHistory (trigger onMeasurementSaved → update Tortoise otomatis)
      await base44.entities.MeasurementHistory.create({
        tortoise_id: task.tortoiseId,
        tortoise_name: task.tortoiseName || task.tortoiseCode,
        date: today,
        weight_grams,
        shell_length_cm: length_cm,
        measured_by: user.full_name || user.email,
        notes: "Rotasi otomatis timbang & ukur",
        ...testTag,
      });
      // 2. Buat MaintenanceLog (centang)
      if (!existingLogItemIds.has(task.id)) {
        await base44.entities.MaintenanceLog.create({
          check_key: `${user.email}__tugas__${task.id}__${today}`,
          enclosure_id: "tugas_harian", enclosure_name: "Tugas Harian",
          freq: "harian", item_id: task.id, item_label: task.label,
          period_key: today, is_done: true,
          done_at: format(new Date(), "HH:mm"),
          done_by: user.full_name || user.email,
          done_by_email: user.email,
          poin_earned: task.points || 0,
          ...testTag,
        });
        registerCheckTime();
      }
      setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
      refetchLogs();
      setUkurTarget(null);
    } catch {
      // error — biarkan dialog terbuka, user bisa retry
    } finally {
      setSavingId(null);
    }
  };

  // ── Selesai & centang task "Timbang semua baby" ──
  const handleTimbangBabyDone = async () => {
    const task = timbangBabyTask;
    if (!task || savingId) return;
    setSavingId(task.id);
    try {
      const lock = await checkTaskLock(task);
      if (lock) {
        refetchAllLogs();
        refetchLogs();
        setTimbangBabyTask(null);
        return;
      }
      if (!existingLogItemIds.has(task.id)) {
        await base44.entities.MaintenanceLog.create({
          check_key: `${user.email}__tugas__${task.id}__${today}`,
          enclosure_id: "tugas_harian", enclosure_name: "Tugas Harian",
          freq: "harian", item_id: task.id, item_label: task.label,
          period_key: today, is_done: true,
          done_at: format(new Date(), "HH:mm"),
          done_by: user.full_name || user.email,
          done_by_email: user.email,
          poin_earned: task.points || 0,
          ...testTag,
        });
        registerCheckTime();
      }
      setCheckedIds(p => { const n = new Set(p); n.add(task.id); return n; });
      refetchLogs();
      setTimbangBabyTask(null);
      qc.invalidateQueries({ queryKey: ["tortoises-timbang-reminder"] });
      qc.invalidateQueries({ queryKey: ["tortoises-lineage"] });
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
      <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-foreground">📋 Tugas Hari Ini — {isMinggu ? "Minggu" : "Senin–Sabtu"}</p>
            <p className="text-xs text-muted-foreground capitalize">{todayLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-700">{progressPct}%</p>
            <p className="text-xs text-muted-foreground">{doneProgress}/{totalProgress} selesai</p>
            <p className="text-xs font-bold text-amber-600 flex items-center gap-0.5 justify-end mt-0.5">
              <Star className="w-3 h-3 fill-current" />{myLogs.reduce((s, l) => s + (l.poin_earned || 0), 0)} poin
            </p>
          </div>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: progressPct === 100 ? "#16a34a" : "linear-gradient(90deg,#4ade80,#16a34a)" }} />
        </div>
        {progressPct === 100 && <p className="text-center text-sm font-bold text-green-700 mt-2">🏆 Semua tugas selesai!</p>}

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Memuat..." : "Refresh"}
          </button>
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

      {isOwnerTestSave && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 flex items-center gap-2.5">
          <span className="text-lg">🧪</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Mode Uji Keeper aktif</p>
            <p className="text-xs text-amber-700">Tugas yang Anda kerjakan tersimpan sebagai <strong>data test</strong> — tidak masuk laporan atau hitung poin asli.</p>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {allTasks.map((task, idx) => {
          if (task.isKebersihanIntro) {
            return (
              <div key={task.id} className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-3.5 flex items-center gap-3 shadow-sm">
                <span className="text-lg flex-shrink-0 leading-none">🏠</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{task.label}</p>
                    {task.require_photo && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600"><Camera className="w-3 h-3" /> Wajib Foto</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600"><Clock className="w-3 h-3" /> Jeda 60 dtk</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{kebersihanProgress.done} dari {kebersihanProgress.total} kandang selesai</p>
                  <div className="w-full h-1.5 bg-blue-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${kebersihanProgress.total ? (kebersihanProgress.done / kebersihanProgress.total) * 100 : 0}%` }} />
                  </div>
                </div>
                <button onClick={() => navigate("/")} className="flex-shrink-0 text-xs font-bold px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all">Buka layar Kandang →</button>
              </div>
            );
          }
          return (
          <TaskRow
            key={task.id}
            task={task}
            idx={idx}
            getCooldownRemaining={getCooldownRemaining}
            isChecked={ABSENSI_IDS.has(task.id) ? (task.id === "abs_masuk" ? absChecked.abs_masuk : absChecked.abs_pulang) : checkedIds.has(task.id)}
            lockedInfo={
              ABSENSI_IDS.has(task.id) || task.noCheck
                ? null
                : (task.assigned_to_email && task.assigned_to_email !== user?.email)
                  ? { kind: "assigned", name: task.assigned_to_name || task.assigned_to_email }
                  : ((task.task_scope || "bersama") === "pribadi"
                      ? null
                      : (doneByOtherMap[task.id] ? { kind: "done", name: doneByOtherMap[task.id].name, time: doneByOtherMap[task.id].time } : null))
            }
            isAbsensi={ABSENSI_IDS.has(task.id)}
            isSaving={savingId === task.id}
            attendance={attendance}
            photoUrl={photoMap[task.id]}
            uploadingPhoto={uploadingPhotoId === task.id}
            photoSaved={photoSavedIds.has(task.id)}
            teamWho={showTeam ? (teamCheckMap[task.id] || []) : []}
            showTeam={showTeam}
            requirePhoto={task.require_photo}
            isUkurRotasi={task.isUkurRotasi}
            isTimbangBaby={task.isTimbangBaby}
            onCheck={() => handleCheck(task)}
            onUkurCheck={() => setUkurTarget(task)}
            onTimbangBabyCheck={() => setTimbangBabyTask(task)}
            onPhotoUpload={(file) => handlePhotoUpload(task.id, file)}
            onPhotoCheck={(file) => handlePhotoCheck(task, file)}
            onPhotoNotes={(notes) => handlePhotoNotes(task.id, notes)}
            photoNotes={photoNotesMap[task.id] || ""}
            aiSaran={aiSaranMap[(task.label || "").trim().toLowerCase()]}
            aiSaranEnabled={aiSaranEnabled}
          />
          );
        })}
        {sopTaskItems.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-6">
            Belum ada SOPTask aktif untuk hari ini. Tambah/aktifkan task di menu SOP.
          </div>
        )}
      </div>

      {/* Extra Tasks */}
      {extraTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">Pekerjaan Tambahan</p>
          {extraTasks.map(log => (
            <ExtraTaskRow key={log.id} log={log} showTeamView={showTeamView} user={user} onApprove={handleApproveExtra} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="rounded-2xl border border-gray-100 bg-card shadow-sm p-3 text-xs text-muted-foreground text-center">
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

      <UkurFormDialog
        open={!!ukurTarget}
        tortoise={ukurTarget ? { code: ukurTarget.tortoiseCode, enclosure: ukurTarget.tortoiseEnclosure } : null}
        saving={savingId === ukurTarget?.id}
        onClose={() => setUkurTarget(null)}
        onSubmit={handleUkurSubmit}
      />

      <TimbangBabyDialog
        open={!!timbangBabyTask}
        task={timbangBabyTask}
        user={user}
        today={today}
        babies={babyTortoises}
        isTestData={isOwnerTestSave}
        saving={savingId === timbangBabyTask?.id}
        onClose={() => setTimbangBabyTask(null)}
        onDone={handleTimbangBabyDone}
      />
    </div>
  );
}

// ── Task Row Component (sederhana, tanpa lock UI) ──
function TaskRow({ task, idx, isChecked, lockedInfo, isAbsensi, isSaving, attendance, photoUrl, uploadingPhoto, photoSaved, teamWho, showTeam, requirePhoto, isUkurRotasi, isTimbangBaby, onCheck, onUkurCheck, onTimbangBabyCheck, onPhotoUpload, onPhotoCheck, onPhotoNotes, photoNotes, aiSaran, aiSaranEnabled, getCooldownRemaining }) {
  const isIstirahat = task.noCheck;
  const poin = task.points || 0;
  const cameraRef = useRef(null);
  const photoReceivedRef = useRef(false); // deteksi batal ambil foto kamera
  const [showPhoto, setShowPhoto] = useState(false);
  const [notice, setNotice] = useState(null); // keterangan tertempel di kartu ≥5 dtk
  const [pulse, setPulse] = useState(false); // penegasan singkat saat menekan kartu yang sudah dikerjakan
  const [saveError, setSaveError] = useState(false); // gagal simpan → tombol Coba Lagi
  const [cooldownLeft, setCooldownLeft] = useState(0); // hitungan mundur jeda antar tugas
  const noticeTimer = useRef(null);
  const cooldownTimer = useRef(null);

  // Hitungan mundur jeda — menetap di kartu sampai habis
  const startCooldownNotice = (secs) => {
    setCooldownLeft(secs);
    setSaveError(false);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldownLeft(s => {
        if (s <= 1) { clearInterval(cooldownTimer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };
  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);
  const isLocked = !!lockedInfo;
  const lockedLabel = lockedInfo
    ? (lockedInfo.kind === "done"
        ? `Sudah dikerjakan ${lockedInfo.name}${lockedInfo.time ? ` jam ${lockedInfo.time}` : ""}`
        : `Ditugaskan ke ${lockedInfo.name}`)
    : "";

  const showNotice = (text) => {
    setNotice({ text, id: Date.now() });
    setSaveError(false);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  };

  const openCameraForTask = () => {
    photoReceivedRef.current = false;
    const onWinFocus = () => {
      window.removeEventListener('focus', onWinFocus);
      setTimeout(() => {
        if (!photoReceivedRef.current) {
          showNotice("Foto belum diambil. Tugas ini wajib foto sebelum bisa dicentang. Ketuk tombol kamera untuk mencoba lagi.");
        }
      }, 600);
    };
    window.addEventListener('focus', onWinFocus);
    cameraRef.current?.click();
  };

  const handleClick = async () => {
    // Tidak ada penolakan diam — setiap kasus memunculkan keterangan tertempel di kartu
    if (isAbsensi) { showNotice("Absen dilakukan lewat tombol Check In / Check Out di bagian atas halaman, bukan dari daftar ini."); return; }
    if (isIstirahat) { showNotice("Ini baris penanda waktu istirahat, bukan tugas yang perlu dicentang."); return; }
    if (isSaving) { showNotice("Sedang menyimpan, tunggu sebentar..."); return; }
    if (isLocked) {
      // Penegasan singkat: kedipkan keterangan "sudah dikerjakan" sesaat
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
      return;
    }
    // Jeda minimum 60 detik antar tugas — kecuali uncheck (isChecked) / absensi / istirahat
    if (!isChecked) {
      const remaining = getCooldownRemaining ? getCooldownRemaining() : 0;
      if (remaining > 0) { startCooldownNotice(remaining); return; }
    }
    // A9 — bahan yang dibutuhkan task ini sedang habis. Menolak di sini lebih
    // jujur daripada membiarkan dicentang lalu poinnya dipersoalkan belakangan.
    if (task.terkunci_bahan && !isChecked) {
      showNotice(
        `Tugas ini belum bisa dikerjakan hari ini — ${task.terkunci_alasan || "bahan yang dibutuhkan habis"}. ` +
        `Bukan salah kamu, dan poinnya tidak hangus: begitu bahannya ada, tugas ini terbuka lagi sendiri.`
      );
      return;
    }
    if (saveError) setSaveError(false);
    if (isTimbangBaby && !isChecked) { onTimbangBabyCheck(); return; }
    if (isUkurRotasi && !isChecked) { onUkurCheck(); return; }
    if (requirePhoto && !isChecked) {
      openCameraForTask();
      return;
    }
    const ok = await onCheck();
    if (!ok) setSaveError(true);
  };

  const retryCheck = async () => {
    setSaveError(false);
    const remaining = getCooldownRemaining ? getCooldownRemaining() : 0;
    if (remaining > 0) { startCooldownNotice(remaining); return; }
    if (requirePhoto) { openCameraForTask(); return; }
    const ok = await onCheck();
    if (!ok) setSaveError(true);
  };

  return (
    <div className={`rounded-2xl border-2 transition-all ${
      isIstirahat ? "border-gray-100 bg-muted opacity-60"
      : isLocked ? "border-border bg-muted"
      : isChecked ? "border-green-300 bg-green-50"
      : task.terlambat ? "border-red-300 bg-red-50"
      : "border-gray-100 bg-card"
    } shadow-sm`}>
      <div className={`flex items-start gap-3 p-3.5 ${!isIstirahat && !isAbsensi && !isLocked ? "cursor-pointer active:scale-[0.99]" : ""}`} onClick={handleClick}>
        <span className="text-xs font-bold text-muted-foreground w-5 text-center pt-0.5 flex-shrink-0">{idx + 1}</span>
        <span className="text-lg flex-shrink-0 leading-none">{task.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${isChecked || isLocked ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.label}</p>
            {requirePhoto && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">📷 Wajib Foto</span>
            )}
            {task.terlambat && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white flex-shrink-0 animate-pulse">⏰ Terlambat</span>
            )}
            {task.badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${task.badgeColor}`}>{task.badge}</span>}
            {!isIstirahat && !isAbsensi && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">+{poin} poin</span>
            )}
            {!isIstirahat && !isAbsensi && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0 inline-flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> Jeda 60 dtk
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {task.waktu}</span>
            {task.keterangan && <span className="text-xs text-muted-foreground">· {task.keterangan}</span>}
          </div>

          {isLocked && (
            <p className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${pulse ? "text-blue-700 scale-[1.02]" : "text-muted-foreground"} transition-all`}>
              <CheckCircle2 className={`w-3 h-3 ${pulse ? "text-blue-500" : "text-muted-foreground"}`} /> {lockedLabel}
            </p>
          )}

          {isAbsensi && (
            <p className="text-xs mt-1 font-medium">
              {task.id === "abs_masuk"
                ? attendance?.check_in ? <span className="text-green-600">✓ Masuk {attendance.check_in}</span> : <span className="text-muted-foreground">Belum check in</span>
                : attendance?.check_out ? <span className="text-green-600">✓ Pulang {attendance.check_out}</span> : <span className="text-muted-foreground">Belum check out</span>
              }
            </p>
          )}

          {/* Keterangan tertempel (absensi/istirahat/sedang-menyimpan/foto-batal) — menetap ≥5 dtk, bukan toast sekilas */}
          {notice && (
            <div className="mt-1.5 p-2 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-1.5 animate-fade-in">
              <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-blue-700 leading-snug">{notice.text}</p>
            </div>
          )}

          {/* Jeda antar tugas — hitungan mundur yang menetap di kartu sampai habis */}
          {cooldownLeft > 0 && (
            <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-300 flex items-start gap-1.5 animate-fade-in">
              <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
              <p className="text-[11px] font-semibold text-amber-700 leading-snug">
                Tunggu <span className="text-amber-800">{cooldownLeft} detik</span> lagi. Satu tugas butuh waktu untuk dikerjakan.
              </p>
            </div>
          )}

          {/* Gagal simpan (sinyal buruk/error jaringan) → keterangan + tombol Coba Lagi */}
          {saveError && (
            <div className="mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 animate-fade-in">
              <p className="text-[11px] font-medium text-red-700 leading-snug flex-1">Gagal menyimpan — cek sinyal, lalu coba lagi.</p>
              <button onClick={(e) => { e.stopPropagation(); retryCheck(); }} className="flex-shrink-0 text-[11px] font-bold text-red-700 bg-card border border-red-300 rounded-lg px-2.5 py-1 active:scale-95 transition-all flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Coba Lagi
              </button>
            </div>
          )}

          {/* Photo thumbnail — clickable to enlarge */}
          {photoUrl && (
            <div className="mt-1.5 flex items-start gap-2" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPhoto(true)} className="block flex-shrink-0">
                <img src={photoUrl} alt="Dokumentasi" className="w-16 h-12 rounded-lg object-cover border border-green-200 hover:opacity-80 transition-opacity" />
              </button>
              <input
                type="text"
                placeholder="Catatan foto (opsional)..."
                defaultValue={photoNotes}
                onBlur={e => { if (e.target.value !== photoNotes) onPhotoNotes(e.target.value); }}
                className="flex-1 min-w-0 h-8 text-xs rounded-lg border border-border px-2 bg-muted/50 focus:bg-card focus:border-blue-300 outline-none"
              />
            </div>
          )}
          {showPhoto && (
            <PhotoPreviewModal open={showPhoto} onClose={() => setShowPhoto(false)} photoUrl={photoUrl} taskTitle={task.label} />
          )}

          {/* Umpan balik visual foto: menyimpan / tersimpan */}
          {(uploadingPhoto || (isSaving && requirePhoto && !isChecked)) && (
            <p className="mt-1 text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan foto...
            </p>
          )}
          {photoSaved && (
            <p className="mt-1 text-[11px] text-green-600 font-semibold flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3 h-3" /> Foto tersimpan ✓
            </p>
          )}

          {/* AI Catatan untuk keeper — apresiasi + saran (bukan penilaian teknis) */}
          <AICatatanCard aiSaran={aiSaran} enabled={aiSaranEnabled} />

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
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {/* Tombol kamera jelas terlihat untuk tugas wajib foto — terpisah dari area centang */}
          {requirePhoto && !isIstirahat && !isAbsensi && !isLocked && (
            <button
              onClick={(e) => { e.stopPropagation(); openCameraForTask(); }}
              disabled={isSaving || uploadingPhoto}
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${
                isChecked ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                : "border-red-300 text-red-600 bg-red-50 hover:bg-red-100"
              }`}
            >
              {(uploadingPhoto || (isSaving && requirePhoto)) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {isChecked ? "Ganti" : "Foto"}
            </button>
          )}
          {/* Optional photo button (non-require_photo, checked, no photo yet) — camera or gallery */}
          {!requirePhoto && !isIstirahat && !isAbsensi && !isLocked && isChecked && !photoUrl && (
            <label className={`w-7 h-7 rounded-xl border-2 border-border flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all ${uploadingPhoto ? "opacity-50" : ""}`}>
              {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" /> : <Camera className="w-3.5 h-3.5 text-muted-foreground" />}
              <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) onPhotoUpload(e.target.files[0]); e.target.value = ""; }} className="hidden" />
            </label>
          )}

          {/* Checkbox */}
          {!isIstirahat && (
            <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
              isChecked || isLocked ? "bg-green-500 border-green-500"
              : isAbsensi ? "border-border bg-muted"
              : requirePhoto ? "border-red-300 hover:border-red-400"
              : "border-border hover:border-green-400"
            } ${(isSaving || isLocked) ? "opacity-60" : ""}`} onClick={e => { e.stopPropagation(); if (!isIstirahat && !isAbsensi && !isSaving && !isLocked) handleClick(); }}>
              {(isChecked || isLocked) ? <CheckCircle2 className="w-4 h-4 text-white" /> : null}
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
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          photoReceivedRef.current = true; // kamera ditutup DENGAN foto → fokus handler tidak akan salah baca
          const ok = await onPhotoCheck(f);
          if (!ok) setSaveError(true);
        }}
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
              <p className="text-sm font-semibold text-foreground">{log.item_label}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Tambahan</span>
              {isApproved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Approved +{log.poin_earned}p</span>}
              {isPending && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Menunggu Approval</span>}
            </div>
            {log.extra_description && <p className="text-xs text-muted-foreground mt-0.5">{log.extra_description}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">oleh {log.done_by} · {log.done_at}</p>
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
            <input type="number" value={poinInput} onChange={e => setPoinInput(e.target.value)} className="w-16 h-8 rounded-lg border border-border text-center text-sm" min="0" max="100" />
            <span className="text-xs text-muted-foreground">poin</span>
            <button onClick={() => onApprove(log, parseInt(poinInput) || 0)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">
              <Check className="w-3 h-3" /> Approve
            </button>
            <button onClick={() => onApprove(log, 0)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-foreground text-xs font-bold rounded-lg hover:bg-gray-300">
              <X className="w-3 h-3" /> Tolak
            </button>
          </div>
        )}
      </div>
    </div>
  );
}