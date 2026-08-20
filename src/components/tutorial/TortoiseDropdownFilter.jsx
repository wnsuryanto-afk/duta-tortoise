import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Search } from "lucide-react";

/**
 * Reusable searchable dropdown for filtering by tortoise name or enclosure.
 * Props:
 *   items: [{id, label}] — list of selectable options
 *   selected: string | null — currently selected id
 *   onSelect: (id | null) => void
 *   placeholder: string
 *   allLabel: string — label for "all / reset" option
 */
export default function SearchableDropdownFilter({ items, selected, onSelect, placeholder = "Cari...", allLabel = "Semua" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = items.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = items.find(i => i.id === selected);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-w-[140px] max-w-[200px]
          ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
      >
        <span className="flex-1 min-w-0 text-left truncate">
          {selectedItem ? selectedItem.label : allLabel}
        </span>
        {selected ? (
          <X className="w-3 h-3 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onSelect(null); setSearch(""); }} />
        ) : (
          <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-56 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1">
              <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={placeholder}
                className="bg-transparent text-xs w-full outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              onClick={() => { onSelect(null); setSearch(""); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${!selected ? "text-primary font-semibold" : ""}`}
            >
              {allLabel}
            </button>
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); setSearch(""); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors truncate ${selected === item.id ? "text-primary font-semibold bg-primary/5" : ""}`}
              >
                {item.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Tidak ditemukan</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}