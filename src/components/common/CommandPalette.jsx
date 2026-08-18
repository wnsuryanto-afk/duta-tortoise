/**
 * CommandPalette — pencarian halaman cepat (Ctrl+K / ⌘K).
 *
 * Alasan keberadaannya: aplikasi punya ~69 halaman, tapi hanya sebagian yang
 * muat di sidebar. Sisanya selama ini cuma bisa dibuka lewat URL.
 * Dengan palette ini, menu bisa tetap pendek tanpa ada halaman yang hilang.
 *
 * Sumber tujuan: NAV_GROUPS dari Sidebar (agar tidak ada daftar ganda)
 * + HIDDEN_ROUTES untuk halaman yang memang tidak layak masuk menu.
 * Semuanya tetap disaring oleh canAccess() sesuai role.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, X } from "lucide-react";
import { NAV_SECTIONS, SETTINGS_ITEMS, EXTRA_DESTINATIONS } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function buildDestinations(role) {
  const out = [];
  const seen = new Set();
  const add = (path, label, group, section) => {
    if (!canAccess(role, section) || seen.has(path)) return;
    seen.add(path);
    out.push({ path, label, group });
  };
  NAV_SECTIONS.forEach((s) => {
    add(s.hub, `${s.label} \u2014 semua halaman`, s.label, s.items[0]?.section);
    s.items.forEach((i) => add(i.path, i.label, s.label, i.section));
  });
  SETTINGS_ITEMS.forEach((i) => add(i.path, i.label, "Pengaturan", i.section));
  EXTRA_DESTINATIONS.forEach((i) => add(i.path, i.label, i.group, i.section));
  return out;
}

// Pencocokan longgar: semua kata kunci harus muncul di label/grup/path.
function match(dest, q) {
  if (!q) return true;
  const hay = `${dest.label} ${dest.group} ${dest.path}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export default function CommandPalette({ open, onOpenChange, role }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const destinations = useMemo(() => buildDestinations(role), [role]);
  const results = useMemo(
    () => destinations.filter((d) => match(d, q)).slice(0, 40),
    [destinations, q]
  );

  // Buka dengan Ctrl+K / ⌘K, tutup dengan Esc
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [q]);

  const go = (dest) => {
    if (!dest) return;
    onOpenChange(false);
    navigate(dest.path);
  };

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-modal overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Cari halaman… (mis. kasbon, stok, breeding)"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-muted" aria-label="Tutup">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Tidak ada halaman yang cocok dengan “{q}”.
            </p>
          ) : (
            results.map((d, i) => (
              <button
                key={d.path}
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(d)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-4 py-2 text-left transition-colors",
                  i === active ? "bg-primary/10" : "hover:bg-muted/60"
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{d.label}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{d.group}</span>
                </span>
                {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>↑↓ pilih</span>
          <span>↵ buka</span>
          <span>Esc tutup</span>
          <span className="ml-auto">{results.length} halaman</span>
        </div>
      </div>
    </div>
  );
}
