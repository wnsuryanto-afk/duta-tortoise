import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function formatRupiah(val) {
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
  return `Rp ${val}`;
}

const MONTHS_COUNT = 6;

export default function MonthlySalesSummary({ sales = [] }) {
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0); // 0 = bulan ini

  const now = new Date();

  // Buat array 6 bulan terakhir
  const months = useMemo(() => {
    return Array.from({ length: MONTHS_COUNT }, (_, i) => {
      const date = subMonths(now, MONTHS_COUNT - 1 - i);
      return {
        date,
        label: format(date, "MMM yy", { locale: id }),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    });
  }, []);

  // Hitung data per bulan
  const monthlyData = useMemo(() => {
    return months.map((m) => {
      const monthlySales = sales.filter((s) => {
        if (!s.sale_date) return false;
        const saleDate = parseISO(s.sale_date);
        return isWithinInterval(saleDate, { start: m.start, end: m.end });
      });
      return {
        ...m,
        count: monthlySales.length,
        revenue: monthlySales.reduce((sum, s) => sum + (s.price || 0), 0),
        sales: monthlySales,
      };
    });
  }, [months, sales]);

  const selectedIdx = MONTHS_COUNT - 1 - selectedMonthOffset;
  const selected = monthlyData[selectedIdx];
  const prev = monthlyData[selectedIdx - 1];

  const revDiff = prev ? selected.revenue - prev.revenue : null;
  const countDiff = prev ? selected.count - prev.count : null;

  const TrendIcon = revDiff === null ? null : revDiff > 0 ? TrendingUp : revDiff < 0 ? TrendingDown : Minus;
  const trendColor = revDiff === null ? "" : revDiff > 0 ? "text-green-600" : revDiff < 0 ? "text-destructive" : "text-muted-foreground";

  const canGoLeft = selectedMonthOffset < MONTHS_COUNT - 1;
  const canGoRight = selectedMonthOffset > 0;

  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading font-semibold text-lg">Ringkasan Penjualan Bulanan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Performa bisnis 6 bulan terakhir</p>
        </div>
        <ShoppingBag className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Bar Chart */}
      <div className="h-36 mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} barSize={28} onClick={(d) => {
            if (d?.activeTooltipIndex !== undefined) {
              setSelectedMonthOffset(MONTHS_COUNT - 1 - d.activeTooltipIndex);
            }
          }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(val) => [formatRupiah(val), "Pendapatan"]}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {monthlyData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={idx === selectedIdx ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.25)"}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => canGoLeft && setSelectedMonthOffset((o) => o + 1)}
          disabled={!canGoLeft}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(selected.date, "MMMM yyyy", { locale: id })}
        </span>
        <button
          onClick={() => canGoRight && setSelectedMonthOffset((o) => o - 1)}
          disabled={!canGoRight}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Total Pendapatan</p>
          <p className="text-lg font-bold text-primary">{formatRupiah(selected.revenue)}</p>
          {TrendIcon && (
            <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs">{revDiff > 0 ? "+" : ""}{formatRupiah(Math.abs(revDiff))} vs bln lalu</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Kura-kura Terjual</p>
          <p className="text-lg font-bold text-accent">{selected.count} ekor</p>
          {countDiff !== null && (
            <div className={`flex items-center gap-1 mt-1 ${countDiff > 0 ? "text-green-600" : countDiff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {countDiff > 0 ? <TrendingUp className="w-3 h-3" /> : countDiff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span className="text-xs">{countDiff > 0 ? "+" : ""}{countDiff} vs bln lalu</span>
            </div>
          )}
        </div>
      </div>

      {/* Detail transaksi bulan terpilih */}
      {selected.sales.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Tidak ada penjualan bulan ini</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Transaksi ({selected.sales.length})</p>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {selected.sales.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 text-sm">
                <div>
                  <p className="font-medium text-xs">{s.tortoise_name}</p>
                  <p className="text-xs text-muted-foreground">{s.buyer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-primary">{formatRupiah(s.price || 0)}</p>
                  <Badge variant={s.payment_status === "lunas" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 mt-0.5">
                    {s.payment_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}