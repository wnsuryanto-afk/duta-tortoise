import { useState, useMemo } from "react";
import { Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { isManagerLevel } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { getBreedingMilestones, isBatchSegera, getNextMilestone } from "@/lib/breedingCalendarUtils";
import BreedingBatchDetail from "@/components/breeding/BreedingBatchDetail";
import { clutchAktif } from "@/lib/breedingUtils";
import { STATUS_ADA_HASIL } from "@/lib/hasilInkubasi";

const STATUS_CONFIG = {
  bertelur: { label: "Bertelur", color: "bg-amber-100 text-amber-700 border-amber-200" },
  inkubasi: { label: "Di Inkubator", color: "bg-blue-100 text-blue-700 border-blue-200" },
  menetas:  { label: "Menetas", color: "bg-green-100 text-green-700 border-green-200" },
  gagal:    { label: "Gagal", color: "bg-red-100 text-red-700 border-red-200" },
  selesai:  { label: "Selesai", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

function fmtShort(d) {
  if (!d) return "—";
  try { return format(d, "d MMM", { locale: idLocale }); } catch { return "—"; }
}

function BatchTimeline({ batch, now, onClick }) {
  const m = getBreedingMilestones(batch);
  const cfg = STATUS_CONFIG[batch.status] || STATUS_CONFIG.selesai;
  const isSegera = isBatchSegera(batch, now);

  if (!m.hasTimeline) {
    return (
      <button
        type="button"
        className="w-full text-left bg-card rounded-xl border border-border p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="min-w-0 text-sm font-semibold truncate">♀ {batch.female_name} × ♂ {batch.male_name}</p>
            <p className="text-xs text-muted-foreground">Belum ada tanggal kawin</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
        </div>
      </button>
    );
  }

  const steps = [
    { label: "Kawin", date: m.mating, done: !!m.mating },
    { label: "Bertelur", date: m.eggLaying, est: !m.eggLaying ? [m.estEggLayStart, m.estEggLayEnd] : null, done: !!m.eggLaying },
    { label: "Menetas", date: m.hatch, est: !m.hatch ? [m.estHatchStart, m.estHatchEnd] : null, done: !!m.hatch },
  ];

  return (
    <button
      type="button"
      className={`w-full text-left bg-card rounded-xl border p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${isSegera ? "border-amber-300 ring-1 ring-amber-200" : "border-border"}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">♀ {batch.female_name} × ♂ {batch.male_name}</p>
          <p className="text-xs text-muted-foreground">
            {batch.egg_count ? `${batch.egg_count} telur` : "Belum bertelur"}
            {batch.incubator_name ? ` · ${batch.incubator_name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isSegera && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 animate-pulse">
              SEGERA
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Horizontal timeline */}
      <div className="flex items-start">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 48 }}>
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  s.done ? "bg-primary border-primary"
                  : s.est ? "bg-amber-100 border-amber-400"
                  : "bg-muted border-muted-foreground/30"
                }`}
              />
              <span className="text-[10px] font-medium mt-1 text-center">{s.label}</span>
              <span className="text-[9px] text-muted-foreground text-center leading-tight">
                {s.date ? fmtShort(s.date) : s.est && s.est[0] ? `±${fmtShort(s.est[0])}` : "—"}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-1.5 mx-1 ${s.done ? "bg-primary/40" : "bg-muted-foreground/20"}`}
                style={{ minWidth: 12 }}
              />
            )}
          </div>
        ))}
      </div>
    </button>
  );
}

function HistoryCard({ batch, onClick }) {
  const cfg = STATUS_CONFIG[batch.status] || STATUS_CONFIG.selesai;
  const m = getBreedingMilestones(batch);
  return (
    <button
      type="button"
      className="w-full text-left bg-card rounded-xl border border-border p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="min-w-0 text-sm font-semibold truncate">♀ {batch.female_name} × ♂ {batch.male_name}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-base font-bold text-amber-600">{batch.egg_count || 0}</p>
          <p className="text-[9px] text-muted-foreground">telur</p>
        </div>
        <div>
          <p className="text-base font-bold text-green-600">{batch.hatched_count || 0}</p>
          <p className="text-[9px] text-muted-foreground">menetas</p>
        </div>
        <div>
          <p className="text-base font-bold text-red-500">{batch.failed_count || 0}</p>
          <p className="text-[9px] text-muted-foreground">gagal</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        {m.hatch ? `Menetas ${fmtShort(m.hatch)}` : m.completed ? `Selesai ${fmtShort(m.completed)}` : ""}
      </p>
    </button>
  );
}

function SegeraRow({ batch, now, onClick }) {
  const next = getNextMilestone(batch, now);
  return (
    <button
      className="w-full text-left flex items-center justify-between gap-2 text-xs hover:bg-amber-100/50 rounded-lg p-1.5 transition-colors"
      onClick={onClick}
    >
      <span className="text-amber-800">
        ♀ {batch.female_name} × ♂ {batch.male_name}
      </span>
      <span className="text-amber-700 font-medium flex items-center gap-1 flex-shrink-0">
        {next?.label} ±{next?.start ? fmtShort(next.start) : ""}
        <ChevronRight className="w-3 h-3" />
      </span>
    </button>
  );
}

/**
 * Timeline perkembangan batch breeding — dulu halaman `/breeding-calendar`.
 *
 * Disatukan sebagai tab di halaman Breeding & Telur pada 30 September 2026.
 * Isinya sendiri TIDAK tumpang tindih dengan tab lain — timeline per batch
 * (kawin → bertelur → perkiraan menetas → menetas) benar-benar berbeda dari
 * kisi telur di tab "Riwayat". Yang dihapus hanya jalan masuknya yang
 * terpisah: sepuluh catatan yang sama tidak butuh empat pintu di menu.
 *
 * Halaman aslinya membaca `Breeding` sendiri. Sebagai tab ia menerima
 * `batches` dari induknya, supaya sepuluh baris itu tidak ditarik dua kali
 * dalam satu halaman.
 */
export default function TimelineBatch({ batches }) {
  const { role, isLoading: userLoading } = useCurrentUser();
  const [selectedBatch, setSelectedBatch] = useState(null);
  // Data datang dari induknya — lihat komentar di atas.
  const breedings = batches || [];

  const now = new Date();

  const { activeBatches, historyBatches, segeraBatches } = useMemo(() => {
    const active = breedings.filter(clutchAktif);
    const history = breedings.filter(b => !b.is_archived && STATUS_ADA_HASIL.includes(b.status));
    const segera = breedings.filter(b => isBatchSegera(b, now));
    return { activeBatches: active, historyBatches: history, segeraBatches: segera };
  }, [breedings]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Penjaga akses dibiarkan: tab ini ikut halaman Breeding & Telur, tetapi
  // isinya tetap milik manajemen. Kalau kelak tab ini dipakai di tempat lain,
  // penjaganya sudah ikut.
  if (!isManagerLevel(role)) {
    return <AccessDenied message="Timeline batch hanya untuk Owner, Manajer, dan Admin." />;
  }


  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Timeline perkembangan batch dari kawin hingga menetas. Tanggal perkiraan ditandai ±.
      </p>

      {/* SEGERA */}
      {segeraBatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Perkiraan bertelur/menetas dalam 2 minggu: {segeraBatches.length} batch
          </p>
          <div className="mt-2 space-y-0.5">
            {segeraBatches.map(b => (
              <SegeraRow key={b.id} batch={b} now={now} onClick={() => setSelectedBatch(b)} />
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE BATCHES */}
      <div>
        <h2 className="text-sm font-bold mb-3">Batch Aktif ({activeBatches.length})</h2>
        {activeBatches.length === 0 ? (
          <div className="bg-muted/30 rounded-xl p-6 text-center text-sm text-muted-foreground">
            Belum ada batch breeding aktif.
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeBatches.map(b => (
              <BatchTimeline key={b.id} batch={b} now={now} onClick={() => setSelectedBatch(b)} />
            ))}
          </div>
        )}
      </div>

      {/* HISTORY */}
      <div>
        <h2 className="text-sm font-bold mb-3">Riwayat Batch ({historyBatches.length})</h2>
        {historyBatches.length === 0 ? (
          <div className="bg-muted/30 rounded-xl p-6 text-center text-sm text-muted-foreground">
            Belum ada riwayat batch.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {historyBatches.map(b => (
              <HistoryCard key={b.id} batch={b} onClick={() => setSelectedBatch(b)} />
            ))}
          </div>
        )}
      </div>

      <BreedingBatchDetail batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
    </div>
  );
}