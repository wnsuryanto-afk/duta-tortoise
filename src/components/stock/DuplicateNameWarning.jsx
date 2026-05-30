/**
 * Komponen warning duplikat nama saat input item baru.
 * Digunakan oleh StockItemForm.
 */
import { AlertTriangle, Info } from "lucide-react";

// Hitung kesamaan nama (0-1), pakai Dice's coefficient sederhana
function similarity(a, b) {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;
  const bigrams1 = new Set();
  for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1[i] + s1[i + 1]);
  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bg = s2[i] + s2[i + 1];
    if (bigrams1.has(bg)) intersection++;
  }
  return (2 * intersection) / (s1.length - 1 + s2.length - 1);
}

export function checkDuplicates(name, existingItems, editId) {
  if (!name || name.trim().length < 2) return { exact: null, similar: [] };
  const n = name.toLowerCase().trim();
  let exact = null;
  const similar = [];
  for (const item of existingItems) {
    if (item.id === editId) continue;
    const score = similarity(n, item.name);
    if (score === 1) { exact = item; break; }
    if (score >= 0.8) similar.push({ item, score });
  }
  return { exact, similar: similar.sort((a, b) => b.score - a.score).slice(0, 3) };
}

export function DuplicateNameWarning({ exact, similar, onIgnore, onViewExisting }) {
  if (!exact && similar.length === 0) return null;

  if (exact) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            Sudah ada barang bernama "{exact.name}"
          </p>
        </div>
        <p className="text-xs text-red-600">
          Stok: {exact.current_stock} {exact.unit} · SKU: {exact.sku || "-"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onViewExisting && onViewExisting(exact)}
            className="text-xs underline text-red-700 hover:text-red-900"
          >
            Lihat barang yang ada
          </button>
          <span className="text-xs text-muted-foreground">·</span>
          <button
            type="button"
            onClick={onIgnore}
            className="text-xs underline text-muted-foreground hover:text-foreground"
          >
            Tetap simpan sebagai baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        <p className="text-sm font-medium text-yellow-700">Nama mirip dengan barang yang sudah ada:</p>
      </div>
      <ul className="space-y-1">
        {similar.map(({ item }) => (
          <li key={item.id} className="text-xs text-yellow-800 pl-1">
            • <span className="font-medium">{item.name}</span> — stok: {item.current_stock} {item.unit}
          </li>
        ))}
      </ul>
    </div>
  );
}