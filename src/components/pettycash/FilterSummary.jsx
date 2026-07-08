import { PETTYCASH_CAT_LABELS } from "@/lib/financeCategories";
import { usePettyCashCategories } from "@/hooks/useEntityCategories";

function formatRp(n) {
  return "Rp " + Math.round(Number(n || 0)).toLocaleString("id-ID");
}

export default function FilterSummary({ filtered, filterCat }) {
  const { cats: pettyCats } = usePettyCashCategories();
  const catLabels = pettyCats.length
    ? Object.fromEntries(pettyCats.map(c => [c.value, c.label]))
    : PETTYCASH_CAT_LABELS;

  const pemakaians = filtered.filter(l => l.entry_type === "pemakaian");
  const topUps = filtered.filter(l => l.entry_type === "top_up");
  const totalPemakaian = pemakaians.reduce((s, l) => s + Math.round(l.amount || 0), 0);
  const totalTopUp = topUps.reduce((s, l) => s + Math.round(l.amount || 0), 0);
  const pemakaianLabel = filterCat !== "all" ? (catLabels[filterCat] || filterCat) : "Pemakaian";

  return (
    <div className="flex gap-2 flex-wrap">
      <div className="flex-1 min-w-[140px] p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-xs text-red-600 font-medium">Total {pemakaianLabel}</p>
        <p className="text-lg font-bold text-red-700">{formatRp(totalPemakaian)}</p>
        <p className="text-xs text-red-500">{pemakaians.length} transaksi</p>
      </div>
      {topUps.length > 0 && (
        <div className="flex-1 min-w-[140px] p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-600 font-medium">Total Top Up</p>
          <p className="text-lg font-bold text-green-700">{formatRp(totalTopUp)}</p>
          <p className="text-xs text-green-500">{topUps.length} transaksi</p>
        </div>
      )}
    </div>
  );
}