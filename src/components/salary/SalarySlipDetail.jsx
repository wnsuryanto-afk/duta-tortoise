import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, CheckCircle2, XCircle, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

const statusConfig = {
  draft:    { label: "Draft",     icon: Clock,        color: "bg-gray-100 text-gray-700" },
  approved: { label: "Disetujui", icon: CheckCircle2, color: "bg-blue-100 text-blue-700" },
  paid:     { label: "Dibayar",   icon: CheckCircle2, color: "bg-green-100 text-green-700" },
};

export default function SalarySlipDetail({ slip, onClose, companySettings }) {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const printRef = useRef(null);

  if (!slip) return null;

  const canManage = ["owner", "manajer", "admin"].includes(role);
  const settings = companySettings || {};
  const conf = statusConfig[slip.status] || statusConfig.draft;
  const StatusIcon = conf.icon;

  const periodLabel = slip.period
    ? format(new Date(slip.period + "-01"), "MMMM yyyy", { locale: id })
    : slip.period;

  const handleApprove = async () => {
    await base44.entities.SalarySlip.update(slip.id, {
      status: "approved",
      approved_by: user?.full_name || user?.email,
      approved_date: format(new Date(), "yyyy-MM-dd"),
    });
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    toast.success("Slip gaji disetujui");
    onClose();
  };

  const handleMarkPaid = async () => {
    const paidDate = format(new Date(), "yyyy-MM-dd");
    await base44.entities.SalarySlip.update(slip.id, {
      status: "paid",
      paid_date: paidDate,
      paid_by: user?.full_name || user?.email,
    });
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    toast.success("Slip gaji ditandai dibayar");
    onClose();
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Slip Gaji - ${slip.employee_name} - ${periodLabel}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
            .header h1 { font-size: 16px; font-weight: bold; }
            .header h2 { font-size: 13px; margin-top: 4px; letter-spacing: 2px; }
            .header p { font-size: 11px; color: #555; margin-top: 4px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
            .info-row { display: flex; gap: 6px; }
            .info-label { color: #666; min-width: 80px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th { background: #f5f5f5; padding: 6px 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; }
            td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
            .amount { text-align: right; }
            .total-row td { font-weight: bold; background: #f5f5f5; font-size: 13px; }
            .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 24px; }
            .sign-box { text-align: center; }
            .sign-box p { font-size: 11px; margin-bottom: 48px; }
            .sign-box .name { font-weight: bold; border-top: 1px solid #333; padding-top: 4px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .badge-gray { background: #f3f4f6; color: #374151; }
            @media print { body { padding: 12px; } }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const grossTotal = (slip.base_salary || 0) + (slip.kpi_bonus || 0) + (slip.overtime_pay || 0) + (slip.vegetable_pay || 0);
  const hasOvertime = (slip.overtime_pay || 0) > 0;
  const hasVeg = (slip.vegetable_pay || 0) > 0;
  const hasKasbonDed = (slip.kasbon_deduction || 0) > 0;
  const hasPoinDed = (slip.poin_deduction || 0) > 0;
  const targetPoin = settings.min_poin_bulanan || 300;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Detail Slip Gaji</span>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${conf.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {conf.label}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Printable area */}
        <div ref={printRef}>
          {/* KOP */}
          <div className="header text-center border-b-2 border-gray-300 pb-3 mb-4">
            {settings.company_logo_url && (
              <img src={settings.company_logo_url} alt="Logo" className="h-12 mx-auto mb-1" />
            )}
            <h1 className="text-base font-bold">{settings.company_name || "Duta Tortoise Farm"}</h1>
            {settings.company_address && <p className="text-xs text-muted-foreground">{settings.company_address}{settings.company_city ? `, ${settings.company_city}` : ""}</p>}
            {settings.company_phone && <p className="text-xs text-muted-foreground">Telp: {settings.company_phone}</p>}
            <h2 className="text-sm font-bold mt-2 tracking-widest">SLIP GAJI KARYAWAN</h2>
            <p className="text-xs text-muted-foreground">Periode: {periodLabel}</p>
          </div>

          {/* Info karyawan */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
            <div className="flex gap-2"><span className="text-muted-foreground w-28">Nama</span><span className="font-medium">: {slip.employee_name}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-28">Jabatan</span><span className="font-medium capitalize">: {slip.employee_role}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-28">Periode</span><span className="font-medium">: {periodLabel}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-28">Tgl. Dibuat</span><span className="font-medium">: {slip.generated_date ? format(new Date(slip.generated_date), "d MMM yyyy", { locale: id }) : "-"}</span></div>
          </div>

          {/* Tabel rincian */}
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left p-2 border border-border font-semibold">Komponen</th>
                <th className="text-right p-2 border border-border font-semibold">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-border">Gaji Pokok</td>
                <td className="p-2 border border-border text-right font-medium">{fmt(slip.base_salary)}</td>
              </tr>
              <tr className="bg-amber-50/40">
                <td className="p-2 border border-border">
                  Total Poin KPI
                  <span className="text-xs text-muted-foreground ml-1">({slip.total_poin || 0} poin · Target: {targetPoin} poin)</span>
                </td>
                <td className="p-2 border border-border text-right">
                  <span className={`text-xs font-medium ${(slip.total_poin || 0) >= targetPoin ? "text-green-600" : "text-red-600"}`}>
                    {(slip.total_poin || 0) >= targetPoin ? "✓ Tercapai" : `✗ ${slip.poin_status || ""}`}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="p-2 border border-border">Bonus Poin ({slip.total_poin || 0} × Rp {(settings.nilai_per_poin || 500).toLocaleString("id-ID")})</td>
                <td className="p-2 border border-border text-right text-green-600 font-medium">+{fmt(slip.poin_bonus)}</td>
              </tr>
              {hasPoinDed && (
                <tr>
                  <td className="p-2 border border-border text-red-600">Potongan Poin (kurang target)</td>
                  <td className="p-2 border border-border text-right text-red-600 font-medium">({fmt(slip.poin_deduction)})</td>
                </tr>
              )}
              <tr className="bg-blue-50/30">
                <td className="p-2 border border-border font-medium">KPI Bersih</td>
                <td className={`p-2 border border-border text-right font-semibold ${(slip.kpi_bonus || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {(slip.kpi_bonus || 0) >= 0 ? "+" : ""}{fmt(slip.kpi_bonus)}
                </td>
              </tr>
              {hasOvertime && (
                <tr>
                  <td className="p-2 border border-border">Lembur</td>
                  <td className="p-2 border border-border text-right text-blue-600 font-medium">+{fmt(slip.overtime_pay)}</td>
                </tr>
              )}
              {hasVeg && (
                <tr>
                  <td className="p-2 border border-border">Tunjangan Sayuran</td>
                  <td className="p-2 border border-border text-right text-blue-600 font-medium">+{fmt(slip.vegetable_pay)}</td>
                </tr>
              )}
              <tr className="bg-muted/30 font-semibold">
                <td className="p-2 border border-border">Total Bruto</td>
                <td className="p-2 border border-border text-right">{fmt(grossTotal)}</td>
              </tr>
              {hasKasbonDed && (
                <tr>
                  <td className="p-2 border border-border text-red-600">Potongan Kasbon</td>
                  <td className="p-2 border border-border text-right text-red-600 font-medium">({fmt(slip.kasbon_deduction)})</td>
                </tr>
              )}
              <tr className="bg-primary/10 font-bold text-base">
                <td className="p-3 border border-border text-primary">TOTAL GAJI BERSIH</td>
                <td className="p-3 border border-border text-right text-primary text-lg">{fmt(slip.net_total)}</td>
              </tr>
            </tbody>
          </table>

          {/* Status info */}
          {slip.paid_date && (
            <p className="text-xs text-muted-foreground mb-2">
              Dibayarkan: {format(new Date(slip.paid_date), "d MMMM yyyy", { locale: id })}
              {slip.paid_by && ` oleh ${slip.paid_by}`}
            </p>
          )}

          {/* Tanda tangan */}
          <div className="grid grid-cols-3 gap-4 mt-6 text-center text-xs">
            <div>
              <p className="text-muted-foreground mb-10">Dibuat oleh,</p>
              <p className="border-t border-gray-400 pt-1 font-medium">
                {slip.generated_by || settings.director_name || "Admin"}
              </p>
              <p className="text-muted-foreground capitalize">{settings.director_title || "Pimpinan"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-10">Disetujui oleh,</p>
              <p className="border-t border-gray-400 pt-1 font-medium">
                {slip.approved_by || "....................."}
              </p>
              <p className="text-muted-foreground capitalize">{slip.approved_by ? "Manager" : ""}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-10">Diterima oleh,</p>
              <p className="border-t border-gray-400 pt-1 font-medium">{slip.employee_name}</p>
              <p className="text-muted-foreground capitalize">{slip.employee_role}</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-4">
            Dokumen ini diterbitkan secara digital · {settings.company_name || "Duta Tortoise Farm"} · {slip.generated_date}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Cetak / Export PDF
          </Button>
          {canManage && slip.status === "draft" && (
            <Button variant="outline" onClick={handleApprove} className="gap-2 text-blue-600 border-blue-300 hover:bg-blue-50">
              <CheckCircle2 className="w-4 h-4" /> Approve
            </Button>
          )}
          {canManage && slip.status !== "paid" && (
            <Button onClick={handleMarkPaid} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Tandai Dibayar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="ml-auto">
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}