import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Star, TrendingUp, FileText, CheckCircle2, Loader2, Eye, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, formatRole } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { toast } from "sonner";
import SalarySlipDetail from "@/components/salary/SalarySlipDetail";
import { useCompanySettings } from "@/lib/useCompanySettings";
import AlurGaji from "@/components/salary/AlurGaji";
import { useVegTrips } from "@/hooks/useVegTrips";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function RekapPoinGajiPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [generating, setGenerating] = useState(null);
  const [viewSlip, setViewSlip] = useState(null);

  const settings = useCompanySettings();
  const TARGET_POIN_SETTING = settings.min_poin_bulanan || 0;
  const NILAI_PER_POIN_SETTING = settings.nilai_per_poin || 0;

  const { data: users = [] } = useActiveUsers();

  const { data: salaryConfigs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
  });

  const { data: bonusRewards = [] } = useQuery({
    queryKey: ["bonus-rewards"],
    queryFn: () => base44.entities.BonusReward.list("-period", 200),
  });

  const { data: dailyChecklists = [] } = useQuery({
    queryKey: ["daily-checklists-month", selectedMonth],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 500),
  });

  const { data: slips = [] } = useQuery({
    queryKey: ["salary-slips"],
    queryFn: () => base44.entities.SalarySlip.list("-period", 200),
  });

  const { data: kasbons = [] } = useQuery({
    queryKey: ["kasbons"],
    queryFn: () => base44.entities.Kasbon.list("-request_date", 200),
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendances-all"],
    queryFn: () => base44.entities.Attendance.list("-date", 500),
  });

  const { data: overtimeLogs = [] } = useQuery({
    queryKey: ["overtime-logs"],
    queryFn: () => base44.entities.OvertimeLog.list("-date", 300),
  });

  const { data: vegTripsMap = {} } = useVegTrips(selectedMonth);

  const monthStart = selectedMonth + "-01";
  const monthEnd = format(new Date(selectedMonth + "-01").setMonth(new Date(selectedMonth + "-01").getMonth() + 1), "yyyy-MM") + "-01";

  const employees = users.filter(u => ["keeper", "admin", "kepala_feeder"].includes(u.role));

  const rekapData = useMemo(() => {
    return employees.map(emp => {
      const config = salaryConfigs.find(c => c.role === emp.role);
      const daily = ["keeper", "kepala_feeder"].includes(emp.role);
      const pointValue = (config?.point_value && config.point_value > 0) ? config.point_value : (daily ? 200 : 0);
      const baseSalary = config?.base_salary || 0;
      const salaryType = daily ? "harian" : "bulanan";
      const absentDeduction = config?.absent_deduction || 0;
      const overtimeRate = config?.overtime_rate_per_hour || 0;
      const vegRate = config?.vegetable_rate_per_trip || 0;

      // Poin dari BonusReward (existing)
      const empBonus = bonusRewards.find(b => b.employee_email === emp.email && b.period === selectedMonth);
      const bonusPoin = empBonus?.total_points || 0;

      // Poin dari DailyChecklist bulan ini
      const empChecklists = dailyChecklists.filter(c =>
        c.employee_email === emp.email &&
        c.date >= monthStart &&
        c.date < monthEnd
      );
      const checklistPoin = empChecklists
        .filter((c) => c.status !== "rejected")
        .reduce((s, c) => {
          const pts = c.approved_points || c.total_points_claimed ||
            (Array.isArray(c.completed_tasks) ? c.completed_tasks.reduce((t, x) => t + (x.points || 0), 0) : 0);
          return s + (pts || 0);
        }, 0);

      const totalPoin = bonusPoin + checklistPoin;
      const targetTercapai = totalPoin >= TARGET_POIN_SETTING;
      const selisihPoin = Math.abs(totalPoin - TARGET_POIN_SETTING);

      const bonus = totalPoin * pointValue;
      const potonganPoin = 0;
      const kpiBonus = bonus;

      // Gaji pokok
      const empAttendances = attendances.filter(a => a.employee_email === emp.email && a.date >= monthStart && a.date < monthEnd);
      const hadirDays = empAttendances.filter(a => a.status === "hadir").length;
      const absenDays = empAttendances.filter(a => a.status !== "hadir" && a.status !== "izin" && a.status !== "sakit").length;

      const empOvertime = overtimeLogs.filter(o => o.employee_email === emp.email && o.date >= monthStart && o.date < monthEnd);
      const totalOvertimeHours = empOvertime.reduce((s, o) => s + (o.hours || 0), 0);
      const overtimePay = totalOvertimeHours * overtimeRate;

      const vegData = vegTripsMap[emp.email] || { trips: 0, dates: [] };
      const totalVegTrips = daily ? vegData.trips : 0;
      const vegPay = totalVegTrips * vegRate;

      let effectiveBase = salaryType === "harian" ? hadirDays * baseSalary : baseSalary;
      let deduction = salaryType === "harian" ? 0 : absenDays * absentDeduction;

      const empKasbons = kasbons.filter(k => k.employee_email === emp.email && k.status === "approved");
      let kasbonDeduction = 0;
      let kasbonRemaining = 0;
      const kasbonIdsToDeduct = [];
      empKasbons.forEach(k => {
        const sisaK = (k.amount || 0) - (k.total_paid || 0);
        if (sisaK <= 0) return;
        // Anti-dobel: skip jika sudah dipotong untuk periode ini via slip
        const alreadyDeducted = (k.deduction_log || []).some(d => d.salary_period === selectedMonth && d.salary_slip_id);
        if (alreadyDeducted) { kasbonRemaining += sisaK; return; }
        const deduction = Math.min(k.weekly_deduction || 100000, sisaK);
        kasbonDeduction += deduction;
        kasbonIdsToDeduct.push(k.id);
        kasbonRemaining += (sisaK - deduction);
      });

      const netTotal = effectiveBase + overtimePay + vegPay + kpiBonus - deduction - kasbonDeduction;

      // Existing slip for this period
      const existingSlip = slips.find(s => s.employee_email === emp.email && s.period === selectedMonth);

      return {
        emp, config, totalPoin, targetTercapai, selisihPoin,
        bonus, potonganPoin, kpiBonus, netTotal, effectiveBase,
        overtimePay, vegPay, vegTrips: totalVegTrips, vegDates: vegData.dates,
        deduction, kasbonDeduction, kasbonIdsToDeduct, kasbonRemaining, hadirDays,
        existingSlip, pointValue,
      };
    });
  }, [employees, salaryConfigs, bonusRewards, dailyChecklists, slips, kasbons, attendances, overtimeLogs, vegTripsMap, selectedMonth, TARGET_POIN_SETTING, NILAI_PER_POIN_SETTING]);

  if (!canAccess(role, "payroll")) return <AccessDenied />;

  // Render SalarySlipDetail modal jika ada viewSlip
  if (viewSlip) {
    return (
      <SalarySlipDetail
        slip={viewSlip}
        companySettings={settings}
        onClose={() => {
          setViewSlip(null);
          qc.invalidateQueries({ queryKey: ["salary-slips"] });
        }}
      />
    );
  }

  const handleGenerateSlip = async (row) => {
    setGenerating(row.emp.id);
    const data = {
      employee_id: row.emp.id,
      employee_name: row.emp.full_name || row.emp.email,
      employee_email: row.emp.email,
      employee_role: row.emp.role,
      period: selectedMonth,
      base_salary: row.effectiveBase,
      kpi_bonus: row.kpiBonus,
      overtime_pay: row.overtimePay,
      vegetable_pay: row.vegPay,
      vegetable_trips: row.vegTrips,
      vegetable_trip_dates: row.vegDates,
      absent_deduction: row.deduction,
      kasbon_deduction: row.kasbonDeduction,
      kasbon_ids: row.kasbonIdsToDeduct,
      kasbon_remaining: row.kasbonRemaining,
      net_total: row.netTotal,
      total_points: row.totalPoin,
      point_value: row.pointValue,
      target_points: TARGET_POIN_SETTING,
      total_poin: row.totalPoin,
      poin_bonus: row.bonus,
      poin_deduction: row.potonganPoin,
      poin_status: row.targetTercapai ? "Tercapai" : `Kurang ${row.selisihPoin} poin`,
      status: "draft",
      generated_date: format(new Date(), "yyyy-MM-dd"),
    };
    let slipId;
    if (row.existingSlip) {
      await base44.entities.SalarySlip.update(row.existingSlip.id, data);
      slipId = row.existingSlip.id;
      toast.success(`Slip gaji ${row.emp.full_name || row.emp.email} diperbarui`);
    } else {
      const created = await base44.entities.SalarySlip.create(data);
      slipId = created.id;
      toast.success(`Slip gaji ${row.emp.full_name || row.emp.email} dibuat`);
    }
    // Update kasbon: total_paid + deduction_log (anti-dobel via salary_slip_id)
    for (const kasbonId of row.kasbonIdsToDeduct || []) {
      const k = kasbons.find(kk => kk.id === kasbonId);
      if (!k) continue;
      const sisaK = (k.amount || 0) - (k.total_paid || 0);
      if (sisaK <= 0) continue;
      const deduction = Math.min(k.weekly_deduction || 100000, sisaK);
      const newPaid = (k.total_paid || 0) + deduction;
      const newStatus = newPaid >= k.amount ? "lunas" : "approved";
      const newLog = [...(k.deduction_log || []), {
        amount: deduction,
        date: format(new Date(), "yyyy-MM-dd"),
        method: "salary_slip",
        salary_period: selectedMonth,
        salary_slip_id: slipId,
        recorded_by: user?.full_name || user?.email,
      }];
      await base44.entities.Kasbon.update(k.id, {
        total_paid: newPaid,
        status: newStatus,
        deduction_log: newLog,
      });
    }
    if ((row.kasbonIdsToDeduct || []).length > 0) {
      qc.invalidateQueries({ queryKey: ["kasbons"] });
    }
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    setGenerating(null);
  };

  const totalPoinTertinggi = Math.max(...rekapData.map(r => r.totalPoin), 0);
  const totalGaji = rekapData.reduce((s, r) => s + r.netTotal, 0);

  const handleGenerateAll = async () => {
    setGenerating("all");
    for (const row of rekapData) {
      const data = {
        employee_id: row.emp.id,
        employee_name: row.emp.full_name || row.emp.email,
        employee_email: row.emp.email,
        employee_role: row.emp.role,
        period: selectedMonth,
        base_salary: row.effectiveBase,
        kpi_bonus: row.kpiBonus,
        overtime_pay: row.overtimePay,
        vegetable_pay: row.vegPay,
        vegetable_trips: row.vegTrips,
        vegetable_trip_dates: row.vegDates,
        absent_deduction: row.deduction,
        kasbon_deduction: row.kasbonDeduction,
        kasbon_ids: row.kasbonIdsToDeduct,
        kasbon_remaining: row.kasbonRemaining,
        net_total: row.netTotal,
        total_poin: row.totalPoin,
        poin_bonus: row.bonus,
        poin_deduction: row.potonganPoin,
        poin_status: row.targetTercapai ? "Tercapai" : `Kurang ${row.selisihPoin} poin`,
        status: "draft",
        generated_date: format(new Date(), "yyyy-MM-dd"),
      };
      let slipId;
      if (row.existingSlip) {
        await base44.entities.SalarySlip.update(row.existingSlip.id, data);
        slipId = row.existingSlip.id;
      } else {
        const created = await base44.entities.SalarySlip.create(data);
        slipId = created.id;
      }
      for (const kasbonId of row.kasbonIdsToDeduct || []) {
        const k = kasbons.find(kk => kk.id === kasbonId);
        if (!k) continue;
        const sisaK = (k.amount || 0) - (k.total_paid || 0);
        if (sisaK <= 0) continue;
        const deduction = Math.min(k.weekly_deduction || 100000, sisaK);
        const newPaid = (k.total_paid || 0) + deduction;
        const newStatus = newPaid >= k.amount ? "lunas" : "approved";
        const newLog = [...(k.deduction_log || []), {
          amount: deduction,
          date: format(new Date(), "yyyy-MM-dd"),
          method: "salary_slip",
          salary_period: selectedMonth,
          salary_slip_id: slipId,
          recorded_by: user?.full_name || user?.email,
        }];
        await base44.entities.Kasbon.update(k.id, {
          total_paid: newPaid,
          status: newStatus,
          deduction_log: newLog,
        });
      }
    }
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    qc.invalidateQueries({ queryKey: ["kasbons"] });
    toast.success(`${rekapData.length} slip gaji berhasil dibuat/diperbarui`);
    setGenerating(null);
  };

  return (
    <div className="space-y-6">
      <AlurGaji aktif="hitung" periode={selectedMonth} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Rekap Poin & Generate Slip Gaji Rutin</h1>
          <p className="text-muted-foreground text-sm">Kalkulasi KPI, poin, dan gaji rutin per karyawan · Generate slip untuk dicetak</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAll}
            disabled={generating !== null || rekapData.length === 0}
            className="gap-1.5"
          >
            {generating === "all" ? <><span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" /> Generating...</> : <><FileText className="w-3.5 h-3.5" /> Generate Semua</>}
          </Button>
        </div>
      </div>

      {NILAI_PER_POIN_SETTING === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Nilai per poin belum diatur (Rp 0). Atur di halaman Pengaturan Poin & Simulasi.
        </div>
      )}
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <Users className="w-5 h-5 text-primary mb-1.5" />
          <p className="text-2xl font-bold">{employees.length}</p>
          <p className="text-xs text-muted-foreground">Karyawan</p>
        </Card>
        <Card className="p-4">
          <Star className="w-5 h-5 text-amber-500 mb-1.5" />
          <p className="text-2xl font-bold">{totalPoinTertinggi}</p>
          <p className="text-xs text-muted-foreground">Poin Tertinggi</p>
        </Card>
        <Card className="p-4">
          <CheckCircle2 className="w-5 h-5 text-green-500 mb-1.5" />
          <p className="text-2xl font-bold">{rekapData.filter(r => r.targetTercapai).length}</p>
          <p className="text-xs text-muted-foreground">Capai Target</p>
        </Card>
        <Card className="p-4">
          <TrendingUp className="w-5 h-5 text-primary mb-1.5" />
          <p className="text-lg font-bold text-primary">{fmt(totalGaji)}</p>
          <p className="text-xs text-muted-foreground">Total Gaji</p>
        </Card>
      </div>

      {/* Tabel rekap */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Rekap per Karyawan — {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: id })}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Target minimum: {TARGET_POIN_SETTING} poin/bulan · Nilai: {fmt(NILAI_PER_POIN_SETTING)}/poin</p>
        </div>
        <div className="divide-y">
          {rekapData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Belum ada karyawan</p>
            </div>
          ) : rekapData.map((row) => (
            <div key={row.emp.id} className="p-4 hover:bg-muted/20 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Info karyawan */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                    {(row.emp.full_name || row.emp.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{row.emp.full_name || row.emp.email}</p>
                    <Badge variant="outline" className="text-[11px] mt-0.5">{formatRole(row.emp.role)}</Badge>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1">
                  {/* Total Poin */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Total Poin</p>
                    <p className="text-xl font-bold">{row.totalPoin}</p>
                    {row.targetTercapai ? (
                      <Badge className="text-[10px] bg-green-100 text-green-700 mt-0.5">✓ Target</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-red-100 text-red-700 mt-0.5">✗ -{row.selisihPoin} poin</Badge>
                    )}
                  </div>

                  {/* Bonus Poin */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Bonus KPI</p>
                    <p className={`text-sm font-bold ${row.kpiBonus >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {row.kpiBonus >= 0 ? "+" : ""}{fmt(row.kpiBonus)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {row.totalPoin}p × {fmt(row.pointValue)}
                      {row.potonganPoin > 0 && ` − ${fmt(row.potonganPoin)}`}
                    </p>
                  </div>

                  {/* Gaji Pokok */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Gaji Pokok</p>
                    <p className="text-sm font-semibold">{fmt(row.effectiveBase)}</p>
                    {row.overtimePay > 0 && <p className="text-[10px] text-blue-600">+{fmt(row.overtimePay)} lembur</p>}
                  </div>

                  {/* Potongan */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Potongan</p>
                    <p className="text-sm font-semibold text-red-600">
                      -{fmt(row.deduction + row.kasbonDeduction)}
                    </p>
                    {row.kasbonDeduction > 0 && <p className="text-[10px] text-orange-600">kasbon: {fmt(row.kasbonDeduction)}</p>}
                  </div>

                  {/* Total Gaji */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Take Home</p>
                    <p className="text-base font-bold text-primary">{fmt(row.netTotal)}</p>
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
                  <div className="flex gap-1.5">
                    {row.existingSlip && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewSlip(row.existingSlip)}
                        className="gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={row.existingSlip ? "outline" : "default"}
                      onClick={() => handleGenerateSlip(row)}
                      disabled={generating === row.emp.id}
                    >
                      {generating === row.emp.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 mr-1" />
                      )}
                      {row.existingSlip ? "Update" : "Generate"}
                    </Button>
                  </div>
                  {row.existingSlip && (
                    <Badge className={`text-[10px] ${
                      row.existingSlip.status === "paid" ? "bg-green-100 text-green-700" :
                      row.existingSlip.status === "approved" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {row.existingSlip.status === "paid" ? "✓ Dibayar" :
                       row.existingSlip.status === "approved" ? "Disetujui" : "Draft"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}