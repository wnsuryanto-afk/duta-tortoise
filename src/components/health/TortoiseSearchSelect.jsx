import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";

export default function TortoiseSearchSelect({ tortoises = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const sorted = useMemo(() => {
    return [...tortoises].sort((a, b) => {
      const codeA = (a.code || a.name || "").toLowerCase();
      const codeB = (b.code || b.name || "").toLowerCase();
      return codeA.localeCompare(codeB);
    });
  }, [tortoises]);

  const filtered = useMemo(() => {
    if (!query) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(t =>
      t.code?.toLowerCase().includes(q) ||
      t.name?.toLowerCase().includes(q)
    );
  }, [sorted, query]);

  const selected = tortoises.find(t => t.id === value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {open ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ketik kode/nama kura..."
            className="pl-9"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selected ? "" : "text-muted-foreground"}>
            {selected ? `${selected.name} ${selected.code ? `(${selected.code})` : ""}` : "Pilih tortoise"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Tidak ditemukan</div>
          ) : (
            filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setOpen(false); setQuery(""); }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
              >
                <span>{t.name}</span>
                <span className="text-muted-foreground text-xs font-mono">{t.code || ""}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}