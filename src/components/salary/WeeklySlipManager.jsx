import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Star, FileText, Eye, Loader2, CalendarRange, Wallet, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { format, eachDayOfInterval } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { formatRole } from "@/lib/permissions";
import SalarySlipDetail from "@/components/salary/SalarySlipDetail";
import WeeklyRateSettings from "@/components/salary/WeeklyRateSettings";
import { getWeekOptions, getWeekEnd, safeParseDate, calcWeeklyOvertime } from "@/lib/weeklySalaryUtils";
import { useEmployeeUsers } from "@/hooks/useEmployeeUsers";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const DEFAULT_RATES = { base_salary: 70000, overtime_rate_per_hour: 10000, rempesan_rate_per_trip: 30000 };

/**
 * Slip gaji mingguan — rumus sesuai slip manual Excel pemilik:
 *   Gaji = (hari hadir × tarif harian)
 *        + (jam lembur × tarif lembur)
 *        + (trip rempesan × tarif rempesan)
 *        + BONUS POIN (poin × nilai_per_poin)
 *        − potongan kasbon (hasil konfirmasi owner)
 *
 * Periode Minggu–Sabtu. Tarif diambil dari SalaryConfig (bisa diubah owner).
 * Rempesan dari RempesanLog (approved). Poin × nilai_per_poin di-snapshot
 * ke nilai_poin_saat_itu supaya slip yang sudah dibayar tidak berubah surut.
 */
export default function WeeklySlipManager({ settings, isManagerRole, user }) {
  const qc = useQueryClient();
  const weekOptions = getWeekOptions();
  const [weekStart, setWeekStart] = useState(weekOptions[0]?.value || "");
  const [generating, setGenerating] = useState(null);
  const [viewSlip, setViewSlip] = useState(null);
  // Keputusan potongan kasbon per karyawan per kasbon: { `${email}__${kasbonId}`: { mode, amount, skipReason } }
  const [kasbonDecisions, setKasbonDecisions] = useState({});
  const [expandedKasbon, setExpandedKasbon] = useState({});
  const [manualOvertime, setManualOvertime] = useState({});

  const weekStartObj = safeParseDate(weekStart);
  const weekEnd = weekStartObj ? format(getWeekEnd(weekStartObj), "yyyy-MM-dd") : "";
  const days = useMemo(
    () => (weekStartObj ? eachDayOfInterval({ start: weekStartObj, end: getWeekEnd(weekStartObj) }) : []),
    [weekStartObj]
  );

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
  const { data: rempesanLogs = [] } = useQuery({
    queryKey: ["rempesan-week", weekStart, weekEnd],
    queryFn: () => base44.entities.RempesanLog.list("-date", 300),
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
  const { data: userProfiles = [] } = useQuery({
    queryKey: ["user-profiles-week"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const employees = users.filter((u) => ["keeper", "kepala_feeder"].includes(u.role));
  const nilaiPerPoin = Number(settings.nilai_per_poin) || 0;
  const nilaiNol = nilaiPerPoin === 0;
  const autoOvertime = settings.auto_overtime_enabled !== false;
  const poinBonusEnabled = settings.poin_bonus_enabled === true;

  const weekAttendances = attendances.filter((a) => a.date >= weekStart && a.date <= weekEnd);
  const weekChecklists = dailyChecklists.filter((c) => c.date >= weekStart && c.date <= weekEnd);
  const weekRempesan = rempesanLogs.filter((r) => r.date >= weekStart && r.date <= weekEnd && r.status === "approved");

  // Inisialisasi keputusan kasbon default (potong weekly_deduction) untuk kasbon tanpa keputusan
  const rekapData = useMemo(() => {
    return employees.map((emp) => {
      const config = salaryConfigs.find((c) => c.role === emp.role) || {};
      const dailyRate = config.base_salary ?? DEFAULT_RATES.base_salary;
      const overtimeRate = config.overtime_rate_per_hour ?? DEFAULT_RATES.overtime_rate_per_hour;
      const rempesanRate = config.rempesan_rate_per_trip ?? DEFAULT_RATES.rempesan_rate_per_trip;

      const empAtt = weekAttendances.filter((a) => a.employee_email === emp.email);
      const hadirDays = empAtt.filter((a) => a.status === "hadir").length;
      // marker per hari
      const dayMarkers = days.map((d) => {
        const ds = format(d, "yyyy-MM-dd");
        const att = empAtt.find((a) => a.date === ds);
        const rempesan = weekRempesan.find((r) => r.employee_email === emp.email && r.date === ds);
        return { date: ds, hadir: att?.status === "hadir", rempesan: !!rempesan };
      });

      // Lembur — per hari dari jam check-in/out, dibulatkan ke bawah ke jam penuh.
      // Bila "Hitung lembur otomatis" dimatikan, pakai isian manual owner/admin.
      const overtimeHours = autoOvertime
        ? calcWeeklyOvertime(empAtt, days.map((d) => format(d, "yyyy-MM-dd")))
        : Number(manualOvertime[emp.email] || 0);
      const overtimePay = overtimeHours * overtimeRate;

      // Rempesan: dedup per tanggal, maks 1 trip per hari
      const rempesanDatesSet = new Set();
      weekRempesan
        .filter((r) => r.employee_email === emp.email)
        .forEach((r) => { if (r.date) rempesanDatesSet.add(r.date); });
      const rempesanDates = [...rempesanDatesSet].sort();
      const rempesanTrips = rempesanDates.length;
      const rempesanPay = rempesanTrips * rempesanRate;

      // Poin dari checklist approved
      const empChecklists = weekChecklists.filter((c) => c.employee_email === emp.email && c.status === "approved");
      const poin = empChecklists.reduce((s, c) => {
        const pts = c.approved_points || c.total_points_claimed ||
          (Array.isArray(c.completed_tasks) ? c.completed_tasks.reduce((t, x) => t + (x.points || 0), 0) : 0);
        return s + (pts || 0);
      }, 0);
      // Bonus poin hanya bila diaktifkan owner & nilai poin > 0
      const poinBonus = poinBonusEnabled && !nilaiNol ? poin * nilaiPerPoin : 0;

      // Kasbon aktif karyawan
      const empKasbons = kasbons.filter((k) => k.employee_email === emp.email && k.status === "approved");
      const kasbonPlan = empKasbons.map((k) => {
        const key = `${emp.email}__${k.id}`;
        const sisa = Math.max(0, (k.amount || 0) - (k.total_paid || 0));
        const decision = kasbonDecisions[key];
        if (decision?.mode === "lewati") return { kasbon_id: k.id, amount: 0, skip_reason: decision.skipReason || "", sisa };
        const amt = Math.min(decision?.amount ?? (k.weekly_deduction || 100000), sisa);
        return { kasbon_id: k.id, amount: amt, skip_reason: "", sisa };
      });
      const kasbonDeduction = kasbonPlan.reduce((s, p) => s + (p.amount || 0), 0);
      const kasbonRemaining = empKasbons.reduce((s, k) => s + Math.max(0, (k.amount || 0) - (k.total_paid || 0)), 0) - kasbonDeduction;

      const baseSalary = hadirDays * dailyRate;
      const grossTotal = baseSalary + overtimePay + rempesanPay + poinBonus;
      const netTotal = grossTotal - kasbonDeduction;

      // Hari kerja tanpa catatan absensi (untuk peringatan)
      const missingDays = days
        .map((d) => format(d, "yyyy-MM-dd"))
        .filter((ds) => !empAtt.some((a) => a.date === ds));

      const existingSlip = slips.find((s) => s.employee_email === emp.email && s.period_type === "weekly" && s.week_start === weekStart);
      const slipPaid = existingSlip?.status === "paid";

      // Nomor rekening dari UserProfile
      const profile = userProfiles.find((p) => p.user_email === emp.email);

      return {
        emp, config, dailyRate, overtimeRate, rempesanRate,
        hadirDays, dayMarkers, overtimeHours, overtimePay,
        rempesanTrips, rempesanDates, rempesanPay,
        poin, poinBonus, nilaiPerPoin,
        empKasbons, kasbonPlan, kasbonDeduction, kasbonRemaining,
        baseSalary, grossTotal, netTotal, missingDays,
        existingSlip, slipPaid, profile,
      };
    });
  }, [employees, salaryConfigs, weekAttendances, weekChecklists, weekRempesan, kasbons, slips, weekStart, nilaiPerPoin, nilaiNol, poinBonusEnabled, autoOvertime, manualOvertime, kasbonDecisions, days, userProfiles]);

  const totalNet = rekapData.reduce((s, r) => s + r.netTotal, 0);
  const totalPoin = rekapData.reduce((s, r) => s + r.poin, 0);
  const anyMissing = rekapData.some((r) => r.missingDays.length > 0);

  const setKasbonDecision = (key, patch) =>
    setKasbonDecisions((p) => ({
      ...p,
      [key]: { mode: "potong", amount: 100000, skipReason: "", ...p[key], ...patch },
    }));

  const buildSlipData = (row) => ({
    employee_id: row.emp.id,
    employee_name: row.emp.full_name || row.emp.email,
    employee_email: row.emp.email,
    employee_role: row.emp.role,
    period_type: "weekly",
    period: weekStart,
    week_start: weekStart,
    week_end: weekEnd,
    attend_days: row.hadirDays,
    base_salary: row.baseSalary,
    kpi_bonus: row.poinBonus,
    overtime_pay: row.overtimePay,
    // Legacy vegetable_* tetap diisi nol untuk kompatibilitas tampilan lama
    vegetable_pay: 0, vegetable_trips: 0, vegetable_trip_dates: [],
    rempesan_pay: row.rempesanPay,
    rempesan_trips: row.rempesanTrips,
    rempesan_dates: row.rempesanDates,
    absent_deduction: 0,
    kasbon_deduction: row.kasbonDeduction,
    kasbon_ids: row.kasbonPlan.filter((p) => p.amount > 0).map((p) => p.kasbon_id),
    kasbon_plan: row.kasbonPlan.filter((p) => p.amount > 0 || p.skip_reason).map((p) => ({
      kasbon_id: p.kasbon_id, amount: p.amount, skip_reason: p.skip_reason,
    })),
    kasbon_remaining: row.kasbonRemaining,
    net_total: row.netTotal,
    gross_total: row.grossTotal,
    total_poin: row.poin,
    nilai_poin_saat_itu: row.nilaiPerPoin,
    poin_bonus: row.poinBonus,
    poin_deduction: 0,
    poin_status: "Mingguan",
    status: "draft",
    generated_date: format(new Date(), "yyyy-MM-dd"),
  });

  const handleGenerate = async (row) => {
    if (row.slipPaid) { toast.error("Slip sudah dibayar — tidak bisa diubah"); return; }
    setGenerating(row.emp.id);
    const slipData = buildSlipData(row);
    try {
      if (row.existingSlip) {
        await base44.entities.SalarySlip.update(row.existingSlip.id, slipData);
        toast.success(`Slip mingguan ${row.emp.full_name || row.emp.email} diperbarui`);
      } else {
        await base44.entities.SalarySlip.create(slipData);
        toast.success(`Slip mingguan ${row.emp.full_name || row.emp.email} dibuat`);
      }
      // Tandai slip_id di RempesanLog agar tidak dobel di slip lain
      const slipId = row.existingSlip?.id;
      if (slipId) {
        for (const ds of row.rempesanDates) {
          const log = weekRempesan.find((r) => r.employee_email === row.emp.email && r.date === ds && !r.slip_id);
          if (log) await base44.entities.RempesanLog.update(log.id, { slip_id: slipId });
        }
      }
      qc.invalidateQueries({ queryKey: ["salary-slips"] });
    } catch (e) {
      toast.error("Gagal: " + (e?.message || "kesalahan"));
    }
    setGenerating(null);
  };

  const handleGenerateAll = async () => {
    const eligible = rekapData.filter((r) => !r.slipPaid);
    if (eligible.length === 0) { toast.info("Tidak ada slip untuk dibuat (semua sudah dibayar)"); return; }
    setGenerating("all");
    for (const row of eligible) {
      const slipData = buildSlipData(row);
      try {
        if (row.existingSlip) {
          await base44.entities.SalarySlip.update(row.existingSlip.id, slipData);
        } else {
          await base44.entities.SalarySlip.create(slipData);
        }
      } catch { /* lanjut */ }
    }
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    toast.success(`${eligible.length} slip mingguan dibuat/diperbarui`);
    setGenerating(null);
  };

  return (
    <div className="space-y-4">
      {isManagerRole && <WeeklyRateSettings />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-primary flex-shrink-0" />
          <Select value={weekStart} onValueChange={setWeekStart}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Pilih minggu" /></SelectTrigger>
            <SelectContent>
              {weekOptions.map((w) => (<SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        {isManagerRole && (
          <Button onClick={handleGenerateAll} disabled={generating !== null || rekapData.length === 0} className="gap-1.5">
            {generating === "all" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><FileText className="w-3.5 h-3.5" /> Generate Semua Slip Mingguan</>}
          </Button>
        )}
      </div>

      {poinBonusEnabled && nilaiNol && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-300 text-sm text-red-800 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Nilai per poin belum diatur (Rp 0). Bonus poin dihitung Rp 0. Atur di halaman Pengaturan Poin.
        </div>
      )}
      {!poinBonusEnabled && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Bonus poin dimatikan. Poin tetap dicatat sebagai pencapaian tetapi tidak menjadi uang. Nyalakan di Pengaturan Tarif Mingguan bila ingin dibayar.
        </div>
      )}
      {!autoOvertime && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Hitung lembur otomatis dimatikan. Isi jam lembur manual per karyawan pada tabel di bawah.
        </div>
      )}
      {anyMissing && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Ada hari tanpa catatan absensi pada minggu ini.</p>
            <p className="text-xs mt-0.5">Periksa sebelum slip dikunci — gunakan Isi Absensi Manual bila absensi sempat error.</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><Users className="w-4 h-4 text-primary mb-1" /><p className="text-lg font-bold">{employees.length}</p><p className="text-[10px] text-muted-foreground">Karyawan Harian</p></Card>
        <Card className="p-3"><Star className="w-4 h-4 text-amber-500 mb-1" /><p className="text-lg font-bold">{totalPoin}</p><p className="text-[10px] text-muted-foreground">Total Poin Minggu Ini</p></Card>
        <Card className="p-3"><Wallet className="w-4 h-4 text-green-600 mb-1" /><p className="text-sm font-bold text-green-700">{fmt(totalNet)}</p><p className="text-[10px] text-muted-foreground">Total Gaji Minggu Ini</p></Card>
      </div>

      {rekapData.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Tidak ada karyawan harian (keeper/kepala_feeder)</p></Card>
      ) : (
        <div className="space-y-3">
          {rekapData.map((row) => {
            const slipStatus = row.existingSlip?.status;
            const kasbonKey = `${row.emp.email}__kasbon`;
            const showKasbon = expandedKasbon[kasbonKey];
            return (
              <Card key={row.emp.id} className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Baris judul */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{row.emp.full_name || row.emp.email}</span>
                      <Badge variant="outline" className="text-[11px]">{formatRole(row.emp.role)}</Badge>
                      {row.existingSlip && (
                        <Badge className={`text-[11px] ${slipStatus === "paid" ? "bg-green-100 text-green-700" : slipStatus === "approved" ? "bg-blue-100 text-blue-700" : "bg-muted text-foreground"}`}>
                          {slipStatus === "paid" ? "✓ Dibayar" : slipStatus === "approved" ? "Diperiksa" : "Draft"}
                        </Badge>
                      )}
                      {row.missingDays.length > 0 && (
                        <Badge className="text-[11px] bg-amber-100 text-amber-700" title={row.missingDays.join(", ")}>
                          ⚠ {row.missingDays.length} hari tanpa absen
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-bold text-primary">Diterima: {fmt(row.netTotal)}</div>
                  </div>

                  {/* Tabel ala Excel */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[760px]">
                      <thead>
                        <tr className="bg-muted/40 text-muted-foreground">
                          <th className="text-left p-1.5 border border-border">Karyawan</th>
                          {DAY_LABELS.map((d, i) => (
                            <th key={d} className="text-center p-1.5 border border-border">{d}</th>
                          ))}
                          <th className="text-center p-1.5 border border-border">Hari</th>
                          <th className="text-center p-1.5 border border-border">Lembur</th>
                          <th className="text-center p-1.5 border border-border">Rempesan</th>
                          <th className="text-right p-1.5 border border-border">Upah Harian</th>
                          <th className="text-right p-1.5 border border-border">Upah Lembur</th>
                          <th className="text-right p-1.5 border border-border">Total Tambahan</th>
                          <th className="text-right p-1.5 border border-border">Sisa Kasbon</th>
                          <th className="text-right p-1.5 border border-border">Potong Kasbon</th>
                          <th className="text-right p-1.5 border border-border">Diterima</th>
                          <th className="text-left p-1.5 border border-border">No. Rek</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1.5 border border-border font-medium truncate max-w-[120px]">
                            {row.emp.full_name || row.emp.email}
                          </td>
                          {row.dayMarkers.map((dm) => (
                            <td key={dm.date} className="text-center p-1.5 border border-border">
                              {dm.hadir ? <span className="text-green-600 font-semibold">H</span> : dm.rempesan ? <span className="text-blue-600 font-semibold">R</span> : <span className="text-muted-foreground">·</span>}
                            </td>
                          ))}
                          <td className="text-center p-1.5 border border-border font-semibold">{row.hadirDays}</td>
                          <td className="text-center p-1.5 border border-border">
                            {!autoOvertime && isManagerRole && !row.slipPaid ? (
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={manualOvertime[row.emp.email] ?? row.overtimeHours ?? 0}
                                onChange={(e) => setManualOvertime((p) => ({ ...p, [row.emp.email]: Number(e.target.value) || 0 }))}
                                className="h-7 w-14 text-center mx-auto"
                              />
                            ) : (
                              <span>{row.overtimeHours}j</span>
                            )}
                          </td>
                          <td className="text-center p-1.5 border border-border">{row.rempesanTrips}</td>
                          <td className="text-right p-1.5 border border-border">{fmt(row.baseSalary)}</td>
                          <td className="text-right p-1.5 border border-border text-blue-600">{fmt(row.overtimePay)}</td>
                          <td className="text-right p-1.5 border border-border text-blue-600">{fmt(row.overtimePay + row.rempesanPay)}</td>
                          <td className="text-right p-1.5 border border-border text-red-600">{fmt(row.kasbonRemaining)}</td>
                          <td className="text-right p-1.5 border border-border text-red-600">{row.kasbonDeduction > 0 ? `-${fmt(row.kasbonDeduction)}` : "—"}</td>
                          <td className="text-right p-1.5 border border-border font-bold text-primary">{fmt(row.netTotal)}</td>
                          <td className="p-1.5 border border-border text-muted-foreground truncate max-w-[100px]">
                            {row.profile?.bank_account_number || "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Rincian rempesan & poin */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {row.rempesanDates.length > 0 && (
                      <span>Rempesan: {row.rempesanDates.map((d) => format(new Date(d + "T00:00:00"), "d MMM", { locale: id })).join(", ")}</span>
                    )}
                    <span>Upah rempesan: {fmt(row.rempesanPay)} ({row.rempesanTrips} × {fmt(row.rempesanRate)})</span>
                    <span className="text-amber-700">Poin: {row.poin}</span>
                    {isManagerRole && poinBonusEnabled && (
                      <span className="text-amber-700">Bonus poin: {row.poin} × {fmt(row.nilaiPerPoin)} = {fmt(row.poinBonus)}</span>
                    )}
                    {isManagerRole && !poinBonusEnabled && (
                      <span className="text-muted-foreground">Bonus poin dimatikan</span>
                    )}
                  </div>

                  {/* Konfirmasi kasbon */}
                  {row.empKasbons.length > 0 && (
                    <div className="border-t pt-2">
                      <button
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        onClick={() => setExpandedKasbon((p) => ({ ...p, [kasbonKey]: !p[kasbonKey] }))}
                      >
                        {showKasbon ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Konfirmasi Potongan Kasbon ({row.empKasbons.length})
                      </button>
                      {showKasbon && row.empKasbons.map((k) => {
                        const key = `${row.emp.email}__${k.id}`;
                        const dec = kasbonDecisions[key] || { mode: "potong", amount: Math.min(k.weekly_deduction || 100000, Math.max(0, (k.amount || 0) - (k.total_paid || 0))) };
                        const sisa = Math.max(0, (k.amount || 0) - (k.total_paid || 0));
                        return (
                          <div key={k.id} className="mt-2 p-2.5 rounded-lg bg-muted/30 text-xs space-y-2">
                            <p>
                              Sisa kasbon <strong>{fmt(sisa)}</strong> (pinjam {format(new Date(k.request_date + "T00:00:00"), "d MMM yyyy", { locale: id })}).
                              Potong {fmt(k.weekly_deduction || 100000)} minggu ini?
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant={dec.mode === "potong" ? "default" : "outline"}
                                onClick={() => setKasbonDecision(key, { mode: "potong", amount: Math.min(k.weekly_deduction || 100000, sisa) })}
                              >
                                Ya, potong {fmt(Math.min(k.weekly_deduction || 100000, sisa))}
                              </Button>
                              <span className="text-muted-foreground">atau potong lain:</span>
                              <Input
                                type="number"
                                className="h-8 w-28"
                                value={dec.mode === "potong" ? dec.amount : ""}
                                placeholder={String(Math.min(k.weekly_deduction || 100000, sisa))}
                                onChange={(e) => setKasbonDecision(key, { mode: "potong", amount: Number(e.target.value) || 0 })}
                              />
                              <Button
                                size="sm"
                                variant={dec.mode === "lewati" ? "default" : "outline"}
                                onClick={() => setKasbonDecisions((p) => ({ ...p, [key]: { mode: "lewati", amount: 0, skipReason: p[key]?.skipReason || "" } }))}
                                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                              >
                                Lewati minggu ini
                              </Button>
                            </div>
                            {dec.mode === "lewati" && (
                              <Input
                                className="h-8"
                                placeholder="Alasan dilewati (wajib)"
                                value={dec.skipReason || ""}
                                onChange={(e) => setKasbonDecisions((p) => ({ ...p, [key]: { ...p[key], mode: "lewati", skipReason: e.target.value } }))}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Aksi */}
                  <div className="flex gap-2 justify-end">
                    {row.existingSlip && (
                      <Button size="sm" variant="outline" onClick={() => setViewSlip(row.existingSlip)} className="gap-1">
                        <Eye className="w-3.5 h-3.5" /> Lihat
                      </Button>
                    )}
                    {isManagerRole && (
                      <Button
                        size="sm"
                        variant={row.existingSlip ? "outline" : "default"}
                        onClick={() => handleGenerate(row)}
                        disabled={generating !== null || row.slipPaid}
                        className="gap-1"
                      >
                        {generating === row.emp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                        {row.slipPaid ? "Dikunci (dibayar)" : row.existingSlip ? "Update" : "Generate"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {viewSlip && (() => {
        const slipUser = users.find((u) => u.email === viewSlip.employee_email);
        const resolvedSlip = slipUser?.full_name ? { ...viewSlip, employee_name: slipUser.full_name } : viewSlip;
        return (
          <SalarySlipDetail
            slip={resolvedSlip}
            companySettings={settings}
            onClose={() => { setViewSlip(null); qc.invalidateQueries({ queryKey: ["salary-slips"] }); }}
          />
        );
      })()}
    </div>
  );
}