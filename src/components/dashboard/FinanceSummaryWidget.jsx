import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Link } from "react-router-dom";

function fmt(val) {
  const n = Number(val || 0);
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

const EXPENSE_BREAKDOWN = [
  { key: "gaji_karyawan",   label: "Gaji Karyawan",  color: "text-orange-600" },
  { key: "obat_perawatan",  label: "Biaya Obat",      color: "text-red-500" },
  { key: "pakan",           label: "Pakan",           color: "text-green-600" },
  { key: "operasional",     label: "Operasional",     color: "text-yellow-600" },
  { key: "kas_kecil",       label: "Kas Kecil",       color: "text-purple-600" },
  { key: "lainnya",         label: "Lainnya",         color: "text-gray-500" },
];

export default function FinanceSummaryWidget() {
  const currentPeriod = format(new Date(), "yyyy-MM");

  const { data: transactions = [] } = useQuery({
    queryKey: ["finance-transactions"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 1000),
  });

  const periodTx = transactions.filter((t) => t.date?.startsWith(currentPeriod));
  const pemasukan   = periodTx.filter((t) => t.type === "pemasukan").reduce((s, t) => s + (t.amount || 0), 0);
  const pengeluaran = periodTx.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + (t.amount || 0), 0);
  const laba = pemasukan - pengeluaran;

  // Breakdown pengeluaran per kategori
  const expenseByCategory = {};
  periodTx.filter(t => t.type === "pengeluaran").forEach(t => {
    const key = t.category || "lainnya";
    expenseByCategory[key] = (expenseByCategory[key] || 0) + (t.amount || 0);
  });

  const hasBreakdown = Object.keys(expenseByCategory).length > 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-base">Finance Bulan Ini</h2>
        <span className="ml-auto text-xs text-muted-foreground capitalize">
          {format(new Date(), "MMMM yyyy", { locale: id })}
        </span>
      </div>

      {/* Ringkasan 3 angka */}
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

      {/* Breakdown pengeluaran */}
      {hasBreakdown && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Rincian Pengeluaran</p>
          <div className="space-y-1">
            {EXPENSE_BREAKDOWN.map(({ key, label, color }) => {
              const amount = expenseByCategory[key] || 0;
              if (amount === 0) return null;
              const pct = pengeluaran > 0 ? Math.round((amount / pengeluaran) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground flex-1 min-w-0 truncate">{label}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-current rounded-full" style={{ width: `${pct}%`, opacity: 0.7 }} />
                    </div>
                    <span className={`font-medium w-16 text-right ${color}`}>{fmt(amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasBreakdown && pengeluaran === 0 && pemasukan === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Belum ada transaksi bulan ini</p>
      )}

      <Link to="/finance" className="block mt-3 text-center text-xs text-primary hover:underline">
        Lihat laporan lengkap →
      </Link>
    </Card>
  );
}