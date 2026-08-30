import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Loader2, AlertCircle } from "lucide-react";

/**
 * TortoiseSearchSelect — pemilih kura terpusat yang bisa dicari.
 * Meniru pola ItemSearchSelect: kotak ketik di atas, daftar di bawah.
 *
 * Props:
 *   tortoises         array of Tortoise
 *   value             id kura terpilih
 *   onChange(id)      callback saat kura dipilih
 *   loading           bool — tampilkan indikator memuat
 *   error             truthy — tampilkan pesan error + Coba lagi
 *   onRetry           fn — dipanggil tombol Coba lagi
 *   accent            "green" | "red"
 *   genderFilter      "jantan" | "betina" | undefined — hanya tampilkan gender ini
 *   showKandangFilter bool — tampilkan saringan cepat per-kandang (form pembiakan)
 *   showHealthWarning bool — tampilkan "⚠ sedang dalam perawatan" untuk kura sakit
 *   placeholder       label tombol saat kosong
 */
const GENDER_LABEL = { jantan: "jantan", betina: "betina", belum_diketahui: "?" };

function naturalSort(a, b) {
  const ca = (a.code || a.name || "").toString();
  const cb = (b.code || b.name || "").toString();
  return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
}

const isSickTortoise = (t) => !!(t.is_currently_sick || t.status === "sakit");

export default function TortoiseSearchSelect({
  tortoises = [],
  value,
  onChange,
  loading = false,
  error = null,
  onRetry,
  accent = "green",
  genderFilter,
  showKandangFilter = false,
  showHealthWarning = false,
  recoveryInfoMap = {},
  placeholder = "Pilih kura",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kandang, setKandang] = useState(""); // "" = semua kandang
  const ref = useRef(null);

  const ring = accent === "red" ? "focus:ring-red-400" : "focus:ring-green-400";

  // 1. Saring gender (form pembiakan: jantan / betina)
  const byGender = useMemo(() => {
    if (!genderFilter) return tortoises;
    return tortoises.filter((t) => t.gender === genderFilter);
  }, [tortoises, genderFilter]);

  // 2. Daftar kandang unik (untuk saringan cepat)
  const kandangOptions = useMemo(() => {
    const set = new Set();
    byGender.forEach((t) => { if (t.enclosure) set.add(t.enclosure); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [byGender]);

  // 3. Saring kandang + pencarian, lalu urutkan natural (C2 sebelum C10)
  const filtered = useMemo(() => {
    let list = byGender;
    if (kandang) list = list.filter((t) => t.enclosure === kandang);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) =>
        (t.code || "").toLowerCase().includes(q) ||
        (t.name || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort(naturalSort);
  }, [byGender, kandang, query]);

  const selected = tortoises.find((t) => t.id === value);

  // Tutup saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
        setKandang("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setQuery("");
    setKandang("");
  };

  if (loading) {
    return (
      <div className="w-full border border-border rounded-xl px-3 py-3 text-sm text-muted-foreground flex items-center gap-2">
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
        {onRetry && (
          <button onClick={onRetry} className="text-xs font-semibold text-red-700 underline flex-shrink-0">
            Coba lagi
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full border border-border rounded-xl px-3 py-3 text-sm text-left flex items-center justify-between focus:ring-2 ${ring} outline-none`}
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected
              ? `${selected.code || selected.name} — kandang ${selected.enclosure || "?"}`
              : `-- ${placeholder} --`}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik kode/nama kura (cth: C2)..."
            className={`w-full border border-border rounded-xl pl-9 pr-3 py-3 text-sm focus:ring-2 ${ring} outline-none`}
          />
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg flex flex-col max-h-72">
          {/* Saringan cepat per-kandang (form pembiakan) — tetap di atas saat daftar digulir */}
          {showKandangFilter && kandangOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 border-b border-gray-100 bg-muted/80">
              <button
                type="button"
                onClick={() => setKandang("")}
                className={`text-[11px] px-2 py-1 rounded-full border font-medium transition-colors ${
                  kandang === ""
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                Semua
              </button>
              {kandangOptions.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKandang(k === kandang ? "" : k)}
                  className={`text-[11px] px-2 py-1 rounded-full border font-medium transition-colors ${
                    kandang === k
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          {/* Daftar — dapat digulir, kotak ketik tetap di atas */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {query.trim()
                  ? `Kura tidak ditemukan untuk "${query.trim()}"`
                  : "Tidak ada kura yang cocok"}
              </div>
            ) : (
              filtered.map((t) => {
                const sick = isSickTortoise(t);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelect(t.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-green-50 border-b border-gray-50 last:border-0 min-h-[44px]"
                  >
                    <p className="text-sm text-foreground">
                      <span className="font-mono font-semibold">{t.code || t.name}</span>
                      <span className="text-muted-foreground">
                        {" "}— kandang {t.enclosure || "?"} — {GENDER_LABEL[t.gender] || t.gender || "?"}
                      </span>
                    </p>
                    {sick && showHealthWarning && (
                      <p className="text-[11px] text-red-600 font-medium mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> sedang dalam perawatan
                      </p>
                    )}
                    {!sick && showHealthWarning && recoveryInfoMap[t.id] != null && (
                      <p className="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> baru sembuh {recoveryInfoMap[t.id]} hari lalu
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}