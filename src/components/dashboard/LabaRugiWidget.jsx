import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useCostPerTortoise } from "@/hooks/useCostPerTortoise";
import { masukLaporan } from "@/lib/laporan";

const fmt = n => `Rp ${(n || 0).toLocaleString("id-ID")}`;

export default function LabaRugiWidget() {
  const now = new Date();
  const monthKey = format(now, "yyyy-MM");
  const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const thisMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const costData = useCostPerTortoise(monthKey);

  const { data: finances = [] } = useQuery({
    queryKey: ["widget-labugi-finances", monthKey],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const periodFinances = finances.filter(f =>
    f.date >= thisMonthStart && f.date <= thisMonthEnd && masukLaporan(f)
  );

  const pemasukan = periodFinances
    .filter(f => f.type === "pemasukan")
    .reduce((s, f) => s + (f.amount || 0), 0);

  const pengeluaran = periodFinances
    .filter(f => f.type === "pengeluaran")
    .reduce((s, f) => s + (f.amount || 0), 0);

  // Add salary slips and petty cash (from costData breakdown)
  // Pencairan kas kecil tidak ditambahkan: itu perpindahan uang ke kotak kas,
  // bukan biaya. Belanjanya sudah tercatat sebagai FinanceTransaction
  // berkategori "kas_kecil" dan sudah ikut terjumlah di `pengeluaran`.
  // Gaji ditambahkan karena tidak punya FinanceTransaction di mana pun.
  const totalPengeluaran = pengeluaran + (costData?.breakdown?.gaji_karyawan || 0);
  const labaRugi = pemasukan - totalPengeluaran;
  const maxVal = Math.max(pemasukan, totalPengeluaran, 1);
  const incomePct = Math.round((pemasukan / maxVal) * 100);
  const expensePct = Math.round((totalPengeluaran / maxVal) * 100);

  return (
    <Card className="p-4 bg-gradient-to-br from-green-50/50 to-white border-green-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <p className="font-semibold text-sm">Laba Rugi Bulan Ini</p>
        </div>
        <Link to="/finance" className="text-xs text-primary hover:underline flex items-center gap-1">
          Detail <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-green-600 font-medium">Pemasukan {fmt(pemasukan)}</span>
          <span className="text-red-500 font-medium">{fmt(totalPengeluaran)} Pengeluaran</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
          <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${incomePct}%` }} />
          <div className="h-full bg-red-400 rounded-r-full transition-all" style={{ width: `${expensePct}%` }} />
        </div>
      </div>

      {/* Laba / Rugi */}
      <div className={`rounded-lg p-3 ${labaRugi >= 0 ? "bg-green-100/70" : "bg-red-100/70"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {labaRugi >= 0
              ? <TrendingUp className="w-5 h-5 text-green-600" />
              : <TrendingDown className="w-5 h-5 text-red-600" />
            }
            <span className={`text-sm font-bold ${labaRugi >= 0 ? "text-green-800" : "text-red-800"}`}>
              {labaRugi >= 0 ? "LABA" : "RUGI"}
            </span>
          </div>
          <span className={`text-lg font-bold ${labaRugi >= 0 ? "text-green-700" : "text-red-700"}`}>
            {fmt(Math.abs(labaRugi))}
          </span>
        </div>
      </div>

      {/* Biaya per ekor */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Biaya per ekor/bulan</span>
        <span className="font-semibold">
          {fmt(costData?.biayaPerEkor || 0)}
          {!costData?.isDataAktual && <span className="text-amber-500 ml-1">(estimasi)</span>}
        </span>
      </div>
    </Card>
  );
}