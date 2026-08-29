import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Minus, Banknote, ChevronDown, ChevronRight, History } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const statusConfig = {
  pending:  { label: "Menunggu",  color: "bg-amber-100 text-amber-700" },
  approved: { label: "Aktif",     color: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak",   color: "bg-red-100 text-red-700" },
  lunas:    { label: "Lunas",     color: "bg-muted text-muted-foreground" },
};

const methodLabel = {
  manual: "Manual",
  salary_slip: "Slip Gaji",
  cash: "Tunai",
};

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function KasbonCard({ kasbon, isAdmin, isOwner, onApprove, onReject, onDeduct, onPayoff }) {
  const [expanded, setExpanded] = useState(false);
  const sisa = (kasbon.amount || 0) - (kasbon.total_paid || 0);
  const pct = kasbon.amount ? Math.round(((kasbon.total_paid || 0) / kasbon.amount) * 100) : 0;
  const log = [...(kasbon.deduction_log || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const conf = statusConfig[kasbon.status] || statusConfig.pending;

  return (
    <div className="p-4 hover:bg-muted/20 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{kasbon.employee_name}</span>
            <Badge className={`text-[11px] ${conf.color}`}>{conf.label}</Badge>
          </div>
          <p className="text-lg font-bold text-primary">{fmt(kasbon.amount)}</p>
          {kasbon.reason && kasbon.reason !== "-" && (
            <p className="text-xs text-muted-foreground mt-0.5">"{kasbon.reason}"</p>
          )}
          {kasbon.status === "rejected" && kasbon.rejection_reason && (
            <p className="text-xs text-red-600 mt-0.5">Alasan ditolak: "{kasbon.rejection_reason}"</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Diajukan: {kasbon.request_date ? format(new Date(kasbon.request_date), "d MMM yyyy", { locale: id }) : "—"}
            {kasbon.approved_date && ` · Disetujui: ${format(new Date(kasbon.approved_date), "d MMM yyyy", { locale: id })}`}
          </p>

          {(kasbon.status === "approved" || kasbon.status === "lunas") && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Terbayar: {fmt(kasbon.total_paid)}</span>
                <span>Sisa: {fmt(sisa)} ({pct}%)</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Potongan/periode: {fmt(kasbon.weekly_deduction)}
              </p>
            </div>
          )}

          {/* Expandable deduction history */}
          {log.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <History className="w-3 h-3" />
                Riwayat potongan ({log.length})
              </button>
              {expanded && (
                <div className="mt-2 space-y-1.5">
                  {log.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                      <div>
                        <span className="font-medium">{fmt(d.amount)}</span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{methodLabel[d.method] || d.method}</Badge>
                        {d.salary_period && <span className="text-muted-foreground ml-2">· {d.salary_period}</span>}
                      </div>
                      <div className="text-right">
                        <p>{d.date ? format(new Date(d.date), "d MMM yyyy", { locale: id }) : "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{d.recorded_by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {isOwner && kasbon.status === "pending" && (
              <>
                <Button size="sm" onClick={() => onApprove(kasbon)} className="gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject(kasbon)} className="gap-1 text-destructive border-destructive hover:bg-destructive/10">
                  <XCircle className="w-3.5 h-3.5" /> Tolak
                </Button>
              </>
            )}
            {kasbon.status === "approved" && sisa > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => onDeduct(kasbon)} className="gap-1">
                  <Minus className="w-3.5 h-3.5" /> Catat Potongan
                </Button>
                <Button size="sm" variant="outline" onClick={() => onPayoff(kasbon)} className="gap-1 text-green-700 border-green-300 hover:bg-green-50">
                  <Banknote className="w-3.5 h-3.5" /> Pelunasan
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}