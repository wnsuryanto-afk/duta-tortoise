import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useVegTrips } from "@/hooks/useVegTrips";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Star, Clock, Leaf, MinusCircle, FileDown, Users } from "lucide-react";
import { format, subMonths, getDaysInMonth } from "date-fns";
import { id } from "date-fns/locale";
import jsPDF from "jspdf";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: id }) };
});

function fmtRp(val) {
  return `Rp ${(val || 0).toLocaleString("id-ID")}`;
}

export default function MonthlySalaryPage() {
  const { role } = useCurrentUser();
  const [period, setPeriod] = useState(MONTH_OPTIONS[0].value);

  const isAdmin = ["owner", "admin", "manajer"].includes(role);

  const { data: salaryConfigs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
    enabled: isAdmin,
  });

  const { data: userProfiles = [] } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: isAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const roleLabel = (r) => ({
    kepala_feeder: "Kepala Feeder",
    keeper: "Keeper",
    manajer: "Manajer",
    admin: "Admin",
    owner: "Owner",
  })[r] || r || "Keeper";
  const isDailyRole = (r) => ["keeper", "kepala_feeder"].includes(r);

  const { data: checklists = [] } = useQuery({
    queryKey: ["checklists-salary", period],
    queryFn: async () => {
      const all = await base44.entities.DailyChecklist.filter({ status: "approved" });
      return all.filter((c) => c.date?.startsWith(period));
    },
    enabled: isAdmin,
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendance-salary", period],
    queryFn: async () => {
      const all = await base44.entities.Attendance.list("-date", 1000);
      return all.filter((a) => a.date?.startsWith(period));
    },
    enabled: isAdmin,
  });

  const { data: overtimeLogs = [] } = useQuery({
    queryKey: ["overtime-salary", period],
    queryFn: async () => {
      const all = await base44.entities.OvertimeLog.list("-date", 500);
      return all.filter((o) => o.date?.startsWith(period));
    },
    enabled: isAdmin,
  });

  const { data: vegTripsMap = {} } = useVegTrips(period, isAdmin);

  const { data: kasbons = [] } = useQuery({
    queryKey: ["kasbons-active"],
    queryFn: () => base44.entities.Kasbon.filter({ status: "approved" }),
    enabled: isAdmin,
  });

  // Build per-employee salary calculation (eligible employees from User; owner excluded)
  const salaryData = useMemo(() => {
    const configMap = {};
    salaryConfigs.forEach((c) => { configMap[c.role] = c; });

    const empMap = {};
    users.forEach((u) => {
      if (!["keeper", "kepala_feeder", "admin"].includes(u.role)) return;
      if (!u.email) return;
      const profile = userProfiles.find((p) => p.user_email === u.email);
      empMap[u.email] = {
        email: u.email,
        name: u.full_name || profile?.full_name || u.email,
        role: u.role,
        profile,
        attendDays: 0,
        kpiPoints: 0,
        overtimeHours: 0,
        vegTrips: 0,
        kasbonDeduction: 0,
      };
    });

    const [yr, mo] = period.split("-").map(Number);
    const workDays = getDaysInMonth(new Date(yr, mo - 1));

    // Attendance (hari hadir)
    attendances.forEach((a) => {
      const emp = empMap[a.employee_email];
      if (!emp) return;
      if (a.status === "hadir") emp.attendDays++;
    });

    // KPI points dari checklist SOP yang dikirim (exclude rejected)
    checklists.forEach((c) => {
      const emp = empMap[c.employee_email];
      if (!emp) return;
      if (c.status === "rejected") return;
      const pts = c.approved_points || c.total_points_claimed ||
        (Array.isArray(c.completed_tasks) ? c.completed_tasks.reduce((s, t) => s + (t.points || 0), 0) : 0);
      emp.kpiPoints += pts || 0;
    });

    // Overtime
    overtimeLogs.forEach((o) => {
      const emp = empMap[o.employee_email];
      if (!emp) return;
      emp.overtimeHours += o.hours || 0;
    });

    // Vegetable trips (dari PakanHarian, dedup per hari)
    Object.entries(vegTripsMap).forEach(([email, data]) => {
      const emp = empMap[email];
      if (!emp) return;
      emp.vegTrips += data.trips || 0;
    });

    // Kasbon deduction
    kasbons.forEach((k) => {
      const emp = empMap[k.employee_email];
      if (!emp) return;
      const remaining = (k.amount || 0) - (k.total_paid || 0);
      if (remaining > 0) {
        emp.kasbonDeduction += Math.min(remaining, (k.weekly_deduction || 100000) * 4);
      }
    });

    // Calculate salary
    return Object.values(empMap).map((emp) => {
      const cfg = configMap[emp.role] || {};
      const baseRate = cfg.base_salary || 0;
      const daily = isDailyRole(emp.role);
      // Harian: gaji pokok = base × hari hadir; Bulanan: flat
      const baseSalary = daily ? baseRate * emp.attendDays : baseRate;
      // KPI: poin × point_value (default 200 utk keeper & kepala_feeder)
      const pointValue = (cfg.point_value && cfg.point_value > 0) ? cfg.point_value : (daily ? 200 : 0);
      const kpiValue = emp.kpiPoints * pointValue;
      const overtimePay = emp.overtimeHours * (cfg.overtime_rate_per_hour || 0);
      const vegPay = emp.vegTrips * (cfg.vegetable_rate_per_trip || 0);

      let absentDays = 0;
      let absentDeduction = 0;
      if (!daily) {
        absentDays = Math.max(0, workDays - emp.attendDays);
        absentDeduction = absentDays * (cfg.absent_deduction || 0);
      }
      const kasbonDed = emp.kasbonDeduction || 0;

      const totalGross = baseSalary + kpiValue + overtimePay + vegPay;
      const totalDeduction = absentDeduction + kasbonDed;
      const netSalary = Math.max(0, totalGross - totalDeduction);

      return {
        ...emp,
        baseRate,
        daily,
        baseSalary,
        pointValue,
        kpiValue,
        overtimePay,
        vegPay,
        absentDays,
        absentDeduction,
        kasbonDed,
        totalGross,
        totalDeduction,
        netSalary,
      };
    }).sort((a, b) => b.netSalary - a.netSalary);
  }, [salaryConfigs, users, attendances, checklists, overtimeLogs, vegTripsMap, kasbons, userProfiles, period]);

  const totalNet = salaryData.reduce((s, e) => s + e.netSalary, 0);
  const selectedLabel = MONTH_OPTIONS.find((m) => m.value === period)?.label || period;

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const margin = 14;
    let y = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Laporan Gaji Bulanan — ${selectedLabel}`, margin, y); y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Dicetak: ${format(new Date(), "d MMMM yyyy", { locale: id })}`, margin, y); y += 10;

    const headers = ["No","Nama","Role","Gaji Pokok","KPI","Lembur","Sayur","Ptn Absen","Cicilan","Total Bersih"];
    const colWidths = [10, 45, 20, 28, 22, 22, 18, 26, 22, 28];
    let x = margin;
    doc.setFillColor(52, 101, 58);
    doc.rect(margin, y, 266, 8, "F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(7);
    doc.setFont("helvetica","bold");
    headers.forEach((h, i) => { doc.text(h, x + 1, y + 5.5); x += colWidths[i]; });
    y += 8;

    salaryData.forEach((emp, idx) => {
      if (y > 185) { doc.addPage(); y = 20; }
      const bg = idx % 2 === 0 ? [245,249,245] : [255,255,255];
      doc.setFillColor(...bg);
      doc.rect(margin, y, 266, 8, "F");
      doc.setTextColor(40,40,40);
      doc.setFont("helvetica","normal");
      const row = [
        String(idx+1), emp.name, roleLabel(emp.role),
        fmtRp(emp.baseSalary), fmtRp(emp.kpiValue), fmtRp(emp.overtimePay), fmtRp(emp.vegPay),
        fmtRp(emp.absentDeduction), fmtRp(emp.kasbonDed), fmtRp(emp.netSalary)
      ];
      x = margin;
      row.forEach((cell, i) => {
        doc.text(doc.splitTextToSize(cell, colWidths[i]-2)[0]||"", x+1, y+5.5);
        x += colWidths[i];
      });
      y += 8;
    });

    doc.save(`Gaji-Bulanan-${period}.pdf`);
  };

  if (!isAdmin) {
    return <div className="text-center py-20 text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Laporan Gaji Bulanan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Kalkulasi otomatis: gaji pokok + KPI + lembur + sayur - absen - kasbon</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportPDF} disabled={salaryData.length === 0} className="gap-2">
            <FileDown className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7 text-primary opacity-70" />
            <div>
              <p className="text-xs text-muted-foreground">Karyawan</p>
              <p className="text-xl font-bold text-primary">{salaryData.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <Wallet className="w-7 h-7 text-green-600 opacity-70" />
            <div>
              <p className="text-xs text-muted-foreground">Total Gaji Bersih</p>
              <p className="text-base font-bold text-green-700">{fmtRp(totalNet)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <Star className="w-7 h-7 text-amber-500 opacity-70" />
            <div>
              <p className="text-xs text-muted-foreground">Total KPI</p>
              <p className="text-xl font-bold text-amber-700">{fmtRp(salaryData.reduce((s,e)=>s+e.kpiValue,0))}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7 text-blue-600 opacity-70" />
            <div>
              <p className="text-xs text-muted-foreground">Total Lembur</p>
              <p className="text-xl font-bold text-blue-700">{fmtRp(salaryData.reduce((s,e)=>s+e.overtimePay,0))}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detail Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Rincian Gaji — {selectedLabel}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-muted/40 border-b text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Karyawan</th>
                <th className="text-center px-3 py-3 font-semibold">Gaji Pokok</th>
                <th className="text-center px-3 py-3 font-semibold flex items-center gap-1 justify-center"><Star className="w-3 h-3 text-amber-500" />KPI</th>
                <th className="text-center px-3 py-3 font-semibold">Lembur</th>
                <th className="text-center px-3 py-3 font-semibold">Sayur</th>
                <th className="text-center px-3 py-3 font-semibold text-red-600">Ptn Absen</th>
                <th className="text-center px-3 py-3 font-semibold text-red-600">Cicilan</th>
                <th className="text-right px-4 py-3 font-semibold text-primary">Bersih</th>
              </tr>
            </thead>
            <tbody>
              {salaryData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-muted-foreground text-sm">
                    Belum ada data untuk periode {selectedLabel}
                  </td>
                </tr>
              ) : salaryData.map((emp, i) => (
                <tr key={emp.email} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel(emp.role)} · {emp.attendDays} hari hadir</p>
                  </td>
                  <td className="px-3 py-3 text-center text-sm">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{fmtRp(emp.baseSalary)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {emp.daily ? `${emp.attendDays} hari × ${fmtRp(emp.baseRate)}` : "Bulanan"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-medium text-amber-700">{fmtRp(emp.kpiValue)}</span>
                      <span className="text-[10px] text-muted-foreground">{emp.kpiPoints} poin × {fmtRp(emp.pointValue || 0)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm">{fmtRp(emp.overtimePay)}</span>
                      <span className="text-[10px] text-muted-foreground">{emp.overtimeHours} jam</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm">{fmtRp(emp.vegPay)}</span>
                      <span className="text-[10px] text-muted-foreground">{emp.vegTrips} trip</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-sm text-red-600">-{fmtRp(emp.absentDeduction)}</span>
                    {emp.absentDays > 0 && <p className="text-[10px] text-muted-foreground">{emp.absentDays} hari</p>}
                  </td>
                  <td className="px-3 py-3 text-center text-sm text-red-600">
                    -{fmtRp(emp.kasbonDed)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-primary text-base">{fmtRp(emp.netSalary)}</span>
                    {emp.profile?.bank_name && (
                      <p className="text-[10px] text-muted-foreground">{emp.profile.bank_name} · {emp.profile.bank_account_number}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {salaryData.length > 0 && (
              <tfoot>
                <tr className="bg-primary/5 font-semibold border-t">
                  <td colSpan={8} className="px-4 py-3 text-right text-sm">Total Gaji Bersih:</td>
                  <td className="px-4 py-3 text-right text-primary font-bold text-base">{fmtRp(totalNet)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}