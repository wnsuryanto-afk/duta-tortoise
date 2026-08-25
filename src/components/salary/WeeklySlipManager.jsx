import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Star, FileText, Eye, Loader2, CalendarRange, Wallet, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatRole } from "@/lib/permissions";
import SalarySlipDetail from "@/components/salary/SalarySlipDetail";
import { getWeekOptions, formatWeekLabel, getWeekEnd, safeParseDate } from "@/lib/weeklySalaryUtils";
import { useEmployeeUsers } from "@/hooks/useEmployeeUsers";
import { totalPoinChecklist } from "@/lib/poinChecklist";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function WeeklySlipManager({ settings, isManagerRole, user }) {
  const qc = useQueryClient();
  const weekOptions = getWeekOptions();
  const [weekStart, setWeekStart] = useState(weekOptions[0]?.value || "");
  const [generating, setGenerating] = useState(null);
  const [viewSlip, setViewSlip] = useState(null);

  const weekStartObj = safeParseDate(weekStart);
  const weekEnd = weekStartObj ? format(getWeekEnd(weekStartObj), "yyyy-MM-dd") : "";

  const { data: users = [] } = useEmployeeUsers();
  const { data: salaryConfigs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
  });
  const { data: attendances = [] } = useQuery({
    queryKey: ["attendances-week", weekStart, weekEnd],
    queryFn: () => base44.entities.Attendance.list("-date", 500),
    enabled: !!weekStart,
  });
  const { data: dailyChecklists = [] } = useQuery({
    queryKey: ["checklists-week", weekStart, weekEnd],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 500),
    enabled: !!weekStart,
  });
  const { data: overtimeLogs = [] } = useQuery({
    queryKey: ["overtime-week", weekStart, weekEnd],
    queryFn: () => base44.entities.OvertimeLog.list("-date", 300),
    enabled: !!weekStart,
  });
  const { data: pakanHarian = [] } = useQuery({
    queryKey: ["pakan-week", weekStart, weekEnd],
    queryFn: () => base44.entities.PakanHarian.list("-log_date", 500),
    enabled: !!weekStart,
  });
  const { data: kasbons = [] } = useQuery({
    queryKey: ["kasbons-active-week"],
    queryFn: () => base44.entities.Kasbon.filter({ status: "approved" }),
  });
  const { data: slips = [] } = useQuery({
    queryKey: ["salary-slips"],
    queryFn: () => base44.entities.SalarySlip.list("-period", 200),
  });

  const employees = users.filter(u => ["keeper", "kepala_feeder"].includes(u.role));
  const nilaiPerPoin = settings.nilai_per_poin || 0;

  const weekAttendances = attendances.filter(a => a.date >= weekStart && a.date <= weekEnd);
  const weekChecklists = dailyChecklists.filter(c => c.date >= weekStart && c.date <= weekEnd);
  const weekOvertime = overtimeLogs.filter(o => o.date >= weekStart && o.date <= weekEnd);
  const weekPakan = pakanHarian.filter(p => p.log_date >= weekStart && p.log_date <= weekEnd);

  const rekapData = useMemo(() => {
    return employees.map(emp => {
      const config = salaryConfigs.find(c => c.role === emp.role) || {};
      const baseRate = config.base_salary || 0;
      const overtimeRate = config.overtime_rate_per_hour || 0;
      const vegRate = config.vegetable_rate_per_trip || 0;

      // Hari hadir dalam minggu ini
      const attendDays = weekAttendances.filter(
        a => a.employee_email === emp.email && a.status === "hadir"
      ).length;

      // Poin dari checklist yang SUDAH di-approve owner dalam minggu ini
      const empChecklists = weekChecklists.filter(
        c => c.employee_email === emp.email && c.status === "approved"
      );
      // Sudah disaring ke status "approved" di atas, jadi poin yang dipakai
      // adalah keputusan owner — termasuk bila owner menurunkannya ke 0.
      const poin = totalPoinChecklist(empChecklists);
      const poinBonus = poin * nilaiPerPoin;

      // Lembur
      const empOvertime = weekOvertime.filter(o => o.employee_email === emp.email);
      const overtimeHours = empOvertime.reduce((s, o) => s + (o.hours || 0), 0);
      const overtimePay = overtimeHours * overtimeRate;

      // Trip sayur (dedup per hari)
      const empPakan = weekPakan.filter(p => p.recorded_by_email === emp.email &&
        (p.feed_source === "sayur_pasar" || p.feed_source === "campur"));
      const vegDatesSet = new Set();
      empPakan.forEach(p => { if (p.log_date) vegDatesSet.add(p.log_date); });
      const vegTrips = vegDatesSet.size;
      const vegPay = vegTrips * vegRate;
      const vegTripDates = [...vegDatesSet].sort();

      // Kasbon: potongan mingguan, anti-dobel per minggu (weekStart sebagai period key)
      // Hanya dianggap "sudah dipotong" jika slip terkait berstatus "paid"
      const empKasbons = kasbons.filter(k => k.employee_email === emp.email && k.status === "approved");
      let kasbonDeduction = 0;
      let kasbonRemaining = 0;
      const kasbonIdsToDeduct = [];
      empKasbons.forEach(k => {
        const sisaK = (k.amount || 0) - (k.total_paid || 0);
        if (sisaK <= 0) return;
        // Cek apakah kasbon ini sudah dipotong untuk minggu ini DAN slip-nya sudah paid
        const alreadyDeducted = (k.deduction_log || []).some(d => {
          if (d.salary_period !== weekStart || !d.salary_slip_id) return false;
          const linkedSlip = slips.find(s => s.id === d.salary_slip_id);
          return linkedSlip?.status === "paid";
        });
        if (alreadyDeducted) { kasbonRemaining += sisaK; return; }
        const ded = Math.min(k.weekly_deduction || 100000, sisaK);
        kasbonDeduction += ded;
        kasbonIdsToDeduct.push(k.id);
        kasbonRemaining += (sisaK - ded);
      });

      const baseSalary = attendDays * baseRate;
      const grossTotal = baseSalary + overtimePay + vegPay + poinBonus;
      const netTotal = grossTotal - kasbonDeduction;

      const existingSlip = slips.find(s =>
        s.employee_email === emp.email &&
        s.period_type === "weekly" &&
        s.week_start === weekStart
      );

      return {
        emp, config, baseRate, attendDays, baseSalary,
        poin, poinBonus, overtimeHours, overtimePay,
        vegTrips, vegPay, vegTripDates,
        kasbonDeduction, kasbonIdsToDeduct, kasbonRemaining,
        grossTotal, netTotal, existingSlip,
      };
    });
  }, [employees, salaryConfigs, weekAttendances, weekChecklists, weekOvertime, weekPakan, kasbons, slips, weekStart, nilaiPerPoin]);

  const buildSlipData = (row) => ({
    employee_id: row.emp.id,
    employee_name: row.emp.full_name || row.emp.email,
    employee_email: row.emp.email,
    employee_role: row.emp.role,
    period_type: "weekly",
    period: weekStart,
    week_start: weekStart,
    week_end: weekEnd,
    attend_days: row.attendDays,
    base_salary: row.baseSalary,
    kpi_bonus: row.poinBonus,
    overtime_pay: row.overtimePay,
    vegetable_pay: row.vegPay,
    vegetable_trips: row.vegTrips,
    vegetable_trip_dates: row.vegTripDates,
    absent_deduction: 0,
    kasbon_deduction: row.kasbonDeduction,
    kasbon_ids: row.kasbonIdsToDeduct,
    kasbon_remaining: row.kasbonRemaining,
    net_total: row.netTotal,
    total_poin: row.poin,
    poin_bonus: row.poinBonus,
    poin_deduction: 0,
    poin_status: "Mingguan",
    status: "draft",
    generated_date: format(new Date(), "yyyy-MM-dd"),
  });

  const handleGenerate = async (row) => {
    setGenerating(row.emp.id);
    const slipData = buildSlipData(row);
    if (row.existingSlip) {
      await base44.entities.SalarySlip.update(row.existingSlip.id, slipData);
      toast.success(`Slip mingguan ${row.emp.full_name || row.emp.email} diperbarui`);
    } else {
      await base44.entities.SalarySlip.create(slipData);
      toast.success(`Slip mingguan ${row.emp.full_name || row.emp.email} dibuat`);
    }
    // Kasbon deduction_log & total_paid diupdate saat slip ditandai "paid" (via onSalarySlipPaid)
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    setGenerating(null);
  };

  const handleGenerateAll = async () => {
    setGenerating("all");
    for (const row of rekapData) {
      const slipData = buildSlipData(row);
      if (row.existingSlip) {
        await base44.entities.SalarySlip.update(row.existingSlip.id, slipData);
      } else {
        await base44.entities.SalarySlip.create(slipData);
      }
    }
    // Kasbon deduction_log & total_paid diupdate saat slip ditandai "paid" (via onSalarySlipPaid)
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    toast.success(`${rekapData.length} slip mingguan berhasil dibuat/diperbarui`);
    setGenerating(null);
  };

  const totalNet = rekapData.reduce((s, r) => s + r.netTotal, 0);
  const totalPoin = rekapData.reduce((s, r) => s + r.poin, 0);

  return (
    <div className="space-y-4">
      {/* Week picker + generate all */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-primary flex-shrink-0" />
          <Select value={weekStart} onValueChange={setWeekStart}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Pilih minggu" />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map(w => (
                <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isManagerRole && (
          <Button onClick={handleGenerateAll} disabled={generating !== null || rekapData.length === 0} className="gap-1.5">
            {generating === "all"
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
              : <><FileText className="w-3.5 h-3.5" /> Generate Semua Slip Mingguan</>}
          </Button>
        )}
      </div>

      {nilaiPerPoin === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Nilai per poin belum diatur. Bonus poin dihitung Rp 0. Atur di halaman Pengaturan Poin.
        </div>
      )}
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <Users className="w-4 h-4 text-primary mb-1" />
          <p className="text-lg font-bold">{employees.length}</p>
          <p className="text-[10px] text-muted-foreground">Karyawan Harian</p>
        </Card>
        <Card className="p-3">
          <Star className="w-4 h-4 text-amber-500 mb-1" />
          <p className="text-lg font-bold">{totalPoin}</p>
          <p className="text-[10px] text-muted-foreground">Total Poin Minggu Ini</p>
        </Card>
        <Card className="p-3">
          <Wallet className="w-4 h-4 text-green-600 mb-1" />
          <p className="text-sm font-bold text-green-700">{fmt(totalNet)}</p>
          <p className="text-[10px] text-muted-foreground">Total Gaji Minggu Ini</p>
        </Card>
      </div>

      {/* List */}
      {rekapData.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Tidak ada karyawan harian (keeper/kepala_feeder)</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rekapData.map(row => {
            const slip = row.existingSlip;
            const slipStatus = slip?.status;
            return (
              <Card key={row.emp.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold">{row.emp.full_name || row.emp.email}</span>
                      <Badge variant="outline" className="text-[11px]">{formatRole(row.emp.role)}</Badge>
                      {slip && (
                        <Badge className={`text-[11px] ${
                          slipStatus === "paid" ? "bg-green-100 text-green-700" :
                          slipStatus === "approved" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {slipStatus === "paid" ? "✓ Dibayar" : slipStatus === "approved" ? "Disetujui" : "Draft"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{formatWeekLabel(weekStart)}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Hadir:</span>
                        <p className="font-medium">{row.attendDays} hari × {fmt(row.baseRate)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gaji Pokok:</span>
                        <p className="font-medium">{fmt(row.baseSalary)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Poin ({row.poin}):</span>
                        <p className="font-medium text-green-600">+{fmt(row.poinBonus)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lembur ({row.overtimeHours}j):</span>
                        <p className="font-medium text-blue-600">+{fmt(row.overtimePay)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sayur ({row.vegTrips}):</span>
                        <p className="font-medium text-lime-600">+{fmt(row.vegPay)}</p>
                      </div>
                      {row.kasbonDeduction > 0 && (
                        <div>
                          <span className="text-muted-foreground">Kasbon:</span>
                          <p className="font-medium text-red-600">-{fmt(row.kasbonDeduction)}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-sm font-bold text-primary">Take Home: {fmt(row.netTotal)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {slip && (
                      <Button size="sm" variant="outline" onClick={() => setViewSlip(slip)} className="gap-1">
                        <Eye className="w-3.5 h-3.5" /> Lihat
                      </Button>
                    )}
                    {isManagerRole && (
                      <Button
                        size="sm"
                        variant={slip ? "outline" : "default"}
                        onClick={() => handleGenerate(row)}
                        disabled={generating !== null}
                        className="gap-1"
                      >
                        {generating === row.emp.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <FileText className="w-3.5 h-3.5" />}
                        {slip ? "Update" : "Generate"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {viewSlip && (
        <SalarySlipDetail
          slip={viewSlip}
          companySettings={settings}
          onClose={() => {
            setViewSlip(null);
            qc.invalidateQueries({ queryKey: ["salary-slips"] });
          }}
        />
      )}
    </div>
  );
}