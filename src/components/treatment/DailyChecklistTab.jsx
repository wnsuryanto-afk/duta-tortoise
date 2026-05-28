import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";

const TODAY = format(new Date(), "yyyy-MM-dd");

// ── TREATMENT TEMPLATES PER FREQUENCY ───────────────────────────────────────
const DAILY_TREATMENTS = [
  {
    id: "pagi_pakan",
    time: "08:00",
    emoji: "☀️",
    label: "Pakan Pagi",
    detail: "Sayuran segar: selada, sawi, fumak, daun kembang sepatu + pelet kura darat",
    dose: "Baby: 2-3% BB | Juvenile: 1.5-2% BB | Dewasa: 1% BB",
    mod_type: "lainnya",
  },
  {
    id: "rendam",
    time: "10:00",
    emoji: "🛁",
    label: "Rendam Air Hangat",
    detail: "Rendam 15-30 menit di bawah sinar matahari. Untuk minum, BAB, dan hidrasi.",
    dose: "",
    mod_type: "mandi",
  },
  {
    id: "jemur",
    time: "10:30",
    emoji: "🌤️",
    label: "Jemur UVB Alami",
    detail: "Jemur di pasir/tanah 1 jam. Pastikan ada area teduh untuk kabur jika kepanasan.",
    dose: "",
    mod_type: "lainnya",
  },
  {
    id: "sore_pakan",
    time: "15:00",
    emoji: "🥬",
    label: "Pakan Sore",
    detail: "Rumput gajah, hay kering, atau hijauan lainnya.",
    dose: "",
    mod_type: "lainnya",
  },
  {
    id: "air_minum",
    time: "Sepanjang hari",
    emoji: "💧",
    label: "Cek Air Minum",
    detail: "Pastikan air minum segar selalu tersedia dan tidak kotor.",
    dose: "",
    mod_type: "lainnya",
  },
];

const WEEKLY_TREATMENTS = [
  {
    id: "kalsium_d3",
    day: "Senin",
    emoji: "🦴",
    label: "Vitamin & Kalsium D3",
    detail: "Taburkan di atas pakan.",
    dose: "1 sendok teh per 5kg BB",
    mod_type: "vitamin",
  },
  {
    id: "vitamin_e",
    day: "Rabu",
    emoji: "🌸",
    label: "Vitamin E (indukan aktif)",
    detail: "1 tablet per 10kg BB, campur ke pakan. Khusus indukan aktif breeding.",
    dose: "1 tablet per 10kg BB",
    mod_type: "vitamin",
  },
  {
    id: "probiotik",
    day: "Jumat",
    emoji: "🦠",
    label: "Probiotik Reptil",
    detail: "Campur ke air rendaman untuk pencernaan sehat.",
    dose: "Sesuai petunjuk kemasan",
    mod_type: "obat",
  },
];

const MONTHLY_TREATMENTS = [
  { id: "m_visual",  week: "Minggu 1", emoji: "👁️",  label: "Cek Visual Seluruh Kura", detail: "Periksa mata, mulut, cangkang, kaki, ekor, kloaka." },
  { id: "m_timbang", week: "Minggu 2", emoji: "⚖️",  label: "Timbang & Ukur Cangkang",  detail: "Baby: tiap 2 minggu | Juvenile: tiap 1 bulan | Dewasa: tiap 3 bulan." },
  { id: "m_bersih",  week: "Minggu 3", emoji: "🪥",  label: "Bersihkan Cangkang",        detail: "Sikat lembut + air bersih. Jangan pakai sabun." },
  { id: "m_foto",    week: "Minggu 4", emoji: "📷",  label: "Foto Dokumentasi",           detail: "Foto progress pertumbuhan dari sudut yang sama setiap bulan." },
];

const QUARTERLY_TREATMENTS = [
  { id: "q_deworming", emoji: "💊", label: "Deworming",    detail: "Fenbendazole 50mg/kg BB, 3 hari berturut. Ulangi 2 minggu kemudian (booster). Khusus kura > 6 bulan.", dose: "50mg/kg BB" },
  { id: "q_fecal",    emoji: "🔬", label: "Fecal Test",   detail: "Ambil sampel feses, kirim ke lab/drh untuk pemeriksaan parasit.", dose: "" },
  { id: "q_kulit",    emoji: "🔍", label: "Cek Kulit",    detail: "Periksa tungau/kutu di lipatan kulit, ketiak, dan pangkal kaki.", dose: "" },
];

// ── LOG KEY ──────────────────────────────────────────────────────────────────
function treatLogKey(tortId, treatId) {
  return `${tortId}__${treatId}__${TODAY}`;
}
function weekTreatLogKey(tortId, treatId) {
  const d = new Date();
  const wk = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}-${d.getMonth() + 1}`;
  return `${tortId}__${treatId}__${wk}`;
}

// ── TORTOISE ROW ─────────────────────────────────────────────────────────────
function TortoiseRow({ tortoise, treatId, logs, onCheck, user }) {
  const key = treatLogKey(tortoise.id, treatId);
  const log = logs.find(l => l.treat_log_key === key);
  const isDone = log?.is_done;

  return (
    <button
      onClick={() => onCheck(tortoise, treatId, key, log)}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-all text-left ${
        isDone ? "bg-green-50 border-green-300 text-green-700 cursor-default" : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
      }`}>
      {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="truncate font-medium">{tortoise.name}</span>
      {tortoise.age_category && <span className="text-[10px] opacity-60 flex-shrink-0">{tortoise.age_category}</span>}
    </button>
  );
}

// ── TREATMENT ITEM CARD ──────────────────────────────────────────────────────
function TreatmentItemCard({ treat, tortoises, logs, onCheck, user, timeLabel }) {
  const [expanded, setExpanded] = useState(false);
  const doneCount = tortoises.filter(t => {
    const log = logs.find(l => l.treat_log_key === treatLogKey(t.id, treat.id));
    return log?.is_done;
  }).length;
  const total = tortoises.length;
  const allDone = doneCount === total && total > 0;

  return (
    <Card className={`overflow-hidden ${allDone ? "border-green-400 bg-green-50/20" : ""}`}>
      <div className="p-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0">{treat.emoji}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {timeLabel && <span className="text-[11px] text-muted-foreground font-medium">{timeLabel}</span>}
                <p className="font-semibold text-sm">{treat.label}</p>
              </div>
              {treat.detail && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{treat.detail}</p>}
              {treat.dose && <p className="text-xs text-primary mt-0.5">💊 {treat.dose}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={`text-[11px] ${allDone ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              {doneCount}/{total}
            </Badge>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        {/* mini progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden mt-2">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }} />
        </div>
      </div>

      {expanded && total > 0 && (
        <div className="px-3 pb-3 border-t">
          <p className="text-xs text-muted-foreground mb-2 pt-2">Klik kura-kura untuk tandai selesai:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {tortoises.map(t => (
              <TortoiseRow key={t.id} tortoise={t} treatId={treat.id} logs={logs} onCheck={onCheck} user={user} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DailyChecklistTab() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [freqTab, setFreqTab] = useState("harian");
  const [encFilter, setEncFilter] = useState("semua");

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-active"],
    queryFn: () => base44.entities.Tortoise.filter({ status: "aktif" }, "name", 200),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["treat-daily-logs", TODAY],
    queryFn: () => base44.entities.TreatmentLog.filter({ done_date: TODAY }, "-created_date", 1000),
  });

  const enclosures = useMemo(() => [...new Set(tortoises.map(t => t.enclosure).filter(Boolean))].sort(), [tortoises]);
  const filteredTortoises = encFilter === "semua" ? tortoises : tortoises.filter(t => t.enclosure === encFilter);

  const handleCheck = async (tortoise, treatId, key, existingLog) => {
    if (existingLog?.is_done) {
      // Uncheck - update log
      await base44.entities.TreatmentLog.update(existingLog.id, { is_done: false });
    } else if (existingLog) {
      await base44.entities.TreatmentLog.update(existingLog.id, { is_done: true });
    } else {
      await base44.entities.TreatmentLog.create({
        treat_log_key: key,
        schedule_id: "daily-checklist",
        schedule_title: treatId,
        tortoise_id: tortoise.id,
        tortoise_name: tortoise.name,
        done_date: TODAY,
        done_by: user?.full_name || user?.email || "",
        is_done: true,
        notes: "",
      });
    }
    qc.invalidateQueries({ queryKey: ["treat-daily-logs", TODAY] });
  };

  // Summary
  const dailyDone = DAILY_TREATMENTS.reduce((acc, treat) => {
    return acc + filteredTortoises.filter(t => logs.some(l => l.treat_log_key === treatLogKey(t.id, treat.id) && l.is_done)).length;
  }, 0);
  const dailyTotal = DAILY_TREATMENTS.length * filteredTortoises.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border">
        <div className="text-center px-3">
          <p className="text-2xl font-bold text-primary">{dailyDone}</p>
          <p className="text-xs text-muted-foreground">Selesai</p>
        </div>
        <div className="text-center px-3 border-l">
          <p className="text-2xl font-bold">{dailyTotal}</p>
          <p className="text-xs text-muted-foreground">Total Hari Ini</p>
        </div>
        <div className="flex-1 ml-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${dailyTotal > 0 ? (dailyDone / dailyTotal) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{dailyTotal > 0 ? Math.round((dailyDone / dailyTotal) * 100) : 0}% selesai</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {[["harian","☀️ Harian"],["mingguan","📅 Mingguan"],["bulanan","🗓️ Bulanan"],["quarterly","⚕️ Quarterly"]].map(([v, l]) => (
            <button key={v} onClick={() => setFreqTab(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${freqTab === v ? "bg-primary text-primary-foreground" : "bg-background border-border hover:bg-muted"}`}>
              {l}
            </button>
          ))}
        </div>
        <select value={encFilter} onChange={e => setEncFilter(e.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-background text-xs ml-auto">
          <option value="semua">Semua Kandang</option>
          {enclosures.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Harian */}
      {freqTab === "harian" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy", { locale: undefined })} — Treatment Harian</p>
          {DAILY_TREATMENTS.map(treat => (
            <TreatmentItemCard key={treat.id} treat={treat} tortoises={filteredTortoises}
              logs={logs} onCheck={handleCheck} user={user} timeLabel={treat.time} />
          ))}
        </div>
      )}

      {/* Mingguan */}
      {freqTab === "mingguan" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Treatment Mingguan — centang setelah selesai dilakukan minggu ini</p>
          {WEEKLY_TREATMENTS.map(treat => (
            <TreatmentItemCard key={treat.id} treat={treat} tortoises={filteredTortoises}
              logs={logs} onCheck={handleCheck} user={user} timeLabel={treat.day} />
          ))}
        </div>
      )}

      {/* Bulanan */}
      {freqTab === "bulanan" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Treatment Bulanan — centang setelah selesai dilakukan bulan ini</p>
          {MONTHLY_TREATMENTS.map(treat => (
            <Card key={treat.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{treat.emoji}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[11px]">{treat.week}</Badge>
                    <p className="font-semibold text-sm">{treat.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{treat.detail}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quarterly */}
      {freqTab === "quarterly" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Treatment Per 3 Bulan (Quarterly) — untuk kura &gt; 6 bulan</p>
          {QUARTERLY_TREATMENTS.map(treat => (
            <Card key={treat.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{treat.emoji}</span>
                <div>
                  <p className="font-semibold text-sm">{treat.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{treat.detail}</p>
                  {treat.dose && <p className="text-xs text-primary font-medium mt-1">💊 Dosis: {treat.dose}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}