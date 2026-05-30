/**
 * Shared filter toggle + summary bar for "data tidak lengkap" feature.
 * Props:
 *   items: all items (before filter)
 *   isIncomplete: fn(item) => bool
 *   lengkapFilter: "semua" | "lengkap" | "belum"
 *   onChangeLengkap: fn(value)
 *   isAdmin: bool
 *   onGenerateSKU: fn() — callback for bulk SKU generate
 *   generatingSKU: bool
 */
export default function DataLengkapFilter({ items, isIncomplete, lengkapFilter, onChangeLengkap, isAdmin, onGenerateSKU, generatingSKU }) {
  const belumCount = items.filter(isIncomplete).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filter toggle */}
      <div className="flex rounded-lg border overflow-hidden h-9 text-xs">
        {[["semua", "Semua"], ["lengkap", "Lengkap ✓"], ["belum", `Belum Lengkap (${belumCount})`]].map(([v, l]) => (
          <button key={v} onClick={() => onChangeLengkap(v)}
            className={`px-3 font-medium transition-colors border-r last:border-r-0 ${lengkapFilter === v
              ? v === "belum" ? "bg-yellow-500 text-white" : "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Summary text */}
      {lengkapFilter === "belum" && belumCount > 0 && (
        <span className="text-xs text-yellow-700 font-medium">
          {belumCount} dari {items.length} barang belum lengkap
        </span>
      )}

      {/* Generate SKU massal */}
      {isAdmin && onGenerateSKU && (
        <button onClick={onGenerateSKU} disabled={generatingSKU}
          className="px-3 h-9 rounded-lg border text-xs font-medium bg-background hover:bg-muted transition-colors disabled:opacity-50">
          {generatingSKU ? "⏳ Memproses..." : "🔑 Generate SKU Massal"}
        </button>
      )}
    </div>
  );
}