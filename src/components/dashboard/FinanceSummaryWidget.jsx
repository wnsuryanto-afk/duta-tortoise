import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

function fmt(val) {
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
  return `Rp ${val}`;
}

export default function FinanceSummaryWidget() {
  const currentPeriod = format(new Date(), "yyyy-MM");

  const { data: transactions = [] } = useQuery({
    queryKey: ["finance-transactions"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 1000),
  });

  const periodTx = transactions.filter((t) => t.date?.startsWith(currentPeriod));
  const pemasukan  = periodTx.filter((t) => t.type === "pemasukan").reduce((s, t) => s + (t.amount || 0), 0);
  const pengeluaran = periodTx.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + (t.amount || 0), 0);
  const laba = pemasukan - pengeluaran;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-base">Finance Bulan Ini</h2>
        <span className="ml-auto text-xs text-muted-foreground capitalize">{format(new Date(), "MMMM yyyy")}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-green-50 text-center">
          <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-1" />
          <p className="text-sm font-bold text-green-700">{fmt(pemasukan)}</p>
          <p className="text-[11px] text-green-600">Pemasukan</p>
        </div>
        <div className="p-3 rounded-xl bg-red-50 text-center">
          <TrendingDown className="w-4 h-4 text-red-600 mx-auto mb-1" />
          <p className="text-sm font-bold text-red-700">{fmt(pengeluaran)}</p>
          <p className="text-[11px] text-red-600">Pengeluaran</p>
        </div>
        <div className={`p-3 rounded-xl text-center ${laba >= 0 ? "bg-primary/5" : "bg-orange-50"}`}>
          <DollarSign className={`w-4 h-4 mx-auto mb-1 ${laba >= 0 ? "text-primary" : "text-orange-600"}`} />
          <p className={`text-sm font-bold ${laba >= 0 ? "text-primary" : "text-orange-700"}`}>{fmt(Math.abs(laba))}</p>
          <p className={`text-[11px] ${laba >= 0 ? "text-primary/70" : "text-orange-600"}`}>{laba >= 0 ? "Laba" : "Rugi"}</p>
        </div>
      </div>

      {/* Transaksi terbaru */}
      {periodTx.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {periodTx.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/40">
              <span className="text-xs text-muted-foreground truncate flex-1">{t.description || t.category}</span>
              <span className={`text-xs font-semibold flex-shrink-0 ml-2 ${t.type === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                {t.type === "pemasukan" ? "+" : "-"}{fmt(t.amount || 0)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link to="/finance" className="block mt-3 text-center text-xs text-primary hover:underline">
        Lihat laporan lengkap →
      </Link>
    </Card>
  );
}