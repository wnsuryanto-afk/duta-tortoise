import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, Star, Trophy, Gift, CheckCircle2, Clock } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import jsPDF from "jspdf";

// Generate last 12 months options
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const date = subMonths(new Date(), i);
  return {
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy", { locale: id }),
  };
});

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabels = { pending: "Belum Dibayar", paid: "Sudah Dibayar", cancelled: "Dibatalkan" };

export default function PayrollReport() {
  const { role } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState(MONTH_OPTIONS[0].value);
  const printRef = useRef(null);

  const isAdmin = role === "owner" || role === "admin" || role === "manajer";

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["bonus-rewards-period", selectedPeriod],
    queryFn: () => base44.entities.BonusReward.filter({ period: selectedPeriod }),
    enabled: isAdmin,
  });

  const { data: checklists = [], isLoading: loadingCL } = useQuery({
    queryKey: ["checklists-period", selectedPeriod],
    queryFn: async () => {
      const all = await base44.entities.DailyChecklist.filter({ status: "approved" });
      return all.filter((c) => c.date?.startsWith(selectedPeriod));
    },
    enabled: isAdmin,
  });

  // Build per-employee summary
  const employeeMap = {};
  checklists.forEach((c) => {
    if (!employeeMap[c.employee_email]) {
      employeeMap[c.employee_email] = {
        name: c.employee_name,
        email: c.employee_email,
        approvedDays: 0,
        approvedPoints: 0,
      };
    }
    employeeMap[c.employee_email].approvedDays += 1;
    employeeMap[c.employee_email].approvedPoints += c.approved_points || 0;
  });

  // Merge with bonus reward records
  rewards.forEach((r) => {
    if (!employeeMap[r.employee_email]) {
      employeeMap[r.employee_email] = {
        name: r.employee_name,
        email: r.employee_email,
        approvedDays: 0,
        approvedPoints: r.total_points || 0,
      };
    }
    employeeMap[r.employee_email].bonus_amount = r.bonus_amount || 0;
    employeeMap[r.employee_email].status = r.status;
    employeeMap[r.employee_email].reward_id = r.id;
    if (!employeeMap[r.employee_email].approvedPoints) {
      employeeMap[r.employee_email].approvedPoints = r.total_points || 0;
    }
  });

  const employees = Object.values(employeeMap).sort((a, b) => b.approvedPoints - a.approvedPoints);
  const totalBonus = employees.reduce((s, e) => s + (e.bonus_amount || 0), 0);
  const totalPoints = employees.reduce((s, e) => s + e.approvedPoints, 0);
  const selectedLabel = MONTH_OPTIONS.find((m) => m.value === selectedPeriod)?.label || selectedPeriod;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(52, 101, 58);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Laporan Rekapitulasi KPI & Bonus Karyawan", 14, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${selectedLabel}   |   Cetak: ${format(new Date(), "d MMMM yyyy", { locale: id })}`, 14, 22);

    // Summary box
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(245, 249, 245);
    doc.rect(14, 32, pageW - 28, 12, "F");
    doc.text(`Total Karyawan: ${employees.length}`, 18, 40);
    doc.text(`Total Poin: ${totalPoints.toLocaleString()}`, 80, 40);
    doc.text(`Total Bonus: Rp ${totalBonus.toLocaleString("id-ID")}`, 150, 40);

    // Table header
    const cols = ["No", "Nama Karyawan", "Email", "Hari", "Poin", "Bonus (Rp)", "Status"];
    const colX = [14, 24, 74, 124, 141, 158, 187];
    const colW = [10, 50, 50, 17, 17, 29, 28];
    let y = 52;

    doc.setFillColor(52, 101, 58);
    doc.rect(14, y - 5, pageW - 28, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    cols.forEach((col, i) => doc.text(col, colX[i] + 1, y));

    // Table rows
    doc.setFont("helvetica", "normal");
    employees.forEach((emp, i) => {
      y += 9;
      if (y > pageH - 20) {
        doc.addPage();
        y = 20;
      }
      // Alternating row
      if (i % 2 === 0) {
        doc.setFillColor(249, 252, 249);
        doc.rect(14, y - 5, pageW - 28, 8, "F");
      }
      doc.setTextColor(0, 0, 0);
      const row = [
        String(i + 1),
        (emp.name || emp.email || "-").substring(0, 22),
        (emp.email || "-").substring(0, 22),
        String(emp.approvedDays || 0),
        String(emp.approvedPoints),
        emp.bonus_amount ? `Rp ${emp.bonus_amount.toLocaleString("id-ID")}` : "-",
        emp.status ? (statusLabels[emp.status] || emp.status) : "Belum Ada Data",
      ];
      row.forEach((cell, j) => doc.text(cell, colX[j] + 1, y));
    });

    // Total row
    y += 9;
    doc.setFillColor(220, 237, 220);
    doc.rect(14, y - 5, pageW - 28, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL", colX[0] + 1, y);
    doc.text(String(totalPoints), colX[4] + 1, y);
    doc.text(`Rp ${totalBonus.toLocaleString("id-ID")}`, colX[5] + 1, y);

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text(`Halaman ${p} dari ${pageCount}  —  Sulcata Farm Manager`, pageW / 2, pageH - 6, { align: "center" });
    }

    doc.save(`Laporan-KPI-${selectedPeriod}.pdf`);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    );
  }

  const loading = isLoading || loadingCL;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Laporan KPI & Penggajian</h1>
          <p className="text-sm text-muted-foreground mt-1">Rekapitulasi poin dan bonus karyawan per bulan</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportPDF} disabled={loading || employees.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary opacity-70" />
            <div>
              <p className="text-xs text-muted-foreground">Total Karyawan</p>
              <p className="text-2xl font-heading font-bold text-primary">{employees.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-amber-500 fill-current opacity-70" />
            <div>
              <p className="text-xs text-muted-foreground">Total Poin</p>
              <p className="text-2xl font-heading font-bold text-amber-700">{totalPoints.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-green-600 opacity-70" />
            <div>
              <p className="text-xs text-muted-foreground">Total Bonus</p>
              <p className="text-xl font-heading font-bold text-green-700">Rp {totalBonus.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Rekap Karyawan — {selectedLabel}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Belum ada data untuk periode {selectedLabel}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Karyawan</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground">Hari Disetujui</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground">Total Poin</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Bonus</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={emp.email} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{emp.name || emp.email}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="font-semibold">{emp.approvedDays}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="font-bold">{emp.approvedPoints}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {emp.bonus_amount ? `Rp ${emp.bonus_amount.toLocaleString("id-ID")}` : (
                        <span className="text-muted-foreground font-normal text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.status ? (
                        <Badge className={`text-[11px] ${statusColors[emp.status] || ""}`}>
                          {emp.status === "pending" ? (
                            <><Clock className="w-3 h-3 mr-1" /> Belum Dibayar</>
                          ) : emp.status === "paid" ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Dibayar</>
                          ) : "Batal"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Belum Ada Data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-3" colSpan={3}></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{totalPoints}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-primary">
                    Rp {totalBonus.toLocaleString("id-ID")}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}