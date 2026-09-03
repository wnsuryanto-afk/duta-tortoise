import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  MapPin, Heart, CheckCircle2, AlertTriangle,
  Smile, Star, Bell, X, Package, ClipboardList, Clock, Camera
} from "lucide-react";
import { getCurrentPosition, haversineDistance, calcOvertimeHours } from "@/components/attendance/useGPSLocation";
import WidgetErrorBoundary from "./WidgetErrorBoundary";
import BonusBulanIni from "./BonusBulanIni";
import TugasHariIni from "@/components/sop/TugasHariIni";
import IncidentalTaskList from "@/components/incidental/IncidentalTaskList";
import SelfieCaptureDialog from "@/components/common/SelfieCaptureDialog";
import TortoiseSearchSelect from "@/components/health/TortoiseSearchSelect";
import CareTaskSuggestionPanel from "@/components/health/CareTaskSuggestionPanel";
import { compressImage } from "@/lib/useImageCompression";
import { syncPhotoToChecklist } from "@/lib/syncPhotoToChecklist";
import { canonicalKandangItemId, canonicalKandangCheckKey, matchKandangLog } from "@/lib/taskLock";
import { LeafPattern } from "@/components/common/Illustration";
import { perubahanSakit } from "@/lib/statusKura";
import { tandaiSembuh } from "@/lib/kesehatanKura";
import { ambilKuraSakitBerketerangan } from "@/lib/daftarKuraSakit";
import { catatPerawatanHarian } from "@/lib/perawatanHarian";
import { kandangWajib, tugasUbinKandang, poinUbinKandang } from "@/lib/kandang";
import { terjadwalPada } from "@/lib/kepatuhanSOP";
import { jadwalBerlaku, sesuaikanMundurRacikan } from "@/lib/jadwalPerawatan";
import { masukLaporan } from "@/lib/laporan";

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

// Daftar kandang tinggal satu tempat: src/lib/kandang.js. Kartu kepatuhan di
// dashboard memakai daftar yang sama, supaya penyebutnya tidak pernah beda
// dari yang dilihat kiper di layar ini.

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
    <div className={`rounded-2xl border-2 transition-all ${done ? "border-green-300 bg-green-50" : "border-gray-100 bg-card"} shadow-sm ${className}`}>
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
  const [kandangNotice, setKandangNotice] = useState(null); // { text, tone } — keterangan tertempel ≥5 dtk
  const kandangNoticeTimer = useRef(null);
  const kandangPhotoRef = useRef({ received: false, k: null }); // deteksi batal ambil foto kamera
  const [kondisiOk, setKondisiOk]       = useState(null);
  const [sakitForm, setSakitForm]       = useState({ kura: "", diagnosis: [], severity: "", description: "", treatment: "" });
  const [savedSakit, setSavedSakit]     = useState(null);
  const [sakitReports, setSakitReports] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [sembuhLoading, setSembuhLoading] = useState(null);
  const [msg, setMsg]                   = useState(null);
  const [poinFlash, setPoinFlash]       = useState(null); // { label, poin }
  const [showSakitForm, setShowSakitForm] = useState(false);
  const [catatan, setCatatan]           = useState("");
  const [showCatatan, setShowCatatan]   = useState(false);
  const [showSelfie, setShowSelfie]     = useState(false);
  const [selfieMode, setSelfieMode]     = useState(null); // "checkin" | "checkout"
  const [sembuhPrompt, setSembuhPrompt]   = useState(new Set()); // tortoise_id yg sedang ditanya "sudah sembuh?"
  const [savingPerawatan, setSavingPerawatan] = useState(null); // tortoise_id sedang mencatat perawatan

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

  /*
    Trip ambil sayur di pasar hari ini.

    Dibaca dari PakanHarian dengan sumber "sayur_pasar" — sumber yang sama
    yang dipakai hooks/useVegTrips.js untuk menghitung upah Rp 30.000 per trip
    di slip gaji. Satu definisi: kalau baris ini tidak ada, upahnya juga tidak
    ada, dan sebaliknya.
  */
  const { data: tripSayurHariIni } = useQuery({
    queryKey: ["trip-sayur-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.PakanHarian.filter({
        recorded_by_email: user.email,
        log_date: today,
        feed_source: "sayur_pasar",
      });
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Stok racikan Duta Repro (VIT-REP00). Selama racikan ada, jadwal kalsium /
  // asam folat / vitamin E harian mundur - kandungannya sudah di dalam racikan.
  const { data: racikanRepro = 0 } = useQuery({
    queryKey: ["stok-racikan-repro"],
    queryFn: async () => {
      const res = await base44.entities.WarehouseItem.filter({ sku: "VIT-REP00" });
      return Number(res?.[0]?.current_stock || 0);
    },
    staleTime: 5 * 60 * 1000,
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

  // Semua log kebersihan hari ini (semua karyawan, kedua format lama & baru) — untuk penguncian & tampilan per-kandang
  const { data: allKebersihanLogs = [] } = useQuery({
    queryKey: ["kebersihan-all-logs", today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ period_key: today }),
    staleTime: 30 * 1000,
  });
  const allKandangDoneMap = useMemo(() => {
    const m = {};
    allKebersihanLogs.forEach(l => {
      if (!l.is_done || !masukLaporan(l)) return;
      // format baru / TugasHariIni: item_id "kebersihan_kandang_E4"
      if (l.item_id && l.item_id.startsWith("kebersihan_kandang_")) {
        const k = l.item_id.replace("kebersihan_kandang_", "");
        if (k && !m[k]) m[k] = { done_by: l.done_by, done_at: l.done_at, done_by_email: l.done_by_email };
      }
      // format lama GuidedHariIni: item_id "kebersihan", enclosure_id "E4"
      else if (l.item_id === "kebersihan" && l.enclosure_id && !m[l.enclosure_id]) {
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
  // Kura sakit = status bertahan di data kura, BUKAN catatan bertanggal hari ini.
  // Versi lama hanya membaca 10 catatan terakhir yang date === hari ini, sehingga
  // kura yang dilaporkan sakit kemarin lenyap dari layar keeper esok harinya —
  // tidak ada pengingat perawatan sama sekali sampai dia mati atau sembuh sendiri.
  const { data: sickTortoises = [] } = useQuery({
    queryKey: ["sick-tortoises-today"],
    queryFn: () => ambilKuraSakitBerketerangan(200),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  });

  // Keeper menutup siklus: lapor sembuh -> catatan "sembuh" + status kembali aktif
  const handleLaporSembuh = async (t) => {
    if (sembuhLoading) return;
    setSembuhLoading(t.tortoise_id);
    try {
      // Menutup kasus sakitnya sekalian — tanpa itu, kura yang sudah
      // dilaporkan sembuh tetap memakai lencana merah SAKIT selamanya.
      await tandaiSembuh({
        kura: t,
        user,
        tanggal: today,
        asal: "layar keeper",
      });
      qc.invalidateQueries({ queryKey: ["sick-tortoises-today"] });
      qc.invalidateQueries({ queryKey: ["health-records"] });
      showMsg("success", `${t.tortoise_name} ditandai sembuh.`);
    } catch {
      showMsg("error", "Gagal menyimpan. Coba lagi ya.");
    }
    setSembuhLoading(null);
  };

  // ── Perawatan harian kura sakit ──
  // Keeper mencatat bahwa perawatan hari ini sudah dilakukan. Setelah dicentang,
  // tawarkan penutupan langsung di kartunya ("Apakah sudah sembuh?").
  // Pencatatan ini PERSISTEN (disimpan ke MaintenanceLog) agar tidak muncul lagi
  // hari ini, tapi TIDAK mengubah status kura — keputusan sembuh tetap di keeper.
  const perawatanDoneIds = useMemo(() => {
    const s = new Set();
    (maintenanceLogs || []).forEach((l) => {
      if (l.item_id && l.item_id.startsWith("perawatan_")) {
        s.add(l.item_id.replace("perawatan_", ""));
      }
    });
    return s;
  }, [maintenanceLogs]);

  const handlePerawatanDone = async (h) => {
    if (savingPerawatan) return;
    setSavingPerawatan(h.tortoise_id);
    try {
      // Diambil saat tombol ditekan, bukan disimpan sebagai state: aksinya jarang,
      // dan data yang segar justru yang mencegah catatan medis terduplikasi bila
      // keeper lain sudah mencentang kura yang sama dari perangkat berbeda.
      const [catatanKura, tugasTertunda] = await Promise.all([
        base44.entities.HealthRecord.filter({ tortoise_id: h.tortoise_id, date: today }),
        base44.entities.IncidentalTask.filter({ status: "pending" }, "-due_date", 100),
      ]);

      const hasil = await catatPerawatanHarian(h, user, {
        tanggal: today,
        catatanKesehatan: catatanKura,
        tugasInsidentil: tugasTertunda,
      });

      refetchML();
      qc.invalidateQueries({ queryKey: ["health-records"] });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-all"] });
      setSembuhPrompt((p) => new Set(p).add(h.tortoise_id));

      if (!hasil.dicatat) {
        showMsg("warn", `Perawatan ${h.tortoise_name} sudah tercatat hari ini.`);
      } else if (hasil.peringatan) {
        // Catatan medisnya tersimpan, tapi ada jejak tambahan yang gagal —
        // menelannya berarti keeper mengira semuanya beres.
        showMsg("warn", `Perawatan tercatat, tapi ${hasil.peringatan}.`);
      } else {
        showMsg("success", `Perawatan ${h.tortoise_name} masuk ke rekam kesehatannya.`);
      }
    } catch {
      showMsg("error", "Gagal mencatat perawatan. Coba lagi ya.");
    }
    setSavingPerawatan(null);
  };

  const dismissSembuhPrompt = (tid) =>
    setSembuhPrompt((p) => {
      const n = new Set(p);
      n.delete(tid);
      return n;
    });

  // Sync kandang done dari maintenance logs (restore state setelah reload)
  // Mendukung kedua format: baru (item_id "kebersihan_kandang_E4") & lama (item_id "kebersihan", enclosure_id "E4")
  useEffect(() => {
    if (maintenanceLogs.length > 0) {
      const saved = new Set();
      maintenanceLogs.forEach(l => {
        if (l.item_id && l.item_id.startsWith("kebersihan_kandang_")) {
          saved.add(l.item_id.replace("kebersihan_kandang_", ""));
        } else if (l.item_id === "kebersihan" && l.enclosure_id) {
          saved.add(l.enclosure_id);
        }
      });
      setKandangDone(saved);
      setKandangSaved(saved);
    }
  }, [maintenanceLogs.length]);

  const [lastCheckAtMs, setLastCheckAtMs] = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);

  // Sinkron jeda: ambil timestamp centang kandang terakhir dari log sendiri (created_date = presisi detik)
  useEffect(() => {
    if (!maintenanceLogs.length) return;
    let maxMs = 0;
    maintenanceLogs.forEach(l => {
      if ((l.item_id && l.item_id.startsWith("kebersihan_kandang_")) || l.item_id === "kebersihan") {
        const ms = l.created_date ? new Date(l.created_date).getTime() : 0;
        if (ms > maxMs) maxMs = ms;
      }
    });
    if (maxMs > 0) setLastCheckAtMs(prev => Math.max(prev, maxMs));
  }, [maintenanceLogs]);

  // Hitungan mundur jeda antar kandang
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setTimeout(() => setCooldownSec(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSec]);

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
  // Penyaringan jadwal perawatan pindah ke lib/jadwalPerawatan.js.
  //
  // Aturan lama di sini hanya mengenali "harian" dan "mingguan dengan daftar
  // hari terisi", sehingga SEPULUH dari empat belas jadwal tidak pernah tampil
  // - termasuk dua yang dibuat untuk mencegah egg binding, sebab kematian yang
  // sudah terjadi di peternakan ini.
  const supplemenHariIni = jadwalBerlaku(treatmentSchedules, {
    hari: new Date(),
    musimBertelur: settings?.musim_bertelur_aktif === true,
    racikanTersedia: racikanRepro > 0,
  }).filter(ts => {
    // ATURAN JEMUR: hanya muncul jika ada kura aktif kategori baby
    const isJemur = (ts.title || "").toLowerCase().includes("jemur");
    if (isJemur && babyCount === 0) return false;
    return true;
  });

  // Berapa jadwal yang HARUSNYA muncul hari ini tetapi mundur karena racikan.
  // Yang dihitung: jadwal yang benar-benar HILANG hari ini. Jadwal untuk semua
  // kura tidak hilang — ia menyempit ke jantan saja, karena racikan Duta Repro
  // hanya diberikan kepada betina. Menghitungnya sebagai "mundur" membuat
  // kiper mengira kalsium jantan sudah tergantikan; tidak ada yang
  // menggantikannya.
  const suplemenMundur = (treatmentSchedules || []).filter(
    (ts) => ts.is_active === true && sesuaikanMundurRacikan(ts, racikanRepro > 0) === null
  ).length;

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

  /*
    Menandai hari ini sebagai LIBUR.

    Sampai 01-09-2026 tidak ada satu pun cara mencatat hari tidak masuk: kolom
    status ada di basis data, tetapi seluruh 52 catatan Agustus berstatus
    "hadir" karena hanya check-in yang pernah menulisnya. Hari yang tidak masuk
    jadi tidak punya catatan sama sekali — dan hari tanpa catatan tidak bisa
    dibedakan dari absensi yang lupa diisi.

    Bedanya nyata: enam hari Angsolo pada Agustus hilang senilai Rp 420.000
    tanpa ada yang pernah memutuskan itu libur.

    Ini TIDAK mengubah gaji. Gaji tetap dihitung dari hari masuk (keputusan
    Iwan 01-09-2026). Yang berubah: hari yang benar-benar libur jadi punya
    catatan, sehingga hari yang TIDAK punya catatan sama sekali menjadi tanda
    bahwa ada absensi yang belum diisi — dan itu bisa dikejar sebelum gaji
    dihitung, bukan sesudah.
  */
  const tandaiLibur = async () => {
    if (hasCheckedIn || attendance) return;
    setLoading(true);
    try {
      await base44.entities.Attendance.create({
        employee_id: user.id,
        employee_name: user.full_name || user.email,
        employee_email: user.email,
        date: today,
        status: "libur",
      });
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      showMsg("ok", "Hari ini ditandai libur. Tidak dihitung sebagai hari kerja.");
    } catch (e) {
      showMsg("warn", "Gagal menandai libur: " + (e?.message || ""));
    }
    setLoading(false);
  };

  /*
    Catat trip ambil sayur di pasar — SEKALI TEKAN.

    Aturannya sudah lama ada: Rp 30.000 per trip, di SalaryConfig
    (vegetable_rate_per_trip) dan sudah dihitung lib/hitungGaji.js. Yang tidak
    ada adalah jalan masuknya. Sumber datanya formulir Pakan Harian, dan
    sampai 03-09-2026 seluruh aplikasi hanya punya SATU catatan pakan —
    tertanggal 27 Juli. Jadi selama ini aturannya membayar nol, bukan karena
    tidak ada yang ke pasar, melainkan karena tidak ada yang mengisi formulir
    berkolom banyak sambil membawa keranjang.

    Tombol ini menukar formulir itu dengan satu ketukan. Yang dikorbankan:
    jumlah keranjang tidak ikut tercatat (basket_count 0) dan tidak ada foto.
    Untuk upah trip itu tidak berpengaruh — yang dibayar adalah perjalanannya,
    bukan isinya. Untuk mengukur volume pakan, formulir lengkapnya tetap ada.
  */
  const catatTripSayur = async () => {
    if (tripSayurHariIni) return;
    setLoading(true);
    try {
      await base44.entities.PakanHarian.create({
        log_date: today,
        session: "pagi",
        basket_count: 0,
        feed_source: "sayur_pasar",
        recorded_by_name: user.full_name || user.email,
        recorded_by_email: user.email,
        notes: "Dicatat sekali tekan dari layar harian. Jumlah keranjang tidak diisi — buka Pakan Harian bila perlu mencatat volumenya.",
      });
      qc.invalidateQueries({ queryKey: ["trip-sayur-today"] });
      qc.invalidateQueries({ queryKey: ["veg-trips"] });
      showMsg("ok", "Trip sayur tercatat. Upah Rp 30.000 masuk hitungan gaji bulan ini.");
    } catch (e) {
      showMsg("warn", "Gagal mencatat trip sayur: " + (e?.message || ""));
    }
    setLoading(false);
  };

  const startCheckOut = () => { setSelfieMode("checkout"); setShowSelfie(true); };

  const handleCheckOut = async (selfieUrl) => {
    if (hasCheckedOut || !attendance) return;
    setLoading(true);
    if (farmConfigured) {
      // GPS mati / izin ditolak BUKAN alasan mengunci orang dari check out.
      // Check out tetap jalan, tapi ditandai tidak terverifikasi agar terlihat
      // oleh owner di Layar Tim. Blokir hanya kalau GPS berhasil DAN jelas jauh.
      let pos = null;
      try { pos = await getCurrentPosition(); }
      catch { pos = null; }
      if (pos) {
        const dist = Math.round(haversineDistance(pos.lat, pos.lng, farmLat, farmLng));
        if (dist > farmRadius) {
          showMsg("error", `Kamu masih ${dist}m dari kandang. Harus di lokasi kandang untuk check out.`);
          setLoading(false); return;
        }
      } else {
        showMsg("warn", "GPS tidak terbaca. Check out tetap dicatat, tapi ditandai tanpa lokasi.");
      }
      const checkoutTime = nowStr();
      const shiftEnd = attendance.shift_end || salaryConfig?.shift_end || "16:00";
      const ot = calcOvertimeHours(checkoutTime, shiftEnd);
      await base44.entities.Attendance.update(attendance.id, {
        check_out: checkoutTime,
        check_out_lat: pos ? pos.lat : null,
        check_out_lng: pos ? pos.lng : null,
        checkout_location_verified: !!pos,
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

  // D12 - Satu ubin kandang = satu kunjungan = semua tugas per-kandang yang
  // terjadwal hari itu. Poinnya dijumlahkan dari SOPTask, jadi mengubah nilai
  // tugas di pengaturan langsung terlihat di sini tanpa menyentuh kode.
  const { data: sopTasksAktif = [] } = useQuery({
    queryKey: ["sop-tasks-aktif"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }, "title", 200),
    staleTime: 10 * 60 * 1000,
  });
  const { data: enclosures = [] } = useQuery({
    queryKey: ["guided-enclosures"],
    queryFn: () => base44.entities.Enclosure.list("name", 100),
    staleTime: 30 * 60 * 1000,
  });

  // D15 - Kandang kosong tidak dituntut. Begitu ada kura masuk, kandangnya
  // kembali muncul sebagai kewajiban dengan sendirinya.
  const daftarKandang = useMemo(() => kandangWajib(enclosures), [enclosures]);

  const tugasUbin = useMemo(
    () => tugasUbinKandang(sopTasksAktif, terjadwalPada, today),
    [sopTasksAktif, today],
  );
  const poinKebersihan = useMemo(
    () => poinUbinKandang(sopTasksAktif, terjadwalPada, today),
    [sopTasksAktif, today],
  );
  const requirePhotoKebersihan = tugasUbin.some(t => t.require_photo === true);
  const kandangCameraRef = useRef(null);
  const [pendingKandang, setPendingKandang] = useState(null);
  // ── Jeda minimum 60 detik antar kandang (anti centang beruntun) ──

  // Poin hari ini (dideklarasikan setelah poinKebersihan)
  // settled = dikerjakan sendiri ATAU dikerjakan rekan (tidak menggandakan poin, tapi menghitung sebagai selesai)
  const settledKandangCount = daftarKandang.filter(k =>
    kandangSaved.has(k) || (allKandangDoneMap[k] && allKandangDoneMap[k].done_by_email !== user.email)
  ).length;
  const poinKandang = kandangSaved.size * poinKebersihan;
  const poinKura    = sakitReports.length * 15;
  const poinCheckin = hasCheckedIn ? 5 : 0;
  const totalPoin   = poinCheckin + poinKandang + poinKura;

  // Keterangan tertempel di widget kandang minimal 5 detik (bukan toast sekilas)
  const showKandangNotice = (text, tone = "info") => {
    setKandangNotice({ text, tone, id: Date.now() });
    if (kandangNoticeTimer.current) clearTimeout(kandangNoticeTimer.current);
    kandangNoticeTimer.current = setTimeout(() => setKandangNotice(null), 6000);
  };

  const handleToggleKandang = async (k) => {
    const alreadySaved = kandangSaved.has(k);
    if (alreadySaved) {
      setKandangDone(p => { const n = new Set(p); n.delete(k); return n; });
      return;
    }
    // JEDA MINIMUM 60 DETIK antar kandang — tolak dengan hitungan mundur yang jelas & ramah
    if (lastCheckAtMs > 0) {
      const elapsedMs = Date.now() - lastCheckAtMs;
      if (elapsedMs < 60000) {
        const remaining = Math.ceil((60000 - elapsedMs) / 1000);
        setCooldownSec(remaining);
        return;
      }
    }
    // VALIDASI PENGEKUNCIAN LINTAS MODUL: kandang sudah dikerjakan rekan → tampilkan selesai di ubin + keterangan tertempel
    const lockByOther = allKandangDoneMap[k] && allKandangDoneMap[k].done_by_email !== user.email ? allKandangDoneMap[k] : null;
    if (lockByOther) {
      setKandangDone(p => { const n = new Set(p); n.add(k); return n; }); // ubin langsung tampil selesai
      showKandangNotice(`Kandang ${k} sudah dibersihkan ${lockByOther.done_by || "rekan"}${lockByOther.done_at ? ` jam ${lockByOther.done_at}` : ""}.`, "info");
      return;
    }
    // ANTI-DOBEL: cek apakah sudah ada log kebersihan (format lama atau baru) untuk kandang ini hari ini
    const dupLog = maintenanceLogs.find(l => matchKandangLog(l, "kebersihan", k));
    if (dupLog) {
      setKandangDone(p => { const n = new Set(p); n.add(k); return n; });
      setKandangSaved(p => { const n = new Set(p); n.add(k); return n; });
      return;
    }
    // Jika kebersihan wajib foto, buka kamera dulu (kamera langsung, anti galeri)
    if (requirePhotoKebersihan) {
      setPendingKandang(k);
      kandangPhotoRef.current = { received: false, k };
      const onWinFocus = () => {
        window.removeEventListener('focus', onWinFocus);
        setTimeout(() => {
          // Kamera ditutup tanpa memilih foto → beri keterangan tertempel, jangan diam
          if (!kandangPhotoRef.current.received && kandangPhotoRef.current.k === k) {
            setPendingKandang(null);
            showKandangNotice(`Foto belum diambil. Kandang ${k} wajib foto sebelum bisa dicentang. Ketuk ubin kandang lagi untuk membuka kamera.`, "error");
          }
        }, 600);
      };
      window.addEventListener('focus', onWinFocus);
      kandangCameraRef.current?.click();
      return;
    }
    await saveKandangDone(k, null);
  };

  const saveKandangDone = async (k, photoUrl) => {
    setKandangDone(p => { const n = new Set(p); n.add(k); return n; });
    try {
      const logData = {
        check_key: canonicalKandangCheckKey(user.email, "kebersihan", k, today),
        enclosure_id: k,
        enclosure_name: k,
        freq: "harian",
        item_id: canonicalKandangItemId("kebersihan", k),
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
      setLastCheckAtMs(Date.now()); // mulai jeda 60 dtk untuk kandang berikutnya
      refetchML();
      flashPoin(k, poinKebersihan);
      if (photoUrl) {
        syncPhotoToChecklist({
          employeeEmail: user.email, date: today,
          taskTitle: `Kebersihan ${k}`, enclosure: k,
          photoUrl, takenAt: nowStr(),
        });
      }
    } catch (err) {
      // Gagal simpan (sinyal buruk/error jaringan) → kembalikan ubin ke belum selesai + keterangan tertempel
      setKandangDone(p => { const n = new Set(p); n.delete(k); return n; });
      showKandangNotice(`Gagal menyimpan kandang ${k} — cek sinyal, lalu ketuk ubin kandang untuk mencoba lagi.`, "error");
    } finally {
      setPendingKandang(null);
    }
  };

  const handleKandangPhoto = async (file) => {
    if (!pendingKandang) return;
    kandangPhotoRef.current.received = true; // tandai foto sudah masuk → fokus handler tidak akan salah baca
    const k = pendingKandang;
    try {
      const compressed = await compressImage(file);
      if (!compressed) { setPendingKandang(null); return; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      await saveKandangDone(k, file_url);
    } catch (err) {
      setPendingKandang(null);
      showKandangNotice(`Gagal mengunggah foto kandang ${k} — cek sinyal, lalu ketuk ubin kandang untuk mencoba lagi.`, "error");
    }
  };

  // pakanDone & pakanSaved sekarang dikelola dalam WidgetPakan (self-contained)

  const handleLaporKura = async () => {
    if (!sakitForm.kura || sakitForm.diagnosis.length === 0 || !sakitForm.severity) {
      showMsg("warn", "Pilih kura, diagnosis, dan tingkat keparahan dulu ya.");
      return;
    }
    if (!sakitForm.treatment.trim()) {
      showMsg("warn", "Isi dulu perlakuan/tindakannya. Ini yang akan dibaca tim setiap hari.");
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
      treatment: sakitForm.treatment.trim(),
      description: `Dilaporkan oleh ${user.full_name || user.email}. Diagnosis: ${diagNames}${sakitForm.description ? `. Catatan: ${sakitForm.description}` : ""}`,
      diagnosis_notes: diagNames,
    });
    // Set is_currently_sick=true pada Tortoise
    try {
      await base44.entities.Tortoise.update(sakitForm.kura, perubahanSakit(kura, today));
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
    setSakitForm({ kura: "", diagnosis: [], severity: "", description: "", treatment: "" });
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
      {/* ── HEADER ──
          Keeper membuka layar ini puluhan kali sehari, hampir selalu sambil
          berdiri di kandang. Karena itu kemajuan hari ini ditaruh di header:
          berapa kandang beres, berapa poin terkumpul, sudah absen atau belum —
          semuanya terbaca dalam satu pandangan tanpa perlu menggulir. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-700 to-green-800 text-white px-5 pt-10 pb-5">
        <LeafPattern className="text-white opacity-[0.07]" />
        {/* Cahaya samar — memberi kedalaman pada blok warna datar */}
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-lime-300/15 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-green-200 text-sm">{getSalam()},</p>
              <h1 className="text-xl font-bold mt-0.5 truncate">
                {user?.full_name?.split(" ")[0] || "Keeper"} 👋
              </h1>
              <p className="text-green-200/90 text-xs mt-1 capitalize">{todayLabel}</p>
            </div>

            {/* Cincin kemajuan kandang — bentuk lingkaran lebih cepat dibaca
                daripada tulisan "3/8" saat layar dilirik sekilas. */}
            {daftarKandang.length > 0 && (
              <div className="relative flex-shrink-0 w-[62px] h-[62px]">
                <svg viewBox="0 0 62 62" className="w-full h-full -rotate-90">
                  <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="6" />
                  <circle
                    cx="31" cy="31" r="26" fill="none"
                    stroke={settledKandangCount >= daftarKandang.length ? "#bef264" : "#ffffff"}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - settledKandangCount / daftarKandang.length)}
                    style={{ transition: "stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                  <span className="text-sm font-bold tabular">
                    {settledKandangCount}<span className="opacity-60">/{daftarKandang.length}</span>
                  </span>
                  <span className="text-[8px] text-green-100/80 mt-0.5">kandang</span>
                </div>
              </div>
            )}
          </div>

          {/* Ringkasan hari ini — angka yang paling sering ditanyakan keeper */}
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
              {totalPoin} poin
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              hasCheckedIn ? "bg-lime-300/25 text-lime-100" : "bg-amber-300/25 text-amber-100"
            }`}>
              <Clock className="w-3.5 h-3.5" />
              {hasCheckedIn ? `Masuk ${attendance.check_in}` : "Belum absen"}
            </span>
            {sickTortoises.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-red-400/30 text-red-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                <Heart className="w-3.5 h-3.5" />
                {sickTortoises.length} kura sakit
              </span>
            )}
          </div>

          {/* Rincian poin — supaya jelas dari mana angkanya, bukan angka gaib */}
          {totalPoin > 0 && (
            <p className="text-[11px] text-green-200/80 mt-2">
              {poinCheckin > 0 && `Absen ${poinCheckin}`}
              {poinKandang > 0 && `${poinCheckin > 0 ? " · " : ""}Kandang ${poinKandang}`}
              {poinKura > 0 && `${poinCheckin > 0 || poinKandang > 0 ? " · " : ""}Lapor sakit ${poinKura}`}
            </p>
          )}
        </div>
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

        {/* ══ BONUS BULAN INI ════════════════════════════════
            Ditaruh di atas daftar tugas, bukan di halaman terpisah: poin baru
            memotivasi kalau terlihat pada saat orang memutuskan mau mengerjakan
            tugas berikutnya atau tidak. */}
        <WidgetErrorBoundary widgetName="Bonus Bulan Ini">
          <BonusBulanIni user={user} />
        </WidgetErrorBoundary>

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
            {sickTortoises.map(h => {
              const hari = h.since
                ? Math.max(0, Math.round((new Date(today) - new Date(h.since)) / 86400000))
                : null;
              return (
                <div key={h.id} className="p-3 bg-card rounded-xl border border-red-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-red-800">
                        {h.tortoise_name}
                        {h.enclosure ? <span className="font-normal text-red-500"> · {h.enclosure}</span> : null}
                      </p>
                      <p className="text-xs text-red-600">{h.diagnosis_notes || h.description || "Perlu diperiksa"}</p>
                    </div>
                    {h.severity && (
                      <span className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-red-100 text-red-700">
                        {h.severity}
                      </span>
                    )}
                  </div>

                  {h.treatment && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Perlakuan</p>
                      <p className="text-xs text-amber-900 whitespace-pre-line">{h.treatment}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {hari !== null && (
                      <span className="text-[11px] text-red-500 flex-1">
                        {hari === 0 ? "Dilaporkan hari ini" : `Sudah ${hari} hari sakit`}
                      </span>
                    )}
                    {!(hari > 14) && (
                      <button
                        onClick={() => handleLaporSembuh(h)}
                        disabled={sembuhLoading === h.tortoise_id}
                        className="flex-shrink-0 text-xs font-bold text-white bg-green-600 px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {sembuhLoading === h.tortoise_id ? "Menyimpan…" : "✓ Sudah Sembuh"}
                      </button>
                    )}
                  </div>

                  {/* Pengingat: kura sudah sakit >14 hari — mungkin lupa ditutup */}
                  {hari > 14 && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border-2 border-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-[11px] font-semibold text-amber-800 flex-1 leading-snug">
                        Sudah {hari} hari dalam perawatan — masih sakit atau lupa ditutup?
                      </p>
                      <button
                        onClick={() => handleLaporSembuh(h)}
                        disabled={sembuhLoading === h.tortoise_id}
                        className="flex-shrink-0 text-xs font-bold text-white bg-amber-600 px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {sembuhLoading === h.tortoise_id ? "Menyimpan…" : "Tandai Sembuh"}
                      </button>
                    </div>
                  )}

                  {/* Tugas perawatan harian: keeper mencatat perawatan hari ini */}
                  {!perawatanDoneIds.has(h.tortoise_id) ? (
                    <button
                      onClick={() => handlePerawatanDone(h)}
                      disabled={savingPerawatan === h.tortoise_id}
                      className="w-full text-xs font-semibold text-green-800 bg-green-100 border border-green-300 px-3 py-2 rounded-lg hover:bg-green-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {savingPerawatan === h.tortoise_id ? "Menyimpan…" : "✓ Perawatan hari ini sudah dilakukan"}
                    </button>
                  ) : (
                    <p className="text-[11px] text-green-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Perawatan hari ini sudah dicatat
                    </p>
                  )}

                  {/* Penutupan: tawarkan saat perawatan hari ini baru saja dicentang */}
                  {sembuhPrompt.has(h.tortoise_id) && (
                    <div className="p-2.5 rounded-lg bg-green-50 border-2 border-green-400 space-y-2">
                      <p className="text-xs font-semibold text-green-800">
                        Apakah {h.tortoise_name} sudah sembuh?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLaporSembuh(h)}
                          disabled={sembuhLoading === h.tortoise_id}
                          className="flex-1 text-xs font-bold text-white bg-green-600 px-3 py-2 rounded-lg disabled:opacity-50"
                        >
                          {sembuhLoading === h.tortoise_id ? "Menyimpan…" : "Ya, sudah sembuh"}
                        </button>
                        <button
                          onClick={() => dismissSembuhPrompt(h.tortoise_id)}
                          className="flex-1 text-xs font-bold text-foreground bg-muted px-3 py-2 rounded-lg hover:bg-gray-200"
                        >
                          Belum, lanjut besok
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {kritisNotifs.map(n => (
              <div key={n.id} className="flex items-start gap-2 bg-card rounded-xl border border-amber-200 p-2.5">
                <Bell className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">{n.title}</p>
                  {n.message && <p className="text-xs text-amber-700">{n.message}</p>}
                </div>
                <button onClick={() => dismissNotif(n.id)}><X className="w-4 h-4 text-muted-foreground" /></button>
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
              <span className="font-semibold text-foreground">Absensi</span>
              {hasCheckedOut && (
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Selesai</span>
              )}
            </div>

            {/* Hari yang sudah ditandai libur tidak lagi menawarkan check-in;
                tanpa syarat ini kedua blok tampil bersamaan. */}
            {!hasCheckedIn && attendance?.status !== "libur" && (
              <div>
                <p className="text-sm text-muted-foreground mb-3">Belum mulai kerja hari ini</p>
                <button
                  onClick={startCheckIn}
                  disabled={loading}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-2xl text-base active:scale-95 transition-transform disabled:opacity-60"
                >
                  {loading ? "Tunggu sebentar..." : "📸 CHECK IN — Selfie & Mulai Kerja"}
                </button>
                {farmConfigured && <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1"><MapPin className="w-3 h-3" /> GPS diperlukan</p>}

                <button
                  onClick={tandaiLibur}
                  disabled={loading}
                  className="w-full mt-2 border border-border text-muted-foreground font-medium py-2.5 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-60"
                >
                  Hari ini saya libur
                </button>
                <p className="text-[11px] text-center text-muted-foreground mt-1">
                  Hari libur tidak dihitung hari kerja. Tekan ini supaya tidak tercatat sebagai absensi yang lupa diisi.
                </p>
              </div>
            )}

            {!hasCheckedIn && attendance?.status === "libur" && (
              <p className="text-sm text-muted-foreground">Hari ini ditandai libur.</p>
            )}

            {hasCheckedIn && !hasCheckedOut && (
              <div>
                <p className="text-sm text-green-700 font-medium mb-1">✓ Masuk jam {attendance.check_in}</p>
                <p className="text-xs text-muted-foreground mb-3">Sudah bekerja {workDuration(attendance.check_in)}</p>
                <button
                  onClick={startCheckOut}
                  disabled={loading}
                  className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-60"
                >
                  {loading ? "Tunggu sebentar..." : "📸 CHECK OUT — Selfie & Selesai Kerja"}
                </button>
                {farmConfigured && <p className="text-xs text-center text-muted-foreground mt-2">GPS diperlukan untuk check out</p>}
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
        {/* Tugas suplemen yang mundur karena racikan tersedia disebut sekali,
            dengan alasannya. Tugas yang hilang tanpa keterangan terbaca sebagai
            aplikasi rusak - dan kiper yang bingung akan memberi suplemennya
            sendiri, yang justru membuat dosisnya dobel. */}
        {suplemenMundur > 0 && (
          <div className="bg-card rounded-xl border border-border p-3.5 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">🧪</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{suplemenMundur} tugas suplemen sedang tidak perlu.</span>{" "}
              Kalsium, asam folat, dan vitamin E sudah termasuk di dalam racikan Duta Repro yang diberikan hari ini.
              Jangan memberi tambahan lagi &mdash; dosisnya bisa dobel. Tugasnya kembali sendiri kalau racikan habis.
            </p>
          </div>
        )}

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
        <Widget done={settledKandangCount === daftarKandang.length}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">🏠</span>
                <span className="font-semibold text-foreground">Kunjungan Kandang</span>
                {requirePhotoKebersihan && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600"><Camera className="w-3 h-3" /> Wajib Foto</span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600"><Clock className="w-3 h-3" /> Jeda 60 dtk</span>
              </div>
              <span className="text-xs text-muted-foreground">{settledKandangCount}/{daftarKandang.length} selesai</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${(settledKandangCount / daftarKandang.length) * 100}%` }} />
            </div>

            {cooldownSec > 0 && (
              <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
                <p className="text-xs font-semibold text-amber-700">
                  Tunggu <span className="text-amber-800">{cooldownSec} detik</span> lagi sebelum kandang berikutnya. Satu kandang butuh waktu untuk dibersihkan.
                </p>
              </div>
            )}
            {kandangNotice && (
              <div className={`mb-3 p-2.5 rounded-lg flex items-center gap-2 ${kandangNotice.tone === "error" ? "bg-red-50 border border-red-300" : "bg-blue-50 border border-blue-300"}`}>
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${kandangNotice.tone === "error" ? "text-red-600" : "text-blue-600"}`} />
                <p className={`text-xs font-semibold ${kandangNotice.tone === "error" ? "text-red-700" : "text-blue-700"}`}>{kandangNotice.text}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mb-3">
              Tap kandang yang sudah selesai dikunjungi ·{" "}
              <span className="text-green-600 font-medium">+{poinKebersihan} poin per kandang</span>
              {requirePhotoKebersihan && <span className="text-red-500 font-medium"> · 📷 Wajib foto per kandang</span>}
            </p>
            {tugasUbin.length > 0 && (
              <div className="mb-3 rounded-lg bg-muted/60 border border-border px-3 py-2">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">Satu tap kandang mencakup:</p>
                <ul className="space-y-0.5">
                  {tugasUbin.map(t => (
                    <li key={t.id} className="text-[11px] text-foreground flex items-baseline gap-1.5">
                      <span className="text-green-600">✓</span>
                      <span>{t.title}</span>
                      <span className="text-muted-foreground">+{t.points}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2">
              {daftarKandang.map(k => {
                const done = kandangDone.has(k);
                const isPending = pendingKandang === k;
                const other = (allKandangDoneMap[k] && allKandangDoneMap[k].done_by_email !== user.email) ? allKandangDoneMap[k] : null;
                return (
                  <button
                    key={k}
                    onClick={() => handleToggleKandang(k)}
                    disabled={!!other}
                    title={other ? `Sudah dikerjakan ${other.done_by}${other.done_at ? ` jam ${other.done_at}` : ""}` : (done ? "Sudah kamu kerjakan" : "Tap jika sudah dibersihkan")}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                      done ? "bg-green-500 text-white shadow-md active:scale-90"
                      : other ? "bg-gray-200 text-muted-foreground border border-border"
                      : isPending ? "bg-amber-100 text-amber-600 animate-pulse active:scale-90"
                      : "bg-muted text-muted-foreground hover:bg-gray-200 active:scale-90"
                    }`}
                  >
                    {(done || other) ? <CheckCircle2 className="w-3.5 h-3.5 mb-0.5" /> : null}
                    <span className={other ? "line-through opacity-80" : ""}>{k}</span>
                    {other && <span className="text-[7px] font-normal mt-0.5 truncate w-full text-center px-0.5">{(other.done_by || "Rekan").split(" ")[0]}</span>}
                  </button>
                );
              })}
            </div>

            {settledKandangCount === daftarKandang.length && (
              <p className="text-center text-sm font-semibold text-green-700 mt-3">✓ Semua kandang sudah dibersihkan!</p>
            )}

            <input
              ref={kandangCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleKandangPhoto(e.target.files[0]); else setPendingKandang(null); e.target.value = ""; }}
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
              <span className="font-semibold text-foreground">Kondisi Kura Hari Ini</span>
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
                <p className="text-xs text-muted-foreground text-center mt-2">💡 Kura tidak mau makan atau gerak lambat? Pilih "Ada yang Sakit"</p>
              </>
            ) : kondisiOk === true && sakitReports.length === 0 ? (
              <div className="flex items-center gap-3 p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <p className="font-semibold text-green-800">Kondisi normal hari ini ✓</p>
                <button onClick={() => setKondisiOk(null)} className="ml-auto text-xs text-muted-foreground underline">Ubah</button>
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
                    tortoiseId={savedSakit.tortoise_id}
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
              <div className="mt-4 space-y-3 p-4 bg-card rounded-2xl border border-red-200">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-sm">Laporan Kura Sakit</p>
                  <button onClick={() => setShowSakitForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <TortoiseSearchSelect
                  tortoises={tortoises}
                  loading={tortoisesLoading}
                  error={tortoisesError}
                  onRetry={refetchTortoises}
                  value={sakitForm.kura}
                  onChange={(id) => setSakitForm(p => ({ ...p, kura: id }))}
                  placeholder="Pilih kura"
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
                            // Isi perlakuan otomatis dari protokol saat diagnosis dipilih.
                            // Keeper tinggal menyesuaikan, tidak perlu mengarang dari nol.
                            let nextTreatment = prev.treatment;
                            if (!isSel && !nextTreatment && Array.isArray(p.perawatan_pendukung) && p.perawatan_pendukung.length > 0) {
                              nextTreatment = p.perawatan_pendukung.map((x, i) => `${i + 1}. ${x}`).join("\n");
                            }
                            return { ...prev, diagnosis: next, severity: nextSeverity, treatment: nextTreatment };
                          })}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            sel ? "text-white border-[#1B4332]" : "bg-muted border-border text-muted-foreground"
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
                            : "bg-muted border-border text-muted-foreground"
                        }`}
                        style={sakitForm.severity === s.value ? { backgroundColor: "#1B4332" } : {}}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#1B4332" }}>
                    Perlakuan / tindakan * (wajib diisi)
                  </p>
                  <textarea
                    rows={4}
                    value={sakitForm.treatment}
                    onChange={e => setSakitForm(prev => ({ ...prev, treatment: e.target.value }))}
                    placeholder="Apa yang dilakukan untuk kura ini? Pilih diagnosis dulu, saran perawatan akan terisi otomatis."
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-400 outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ini yang akan muncul di layar tim setiap hari sampai kura dinyatakan sembuh.
                  </p>
                </div>
                <textarea
                  rows={2}
                  value={sakitForm.description}
                  onChange={e => setSakitForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Catatan tambahan (opsional)..."
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-400 outline-none"
                />
                <p className="text-xs text-green-600 font-semibold text-center">+15 poin untuk laporan ini</p>
                <button
                  onClick={handleLaporKura}
                  disabled={loading || !sakitForm.kura || sakitForm.diagnosis.length === 0 || !sakitForm.severity || !sakitForm.treatment.trim()}
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
        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Aksi Cepat</p>
          <div className="grid grid-cols-3 gap-2">
            <a href="/stok-unified" className="flex flex-col items-center gap-1.5 p-3 bg-muted rounded-xl hover:bg-muted active:scale-95 transition-all">
              <Package className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground text-center">Ambil Stok</span>
            </a>
            <button
              onClick={() => setShowCatatan(v => !v)}
              className="flex flex-col items-center gap-1.5 p-3 bg-muted rounded-xl hover:bg-muted active:scale-95 transition-all"
            >
              <ClipboardList className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground text-center">Catatan</span>
            </button>
            <a href="/health" className="flex flex-col items-center gap-1.5 p-3 bg-muted rounded-xl hover:bg-muted active:scale-95 transition-all">
              <Heart className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground text-center">Kesehatan</span>
            </a>
          </div>

          {showCatatan && (
            <div className="mt-3">
              <textarea
                rows={3}
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                placeholder="Tulis catatan hari ini..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-400 outline-none"
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
            <span className="text-xs text-muted-foreground">Selfie masuk {attendance.check_in}</span>
          </div>
        )}

        {hasCheckedOut && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-green-800 text-base">🏆 Ringkasan Hari Ini</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kandang dibersihkan</span>
                <span className="font-semibold">{kandangSaved.size} kandang</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kondisi kura</span>
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
            <span className="font-semibold text-foreground">Suplemen & Vitamin Hari Ini</span>
          </div>
          <span className="text-xs text-muted-foreground">{done.size}/{items.length}</span>
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
                    isDone ? "bg-green-50 border-green-400" : isSkipped ? "bg-muted border-border" : "bg-card border-border hover:border-yellow-400"
                  }`}
                >
                  <span className="text-xl flex-shrink-0">💊</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-foreground ${isSkipped ? "line-through text-muted-foreground" : ""}`}>{item.title}</p>
                    {stockLow && !isDone && !isSkipped && (
                      <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> ⚠️ Stok belum tersedia
                      </p>
                    )}
                    {isSkipped && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">⏭️ Dilewati - stok kosong</p>
                    )}
                  </div>
                  {isDone && <span className="text-xs text-green-600 font-bold flex-shrink-0">+5</span>}
                  {!isDone && !isSkipped && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stockLow && (
                        <button
                          onClick={() => handleSkip(item)}
                          disabled={processingId === item.id}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                        >
                          Dilewati
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={processingId === item.id}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          stockLow ? "border-border" : "border-border hover:border-yellow-400"
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