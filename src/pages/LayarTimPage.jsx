/**
 * Layar Tim — pantau aktivitas keeper hari ini apa adanya.
 *
 * Tujuan: menjawab pertanyaan "apa yang sebenarnya dikerjakan tim hari ini"
 * tanpa harus membuka checklist satu per satu.
 *
 * Tiga sinyal integritas yang dihitung otomatis:
 *  1. Kecepatan kandang — jeda rata-rata antar centang kebersihan kandang.
 *  2. Bukti foto      — berapa tugas wajib-foto yang dicentang tanpa foto.
 *  3. Foto menyusul   — selisih antara jam tugas dicentang dan jam foto diambil.
 *
 * Halaman ini HANYA membaca data. Tidak ada tombol yang mengubah apa pun.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { poinDisetujui, poinDiklaim } from "@/lib/poinChecklist";
import { format, subDays, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Users, Camera, CameraOff, Clock, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight, MapPin, Timer, ImageOff, Eye, FileEdit, WifiOff
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────
const toMin = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const isKandangTask = (t) =>
  typeof t?.task_id === "string" && t.task_id.includes("kebersihan_kandang");

function Stat({ icon: Icon, label, value, tone = "normal" }) {
  const tones = {
    normal: "bg-muted/50 text-foreground",
    good: "bg-green-50 text-green-700 border-green-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    bad: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-lg border border-transparent p-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[11px] opacity-70">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-sm font-bold mt-0.5 leading-tight">{value}</p>
    </div>
  );
}

function Flag({ tone, children }) {
  const map = {
    bad: "bg-red-50 border-red-200 text-red-700",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
  };
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${map[tone]}`}>
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ── Kartu per karyawan ────────────────────────────────────
function KeeperCard({ checklist, attendance }) {
  const [openTimeline, setOpenTimeline] = useState(false);

  const tasks = [...(checklist?.completed_tasks || [])].sort(
    (a, b) => (toMin(a.recorded_at) ?? 0) - (toMin(b.recorded_at) ?? 0)
  );

  const kandang = tasks.filter(isKandangTask);
  const kandangTimes = kandang.map((t) => toMin(t.recorded_at)).filter((v) => v !== null);

  // Jeda rata-rata antar kandang
  let avgGap = null, spanText = "—";
  if (kandangTimes.length >= 2) {
    const first = Math.min(...kandangTimes), last = Math.max(...kandangTimes);
    avgGap = (last - first) / (kandangTimes.length - 1);
    spanText = `${kandang[0]?.recorded_at}–${kandang[kandang.length - 1]?.recorded_at}`;
  }

  const kandangNoPhoto = kandang.filter((t) => !t.photo_url).length;
  const withPhoto = tasks.filter((t) => t.photo_url).length;
  // Layar ini menampilkan keadaan hari ini, bukan uang: untuk checklist yang
  // masih menunggu, yang pantas ditampilkan adalah klaimnya.
  const totalPoin = checklist?.status === "approved" ? poinDisetujui(checklist) : poinDiklaim(checklist);

  // Foto menyusul: jarak jam centang vs jam foto diambil > 20 menit
  const lateProof = tasks
    .map((t) => {
      const r = toMin(t.recorded_at), p = toMin(t.photo_taken_at);
      if (r === null || p === null) return null;
      const diff = p - r;
      return diff > 20 ? { ...t, diff } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.diff - a.diff);

  const aiTemuan = tasks.filter((t) => t.ai_temuan_penting && t.ai_status !== "selesai");

  // Absensi yang dibuat orang lain (mis. owner) = input manual, bukan check-in lapangan.
  const isManual =
    !!attendance &&
    (/manual/i.test(attendance.notes || "") ||
      (!!attendance.created_by && !!attendance.employee_email &&
        attendance.created_by !== attendance.employee_email));
  const hasGps = attendance?.check_in_lat != null && attendance?.check_in_lng != null;

  const statusMap = {
    approved: { t: "Disetujui", c: "bg-green-100 text-green-700" },
    submitted: { t: "Menunggu approval", c: "bg-amber-100 text-amber-800" },
    rejected: { t: "Ditolak", c: "bg-red-100 text-red-700" },
  };
  const st = statusMap[checklist?.status] ||
    (isManual && !checklist
      ? { t: "Input manual", c: "bg-slate-100 text-slate-600" }
      : { t: checklist?.status || "Belum kirim", c: "bg-muted text-muted-foreground" });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {checklist?.employee_name || attendance?.employee_name || "—"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {checklist?.employee_email || attendance?.employee_email}
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${st.c}`}>
          {st.t}
        </span>
      </div>

      {/* Statistik ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
        <Stat
          icon={Clock}
          label="Absensi"
          value={attendance?.check_in ? `${attendance.check_in}${attendance.check_out ? `–${attendance.check_out}` : " · belum pulang"}` : "Tidak absen"}
          tone={attendance?.check_in ? "normal" : "warn"}
        />
        <Stat
          icon={Timer}
          label="Jeda antar kandang"
          value={avgGap === null ? `${kandang.length} kandang` : `${avgGap.toFixed(1)} mnt · ${kandang.length} kandang`}
          tone={avgGap !== null && avgGap < 3 ? "bad" : avgGap !== null && avgGap < 6 ? "warn" : "normal"}
        />
        <Stat
          icon={withPhoto > 0 ? Camera : CameraOff}
          label="Tugas berfoto"
          value={`${withPhoto} dari ${tasks.length}`}
          tone={withPhoto === 0 && tasks.length > 0 ? "bad" : "normal"}
        />
        <Stat icon={CheckCircle2} label="Poin hari ini" value={totalPoin} tone="normal" />
      </div>

      {/* Bendera merah */}
      <div className="px-3 pb-3 space-y-1.5">
        {avgGap !== null && avgGap < 3 && (
          <Flag tone="bad">
            {kandang.length} kandang dicentang dalam rentang {spanText} — rata-rata {avgGap.toFixed(1)} menit per kandang.
            Terlalu cepat untuk pembersihan nyata.
          </Flag>
        )}
        {kandang.length > 0 && kandangNoPhoto === kandang.length && (
          <Flag tone="bad">
            Seluruh {kandang.length} kandang dicentang <strong>tanpa satu pun foto</strong>.
          </Flag>
        )}
        {kandang.length > 0 && kandangNoPhoto > 0 && kandangNoPhoto < kandang.length && (
          <Flag tone="warn">{kandangNoPhoto} dari {kandang.length} kandang tanpa foto bukti.</Flag>
        )}
        {lateProof.slice(0, 3).map((t) => (
          <Flag key={t.task_id} tone="warn">
            “{t.task_title}” dicentang {t.recorded_at} tapi fotonya baru diambil {t.photo_taken_at}
            {" "}(selisih {Math.floor(t.diff / 60) > 0 ? `${Math.floor(t.diff / 60)} jam ` : ""}{t.diff % 60} menit).
          </Flag>
        ))}
        {aiTemuan.slice(0, 2).map((t) => (
          <Flag key={t.task_id + "-ai"} tone="warn">AI pada “{t.task_title}”: {t.ai_temuan_penting}</Flag>
        ))}
        {isManual ? (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg border bg-slate-50 border-slate-200 text-xs text-slate-700">
            <FileEdit className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Absensi ini <strong>diinput manual</strong>, bukan check-in dari lapangan.
              {attendance?.notes ? ` Catatan: ${attendance.notes}` : ""}
            </span>
          </div>
        ) : (
          hasGps && attendance?.location_verified === false && (
            <Flag tone="warn">Check-in tercatat di luar radius kandang.</Flag>
          )
        )}
        {tasks.length === 0 && !isManual && (
          <p className="text-xs text-muted-foreground px-1">Belum ada tugas tercatat hari ini.</p>
        )}
      </div>

      {/* Timeline */}
      {tasks.length > 0 && (
        <>
          <button
            onClick={() => setOpenTimeline((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-border text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Urutan kerja ({tasks.length} tugas)</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openTimeline ? "rotate-90" : ""}`} />
          </button>
          {openTimeline && (
            <div className="px-4 py-3 border-t border-border space-y-1 max-h-80 overflow-y-auto">
              {tasks.map((t, i) => {
                const prev = i > 0 ? toMin(tasks[i - 1].recorded_at) : null;
                const cur = toMin(t.recorded_at);
                const gap = prev !== null && cur !== null ? cur - prev : null;
                return (
                  <div key={t.task_id + i} className="flex items-start gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                    <span className="font-mono text-muted-foreground w-11 flex-shrink-0">{t.recorded_at || "--:--"}</span>
                    <span className="flex-1 min-w-0">
                      <span className="truncate block">{t.task_title}</span>
                      {gap !== null && gap <= 2 && (
                        <span className="text-[10px] text-red-600 font-medium">+{gap} menit dari tugas sebelumnya</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-muted-foreground">{t.points || 0}p</span>
                      {t.photo_url ? (
                        <a href={t.photo_url} target="_blank" rel="noreferrer" title={`Foto diambil ${t.photo_taken_at || "-"}`}>
                          <Camera className="w-3.5 h-3.5 text-green-600" />
                        </a>
                      ) : (
                        <ImageOff className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Halaman ───────────────────────────────────────────────
export default function LayarTimPage() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["layar-tim-checklist", date],
    queryFn: () => base44.entities.DailyChecklist.filter({ date }),
    staleTime: 60 * 1000,
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["layar-tim-attendance", date],
    queryFn: () => base44.entities.Attendance.filter({ date }),
    staleTime: 60 * 1000,
  });

  // Gabung per email; abaikan data uji agar statistik tidak tercemar
  const rows = checklists
    .filter((c) => !c.is_test_data && !c.excluded_from_reports)
    .map((c) => ({
      key: c.employee_email || c.id,
      checklist: c,
      attendance: attendances.find((a) => a.employee_email === c.employee_email) || null,
    }));

  // Karyawan yang absen tapi tidak punya checklist sama sekali
  attendances
    .filter((a) => !checklists.some((c) => c.employee_email === a.employee_email))
    .forEach((a) => rows.push({ key: a.employee_email || a.id, checklist: null, attendance: a }));

  const isToday = date === format(new Date(), "yyyy-MM-dd");
  const shift = (n) => setDate(format(n > 0 ? addDays(new Date(date), 1) : subDays(new Date(date), 1), "yyyy-MM-dd"));

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold font-heading flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Layar Tim
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Apa yang benar-benar dikerjakan tim — urutan, jeda waktu, dan bukti foto.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          <button onClick={() => shift(-1)} className="p-1.5 rounded hover:bg-muted" aria-label="Hari sebelumnya">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium px-2 whitespace-nowrap">
            {format(new Date(date), "EEE, d MMM yyyy", { locale: idLocale })}
          </span>
          <button
            onClick={() => shift(1)}
            disabled={isToday}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Halaman ini hanya membaca. Angka jeda dihitung dari jam pencatatan tiap tugas,
          bukan dari perkiraan. Jeda di bawah 3 menit per kandang ditandai merah.
        </span>
      </div>

      {!isLoading && attendances.length > 0 && checklists.length === 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-100 border border-slate-300 text-xs text-slate-700">
          <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Tidak ada satu pun checklist pada tanggal ini, padahal absensi tercatat.
            Ini biasanya berarti <strong>aplikasi tidak dapat diakses</strong> pada hari tersebut —
            bukan berarti tim tidak bekerja. Jangan pakai hari ini sebagai dasar penilaian.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Tidak ada aktivitas tercatat pada tanggal ini.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <KeeperCard key={r.key} checklist={r.checklist} attendance={r.attendance} />
          ))}
        </div>
      )}
    </div>
  );
}
