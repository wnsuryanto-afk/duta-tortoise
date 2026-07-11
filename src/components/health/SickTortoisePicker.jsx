/**
 * SickTortoisePicker — searchable dropdown pemilihan kura untuk form Lapor Sakit.
 * Menampilkan "CODE — KANDANG" per opsi. Bisa diketik untuk filter (cth: "B6").
 * Menangani loading & error dengan pesan jelas (tidak diam-diam menghilangkan dropdown).
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Loader2, AlertCircle } from "lucide-react";

export default function SickTortoisePicker({
  tortoises = [],
  loading = false,
  error = null,
  onRetry,
  value,
  onChange,
  accent = "green",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const ring = accent === "red" ? "focus:ring-red-400" : "focus:ring-green-400";

  const filtered = useMemo(() => {
    if (!query) return tortoises;
    const q = query.toLowerCase();
    return tortoises.filter(
      (t) =>
        (t.code || "").toLowerCase().includes(q) ||
        (t.name || "").toLowerCase().includes(q)
    );
  }, [tortoises, query]);

  const selected = tortoises.find((t) => t.id === value);

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

  if (loading) {
    return (
      <div className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-400 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat daftar kura...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full border border-red-300 bg-red-50 rounded-xl px-3 py-3 text-sm text-red-600 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> Gagal memuat daftar kura
        </span>
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-red-700 underline flex-shrink-0"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      {open ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik kode kura (cth: B6, A42)..."
            className={`w-full border border-gray-300 rounded-xl pl-9 pr-3 py-3 text-sm focus:ring-2 ${ring} outline-none`}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full border border-gray-300 rounded-xl px-3 py-3 text-sm text-left flex items-center justify-between focus:ring-2 ${ring} outline-none`}
        >
          <span className={selected ? "text-gray-800" : "text-gray-400"}>
            {selected
              ? `${selected.code || selected.name} — ${selected.enclosure || "?"}`
              : "-- Pilih kura --"}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-400 text-center">Tidak ditemukan</div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-green-50 text-left border-b border-gray-50 last:border-0"
              >
                <span className="font-medium text-gray-800">{t.code || t.name}</span>
                <span className="text-xs text-gray-500">{t.enclosure || "?"}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}