import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle } from "lucide-react";

const ENTITY_LABELS = {
  FinanceTransaction: "Transaksi Keuangan",
  Sale: "Penjualan",
  HealthRecord: "Catatan Kesehatan",
  DailyChecklist: "Checklist Harian",
  Attendance: "Absensi",
  SalarySlip: "Slip Gaji",
  OvertimeLog: "Lembur",
  BonusReward: "Bonus",
  MeasurementHistory: "Pengukuran",
  Kasbon: "Kasbon",
  StockMovement: "Pergerakan Stok",
};

const ENTITY_NAMES = Object.keys(ENTITY_LABELS);

// Fetch semua excluded records dalam satu query gabungan
async function fetchAllExcluded() {
  const results = await Promise.all(
    ENTITY_NAMES.map(name =>
      base44.entities[name].filter({ excluded_from_reports: true })
        .then(rows => rows.map(r => ({ ...r, _entityName: name })))
    )
  );
  return results.flat();
}

export default function ExcludedDataWidget() {
  const qc = useQueryClient();
  const [showDetail, setShowDetail] = useState(false);
  const [reincluding, setReincluding] = useState(false);

  const { data: allExcluded = [] } = useQuery({
    queryKey: ["all-excluded-records"],
    queryFn: fetchAllExcluded,
    staleTime: 2 * 60 * 1000,
  });

  const total = allExcluded.length;

  // Count per entity
  const countByEntity = ENTITY_NAMES.reduce((acc, name) => {
    acc[name] = allExcluded.filter(r => r._entityName === name).length;
    return acc;
  }, {});

  const handleReincludeAll = async () => {
    if (!confirm(`Sertakan semua ${total} data kembali ke laporan?`)) return;
    setReincluding(true);
    for (const rec of allExcluded) {
      await base44.entities[rec._entityName].update(rec.id, { excluded_from_reports: false });
    }
    qc.invalidateQueries({ queryKey: ["all-excluded-records"] });
    setReincluding(false);
    setShowDetail(false);
  };

  if (total === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <button
        className="w-full flex items-center justify-between gap-3 text-left"
        onClick={() => setShowDetail(v => !v)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-orange-800">
            🚫 {total} data dikecualikan dari laporan
          </span>
        </div>
        <span className="text-xs text-orange-600">{showDetail ? "▲ Tutup" : "▼ Lihat Detail"}</span>
      </button>

      {showDetail && (
        <div className="mt-3 space-y-2">
          {ENTITY_NAMES.map(name => {
            const count = countByEntity[name];
            if (count === 0) return null;
            return (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="text-orange-700">{ENTITY_LABELS[name]}</span>
                <span className="font-semibold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
                  {count} record
                </span>
              </div>
            );
          })}
          <div className="pt-2 border-t border-orange-200">
            <button
              onClick={handleReincludeAll}
              disabled={reincluding}
              className="w-full py-2 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {reincluding ? "Memproses..." : "✅ Sertakan semua kembali"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}