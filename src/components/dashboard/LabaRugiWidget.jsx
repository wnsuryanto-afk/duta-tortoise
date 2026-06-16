import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, DollarSign, Package, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";

function fmt(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }

export default function LabaRugiWidget() {
  const now = new Date();
  const period = format(now, "yyyy-MM");

  const { data: transactions = [] } = useQuery({
    queryKey: ["lr-widget-tx"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["lr-widget-tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-name", 500),
    staleTime: 10 * 60 * 1000,
  });

  const computed = useMemo(() => {
    const monthTx = transactions.filter(t => t.date?.startsWith(period) && !t.excluded_from_reports);
    const pemasukan = monthTx.filter(t => t.type === "pemasukan").reduce((s,t)=>s+(t.amount||0),0);
    const pengeluaran = monthTx.filter(t => t.type === "pengeluaran").reduce((s,t)=>s+(t.amount||0),0);
    const labaRugi = pemasukan - pengeluaran;
    const activeCount = tortoises.filter(t => t.status==="aktif" || t.status==="baby" || t.status==="breeding").length;
    const biayaPerEkor = pengeluaran > 0 && activeCount > 0 ? Math.round(pengeluaran / activeCount) : null;
    const maxBar = Math.max(pemasukan, pengeluaran, 1);

    return { pemasukan, pengeluaran, labaRugi, biayaPerEkor, activeCount, maxBar };
  }, [transactions, tortoises, period]);

  if (!transactions.length && !tortoises.length) return null;

  const isLaba = computed.labaRugi >= 0;

  return (
    <Link to="/finance" className="block bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Laba Rugi Bulan Ini
        </h3>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Bar visual pemasukan vs pengeluaran */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-20">Pemasukan</span>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(computed.pemasukan / computed.maxBar) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-green-600 w-24 text-right">{fmt(computed.pemasukan)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-20">Pengeluaran</span>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(computed.pengeluaran / computed.maxBar) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-red-600 w-24 text-right">{fmt(computed.pengeluaran)}</span>
        </div>
      </div>

      {/* Laba/Rugi */}
      <div className={`rounded-lg p-3 ${isLaba ? "bg-green-50" : "bg-red-50"}`}>
        <div className="flex items-center gap-2">
          {isLaba ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
          <div>
            <p className="text-xs text-muted-foreground">{isLaba ? "LABA BERSIH" : "RUGI BERSIH"}</p>
            <p className={`text-xl font-bold ${isLaba ? "text-green-700" : "text-red-700"}`}>
              {fmt(Math.abs(computed.labaRugi))}
            </p>
          </div>
        </div>
      </div>

      {/* Biaya per ekor */}
      {computed.biayaPerEkor !== null && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Package className="w-3 h-3" />
          <span>Biaya per ekor: <strong>{fmt(computed.biayaPerEkor)}</strong>/bln</span>
          <span className="text-[10px]">({computed.activeCount} ekor)</span>
        </div>
      )}
    </Link>
  );
}