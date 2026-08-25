/**
 * PengaturanPoinPage — satu-satunya tempat mengubah nilai per poin & target.
 * Owner dapat menyimpan; manajer & admin hanya melihat simulasi & grafik.
 *
 * Bagian A: Pengaturan (input nilai + target, simpan + konfirmasi)
 * Bagian B: Kalkulator dampak real-time
 * Bagian C: Grafik riwayat
 * Bagian D: Tabel simulasi cepat
 * Bagian E: Riwayat perubahan
 * Bagian F: Hak akses (owner simpan, lainnya lihat)
 */
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Star, Target, Save, TrendingUp, Lock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import { useCompanySettings } from "@/lib/useCompanySettings";
import AccessDenied from "@/components/common/AccessDenied";
import PoinKalkulator from "@/components/settings/poin/PoinKalkulator";
import PoinGrafik from "@/components/settings/poin/PoinGrafik";
import PoinTabelSimulasi from "@/components/settings/poin/PoinTabelSimulasi";
import PoinRiwayatPerubahan from "@/components/settings/poin/PoinRiwayatPerubahan";
import { poinChecklist, totalPoinChecklist } from "@/lib/poinChecklist";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function PengaturanPoinPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const settings = useCompanySettings();
  const canEdit = role === "owner";

  const [nilaiInput, setNilaiInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNilaiInput(String(settings.nilai_per_poin ?? 0));
    setTargetInput(String(settings.min_poin_bulanan ?? 0));
  }, [settings.nilai_per_poin, settings.min_poin_bulanan]);

  const { data: mainRecords = [] } = useQuery({
    queryKey: ["company-settings-main-all"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 30 * 1000,
  });
  const { data: users = [] } = useActiveUsers();
  const { data: salaryConfigs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: dailyChecklists = [] } = useQuery({
    queryKey: ["daily-checklists-poin30"],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 500),
    staleTime: 60 * 1000,
  });
  const { data: attendances = [] } = useQuery({
    queryKey: ["attendances-poin30"],
    queryFn: () => base44.entities.Attendance.list("-date", 500),
    staleTime: 60 * 1000,
  });
  const { data: slips = [] } = useQuery({
    queryKey: ["salary-slips-poin6m"],
    queryFn: () => base44.entities.SalarySlip.list("-period", 200),
    staleTime: 5 * 60 * 1000,
  });
  const { data: history = [] } = useQuery({
    queryKey: ["nilai-poin-history"],
    queryFn: () => base44.entities.NilaiPoinHistory.list("-changed_at", 200),
    staleTime: 30 * 1000,
  });

  const now = new Date();
  const cutoffStr = format(new Date(now.getTime() - 30 * 86400000), "yyyy-MM-dd");
  const todayStr = format(now, "yyyy-MM-dd");
  const thisMonthKey = format(now, "yyyy-MM");
  const oldNilai = Number(settings.nilai_per_poin) || 0;
  const newNilai = Number(nilaiInput) || 0;
  const oldTarget = Number(settings.min_poin_bulanan) || 0;

  const employees = users.filter((u) => ["keeper", "kepala_feeder", "admin"].includes(u.role));

  const approved30 = useMemo(
    () => dailyChecklists.filter((c) => c.status === "approved" && c.date && c.date >= cutoffStr && c.date <= todayStr),
    [dailyChecklists, cutoffStr, todayStr]
  );

  const rows = useMemo(
    () =>
      employees.map((emp) => {
        const config = salaryConfigs.find((c) => c.role === emp.role) || {};
        const empApproved = approved30.filter((c) => c.employee_email === emp.email);
        const poin30 = totalPoinChecklist(empApproved);
        const hadirDays30 = attendances.filter((a) => a.employee_email === emp.email && a.status === "hadir" && a.date >= cutoffStr).length;
        const isDaily = ["keeper", "kepala_feeder"].includes(emp.role);
        const monthlyBase = isDaily ? hadirDays30 * (config.base_salary || 0) : config.base_salary || 0;
        return { name: emp.full_name || emp.email, role: emp.role, poin30, monthlyBase };
      }),
    [employees, salaryConfigs, approved30, attendances, cutoffStr]
  );

  const { barData, empNames } = useMemo(() => {
    const byDate = {};
    const names = new Set();
    approved30.forEach((c) => {
      const nm = c.employee_name || "—";
      names.add(nm);
      byDate[c.date] = byDate[c.date] || { date: c.date };
      byDate[c.date][nm] = (byDate[c.date][nm] || 0) + poinChecklist(c);
    });
    return { barData: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)), empNames: [...names] };
  }, [approved30]);

  const lineData = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const m = format(d, "yyyy-MM");
        const bonus = slips.filter((s) => s.period === m).reduce((s, sl) => s + (sl.poin_bonus || 0), 0);
        return { month: m, bonus };
      }),
    [slips]
  );

  const summary = useMemo(() => {
    const totalPoin30 = totalPoinChecklist(approved30);
    const perDay = {};
    approved30.forEach((c) => {
      perDay[c.date] = (perDay[c.date] || 0) + poinChecklist(c);
    });
    const dayVals = Object.values(perDay);
    const totalThisMonth = approved30
      .filter((c) => (c.date || "").startsWith(thisMonthKey))
      .reduce((s, c) => s + poinChecklist(c), 0);
    return {
      avgPerDay: totalPoin30 / 30,
      maxDay: dayVals.length ? Math.max(...dayVals) : 0,
      minDay: dayVals.length ? Math.min(...dayVals) : 0,
      totalThisMonth,
    };
  }, [approved30, thisMonthKey]);

  if (!canAccess(role, "pengaturan-poin")) return <AccessDenied />;

  const dirty = (Number(nilaiInput) || 0) !== oldNilai || (Number(targetInput) || 0) !== oldTarget;

  const handleSave = async () => {
    const n = Number(nilaiInput) || 0;
    const t = Number(targetInput) || 0;
    setSaving(true);
    try {
      if (settings.id) {
        await base44.entities.CompanySettings.update(settings.id, { nilai_per_poin: n, min_poin_bulanan: t });
      } else {
        await base44.entities.CompanySettings.create({
          setting_key: "main",
          company_name: "Duta Tortoise",
          nilai_per_poin: n,
          min_poin_bulanan: t,
        });
      }
      await base44.entities.NilaiPoinHistory.create({
        changed_at: new Date().toISOString(),
        old_value: oldNilai,
        new_value: n,
        old_target: oldTarget,
        new_target: t,
        changed_by_email: user?.email,
        changed_by_name: user?.full_name,
      });
      qc.invalidateQueries({ queryKey: ["company-settings-main"] });
      qc.invalidateQueries({ queryKey: ["company-settings-main-all"] });
      qc.invalidateQueries({ queryKey: ["nilai-poin-history"] });
      const jam = format(new Date(), "HH:mm");
      toast.success(`Tersimpan. Nilai per poin sekarang ${fmt(n)} (${jam})`);
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e?.message || "kesalahan"));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
          Pengaturan Poin & Simulasi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atur nilai rupiah per poin dan target bulanan. Lihat dampak biaya SEBELUM menyimpan.
        </p>
      </div>

      {mainRecords.length > 1 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border-2 border-red-300 text-sm text-red-800 font-medium">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>Ditemukan {mainRecords.length} record CompanySettings berlabel "main". Data tidak konsisten — satukan di Pemeliharaan Sistem sebelum mengubah nilai poin.</span>
        </div>
      )}

      {oldNilai === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Nilai per poin belum diatur. Bonus poin dihitung Rp 0. Atur nilai di bawah ini.
        </div>
      )}

      {/* Bagian A — Pengaturan */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Pengaturan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nilai per poin (Rp) <span className="text-red-500">*</span></Label>
            <Input type="number" min={0} value={nilaiInput} onChange={(e) => setNilaiInput(e.target.value)} disabled={!canEdit} placeholder="Contoh: 50" />
            <p className="text-xs text-muted-foreground">Bebas diisi tanpa batas. Dipakai menghitung bonus poin.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Target poin bulanan</Label>
            <Input type="number" min={0} value={targetInput} onChange={(e) => setTargetInput(e.target.value)} disabled={!canEdit} placeholder="Contoh: 300" />
            <p className="text-xs text-amber-700">
              ⚠️ Saat ini {oldTarget}. Keeper mencapai 90–160 poin per hari — target {oldTarget || 300} tercapai di hari ketiga dan tidak berfungsi sebagai target. Pertimbangkan menaikkannya.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Perubahan nilai poin hanya berlaku ke DEPAN. Slip gaji yang sudah dibuat memakai nilai saat itu dan tidak berubah surut.
        </div>
        {canEdit ? (
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted rounded-lg">
            <Lock className="w-3.5 h-3.5" /> Hanya Owner yang dapat mengubah nilai poin. Manajer & admin dapat melihat simulasi dan grafik.
          </div>
        )}
      </Card>

      {/* Bagian B — Kalkulator dampak */}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Kalkulator Dampak (real-time)
        </h2>
        <p className="text-xs text-muted-foreground mb-3">Poin dari checklist approved 30 hari terakhir. Bonus = poin × nilai. Hitung langsung tanpa menyimpan.</p>
        <PoinKalkulator rows={rows} oldNilai={oldNilai} newNilai={newNilai} />
      </div>

      {/* Bagian C — Grafik */}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" /> Grafik Riwayat
        </h2>
        <PoinGrafik barData={barData} empNames={empNames} lineData={lineData} summary={summary} />
      </div>

      {/* Bagian D — Tabel simulasi cepat */}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-500" /> Tabel Simulasi Cepat
        </h2>
        <PoinTabelSimulasi rows={rows} />
      </div>

      {/* Bagian E — Riwayat perubahan */}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" /> Riwayat Perubahan Nilai Poin
        </h2>
        <PoinRiwayatPerubahan history={history} />
      </div>
    </div>
  );
}