import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, parseISO, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import jsPDF from "jspdf";

// Upah harian default (bisa dikustomisasi)
const DAILY_WAGE = 70000;
const OVERTIME_PER_HOUR = 10000;

function getWeekLabel(weekStart) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return `${format(weekStart, "d", { locale: id })} – ${format(weekEnd, "d MMM yyyy", { locale: id })}`;
}

export default function DailyPayrollReport() {
  const { role } = useCurrentUser();
  const isAdmin = role === "owner" || role === "admin" || role === "manajer";

  // Current week (Senin – Sabtu)
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addWeeks(base, weekOffset);
  }, [weekOffset]);

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);

  // Hari kerja: Senin – Sabtu (6 hari)
  const workDays = useMemo(() => {
    const all = eachDayOfInterval({ start: weekStart, end: weekEnd });
    return all.filter((d) => d.getDay() !== 0); // buang Minggu
  }, [weekStart, weekEnd]);

  const dateFrom = format(weekStart, "yyyy-MM-dd");
  const dateTo = format(weekEnd, "yyyy-MM-dd");

  const { data: attendances = [], isLoading } = useQuery({
    queryKey: ["attendance-week", dateFrom],
    queryFn: async () => {
      const all = await base44.entities.Attendance.list("-date", 500);
      return all.filter((a) => {
        const d = parseISO(a.date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      });
    },
    enabled: isAdmin,
  });

  // Kelompokkan per karyawan
  const employeeData = useMemo(() => {
    const map = {};
    attendances.forEach((a) => {
      if (!map[a.employee_email]) {
        map[a.employee_email] = {
          name: a.employee_name || a.employee_email,
          email: a.employee_email,
          days: {},
        };
      }
      map[a.employee_email].days[a.date] = a;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendances]);

  function calcHours(att) {
    if (!att?.check_in || !att?.check_out) return 0;
    const [ih, im] = att.check_in.split(":").map(Number);
    const [oh, om] = att.check_out.split(":").map(Number);
    return Math.max(0, (oh * 60 + om - ih * 60 - im) / 60);
  }

  function calcOvertimeHours(hours) {
    return Math.max(0, hours - 8);
  }

  function getSummary(emp) {
    let totalDays = 0;
    let totalHours = 0;
    let totalOvertime = 0;

    workDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const att = emp.days[dateStr];
      if (att?.status === "hadir" || (att?.check_in && !att?.status)) {
        totalDays++;
        const h = calcHours(att);
        totalHours += h;
        totalOvertime += calcOvertimeHours(h);
      }
    });

    const upahHarian = totalDays * DAILY_WAGE;
    const upahLembur = Math.round(totalOvertime) * OVERTIME_PER_HOUR;
    const total = upahHarian + upahLembur;
    return { totalDays, totalHours: Math.round(totalHours), totalOvertime: Math.round(totalOvertime), upahHarian, upahLembur, total };
  }

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 12;
    let y = 16;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("UPAH KERJA HARIAN UNTUK KEEPER", pageW / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${getWeekLabel(weekStart)}`, pageW / 2, y, { align: "center" });
    y += 10;

    const dayLabels = workDays.map((d) => format(d, "EEE\nd/M", { locale: id }));
    const colW = { no: 8, name: 36, days: 12, h: 10, upah: 22, lembur: 22, total: 26 };
    const dayColW = 12;

    // Header
    doc.setFillColor(52, 101, 58);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");

    let x = margin;
    const hh = 10;
    const drawCell = (text, cx, w, align = "left") => {
      doc.rect(cx, y, w, hh);
      const tx = align === "center" ? cx + w / 2 : cx + 2;
      doc.text(text, tx, y + 6.5, { align });
    };

    doc.setFillColor(52, 101, 58);
    doc.rect(margin, y, pageW - margin * 2, hh, "F");
    drawCell("No", x, colW.no, "center"); x += colW.no;
    drawCell("Nama", x, colW.name); x += colW.name;
    workDays.forEach((d) => {
      drawCell(format(d, "EEE", { locale: id }), x, dayColW, "center");
      x += dayColW;
    });
    drawCell("Hari", x, colW.days, "center"); x += colW.days;
    drawCell("Jam", x, colW.h, "center"); x += colW.h;
    drawCell("Upah (Rp)", x, colW.upah, "center"); x += colW.upah;
    drawCell("Lembur (Rp)", x, colW.lembur, "center"); x += colW.lembur;
    drawCell("Total (Rp)", x, colW.total, "center");
    y += hh;

    // Rows
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    employeeData.forEach((emp, idx) => {
      const summ = getSummary(emp);
      x = margin;
      const bg = idx % 2 === 0 ? [248, 252, 248] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(margin, y, pageW - margin * 2, hh, "F");
      drawCell(String(idx + 1), x, colW.no, "center"); x += colW.no;
      drawCell(emp.name, x, colW.name); x += colW.name;
      workDays.forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const att = emp.days[dateStr];
        const present = att?.status === "hadir" || (att?.check_in && !att?.status);
        drawCell(present ? "✓" : "-", x, dayColW, "center");
        x += dayColW;
      });
      drawCell(String(summ.totalDays), x, colW.days, "center"); x += colW.days;
      drawCell(String(summ.totalHours), x, colW.h, "center"); x += colW.h;
      drawCell(summ.upahHarian.toLocaleString("id-ID"), x, colW.upah, "center"); x += colW.upah;
      drawCell(summ.upahLembur > 0 ? summ.upahLembur.toLocaleString("id-ID") : "-", x, colW.lembur, "center"); x += colW.lembur;
      drawCell(summ.total.toLocaleString("id-ID"), x, colW.total, "center");
      y += hh;
    });

    // Total row
    const grandTotal = employeeData.reduce((s, e) => s + getSummary(e).total, 0);
    doc.setFillColor(220, 235, 220);
    doc.rect(margin, y, pageW - margin * 2, hh, "F");
    doc.setFont("helvetica", "bold");
    x = margin;
    drawCell("", x, colW.no, "center"); x += colW.no;
    drawCell("TOTAL", x, colW.name); x += colW.name;
    workDays.forEach(() => { x += dayColW; });
    x += colW.days + colW.h + colW.upah + colW.lembur;
    drawCell(grandTotal.toLocaleString("id-ID"), x, colW.total, "center");

    doc.save(`Gaji-Harian-${format(weekStart, "yyyy-ww")}.pdf`);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Laporan Gaji Harian</h1>
          <p className="text-sm text-muted-foreground mt-1">Rekap kehadiran & upah harian keeper per minggu</p>
        </div>
        <Button onClick={handleExportPDF} disabled={isLoading || employeeData.length === 0} className="gap-2">
          <FileDown className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Week Navigator */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-sm">
              {getWeekLabel(weekStart)}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(weekStart, "EEEE", { locale: id })} – {format(weekEnd, "EEEE", { locale: id })}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={weekOffset >= 0}
            className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Info upah */}
      <div className="flex gap-3 text-xs text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
        <span>Upah harian: <strong className="text-foreground">Rp {DAILY_WAGE.toLocaleString("id-ID")}</strong></span>
        <span>•</span>
        <span>Lembur/jam: <strong className="text-foreground">Rp {OVERTIME_PER_HOUR.toLocaleString("id-ID")}</strong></span>
        <span>•</span>
        <span>Jam normal: <strong className="text-foreground">8 jam/hari</strong></span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap w-8">#</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap min-w-[120px]">Nama</th>
                  {workDays.map((d) => (
                    <th key={d.toISOString()} className="px-2 py-3 text-center font-semibold whitespace-nowrap w-14">
                      <div>{format(d, "EEE", { locale: id })}</div>
                      <div className="font-normal opacity-80">{format(d, "d/M")}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Hari</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Jam</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Upah</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Lembur</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap bg-primary-foreground/10">Total</th>
                </tr>
              </thead>
              <tbody>
                {employeeData.length === 0 ? (
                  <tr>
                    <td colSpan={8 + workDays.length} className="text-center py-12 text-muted-foreground">
                      Tidak ada data absensi untuk minggu ini
                    </td>
                  </tr>
                ) : (
                  employeeData.map((emp, idx) => {
                    const summ = getSummary(emp);
                    return (
                      <tr key={emp.email} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-3 font-medium">{emp.name}</td>
                        {workDays.map((d) => {
                          const dateStr = format(d, "yyyy-MM-dd");
                          const att = emp.days[dateStr];
                          const present = att?.status === "hadir" || (att?.check_in && !att?.status);
                          const izin = att?.status === "izin";
                          const sakit = att?.status === "sakit";
                          return (
                            <td key={dateStr} className="px-2 py-3 text-center">
                              {present ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  {att?.check_in && (
                                    <span className="text-[10px] text-muted-foreground leading-tight">
                                      {att.check_in}
                                    </span>
                                  )}
                                </div>
                              ) : izin ? (
                                <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1">I</Badge>
                              ) : sakit ? (
                                <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1">S</Badge>
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center font-semibold">{summ.totalDays}</td>
                        <td className="px-3 py-3 text-center text-muted-foreground">{summ.totalHours}j</td>
                        <td className="px-3 py-3 text-right text-primary font-medium">
                          Rp {summ.upahHarian.toLocaleString("id-ID")}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {summ.upahLembur > 0 ? (
                            <span className="text-accent font-medium">Rp {summ.upahLembur.toLocaleString("id-ID")}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-base">
                          Rp {summ.total.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {employeeData.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/40 font-bold border-t-2">
                    <td className="px-3 py-3" colSpan={2 + workDays.length + 2}></td>
                    <td className="px-3 py-3 text-right text-primary">
                      Rp {employeeData.reduce((s, e) => s + getSummary(e).upahHarian, 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-3 text-right text-accent">
                      {employeeData.some((e) => getSummary(e).upahLembur > 0)
                        ? `Rp ${employeeData.reduce((s, e) => s + getSummary(e).upahLembur, 0).toLocaleString("id-ID")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-lg">
                      Rp {employeeData.reduce((s, e) => s + getSummary(e).total, 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}