import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Trash2, Eye, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const TEST_ENTITIES = [
  { key: "DailyChecklist", label: "Checklist Harian" },
  { key: "Attendance", label: "Absensi" },
  { key: "FinanceTransaction", label: "Transaksi Keuangan" },
  { key: "Sale", label: "Penjualan" },
  { key: "HealthRecord", label: "Catatan Kesehatan" },
  { key: "StockMovement", label: "Pergerakan Stok" },
  { key: "OvertimeLog", label: "Lembur" },
  { key: "BonusReward", label: "Bonus" },
  { key: "Kasbon", label: "Kasbon" },
  { key: "MeasurementHistory", label: "Pengukuran" },
];

async function fetchAllTestData() {
  const results = await Promise.all(
    TEST_ENTITIES.map(({ key, label }) =>
      base44.entities[key].filter({ is_test_data: true })
        .then(rows => rows.map(r => ({ ...r, _entityKey: key, _entityLabel: label })))
    )
  );
  return results.flat();
}

export default function TestModeSettings() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(false);
  const [excluding, setExcluding] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedEntity, setExpandedEntity] = useState(null);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 30 * 1000,
  });

  const { data: testData = [], refetch: refetchTestData, isFetching: fetchingTest } = useQuery({
    queryKey: ["all-test-data"],
    queryFn: fetchAllTestData,
    staleTime: 60 * 1000,
    enabled: showDetail,
  });

  const setting = settings[0];
  const isActive = !!setting?.test_mode_active;

  if (role !== "owner") return null;

  const handleToggle = async (val) => {
    setToggling(true);
    const now = new Date().toISOString();
    const updateData = val
      ? { test_mode_active: true, test_mode_started_at: now, test_mode_started_by: user?.email }
      : { test_mode_active: false };

    if (setting) {
      await base44.entities.CompanySettings.update(setting.id, updateData);
    } else {
      await base44.entities.CompanySettings.create({ setting_key: "main", ...updateData });
    }
    qc.invalidateQueries({ queryKey: ["company-settings"] });
    toast.success(val ? "🧪 Test Mode diaktifkan" : "✅ Test Mode dimatikan");
    setToggling(false);
  };

  const handleExcludeAll = async () => {
    if (!window.confirm(`Exclude semua data test dari laporan? Data tidak akan dihapus.`)) return;
    setExcluding(true);

    // Fetch all test data first
    const all = await fetchAllTestData();
    if (all.length === 0) {
      toast.info("Tidak ada data test yang perlu di-exclude");
      setExcluding(false);
      return;
    }

    for (const rec of all) {
      await base44.entities[rec._entityKey].update(rec.id, { excluded_from_reports: true });
    }

    qc.invalidateQueries({ queryKey: ["all-test-data"] });
    qc.invalidateQueries({ queryKey: ["all-excluded-records"] });
    toast.success(`✅ ${all.length} data test dikecualikan dari laporan`);
    setExcluding(false);
  };

  // Count per entity from testData
  const countByEntity = TEST_ENTITIES.reduce((acc, { key }) => {
    acc[key] = testData.filter(r => r._entityKey === key).length;
    return acc;
  }, {});
  const totalTestRecords = testData.length;

  const startedAt = setting?.test_mode_started_at;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 flex items-center gap-3 ${isActive ? "bg-red-50 border-b border-red-200" : "bg-muted/30 border-b border-border"}`}>
        <FlaskConical className={`w-5 h-5 ${isActive ? "text-red-600" : "text-muted-foreground"}`} />
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">🧪 Test Mode</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aktifkan saat ingin coba-coba. Data yang dibuat tidak akan masuk laporan atau mempengaruhi sistem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && <Badge className="bg-red-100 text-red-700 border-red-200">AKTIF</Badge>}
          {toggling ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={toggling || isLoading}
            />
          )}
        </div>
      </div>

      {/* Info saat aktif */}
      {isActive && startedAt && (
        <div className="px-5 py-3 bg-red-50/50 border-b border-red-100 text-xs text-red-700">
          Aktif sejak {format(new Date(startedAt), "d MMMM yyyy, HH:mm", { locale: idLocale })}
          {setting?.test_mode_started_by && ` · oleh ${setting.test_mode_started_by}`}
        </div>
      )}

      {/* Cleanup section — tampil kalau ada data test */}
      {!isActive && startedAt && (
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">🧹</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Data Test Tersimpan</p>
              {startedAt && (
                <p className="text-xs text-muted-foreground">
                  Sesi test: {format(new Date(startedAt), "d MMM yyyy, HH:mm", { locale: idLocale })}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setShowDetail(v => !v);
                if (!showDetail) refetchTestData();
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              {showDetail ? "Sembunyikan" : "Lihat Data Test"}
              {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={handleExcludeAll}
              disabled={excluding}
            >
              {excluding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Exclude Semua dari Laporan
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ⚠️ Data tidak dihapus, hanya disembunyikan dari laporan.
          </p>

          {/* Detail list */}
          {showDetail && (
            <div className="border border-border rounded-lg overflow-hidden mt-2">
              {fetchingTest ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : totalTestRecords === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Tidak ada data test yang ditemukan
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {TEST_ENTITIES.map(({ key, label }) => {
                    const count = countByEntity[key];
                    if (count === 0) return null;
                    const items = testData.filter(r => r._entityKey === key);
                    const isExpanded = expandedEntity === key;
                    return (
                      <div key={key}>
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                          onClick={() => setExpandedEntity(isExpanded ? null : key)}
                        >
                          <span className="text-sm font-medium">{label}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{count} record</Badge>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="bg-muted/20 px-4 pb-3 space-y-1.5">
                            {items.map(rec => (
                              <div key={rec.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                                <span className="text-muted-foreground">
                                  {rec.date || rec.sale_date || rec.request_date || rec.created_date || "—"}
                                  {rec.employee_name ? ` · ${rec.employee_name}` : ""}
                                  {rec.tortoise_name ? ` · ${rec.tortoise_name}` : ""}
                                  {rec.description ? ` · ${rec.description}` : ""}
                                </span>
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${rec.excluded_from_reports ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                                  {rec.excluded_from_reports ? "Excluded" : "Aktif"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="px-4 py-2.5 bg-muted/30 text-xs text-muted-foreground font-medium">
                    Total: {totalTestRecords} record test
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}