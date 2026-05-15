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
import "jspdf-autotable";

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

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Laporan Rekapitulasi KPI & Bonus Karyawan", 14, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${selectedLabel}`, 14, 30);
    doc.text(`Tanggal Cetak: ${format(new Date(), "d MMMM yyyy", { locale: id })}`, 14, 37);

    // Summary line
    doc.setFont("helvetica", "bold");
    doc.text(`Total Karyawan: ${employees.length}   |   Total Poin: ${totalPoints}   |   Total Bonus: Rp ${totalBonus.toLocaleString("id-ID")}`, 14, 47);

    // Table
    doc.autoTable({
      startY: 55,
      head: [["No", "Nama Karyawan", "Email", "Hari Hadir", "Total Poin", "Bonus (Rp)", "Status"]],
      body: employees.map((e, i) => [
        i + 1,
        e.name || "-",
        e.email || "-",
        e.approvedDays || "-",
        e.approvedPoints,
        e.bonus_amount ? `Rp ${e.bonus_amount.toLocaleString("id-ID")}` : "-",
        e.status ? statusLabels[e.status] || e.status : "Belum Ada Data",
      ]),
      headStyles: { fillColor: [52, 101, 58], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 249, 245] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "right" },
        6: { halign: "center" },
      },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text(
        `Halaman ${i} dari ${pageCount}  —  Sulcata Farm Manager`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
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