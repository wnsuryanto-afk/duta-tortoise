import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PETTYCASH_CAT_LABELS } from "@/lib/financeCategories";
import { usePettyCashCategories } from "@/hooks/useEntityCategories";

function formatRp(n) {
  return "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");
}

export default function CategoryRecap({ ledger }) {
  const [open, setOpen] = useState(true);
  const { cats: pettyCats } = usePettyCashCategories();
  const catLabels = pettyCats.length
    ? Object.fromEntries(pettyCats.map(c => [c.value, c.label]))
    : PETTYCASH_CAT_LABELS;
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [recapMonth, setRecapMonth] = useState(currentMonth);

  const pemakaians = useMemo(() => {
    return (ledger || []).filter(l => l.entry_type === "pemakaian");
  }, [ledger]);

  const months = useMemo(() => {
    const set = new Set();
    pemakaians.forEach(l => {
      if (l.entry_date && l.entry_date !== "null") {
        const d = new Date(l.entry_date);
        if (!isNaN(d.getTime())) set.add(l.entry_date.substring(0, 7));
      }
    });
    set.add(currentMonth);
    return [...set].sort().reverse();
  }, [pemakaians, currentMonth]);

  const recapData = useMemo(() => {
    const filtered = recapMonth === "all"
      ? pemakaians
      : pemakaians.filter(l => l.entry_date && l.entry_date !== "null" && l.entry_date.startsWith(recapMonth));

    const byCat = {};
    filtered.forEach(l => {
      const cat = l.category || "lainnya";
      byCat[cat] = (byCat[cat] || 0) + Math.round(l.amount || 0);
    });

    return Object.entries(byCat)
      .map(([cat, total]) => ({ cat, label: catLabels[cat] || cat, total }))
      .sort((a, b) => b.total - a.total);
  }, [pemakaians, recapMonth, catLabels]);

  const grandTotal = recapData.reduce((s, d) => s + d.total, 0);
  const maxTotal = recapData.length > 0 ? recapData[0].total : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-3 gap-2">
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-sm font-semibold">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          📊 Rekap per Kategori
        </button>
        <Select value={recapMonth} onValueChange={setRecapMonth}>
          <SelectTrigger className="h-8 w-auto text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Waktu</SelectItem>
            {months.map(m => (
              <SelectItem key={m} value={m}>
                {format(new Date(m + "-01"), "MMM yyyy", { locale: id })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-2.5">
          {recapData.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Belum ada pemakaian untuk periode ini</p>
          ) : (
            <>
              {recapData.map(d => (
                <div key={d.cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{d.label}</span>
                    <span className="font-bold">{formatRp(d.total)}</span>
                  </div>
                  <div className="h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all"
                      style={{ width: `${maxTotal > 0 ? Math.max((d.total / maxTotal * 100), 2) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground">Total Pemakaian</span>
                <span className="text-sm font-bold text-primary">{formatRp(grandTotal)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}