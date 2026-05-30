import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  MapPin, Home, Leaf, Heart, LogOut,
  CheckCircle2, Circle, AlertTriangle,
  Smile, Users, Bell, X
} from "lucide-react";
import { getCurrentPosition, haversineDistance, calcOvertimeHours } from "@/components/attendance/useGPSLocation";

// ── Helpers ────────────────────────────────────────────────────────────
function nowStr() { return format(new Date(), "HH:mm"); }

function getSalam() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  return "Selamat sore";
}

const STEP_LABELS = ["Masuk", "Kebersihan", "Pakan", "Cek Kura", "Pulang"];
const STEP_ICONS  = [MapPin, Home, Leaf, Heart, LogOut];

const KANDANG_LIST = [
  "W1","W2","W3","W4","W5",
  "E1","E2","E3","E4","E5",
  "N1","N2","N3","L1","L2",
];

const PAKAN_LIST = [
  { id: "sayuran",  label: "Sayuran pagi",       icon: "🥬" },
  { id: "pelet",    label: "Pelet / Hay",         icon: "🟤" },
  { id: "air",      label: "Air minum (ganti)",   icon: "💧" },
  { id: "kalsium",  label: "Suplemen kalsium",    icon: "⚪" },
  { id: "vitamin",  label: "Vitamin (jadwal)",    icon: "🌿" },
];

const GEJALA_LIST = [
  { id: "tidak_makan", label: "Tidak mau makan",  icon: "🍃" },
  { id: "kaki_bengkak",label: "Kaki bengkak",     icon: "🦶" },
  { id: "ada_luka",    label: "Ada luka",          icon: "🩹" },
  { id: "kurang_gerak",label: "Kurang gerak",      icon: "💤" },
  { id: "mata",        label: "Mata bermasalah",   icon: "👁️" },
  { id: "lainnya",     label: "Lainnya",           icon: "❓" },
];

// ── Step Indicator ──────────────────────────────────────────────────────
function StepBar({ currentStep }) {
  return (
    <div className="flex items-center justify-between px-1">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const done    = currentStep > stepNum;
        const active  = currentStep === stepNum;
        const Icon    = STEP_ICONS[i];
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              done   ? "bg-green-500" :
              active ? "bg-green-800" :
              "bg-gray-200"
            }`}>
              {done
                ? <CheckCircle2 className="w-4 h-4 text-white" />
                : <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-400"}`} />
              }
            </div>
            <span className={`text-[9px] font-semibold text-center leading-tight ${
              done ? "text-green-600" : active ? "text-green-800" : "text-gray-400"
            }`}>{label}</span>
            {i < 4 && (
              <div className={`absolute h-px w-full top-4 ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function GuidedHariIni({ user }) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [step, setStep]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);           // { type: "error"|"success", text }
  const [kandangDone, setKandangDone] = useState(new Set());
  const [pakanDone, setPakanDone]   = useState(new Set());
  const [kondisiOk, setKondisiOk]   = useState(null);           // true=ok, false=ada sakit
  const [sakitForm, setSakitForm]   = useState({ kura: "", gejala: new Set() });
  const [sakitReports, setSakitReports] = useState([]);
  const [selesai, setSelesai]       = useState(false);

  // ── Queries ──
  const { data: attendance } = useQuery({
    queryKey: ["attendance-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.Attendance.filter({ employee_email: user.email, date: today });
      return res[0] || null;
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
  });

  const { data: salaryConfig } = useQuery({
    queryKey: ["salary-config", user?.role],
    queryFn: async () => {
      const res = await base44.entities.SalaryConfig.filter({ role: user?.role });
      return res[0] || null;
    },
    enabled: !!user?.role,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoise-names"],
    queryFn: () => base44.entities.Tortoise.list("-name", 200),
    enabled: step === 4,
  });

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ["maintenance-today", user?.email, today],
    queryFn: async () => base44.entities.MaintenanceLog.filter({ done_by_email: user.email, period_key: today }),
    enabled: !!user?.email,
  });

  // Notif kritis untuk banner
  const { data: kritisNotifs = [], refetch: refetchNotifs } = useQuery({
    queryKey: ["notif-kritis", user?.email, today],
    queryFn: async () => {
      const all = await base44.entities.Notification.filter({ recipient_email: user.email });
      return all.filter(n => n.priority === "tinggi" && !n.is_read && !n.is_dismissed
        && (n.created_at || n.created_date || "").startsWith(today));
    },
    enabled: !!user?.email,
  });

  const dismissNotif = async (notifId) => {
    await base44.entities.Notification.update(notifId, {
      is_dismissed: true, is_read: true, read_at: new Date().toISOString()
    });
    refetchNotifs();
  };

  // Derived from attendance
  const hasCheckedIn  = !!attendance?.check_in;
  const hasCheckedOut = !!attendance?.check_out;
  const farmLat    = settings?.farm_lat;
  const farmLng    = settings?.farm_lng;
  const farmRadius = settings?.farm_location_radius || 200;
  const farmConfigured = !!(farmLat && farmLng);

  // Auto-advance step based on attendance
  const effectiveStep = hasCheckedOut && selesai ? 6
    : hasCheckedOut ? Math.max(step, 5)
    : hasCheckedIn  ? Math.max(step, 2)
    : step;

  const totalPoinHariIni = (kandangDone.size * 10) + (kondisiOk === false && sakitReports.length > 0 ? sakitReports.length * 15 : 0);
  const progressPct = Math.round(((effectiveStep - 1) / 5) * 100);

  // ── HANDLERS ──

  const handleCheckIn = async () => {
    if (hasCheckedIn) { setStep(2); return; }
    setLoading(true);
    setMsg(null);
    let lat = null, lng = null, verified = false;
    try {
      const pos = await getCurrentPosition();
      lat = pos.lat; lng = pos.lng;
      if (farmConfigured) {
        const dist = Math.round(haversineDistance(lat, lng, farmLat, farmLng));
        verified = dist <= farmRadius;
      }
    } catch {
      setMsg({ type: "warn", text: "Izinkan akses lokasi di HP kamu, lalu coba lagi." });
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
    });
    qc.invalidateQueries({ queryKey: ["attendance-today"] });
    setMsg({ type: "success", text: `+5 poin — Check in jam ${nowStr()} ✓` });
    setLoading(false);
    setTimeout(() => { setMsg(null); setStep(2); }, 1200);
  };

  const handleLanjutKebersihan = async () => {
    if (kandangDone.size === 0) { setStep(3); return; }
    setLoading(true);
    // Simpan maintenance log per kandang yang dicentang
    await Promise.all([...kandangDone].map(k =>
      base44.entities.MaintenanceLog.create({
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
        poin_earned: 10,
      }).catch(() => {}) // ignore duplicate
    ));
    qc.invalidateQueries({ queryKey: ["maintenance-today"] });
    setMsg({ type: "success", text: `+${kandangDone.size * 10} poin — ${kandangDone.size} kandang tercatat ✓` });
    setLoading(false);
    setTimeout(() => { setMsg(null); setStep(3); }, 1200);
  };

  const handleLanjutPakan = async () => {
    // Simpan DailyChecklist task pakan
    if (pakanDone.size > 0) {
      const existing = await base44.entities.DailyChecklist.filter({ employee_email: user.email, date: today });
      const completed = [...pakanDone].map(p => ({ task_id: `pakan_${p}`, task_title: PAKAN_LIST.find(x => x.id === p)?.label, done_at: nowStr() }));
      if (existing[0]) {
        await base44.entities.DailyChecklist.update(existing[0].id, {
          completed_tasks: [...(existing[0].completed_tasks || []), ...completed],
        });
      }
    }
    setStep(4);
  };

  const handleLaporKura = async () => {
    if (!sakitForm.kura || sakitForm.gejala.size === 0) return;
    setLoading(true);
    const kura = tortoises.find(t => t.id === sakitForm.kura);
    await base44.entities.HealthRecord.create({
      tortoise_id: sakitForm.kura,
      tortoise_name: kura?.name || sakitForm.kura,
      date: today,
      type: "sakit",
      description: `Dilaporkan oleh ${user.full_name || user.email}. Gejala: ${[...sakitForm.gejala].join(", ")}`,
      diagnosis_notes: [...sakitForm.gejala].join(", "),
    });
    setSakitReports(p => [...p, kura?.name || sakitForm.kura]);
    setMsg({ type: "success", text: `+15 poin — Laporan kura ${kura?.name} tercatat ✓` });
    setSakitForm({ kura: "", gejala: new Set() });
    setLoading(false);
    setTimeout(() => setMsg(null), 2000);
  };

  const handleCheckOut = async () => {
    if (hasCheckedOut) { setSelesai(true); return; }
    if (!attendance) return;
    setLoading(true);
    setMsg(null);

    if (farmConfigured) {
      let pos;
      try { pos = await getCurrentPosition(); }
      catch {
        setMsg({ type: "error", text: "Izinkan akses lokasi di HP kamu, lalu coba lagi." });
        setLoading(false); return;
      }
      const dist = Math.round(haversineDistance(pos.lat, pos.lng, farmLat, farmLng));
      if (dist > farmRadius) {
        setMsg({ type: "error", text: `Kamu masih di luar kandang (${dist}m dari sini). Pastikan sudah di lokasi kandang dulu ya!` });
        setLoading(false); return;
      }
      const checkoutTime = nowStr();
      const shiftEnd = attendance.shift_end || salaryConfig?.shift_end || "16:00";
      const overtimeHours = calcOvertimeHours(checkoutTime, shiftEnd);
      await base44.entities.Attendance.update(attendance.id, {
        check_out: checkoutTime,
        check_out_lat: pos.lat, check_out_lng: pos.lng,
        overtime_hours: overtimeHours,
      });
      if (overtimeHours > 0) {
        await base44.entities.OvertimeLog.create({
          employee_name: attendance.employee_name,
          employee_email: attendance.employee_email,
          date: today, hours: overtimeHours,
          notes: `Lembur otomatis dari checkout ${checkoutTime}`,
        });
      }
    } else {
      const checkoutTime = nowStr();
      const shiftEnd = attendance.shift_end || salaryConfig?.shift_end || "16:00";
      const overtimeHours = calcOvertimeHours(checkoutTime, shiftEnd);
      await base44.entities.Attendance.update(attendance.id, {
        check_out: checkoutTime, overtime_hours: overtimeHours,
      });
      if (overtimeHours > 0) {
        await base44.entities.OvertimeLog.create({
          employee_name: attendance.employee_name,
          employee_email: attendance.employee_email,
          date: today, hours: overtimeHours,
          notes: `Lembur otomatis dari checkout ${checkoutTime}`,
        });
      }
    }

    qc.invalidateQueries({ queryKey: ["attendance-today"] });
    setLoading(false);
    setSelesai(true);
  };

  // ─────────────────────────────────────────────────────
  // RENDER — Selesai
  // ─────────────────────────────────────────────────────
  if (selesai || (hasCheckedOut && effectiveStep === 6)) {
    return (
      <div className="p-5 space-y-5 pt-8 text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kerja bagus hari ini!</h1>
          <p className="text-gray-500 mt-1">
            Kamu sudah check out pukul <strong>{attendance?.check_out}</strong>
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-left space-y-3">
          <p className="font-semibold text-green-800 text-lg text-center">
            🏆 Total Poin Hari Ini: {totalPoinHariIni} poin
          </p>
          {attendance?.overtime_hours > 0 && (
            <p className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⏰ Lembur {attendance.overtime_hours} jam — tercatat otomatis
            </p>
          )}
          <div className="space-y-2 pt-2 border-t border-green-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Kandang dibersihkan</span>
              <span className="font-semibold text-gray-800">{kandangDone.size} kandang</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pakan diberikan</span>
              <span className="font-semibold text-gray-800">
                {pakanDone.size > 0 ? `${pakanDone.size} jenis` : "Dilewati"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Kondisi kura</span>
              <span className={`font-semibold ${sakitReports.length > 0 ? "text-orange-600" : "text-green-700"}`}>
                {sakitReports.length > 0 ? `${sakitReports.length} dilaporkan` : "Semua baik ✓"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // RENDER — Header + Progress
  // ─────────────────────────────────────────────────────
  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-green-700 text-white px-5 pt-10 pb-5">
        <p className="text-green-200 text-sm">{getSalam()},</p>
        <h1 className="text-xl font-bold mt-0.5">{user?.full_name?.split(" ")[0] || "Keeper"} 👋</h1>
        <p className="text-green-200 text-xs mt-1 capitalize">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
        </p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-green-200 mb-1.5">
            <span>Langkah {Math.min(effectiveStep, 5)} dari 5</span>
            <span className="font-bold text-white">{progressPct}%</span>
          </div>
          <div className="h-2.5 bg-green-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Poin hari ini */}
        {totalPoinHariIni > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600/50 rounded-full text-sm font-semibold">
            ⭐ {totalPoinHariIni} poin hari ini
          </div>
        )}
      </div>

      {/* Step indicators */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <StepBar currentStep={effectiveStep} />
      </div>

      {/* Banner notifikasi kritis */}
      {kritisNotifs.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          {kritisNotifs.slice(0, 3).map(notif => (
            <div key={notif.id} className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <Bell className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">{notif.title}</p>
                {notif.message && <p className="text-xs text-amber-700 mt-0.5 line-clamp-2">{notif.message}</p>}
                {notif.action_label && (
                  <button
                    onClick={() => dismissNotif(notif.id)}
                    className="mt-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg"
                  >
                    {notif.action_label}
                  </button>
                )}
              </div>
              <button onClick={() => dismissNotif(notif.id)} className="text-amber-400 hover:text-amber-700 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Feedback message */}
      {msg && (
        <div className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          msg.type === "success" ? "bg-green-50 border border-green-200 text-green-800" :
          msg.type === "warn"    ? "bg-yellow-50 border border-yellow-200 text-yellow-800" :
          "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {msg.type === "success" ? "✅" : msg.type === "warn" ? "⚠️" : "❌"} {msg.text}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* STEP 1 — CHECK IN */}
      {/* ══════════════════════════════════════════ */}
      {effectiveStep === 1 && (
        <div className="p-5 space-y-5 text-center">
          <MapPin className="w-16 h-16 text-green-600 mx-auto mt-4" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Selamat datang!</h2>
            <p className="text-gray-500 mt-1">Klik tombol di bawah untuk mulai kerja</p>
          </div>
          <button
            onClick={handleCheckIn}
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold text-lg py-5 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-60"
          >
            {loading ? "Tunggu sebentar..." : "🏁 MULAI KERJA — CHECK IN"}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* STEP 2 — KEBERSIHAN KANDANG */}
      {/* ══════════════════════════════════════════ */}
      {effectiveStep === 2 && (
        <div className="p-5 space-y-4">
          <div className="text-center pt-2">
            <Home className="w-14 h-14 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-800">Kandang mana yang sudah dibersihkan?</h2>
            <p className="text-gray-500 text-sm mt-1">Ketuk kandang yang sudah selesai</p>
            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              +10 poin per kandang
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {KANDANG_LIST.map(k => {
              const done = kandangDone.has(k);
              return (
                <button
                  key={k}
                  onClick={() => setKandangDone(p => {
                    const n = new Set(p);
                    done ? n.delete(k) : n.add(k);
                    return n;
                  })}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all active:scale-95 ${
                    done
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {done && <CheckCircle2 className="w-4 h-4 mb-0.5" />}
                  {k}
                </button>
              );
            })}
          </div>

          {kandangDone.size > 0 && (
            <p className="text-center text-sm font-semibold text-green-700">
              {kandangDone.size} kandang dipilih (+{kandangDone.size * 10} poin)
            </p>
          )}

          <button
            onClick={handleLanjutKebersihan}
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold text-base py-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-60"
          >
            {loading ? "Tunggu sebentar..." : "Lanjut ke Pakan →"}
          </button>
          <button onClick={() => setStep(3)} className="w-full text-center text-sm text-gray-400 py-2">
            Lewati (tidak ada yang perlu dibersihkan)
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* STEP 3 — PEMBERIAN PAKAN */}
      {/* ══════════════════════════════════════════ */}
      {effectiveStep === 3 && (
        <div className="p-5 space-y-4">
          <div className="text-center pt-2">
            <Leaf className="w-14 h-14 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-800">Pakan sudah diberikan?</h2>
            <p className="text-gray-500 text-sm mt-1">Centang jenis pakan yang sudah diberikan</p>
          </div>

          <div className="space-y-2">
            {PAKAN_LIST.map(p => {
              const done = pakanDone.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setPakanDone(prev => {
                    const n = new Set(prev);
                    done ? n.delete(p.id) : n.add(p.id);
                    return n;
                  })}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-98 ${
                    done
                      ? "bg-green-50 border-green-400"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span className="flex-1 text-left font-medium text-gray-800">{p.label}</span>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    done ? "bg-green-500 border-green-500" : "border-gray-300"
                  }`}>
                    {done && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleLanjutPakan}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold text-base py-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            Lanjut ke Cek Kura →
          </button>
          <button onClick={() => setStep(4)} className="w-full text-center text-sm text-gray-400 py-2">
            Lewati langkah ini
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* STEP 4 — CEK KONDISI KURA */}
      {/* ══════════════════════════════════════════ */}
      {effectiveStep === 4 && (
        <div className="p-5 space-y-4">
          <div className="text-center pt-2">
            <Heart className="w-14 h-14 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-800">Ada kura yang sakit atau tidak normal?</h2>
            <p className="text-gray-500 text-sm mt-1">Lihat dengan teliti setiap kandang</p>
          </div>

          {kondisiOk === null && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => { setKondisiOk(true); setStep(5); }}
                className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:bg-green-100"
              >
                <Smile className="w-10 h-10 text-green-600" />
                <span className="font-bold text-green-800 text-center">Semua Baik</span>
              </button>
              <button
                onClick={() => setKondisiOk(false)}
                className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:bg-red-100"
              >
                <AlertTriangle className="w-10 h-10 text-red-500" />
                <span className="font-bold text-red-700 text-center">Ada yang Sakit</span>
              </button>
            </div>
          )}

          {/* Tip */}
          {kondisiOk === null && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              💡 <strong>Tips:</strong> Kura tidak mau makan, gerakannya lambat, atau ada luka — pilih "Ada yang Sakit"
            </div>
          )}

          {/* Form laporan kura sakit */}
          {kondisiOk === false && (
            <div className="space-y-4 bg-white rounded-2xl border border-red-200 p-4">
              <p className="font-semibold text-gray-700">Laporan Kura Sakit</p>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Kura mana?</label>
                <select
                  value={sakitForm.kura}
                  onChange={e => setSakitForm(p => ({ ...p, kura: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-green-400 outline-none"
                >
                  <option value="">-- Pilih kura --</option>
                  {tortoises.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.enclosure || "?"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">Gejalanya apa?</label>
                <div className="grid grid-cols-3 gap-2">
                  {GEJALA_LIST.map(g => {
                    const sel = sakitForm.gejala.has(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSakitForm(p => {
                          const n = new Set(p.gejala);
                          sel ? n.delete(g.id) : n.add(g.id);
                          return { ...p, gejala: n };
                        })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                          sel ? "bg-red-100 border-red-400 text-red-800" : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
                      >
                        <span className="text-xl">{g.icon}</span>
                        <span className="text-center leading-tight">{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-green-600 text-center font-semibold">+15 poin untuk laporan ini</p>

              <button
                onClick={handleLaporKura}
                disabled={loading || !sakitForm.kura || sakitForm.gejala.size === 0}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl disabled:opacity-40 active:scale-95 transition-transform"
              >
                {loading ? "Tunggu sebentar..." : "📋 Laporkan"}
              </button>

              {sakitReports.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 text-center">
                  ✅ {sakitReports.length} kura sudah dilaporkan: {sakitReports.join(", ")}
                </div>
              )}

              <button
                onClick={() => setStep(5)}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-xl active:scale-95 transition-transform"
              >
                Lanjut ke Pulang →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* STEP 5 — CHECK OUT */}
      {/* ══════════════════════════════════════════ */}
      {effectiveStep === 5 && (
        <div className="p-5 space-y-5 text-center">
          <LogOut className="w-16 h-16 text-green-600 mx-auto mt-4" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Selesai kerja hari ini!</h2>
            <p className="text-gray-500 mt-1">Klik tombol di bawah saat mau pulang</p>
          </div>

          {hasCheckedOut ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800">Sudah check out</p>
              <p className="text-sm text-green-600 mt-1">Jam keluar: {attendance?.check_out}</p>
              <button onClick={() => setSelesai(true)} className="mt-4 w-full bg-green-700 text-white font-bold py-3 rounded-xl">
                Lihat Ringkasan Hari Ini
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold text-lg py-5 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-60"
              >
                {loading ? "Tunggu sebentar..." : "🏠 PULANG — CHECK OUT"}
              </button>
              {farmConfigured && (
                <p className="text-xs text-gray-400">GPS diperlukan untuk check out</p>
              )}
            </>
          )}
        </div>
      )}

      {/* STEP 6 khusus kepala_feeder — Verifikasi Tim */}
      {effectiveStep >= 5 && user?.role === "kepala_feeder" && !selesai && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-8 h-8 text-amber-600" />
            <div>
              <p className="font-bold text-amber-800">Cek pekerjaan tim kamu</p>
              <p className="text-sm text-amber-600">Verifikasi checklist anggota tim</p>
            </div>
          </div>
          <a href="/sop" className="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors">
            Buka Verifikasi Tim →
          </a>
        </div>
      )}
    </div>
  );
}