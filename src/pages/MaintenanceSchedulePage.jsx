import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, AlertCircle, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";

const TODAY = format(new Date(), "yyyy-MM-dd");
const NOW_HOUR = new Date().getHours();

// ── CHECKLIST TEMPLATES ───────────────────────────────────────────────────────
const DAILY_ITEMS = [
  { id: "d1", emoji: "🧹", label: "Bersihkan kotoran kura dari kandang" },
  { id: "d2", emoji: "💧", label: "Cuci & isi tempat minum segar" },
  { id: "d3", emoji: "🥬", label: "Buang sisa pakan basi/layu" },
  { id: "d4", emoji: "👀", label: "Cek visual: pagar, dinding, pintu kandang" },
  { id: "d5", emoji: "🌡️", label: "Cek lampu UVB (nyala/mati)" },
  { id: "d6", emoji: "🏖️", label: "Ratakan & kembalikan pasir/substrat" },
];

const WEEKLY_ITEMS = [
  { id: "w1", emoji: "🧽", label: "Cuci bersih tempat pakan & minum" },
  { id: "w2", emoji: "🌴", label: "Jemur substrat (coco husk) 1 jam di matahari" },
  { id: "w3", emoji: "🔧", label: "Cek & perbaiki pagar/dinding yang rusak" },
  { id: "w4", emoji: "🚿", label: "Semprot & sikat karpet PVC (jika pakai)" },
  { id: "w5", emoji: "🌿", label: "Potong rumput/tanaman yang terlalu lebat" },
];

const MONTHLY_ITEMS = [
  { id: "m1", emoji: "🔄", label: "Ganti substrat/pasir yang sudah kotor" },
  { id: "m2", emoji: "💡", label: "Cek lampu UVB (ganti jika sudah > 6 bulan)" },
  { id: "m3", emoji: "🎨", label: "Cek cat/lapisan anti-karat pada pagar besi" },
  { id: "m4", emoji: "🔍", label: "Inspeksi menyeluruh struktur kandang" },
];

// ── CHECKLIST LOG KEY ─────────────────────────────────────────────────────────
// Key format: enclosure_id__freq__item_id__date
function logKey(encId, freq, itemId, date) {
  return `${encId}__${freq}__${itemId}__${date}`;
}
function weekKey() {
  const d = new Date();
  const wk = Math.ceil(d.getDate() / 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-W${wk}`;
}
function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── ENCLOSURE CHECKLIST CARD ─────────────────────────────────────────────────
function EnclosureChecklistCard({ enclosure, logs, freq, onCheck, onVerify, userRole }) {
  const items = freq === "harian" ? DAILY_ITEMS : freq === "mingguan" ? WEEKLY_ITEMS : MONTHLY_ITEMS;
  const periodKey = freq === "harian" ? TODAY : freq === "mingguan" ? weekKey() : monthKey();
  const canVerify = ["kepala_feeder", "manajer", "admin", "owner"].includes(userRole);

  const checkedItems = items.filter(item => {
    const key = logKey(enclosure.id, freq, item.id, periodKey);
    return logs.some(l => l.check_key === key && l.is_done);
  });

  const verifiedItems = items.filter(item => {
    const key = logKey(enclosure.id, freq, item.id, periodKey);
    return logs.some(l => l.check_key === key && l.is_verified);
  });

  const allDone = checkedItems.length === items.length;
  const allVerified = verifiedItems.length === items.length;

  return (
    <Card className={`p-4 ${allVerified ? "border-green-400 bg-green-50/20" : allDone ? "border-blue-300 bg-blue-50/10" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-sm">{enclosure.name}</h3>
          {enclosure.tortoise_count > 0 && (
            <p className="text-xs text-muted-foreground">{enclosure.tortoise_count} kura-kura</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {allVerified ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-[11px]">✅ Terverifikasi</Badge>
          ) : allDone ? (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[11px]">🔵 Selesai, perlu verifikasi</Badge>
          ) : checkedItems.length > 0 ? (
            <Badge variant="outline" className="text-[11px]">🟡 {checkedItems.length}/{items.length} selesai</Badge>
          ) : (
            <Badge variant="outline" className="text-orange-500 border-orange-300 text-[11px]">⚠️ Belum Dimulai</Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all bg-primary"
          style={{ width: `${(checkedItems.length / items.length) * 100}%` }} />
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.map(item => {
          const key = logKey(enclosure.id, freq, item.id, periodKey);
          const log = logs.find(l => l.check_key === key);
          const isDone = log?.is_done;
          const isVerified = log?.is_verified;

          return (
            <div key={item.id} className="flex items-center gap-2 group">
              <button
                onClick={() => !isVerified && onCheck(enclosure, freq, item, periodKey, log)}
                className={`flex-shrink-0 transition-colors ${isVerified ? "cursor-default text-green-500" : isDone ? "text-primary cursor-pointer" : "text-muted-foreground hover:text-primary cursor-pointer"}`}
              >
                {isVerified ? <CheckCheck className="w-4 h-4 text-green-500" /> :
                 isDone ? <CheckCircle2 className="w-4 h-4 text-primary" /> :
                 <Circle className="w-4 h-4" />}
              </button>
              <span className={`text-sm flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
                {item.emoji} {item.label}
              </span>
              {isDone && log?.done_at && (
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {log.done_at} {log.done_by ? `· ${log.done_by}` : ""}
                </span>
              )}
              {isDone && !isVerified && canVerify && (
                <button onClick={() => onVerify(log)}
                  className="text-[10px] text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  Verifikasi
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch verify */}
      {allDone && !allVerified && canVerify && (
        <Button size="sm" variant="outline" className="mt-3 w-full h-8 text-xs gap-1.5 text-blue-700 border-blue-300"
          onClick={() => items.forEach(item => {
            const key = logKey(enclosure.id, freq, item.id, periodKey);
            const log = logs.find(l => l.check_key === key && !l.is_verified);
            if (log) onVerify(log);
          })}>
          <CheckCheck className="w-3.5 h-3.5" /> Verifikasi Semua
        </Button>
      )}
    </Card>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function MaintenanceSchedulePage() {
  const { user, role } = useCurrentUser();
  const [freq, setFreq] = useState("harian");
  const [encFilter, setEncFilter] = useState("semua");
  const qc = useQueryClient();

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.filter({ is_active: true }, "name", 50),
  });

  const { data: rawLogs = [] } = useQuery({
    queryKey: ["enclosure-clean-logs"],
    queryFn: () => base44.entities.MaintenanceLog.list("-created_date", 500),
  });

  // Flatten: deduplicate by check_key (keep latest)
  const logs = useMemo(() => {
    const map = new Map();
    rawLogs.forEach(l => {
      if (!l.check_key) return;
      const existing = map.get(l.check_key);
      if (!existing || l.created_date > existing.created_date) map.set(l.check_key, l);
    });
    return Array.from(map.values());
  }, [rawLogs]);

  // Filter enclosures
  const visibleEnclosures = encFilter === "semua" ? enclosures : enclosures.filter(e => e.id === encFilter);

  // Stats for today
  const todayKeys = DAILY_ITEMS.flatMap(item => enclosures.map(enc => logKey(enc.id, "harian", item.id, TODAY)));
  const todayDone = logs.filter(l => todayKeys.includes(l.check_key) && l.is_done).length;
  const todayTotal = todayKeys.length;

  const handleCheck = async (enclosure, freq, item, periodKey, existingLog) => {
    const key = logKey(enclosure.id, freq, item.id, periodKey);
    const nowStr = format(new Date(), "HH:mm");

    if (existingLog?.is_done) {
      // Uncheck
      await base44.entities.MaintenanceLog.update(existingLog.id, { is_done: false, is_verified: false });
    } else if (existingLog) {
      await base44.entities.MaintenanceLog.update(existingLog.id, {
        is_done: true, done_at: nowStr, done_by: user?.full_name || user?.email || "",
      });
    } else {
      await base44.entities.MaintenanceLog.create({
        check_key: key,
        enclosure_id: enclosure.id,
        enclosure_name: enclosure.name,
        freq,
        item_id: item.id,
        item_label: item.label,
        period_key: periodKey,
        is_done: true,
        is_verified: false,
        done_at: nowStr,
        done_by: user?.full_name || user?.email || "",
        done_by_email: user?.email || "",
        poin_earned: 5,
      });
    }
    // Update juga jika existing sudah ada tapi is_done berubah ke true
    if (existingLog && !existingLog.is_done) {
      await base44.entities.MaintenanceLog.update(existingLog.id, {
        done_by_email: user?.email || "",
        poin_earned: existingLog.poin_earned || 5,
      });
    }
    qc.invalidateQueries({ queryKey: ["enclosure-clean-logs"] });
  };

  const handleVerify = async (log) => {
    if (!log?.id) return;
    await base44.entities.MaintenanceLog.update(log.id, {
      is_verified: true,
      verified_by: user?.full_name || user?.email || "",
      verified_at: format(new Date(), "HH:mm"),
    });
    qc.invalidateQueries({ queryKey: ["enclosure-clean-logs"] });
    toast.success("Terverifikasi");
  };

  const alertLate = NOW_HOUR >= 17 && todayDone < todayTotal;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">Kebersihan Kandang</h1>
        <p className="text-muted-foreground text-sm">Checklist kebersihan & perawatan fisik per kandang</p>
      </div>

      {/* Alert */}
      {alertLate && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-xl border border-red-300 text-sm font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Sudah jam {NOW_HOUR}:00 — {todayTotal - todayDone} checklist harian BELUM selesai!
        </div>
      )}

      {/* Summary widget */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{todayDone}</p>
          <p className="text-xs text-muted-foreground">Selesai Hari Ini</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{todayTotal}</p>
          <p className="text-xs text-muted-foreground">Total Checklist</p>
        </Card>
        <Card className={`p-4 text-center ${todayDone === todayTotal && todayTotal > 0 ? "bg-green-50 border-green-300" : ""}`}>
          <p className={`text-2xl font-bold ${todayDone === todayTotal && todayTotal > 0 ? "text-green-600" : "text-orange-600"}`}>
            {todayDone === todayTotal && todayTotal > 0 ? "✅" : `${todayTotal - todayDone}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {todayDone === todayTotal && todayTotal > 0 ? "Semua Bersih!" : "Belum Selesai"}
          </p>
        </Card>
      </div>

      {/* Freq Tabs + Enc Filter */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5">
          {[["harian","Harian"],["mingguan","Mingguan"],["bulanan","Bulanan"]].map(([v, l]) => (
            <button key={v} onClick={() => setFreq(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${freq === v ? "bg-primary text-primary-foreground" : "bg-background border-border hover:bg-muted"}`}>
              {l}
            </button>
          ))}
        </div>
        <select value={encFilter} onChange={e => setEncFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm">
          <option value="semua">Semua Kandang</option>
          {enclosures.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Grid */}
      {enclosures.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Belum ada data kandang. Tambahkan kandang terlebih dahulu.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleEnclosures.map(enc => (
            <EnclosureChecklistCard
              key={enc.id}
              enclosure={enc}
              logs={logs}
              freq={freq}
              onCheck={handleCheck}
              onVerify={handleVerify}
              userRole={role}
            />
          ))}
        </div>
      )}
    </div>
  );
}