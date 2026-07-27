import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  MapPin, Leaf, Heart, LogOut, CheckCircle2, AlertTriangle,
  Smile, Star, Bell, X, Package, ChevronDown, ChevronUp, ClipboardList, Lock
} from "lucide-react";
import { getCurrentPosition, haversineDistance, calcOvertimeHours } from "@/components/attendance/useGPSLocation";
import WidgetErrorBoundary from "./WidgetErrorBoundary";
import TugasHariIni from "@/components/sop/TugasHariIni";
import IncidentalTaskList from "@/components/incidental/IncidentalTaskList";
import SelfieCaptureDialog from "@/components/common/SelfieCaptureDialog";
import SickTortoisePicker from "@/components/health/SickTortoisePicker";
import CareTaskSuggestionPanel from "@/components/health/CareTaskSuggestionPanel";
import { compressImage } from "@/lib/useImageCompression";
import { syncPhotoToChecklist } from "@/lib/syncPhotoToChecklist";

// ── Helpers ────────────────────────────────────────────────────────────
function nowStr() { return format(new Date(), "HH:mm"); }

// Retry dengan jeda eksponensial untuk error 429
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      const is429 = e?.message?.includes("429") || e?.status === 429 || e?.response?.status === 429;
      if (is429 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1))); // 2s, 4s, 6s
        continue;
      }
      throw e;
    }
  }
}

function getSalam() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function workDuration(checkIn) {
  if (!checkIn) return null;
  const [h, m] = checkIn.split(":").map(Number);
  const start = new Date(); start.setHours(h, m, 0, 0);
  const diff = Math.floor((new Date() - start) / 60000);
  if (diff < 60) return `${diff} menit`;
  return `${Math.floor(diff / 60)} jam ${diff % 60} menit`;
}

const KANDANG_LIST = [
  "W1","W2","W3","W4","W5",
  "E1","E2","E3","E4","E5",
  "N1","N2","N3","L1","L2",
];

const GEJALA_LIST = [
  { id: "tidak_makan",  label: "Tidak mau makan",  icon: "🍃" },
  { id: "kaki_bengkak", label: "Kaki bengkak",      icon: "🦶" },
  { id: "ada_luka",     label: "Ada luka",           icon: "🩹" },
  { id: "kurang_gerak", label: "Kurang gerak",       icon: "💤" },
  { id: "mata",         label: "Mata bermasalah",    icon: "👁️" },
  { id: "lainnya",      label: "Lainnya",            icon: "❓" },
];

const SEVERITIES = [
  { value: "ringan", label: "🟡 Ringan" },
  { value: "sedang", label: "🟠 Sedang" },
  { value: "berat",  label: "🔴 Berat" },
  { value: "kritis", label: "🚨 Kritis" },
];

const TRIGGER_SEVERITIES = ["sedang", "berat", "kritis"];

// ── Poin flash animation ──────────────────────────────────────────────
function PoinFlash({ poin }) {
  return (
    <span className="inline-block animate-bounce text-green-600 font-bold text-sm ml-1">
      +{poin} poin!
    </span>
  );
}

// ── Widget wrapper ────────────────────────────────────────────────────
function Widget({ children, done = false, className = "" }) {
  return (
    <div className={`rounded-2xl border-2 transition-all ${done ? "border-green-300 bg-green-50" : "border-gray-100 bg-white"} shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function GuidedHariIni({ user }) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  // ── Local state ──
  const [kandangDone, setKandangDone]   = useState(new Set());
  const [kandangSaved, setKandangSaved] = useState(new Set()); // already persisted
  const [kondisiOk, setKondisiOk]       = useState(null);
  const [sakitForm, setSakitForm]       = useState({ kura: "", diagnosis: [], severity: "", description: "" });
  const [savedSakit, setSavedSakit]     = useState(null);
  const [sakitReports, setSakitReports] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState(null);
  const [poinFlash, setPoinFlash]       = useState(null); // { label, poin }
  const [showSakitForm, setShowSakitForm] = useState(false);
  const [catatan, setCatatan]           = useState("");
  const [showCatatan, setShowCatatan]   = useState(false);
  const [showSelfie, setShowSelfie]     = useState(false);
  const [selfieMode, setSelfieMode]     = useState(null); // "checkin" | "checkout"

  // ── Queries — diberi jeda & staleTime panjang ──
  const { data: attendance } = useQuery({
    queryKey: ["attendance-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.Attendance.filter({ employee_email: user.email, date: today });
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // 5 menit, bukan 30 detik
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: salaryConfig } = useQuery({
    queryKey: ["salary-config", user?.role],
    queryFn: async () => {
      const res = await base44.entities.SalaryConfig.filter({ role: user?.role });
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
  });

  // Tortoise dimuat lazy via backend function (bypass RLS — semua role bisa baca)
  const {
    data: tortoises = [],
    isLoading: tortoisesLoading,
    error: tortoisesError,
    refetch: refetchTortoises,
  } = useQuery({
    queryKey: ["active-tortoises-picker"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getActiveTortoisesForPicker");
      return res.data?.tortoises || [];
    },
    enabled: showSakitForm,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: maintenanceLogs = [], refetch: refetchML } = useQuery({
    queryKey: ["maintenance-today", user?.email, today],
    queryFn: async () => base44.entities.MaintenanceLog.filter({ done_by_email: user.email, period_key: today }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  // Semua log kebersihan hari ini (semua karyawan) — untuk penguncian per-kandang
  const { data: allKebersihanLogs = [] } = useQuery({
    queryKey: ["kebersihan-all-logs", today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ period_key: today, item_id: "kebersihan" }),
    staleTime: 30 * 1000,
  });
  const allKandangDoneMap = useMemo(() => {
    const m = {};
    allKebersihanLogs.forEach(l => {
      if (l.enclosure_id && l.is_done !== false) {
        m[l.enclosure_id] = { done_by: l.done_by, done_at: l.done_at, done_by_email: l.done_by_email };
      }
    });
    return m;
  }, [allKebersihanLogs]);

  const { data: treatmentSchedules = [] } = useQuery({
    queryKey: ["treatment-schedules-active"],
    queryFn: () => base44.entities.TreatmentSchedule.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: diagnosisProtocols = [] } = useQuery({
    queryKey: ["diagnosis-protocols"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  // Notifikasi kritis: pakai cache dari NotificationBell, jangan query sendiri
  // Gunakan data yang sudah ada di queryClient dari "notifications"
  const kritisNotifs = [];  // widget darurat tidak perlu query notif sendiri
  const refetchNotifs = () => {};

  // HealthRecord: load lazy, hanya saat widget darurat diperlukan
  const { data: sickTortoises = [] } = useQuery({
    queryKey: ["sick-tortoises-today"],
    queryFn: async () => {
      const hrs = await base44.entities.HealthRecord.list("-date", 10); // limit 10
      return hrs.filter(h => h.date === today && h.type === "sakit");
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: false, // matikan auto-refresh
  });

  // Sync kandang done dari maintenance logs (restore state setelah reload)
  useEffect(() => {
    if (maintenanceLogs.length > 0) {
      const saved = new Set(maintenanceLogs.map(l => l.enclosure_id));
      setKandangDone(saved);
      setKandangSaved(saved);
    }
  }, [maintenanceLogs.length]);

  // Derived
  const hasCheckedIn  = !!attendance?.check_in;
  const hasCheckedOut = !!attendance?.check_out;
  const farmLat    = settings?.farm_lat;
  const farmLng    = settings?.farm_lng;
  const farmRadius = settings?.farm_location_radius || 200;
  const farmConfigured = !!(farmLat && farmLng);

  // Suplemen dari TreatmentSchedule (sumber tunggal — TugasHariIni tidak injeksi treatment)
  const todayDayOfWeek = new Date().getDay();
  const { data: babyCount = 0 } = useQuery({
    queryKey: ["baby-count-active"],
    queryFn: async () => {
      const res = await base44.entities.Tortoise.filter({ status: "baby" });
      return res.length;
    },
    staleTime: 5 * 60 * 1000,
  });
  const supplemenHariIni = treatmentSchedules.filter(ts => {
    if (!ts.is_active) return false;
    if (ts.frequency === "harian") return true;
    if (ts.frequency === "mingguan" && Array.isArray(ts.weekly_days)) {
      return ts.weekly_days.includes(todayDayOfWeek);
    }
    return false;
  }).filter(ts => {
    // ATURAN JEMUR: hanya muncul jika ada kura aktif kategori baby
    const isJemur = (ts.title || "").toLowerCase().includes("jemur");
    if (isJemur && babyCount === 0) return false;
    return true;
  });

  const flashPoin = (label, poin) => {
    setPoinFlash({ label, poin });
    setTimeout(() => setPoinFlash(null), 2000);
  };

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  // ── HANDLERS ──

  const startCheckIn = () => { setSelfieMode("checkin"); setShowSelfie(true); };

  const handleCheckIn = async (selfieUrl) => {
    if (hasCheckedIn) return;
    setLoading(true);
    let lat = null, lng = null, verified = false;
    try {
      const pos = await getCurrentPosition();
      lat = pos.lat; lng = pos.lng;
      if (farmConfigured) {
        const dist = Math.round(haversineDistance(lat, lng, farmLat, farmLng));
        verified = dist <= farmRadius;
        if (!verified) showMsg("warn", `Kamu ${dist}m dari kandang. Check in tercatat tapi lokasi di luar area.`);
      }
    } catch {
      showMsg("warn", "Tidak bisa dapat lokasi GPS. Izinkan akses lokasi di HP kamu.");
    }
    await base44.entities.Attendance.create({
      employee_id: user.id,
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      date: today,
      check_in: nowStr(),
      status: "hadir",
      check_in_lat: lat, check_in_lng: lng,
      location_verified: verified,
      shift_start: salaryConfig?.shift_start || "08:00",
      shift_end: salaryConfig?.shift_end || "16:00",
      selfie_checkin_url: selfieUrl || "",
    });
    qc.invalidateQueries({ queryKey: ["attendance-today"] });
    flashPoin("Check in", 5);
    setLoading(false);
  };

  const startCheckOut = () => { setSelfieMode("checkout"); setShowSelfie(true); };

  const handleCheckOut = async (selfieUrl) => {
    if (hasCheckedOut || !attendance) return;
    setLoading(true);
    if (farmConfigured) {
      let pos;
      try { pos = await getCurrentPosition(); }
      catch {
        showMsg("error", "Izinkan akses lokasi di HP kamu dulu ya.");
        setLoading(false); return;
      }
      const dist = Math.round(haversineDistance(pos.lat, pos.lng, farmLat, farmLng));
      if (dist > farmRadius) {
        showMsg("error", `Kamu masih ${dist}m dari kandang. Harus di lokasi kandang untuk check out.`);
        setLoading(false); return;
      }
      const checkoutTime = nowStr();
      const shiftEnd = attendance.shift_end || salaryConfig?.shift_end || "16:00";
      const ot = calcOvertimeHours(checkoutTime, shiftEnd);
      await base44.entities.Attendance.update(attendance.id, {
        check_out: checkoutTime,
        check_out_lat: pos.lat, check_out_lng: pos.lng,
        overtime_hours: ot,
        selfie_checkout_url: selfieUrl || "",
      });
      if (ot > 0) {
        await base44.entities.OvertimeLog.create({
          employee_name: attendance.employee_name,
          employee_email: attendance.employee_email,
          date: today, hours: ot,
          notes: `Lembur otomatis dari checkout ${checkoutTime}`,
        });
      }
    } else {
      const checkoutTime = nowStr();
      const shiftEnd = attendance.shift_end || salaryConfig?.shift_end || "16:00";
      const ot = calcOvertimeHours(checkoutTime, shiftEnd);
      await base44.entities.Attendance.update(attendance.id, {
        check_out: checkoutTime, overtime_hours: ot,
        selfie_checkout_url: selfieUrl || "",
      });
      if (ot > 0) {
        await base44.entities.OvertimeLog.create({
          employee_name: attendance.employee_name,
          employee_email: attendance.employee_email,
          date: today, hours: ot,
          notes: `Lembur otomatis dari checkout ${checkoutTime}`,
        });
      }
    }
    qc.invalidateQueries({ queryKey: ["attendance-today"] });
    showMsg("success", "Check out berhasil! Kerja bagus hari ini.");
    setLoading(false);
  };

  const handleSelfieComplete = (url) => {
    if (selfieMode === "checkin") handleCheckIn(url);
    else if (selfieMode === "checkout") handleCheckOut(url);
    setSelfieMode(null);
  };

  // Poin kebersihan kandang dari SOPTask (dinamis)
  const { data: sopTasksKebersihan = [] } = useQuery({
    queryKey: ["sop-tasks-kebersihan"],
    queryFn: () => base44.entities.SOPTask.filter({ category: "kebersihan" }),
    staleTime: 10 * 60 * 1000,
  });
  const kebersihanAnchor = sopTasksKebersihan.find(t =>
    t.is_active === true && (t.title || "").toLowerCase().includes("all kandang")
  ) || sopTasksKebersihan.find(t => t.is_active === true);
  const poinKebersihan = kebersihanAnchor?.points ?? 5;
  const requirePhotoKebersihan = kebersihanAnchor?.require_photo ?? false;
  const kandangCameraRef = useRef(null);
  const [pendingKandang, setPendingKandang] = useState(null);

  // Poin hari ini (dideklarasikan setelah poinKebersihan)
  const poinKandang = kandangSaved.size * poinKebersihan;
  const poinKura    = sakitReports.length * 15;
  const poinCheckin = hasCheckedIn ? 5 : 0;
  const totalPoin   = poinCheckin + poinKandang + poinKura;

  const handleToggleKandang = async (k) => {
    const alreadySaved = kandangSaved.has(k);
    if (alreadySaved) {
      setKandangDone(p => { const n = new Set(p); n.delete(k); return n; });
      return;
    }
    // VALIDASI PENGEKUNCIAN: cek apakah kandang ini sudah dikerjakan orang lain
    const lockByOther = allKandangDoneMap[k];
    if (lockByOther && lockByOther.done_by_email !== user.email) {
      showMsg("warn", `${k} sudah dibersihkan ${lockByOther.done_by}${lockByOther.done_at ? ` · ${lockByOther.done_at}` : ""}`);
      return;
    }
    // ANTI-DOBEL: cek apakah sudah ada log kebersihan untuk kandang ini hari ini
    const dupLog = maintenanceLogs.find(l => l.enclosure_id === k && l.item_id === "kebersihan" && l.period_key === today);
    if (dupLog) {
      setKandangDone(p => { const n = new Set(p); n.add(k); return n; });
      setKandangSaved(p => { const n = new Set(p); n.add(k); return n; });
      return;
    }
    // Jika kebersihan wajib foto, buka kamera dulu (kamera langsung, anti galeri)
    if (requirePhotoKebersihan) {
      setPendingKandang(k);
      kandangCameraRef.current?.click();
      return;
    }
    await saveKandangDone(k, null);
  };

  const saveKandangDone = async (k, photoUrl) => {
    setKandangDone(p => { const n = new Set(p); n.add(k); return n; });
    try {
      const logData = {
        check_key: `${user.email}__harian__${k}__${today}`,
        enclosure_id: k,
        enclosure_name: k,
        freq: "harian",
        item_id: "kebersihan",
        item_label: `Kebersihan ${k}`,
        period_key: today,
        is_done: true,
        done_at: nowStr(),
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: poinKebersihan,
      };
      if (photoUrl) logData.photo_url = photoUrl;
      await base44.entities.MaintenanceLog.create(logData);
      setKandangSaved(p => { const n = new Set(p); n.add(k); return n; });
      refetchML();
      flashPoin(k, poinKebersihan);
      if (photoUrl) {
        syncPhotoToChecklist({
          employeeEmail: user.email, date: today,
          taskTitle: `Kebersihan ${k}`, enclosure: k,
          photoUrl, takenAt: nowStr(),
        });
      }
    } catch {
      setKandangSaved(p => { const n = new Set(p); n.add(k); return n; });
    } finally {
      setPendingKandang(null);
    }
  };

  const handleKandangPhoto = async (file) => {
    if (!pendingKandang) return;
    const k = pendingKandang;
    try {
      const compressed = await compressImage(file);
      if (!compressed) { setPendingKandang(null); return; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      await saveKandangDone(k, file_url);
    } catch {
      setPendingKandang(null);
    }
  };

  // pakanDone & pakanSaved sekarang dikelola dalam WidgetPakan (self-contained)

  const handleLaporKura = async () => {
    if (!sakitForm.kura || sakitForm.diagnosis.length === 0 || !sakitForm.severity) {
      showMsg("warn", "Pilih kura, diagnosis, dan tingkat keparahan dulu ya.");
      return;
    }
    setLoading(true);
    const kura = tortoises.find(t => t.id === sakitForm.kura);
    const diagNames = sakitForm.diagnosis
      .map(c => diagnosisProtocols.find(p => p.diagnosis_code === c)?.diagnosis_name || c)
      .join(", ");
    await base44.entities.HealthRecord.create({
      tortoise_id: sakitForm.kura,
      tortoise_name: kura?.name || sakitForm.kura,
      date: today,
      type: "sakit",
      diagnosis: sakitForm.diagnosis,
      severity: sakitForm.severity,
      description: `Dilaporkan oleh ${user.full_name || user.email}. Diagnosis: ${diagNames}${sakitForm.description ? `. Catatan: ${sakitForm.description}` : ""}`,
      diagnosis_notes: diagNames,
    });
    // Set is_currently_sick=true pada Tortoise
    try {
      await base44.entities.Tortoise.update(sakitForm.kura, { is_currently_sick: true, status: "sakit" });
    } catch {}
    qc.invalidateQueries({ queryKey: ["health-records"] });
    qc.invalidateQueries({ queryKey: ["sick-tortoises-today"] });
    setSakitReports(p => [...p, kura?.name || sakitForm.kura]);
    flashPoin("Laporan kura", 15);
    // Tampilkan CareTaskSuggestionPanel jika severity sedang/berat/kritis
    if (TRIGGER_SEVERITIES.includes(sakitForm.severity)) {
      setSavedSakit({
        tortoise_name: kura?.name || sakitForm.kura,
        tortoise_code: kura?.code,
        diagnosis: sakitForm.diagnosis,
        severity: sakitForm.severity,
      });
    }
    setSakitForm({ kura: "", diagnosis: [], severity: "", description: "" });
    setShowSakitForm(false);
    setLoading(false);
  };

  const handleSimpanCatatan = async () => {
    if (!catatan.trim()) return;
    setLoading(true);
    const existing = await base44.entities.DailyChecklist.filter({ employee_email: user.email, date: today });
    const note = `[${nowStr()}] ${catatan.trim()}`;
    if (existing[0]) {
      const prev = existing[0].notes ? existing[0].notes + "\n" + note : note;
      await base44.entities.DailyChecklist.update(existing[0].id, { notes: prev });
    } else {
      await base44.entities.DailyChecklist.create({
        employee_email: user.email,
        employee_name: user.full_name || user.email,
        date: today,
        completed_tasks: [],
        status: "draft",
        notes: note,
      });
    }
    setCatatan("");
    setShowCatatan(false);
    showMsg("success", "Catatan tersimpan!");
    setLoading(false);
  };

  const dismissNotif = async (id) => {
    await base44.entities.Notification.update(id, {
      is_dismissed: true, is_read: true, read_at: new Date().toISOString(),
    });
    refetchNotifs();
  };

  // ── RENDER ──────────────────────────────────────────────────────────────
  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: id });

  return (
    <div className="pb-6">
      {/* ── HEADER ── */}
      <div className="bg-green-700 text-white px-5 pt-10 pb-5">
        <p className="text-green-200 text-sm">{getSalam()},</p>
        <h1 className="text-xl font-bold mt-0.5 flex items-center justify-between">
          <span>{user?.full_name?.split(" ")[0] || "Keeper"} 👋</span>
          {totalPoin > 0 && (
            <span className="flex items-center gap-1 bg-green-600/60 px-3 py-1 rounded-full text-sm font-semibold">
              <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" /> {totalPoin} poin
            </span>
          )}
        </h1>
        <p className="text-green-200 text-xs mt-1 capitalize">{todayLabel}</p>
      </div>

      {/* ── POIN FLASH ── */}
      {poinFlash && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-xl text-base font-bold animate-bounce">
          +{poinFlash.poin} poin! 🎉
        </div>
      )}

      {/* ── FEEDBACK MSG ── */}
      {msg && (
        <div className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          msg.type === "success" ? "bg-green-50 border border-green-200 text-green-800" :
          msg.type === "warn"    ? "bg-yellow-50 border border-yellow-200 text-yellow-800" :
          "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {msg.type === "success" ? "✅" : msg.type === "warn" ? "⚠️" : "❌"} {msg.text}
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">

        {/* ══ TUGAS HARI INI — JADWAL KERJA ════════════════════════ */}
        <WidgetErrorBoundary widgetName="Tugas Hari Ini">
          <IncidentalTaskList user={user} />
          <TugasHariIni user={user} showTeamView={false} />
        </WidgetErrorBoundary>

        {/* ══ WIDGET DARURAT ══════════════════════════════════════ */}
        {(sickTortoises.length > 0 || kritisNotifs.length > 0) && (
          <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Ada yang butuh perhatian segera!
            </div>
            {sickTortoises.map(h => (
              <div key={h.id} className="flex items-start justify-between gap-2 p-2.5 bg-white rounded-xl border border-red-200">
                <div>
                  <p className="text-sm font-semibold text-red-800">Kura sakit: {h.tortoise_name}</p>
                  <p className="text-xs text-red-600">{h.diagnosis_notes || h.description || "—"}</p>
                </div>
                <a href="/health" className="flex-shrink-0 text-xs font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg">
                  Lihat
                </a>
              </div>
            ))}
            {kritisNotifs.map(n => (
              <div key={n.id} className="flex items-start gap-2 bg-white rounded-xl border border-amber-200 p-2.5">
                <Bell className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">{n.title}</p>
                  {n.message && <p className="text-xs text-amber-700">{n.message}</p>}
                </div>
                <button onClick={() => dismissNotif(n.id)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
            ))}
          </div>
        )}

        {/* ══ WIDGET 1: ABSENSI ══════════════════════════════════ */}
        <WidgetErrorBoundary widgetName="Absensi">
        <Widget done={hasCheckedIn}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-green-700" />
              <span className="font-semibold text-gray-800">Absensi</span>
              {hasCheckedOut && (
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Selesai</span>
              )}
            </div>

            {!hasCheckedIn && (
              <div>
                <p className="text-sm text-gray-500 mb-3">Belum mulai kerja hari ini</p>
                <button
                  onClick={startCheckIn}
                  disabled={loading}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-2xl text-base active:scale-95 transition-transform disabled:opacity-60"
                >
                  {loading ? "Tunggu sebentar..." : "📸 CHECK IN — Selfie & Mulai Kerja"}
                </button>
                {farmConfigured && <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1"><MapPin className="w-3 h-3" /> GPS diperlukan</p>}
              </div>
            )}

            {hasCheckedIn && !hasCheckedOut && (
              <div>
                <p className="text-sm text-green-700 font-medium mb-1">✓ Masuk jam {attendance.check_in}</p>
                <p className="text-xs text-gray-500 mb-3">Sudah bekerja {workDuration(attendance.check_in)}</p>
                <button
                  onClick={startCheckOut}
                  disabled={loading}
                  className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-60"
                >
                  {loading ? "Tunggu sebentar..." : "📸 CHECK OUT — Selfie & Selesai Kerja"}
                </button>
                {farmConfigured && <p className="text-xs text-center text-gray-400 mt-2">GPS diperlukan untuk check out</p>}
              </div>
            )}

            {hasCheckedOut && (
              <div className="flex items-center gap-3 p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Masuk {attendance.check_in} · Keluar {attendance.check_out}</p>
                  {attendance.overtime_hours > 0 && (
                    <p className="text-xs text-amber-700 mt-0.5">⏰ Lembur {attendance.overtime_hours} jam tercatat</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Widget>
        </WidgetErrorBoundary>

        {/* ══ WIDGET 2: SUPLEMEN ══════════════════════════════════ */}
        {supplemenHariIni.length > 0 && (
          <WidgetErrorBoundary widgetName="Suplemen">
            <WidgetSuplemen
              items={supplemenHariIni}
              user={user}
              today={today}
              qc={qc}
              flashPoin={flashPoin}
            />
          </WidgetErrorBoundary>
        )}

        {/* ══ WIDGET 3: KEBERSIHAN KANDANG ═══════════════════════ */}
        <WidgetErrorBoundary widgetName="Kebersihan Kandang">
        <Widget done={kandangSaved.size === KANDANG_LIST.length}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🏠</span>
                <span className="font-semibold text-gray-800">Kebersihan Kandang</span>
              </div>
              <span className="text-xs text-gray-500">{kandangSaved.size}/{KANDANG_LIST.length} selesai</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${(kandangSaved.size / KANDANG_LIST.length) * 100}%` }} />
            </div>

            <p className="text-xs text-gray-400 mb-3">Tap kandang yang sudah dibersihkan · <span className="text-green-600 font-medium">+{poinKebersihan} poin per kandang</span>{requirePhotoKebersihan && <span className="text-red-500 font-medium"> · 📷 Wajib foto per kandang</span>}</p>

            <div className="grid grid-cols-5 gap-2">
              {KANDANG_LIST.map(k => {
                const done = kandangDone.has(k);
                const isPending = pendingKandang === k;
                const lockByOther = allKandangDoneMap[k] && allKandangDoneMap[k].done_by_email !== user.email && !done;
                return (
                  <button
                    key={k}
                    onClick={() => handleToggleKandang(k)}
                    disabled={lockByOther}
                    title={lockByOther ? `Sudah dibersihkan ${allKandangDoneMap[k].done_by} · ${allKandangDoneMap[k].done_at || ""}` : ""}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                      done ? "bg-green-500 text-white shadow-md active:scale-90"
                      : lockByOther ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : isPending ? "bg-amber-100 text-amber-600 animate-pulse active:scale-90"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-90"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-3.5 h-3.5 mb-0.5" /> : lockByOther ? <Lock className="w-3 h-3 mb-0.5" /> : null}
                    <span>{k}</span>
                    {lockByOther && <span className="text-[7px] font-normal mt-0.5 truncate w-full text-center px-0.5">{(allKandangDoneMap[k].done_by || "").split(" ")[0]}</span>}
                  </button>
                );
              })}
            </div>

            {kandangSaved.size === KANDANG_LIST.length && (
              <p className="text-center text-sm font-semibold text-green-700 mt-3">✓ Semua kandang sudah dibersihkan!</p>
            )}

            <input
              ref={kandangCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleKandangPhoto(e.target.files[0]); e.target.value = ""; }}
            />
          </div>
        </Widget>
        </WidgetErrorBoundary>

        {/* ══ WIDGET 4: KONDISI KURA ══════════════════════════════ */}
        <WidgetErrorBoundary widgetName="Kondisi Kura">
        <Widget done={kondisiOk !== null || sakitReports.length > 0}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="font-semibold text-gray-800">Kondisi Kura Hari Ini</span>
            </div>

            {kondisiOk === null && sakitReports.length === 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setKondisiOk(true)}
                    className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-green-100"
                  >
                    <Smile className="w-8 h-8 text-green-600" />
                    <span className="font-bold text-green-800 text-sm">Semua Baik</span>
                  </button>
                  <button
                    onClick={() => { setKondisiOk(false); setShowSakitForm(true); }}
                    className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-red-100"
                  >
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <span className="font-bold text-red-700 text-sm">Ada yang Sakit</span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">💡 Kura tidak mau makan atau gerak lambat? Pilih "Ada yang Sakit"</p>
              </>
            ) : kondisiOk === true && sakitReports.length === 0 ? (
              <div className="flex items-center gap-3 p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <p className="font-semibold text-green-800">Kondisi normal hari ini ✓</p>
                <button onClick={() => setKondisiOk(null)} className="ml-auto text-xs text-gray-400 underline">Ubah</button>
              </div>
            ) : (
              <div className="space-y-2">
                {sakitReports.map((n, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-xl border border-orange-200">
                    <span className="text-sm font-medium text-orange-800">🐢 {n} — sudah dilaporkan ✓</span>
                  </div>
                ))}
                {savedSakit && (
                  <CareTaskSuggestionPanel
                    diagnoses={savedSakit.diagnosis}
                    severity={savedSakit.severity}
                    type="sakit"
                    tortoiseName={savedSakit.tortoise_name}
                    tortoiseCode={savedSakit.tortoise_code}
                    protocols={diagnosisProtocols}
                  />
                )}
                <button
                  onClick={() => { setShowSakitForm(true); setSavedSakit(null); }}
                  className="w-full text-sm text-red-600 border border-red-200 rounded-xl py-2 hover:bg-red-50"
                >
                  + Lapor kura lain
                </button>
              </div>
            )}

            {/* Form laporan sakit — inline */}
            {showSakitForm && (
              <div className="mt-4 space-y-3 p-4 bg-white rounded-2xl border border-red-200">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-700 text-sm">Laporan Kura Sakit</p>
                  <button onClick={() => setShowSakitForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
                <SickTortoisePicker
                  tortoises={tortoises}
                  loading={tortoisesLoading}
                  error={tortoisesError}
                  onRetry={refetchTortoises}
                  value={sakitForm.kura}
                  onChange={(id) => setSakitForm(p => ({ ...p, kura: id }))}
                />
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#1B4332" }}>Diagnosis * (pilih yang sesuai)</p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {diagnosisProtocols.map(p => {
                      const sel = sakitForm.diagnosis.includes(p.diagnosis_code);
                      return (
                        <button
                          key={p.diagnosis_code}
                          onClick={() => setSakitForm(prev => {
                            const isSel = prev.diagnosis.includes(p.diagnosis_code);
                            const next = isSel
                              ? prev.diagnosis.filter(d => d !== p.diagnosis_code)
                              : [...prev.diagnosis, p.diagnosis_code];
                            let nextSeverity = prev.severity;
                            if (!nextSeverity && !isSel && p.severity_default) {
                              nextSeverity = p.severity_default;
                            }
                            return { ...prev, diagnosis: next, severity: nextSeverity };
                          })}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            sel ? "text-white border-[#1B4332]" : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                          style={sel ? { backgroundColor: "#1B4332" } : {}}
                        >
                          {p.diagnosis_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#1B4332" }}>Tingkat Keparahan *</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SEVERITIES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setSakitForm(prev => ({ ...prev, severity: s.value }))}
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          sakitForm.severity === s.value
                            ? "text-white border-[#1B4332]"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
                        style={sakitForm.severity === s.value ? { backgroundColor: "#1B4332" } : {}}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={sakitForm.description}
                  onChange={e => setSakitForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Catatan tambahan (opsional)..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-400 outline-none"
                />
                <p className="text-xs text-green-600 font-semibold text-center">+15 poin untuk laporan ini</p>
                <button
                  onClick={handleLaporKura}
                  disabled={loading || !sakitForm.kura || sakitForm.diagnosis.length === 0 || !sakitForm.severity}
                  className="w-full text-white font-bold py-3 rounded-xl disabled:opacity-40 active:scale-95"
                  style={{ backgroundColor: "#E76F00" }}
                >
                  {loading ? "Menyimpan..." : "📋 Laporkan"}
                </button>
              </div>
            )}
          </div>
        </Widget>
        </WidgetErrorBoundary>

        {/* ══ WIDGET 5: AKSI CEPAT ═══════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Aksi Cepat</p>
          <div className="grid grid-cols-3 gap-2">
            <a href="/warehouse" className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 active:scale-95 transition-all">
              <Package className="w-5 h-5 text-gray-600" />
              <span className="text-xs font-medium text-gray-700 text-center">Ambil Stok</span>
            </a>
            <button
              onClick={() => setShowCatatan(v => !v)}
              className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
            >
              <ClipboardList className="w-5 h-5 text-gray-600" />
              <span className="text-xs font-medium text-gray-700 text-center">Catatan</span>
            </button>
            <a href="/health" className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 active:scale-95 transition-all">
              <Heart className="w-5 h-5 text-gray-600" />
              <span className="text-xs font-medium text-gray-700 text-center">Kesehatan</span>
            </a>
          </div>

          {showCatatan && (
            <div className="mt-3">
              <textarea
                rows={3}
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                placeholder="Tulis catatan hari ini..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-400 outline-none"
              />
              <button
                onClick={handleSimpanCatatan}
                disabled={loading || !catatan.trim()}
                className="mt-2 w-full bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                Simpan Catatan
              </button>
            </div>
          )}
        </div>

        {/* ══ RINGKASAN HARI INI (setelah checkout) ════════════════ */}
        {/* Selfie Capture Dialog */}
        <SelfieCaptureDialog
          open={showSelfie}
          onClose={() => { setShowSelfie(false); setSelfieMode(null); }}
          onCapture={handleSelfieComplete}
          title={selfieMode === "checkin" ? "Selfie Check In" : "Selfie Check Out"}
        />

        {/* Selfie preview */}
        {attendance?.selfie_checkin_url && (
          <div className="flex items-center gap-2 px-1">
            <img src={attendance.selfie_checkin_url} alt="Selfie masuk" className="w-10 h-10 rounded-full object-cover border-2 border-green-300" />
            <span className="text-xs text-gray-400">Selfie masuk {attendance.check_in}</span>
          </div>
        )}

        {hasCheckedOut && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-green-800 text-base">🏆 Ringkasan Hari Ini</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kandang dibersihkan</span>
                <span className="font-semibold">{kandangSaved.size} kandang</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kondisi kura</span>
                <span className={`font-semibold ${sakitReports.length > 0 ? "text-orange-600" : "text-green-700"}`}>
                  {sakitReports.length > 0 ? `${sakitReports.length} dilaporkan` : kondisiOk === true ? "Semua baik ✓" : "Belum dicek"}
                </span>
              </div>
              <div className="border-t border-green-200 pt-2 flex justify-between text-sm font-bold">
                <span>Total poin hari ini</span>
                <span className="text-green-700">+{totalPoin} poin</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Widget Suplemen ───────────────────────────────────────────────────
function WidgetSuplemen({ items, user, today, qc, flashPoin }) {
  const [done, setDone] = useState(new Set());
  const [saved, setSaved] = useState(new Set());
  const [skipped, setSkipped] = useState(new Set());
  const [processingId, setProcessingId] = useState(null);

  // Restore state dari log yang sudah tersimpan hari ini (anti duplikat & tampil benar)
  const { data: suplemenLogs = [] } = useQuery({
    queryKey: ["suplemen-logs-today", user?.email, today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ done_by_email: user.email, period_key: today, enclosure_id: "suplemen" }),
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  // Stok gudang untuk cek ketersediaan suplemen/obat/vitamin
  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items-suplemen-check"],
    queryFn: () => base44.entities.WarehouseItem.filter({ is_active: true }, "name", 200),
    staleTime: 60 * 1000,
  });
  const stockMap = useMemo(() => {
    const m = {};
    warehouseItems.forEach(w => { if (w.sku) m[w.sku.trim().toLowerCase()] = w.current_stock || 0; });
    return m;
  }, [warehouseItems]);

  const getStockInfo = (item) => {
    const sku = (item.related_sku || "").trim().toLowerCase();
    if (!sku) return { available: true, stock: null };
    const stock = stockMap[sku];
    return { available: stock !== undefined && stock > 0, stock: stock ?? null };
  };

  useEffect(() => {
    if (suplemenLogs.length > 0) {
      const doneIds = new Set();
      const skipIds = new Set();
      suplemenLogs.forEach(l => {
        if (!l.item_id) return;
        if ((l.notes || "").includes("Dilewati - stok kosong")) skipIds.add(l.item_id);
        else doneIds.add(l.item_id);
      });
      setDone(doneIds);
      setSaved(doneIds);
      setSkipped(skipIds);
    }
  }, [suplemenLogs.length]);

  const handleSkip = async (item) => {
    if (saved.has(item.id) || skipped.has(item.id) || processingId) return;
    setProcessingId(item.id);
    try {
      await base44.entities.MaintenanceLog.create({
        check_key: `${user.email}__harian__suplemen_${item.id}__${today}`,
        enclosure_id: "suplemen",
        enclosure_name: "Suplemen",
        freq: "harian",
        item_id: `suplemen_${item.id}`,
        item_label: item.title,
        period_key: today,
        is_done: true,
        done_at: format(new Date(), "HH:mm"),
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: 0,
        notes: "⏭️ Dilewati - stok kosong",
      });
      setSkipped(p => { const n = new Set(p); n.add(item.id); return n; });
      qc.invalidateQueries({ queryKey: ["suplemen-logs-today"] });
    } catch {
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggle = async (item) => {
    if (saved.has(item.id) || processingId) return; // sudah tersimpan / sedang proses (anti double-tap)
    const nowVal = format(new Date(), "HH:mm");
    setDone(p => { const n = new Set(p); n.add(item.id); return n; });
    setProcessingId(item.id);
    try {
      await base44.entities.MaintenanceLog.create({
        check_key: `${user.email}__harian__suplemen_${item.id}__${today}`,
        enclosure_id: "suplemen",
        enclosure_name: "Suplemen",
        freq: "harian",
        item_id: `suplemen_${item.id}`,
        item_label: item.title,
        period_key: today,
        is_done: true,
        done_at: nowVal,
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: 5,
      });
      setSaved(p => { const n = new Set(p); n.add(item.id); return n; });
      qc.invalidateQueries({ queryKey: ["maintenance-today"] });
      qc.invalidateQueries({ queryKey: ["suplemen-logs-today"] });
      flashPoin(item.title, 5);
    } catch {
      setSaved(p => { const n = new Set(p); n.add(item.id); return n; });
    } finally {
      setProcessingId(null);
    }
  };

  const allDone = items.length > 0 && items.every(i => done.has(i.id));

  return (
    <div className={`rounded-2xl border-2 shadow-sm transition-all ${allDone ? "border-green-300 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💊</span>
            <span className="font-semibold text-gray-800">Suplemen & Vitamin Hari Ini</span>
          </div>
          <span className="text-xs text-gray-500">{done.size}/{items.length}</span>
        </div>
        {allDone ? (
          <p className="text-sm font-semibold text-green-700">✓ Semua suplemen hari ini selesai</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const isDone = done.has(item.id);
              const isSkipped = skipped.has(item.id);
              const stockInfo = getStockInfo(item);
              const stockLow = !stockInfo.available;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    isDone ? "bg-green-50 border-green-400" : isSkipped ? "bg-gray-50 border-gray-300" : "bg-white border-gray-200 hover:border-yellow-400"
                  }`}
                >
                  <span className="text-xl flex-shrink-0">💊</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-gray-800 ${isSkipped ? "line-through text-gray-400" : ""}`}>{item.title}</p>
                    {stockLow && !isDone && !isSkipped && (
                      <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> ⚠️ Stok belum tersedia
                      </p>
                    )}
                    {isSkipped && (
                      <p className="text-[11px] text-gray-500 mt-0.5">⏭️ Dilewati - stok kosong</p>
                    )}
                  </div>
                  {isDone && <span className="text-xs text-green-600 font-bold flex-shrink-0">+5</span>}
                  {!isDone && !isSkipped && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stockLow && (
                        <button
                          onClick={() => handleSkip(item)}
                          disabled={processingId === item.id}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        >
                          Dilewati
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={processingId === item.id}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          stockLow ? "border-gray-300" : "border-gray-300 hover:border-yellow-400"
                        } disabled:opacity-50`}
                        title={stockLow ? "Tetap centang dengan keterangan" : "Tandai selesai"}
                      />
                    </div>
                  )}
                  {(isDone || isSkipped) && (
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-green-500 border-green-500">
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      {isSkipped && <span className="text-[10px] text-white">⏭</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}