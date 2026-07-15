import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, MapPin, CalendarClock, Shell } from "lucide-react";
import AccessDenied from "@/components/common/AccessDenied";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { isManagerLevel } from "@/lib/permissions";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const GROUPS = [
  { key: "merah",  label: "Diam >90hr (baby >30hr)",        dot: "bg-red-500",    card: "border-red-200 bg-red-50",     text: "text-red-700",    badge: "bg-red-100 text-red-700" },
  { key: "kuning", label: "Diam 60-90hr (baby 15-30hr)",    dot: "bg-amber-500",  card: "border-amber-200 bg-amber-50", text: "text-amber-700",  badge: "bg-amber-100 text-amber-700" },
  { key: "hijau",  label: "Terpantau (<60hr / baby <15hr)", dot: "bg-green-500",  card: "border-green-200 bg-green-50", text: "text-green-700",  badge: "bg-green-100 text-green-700" },
  { key: "abu",    label: "Belum pernah tercatat",          dot: "bg-slate-400",  card: "border-slate-200 bg-slate-50", text: "text-slate-600",  badge: "bg-slate-100 text-slate-600" },
];

const SPECIES_LABEL = {
  sulcata: "Sulcata", red_foot: "Red Foot", leopard: "Leopard", aldabra: "Aldabra",
  russian: "Russian", hermann: "Hermann", greek: "Greek", indian_star: "Indian Star", lainnya: "Lainnya",
};

function fmtDate(d) {
  if (!d) return "-";
  try { return format(parseISO(d), "d MMM yyyy", { locale: idLocale }); } catch { return d; }
}

export default function KuraDiamPage() {
  const { role, isLoading: userLoading } = useCurrentUser();
  const [enclosureFilter, setEnclosureFilter] = useState("semua");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["kura-diam-report"],
    queryFn: () => base44.functions.invoke("getKuraDiamReport", {}),
    staleTime: 5 * 60 * 1000,
  });

  const report = data?.data;
  const groups = report?.groups || { merah: [], kuning: [], hijau: [], abu: [] };
  const counts = report?.counts || { merah: 0, kuning: 0, hijau: 0, abu: 0 };
  const enclosures = report?.enclosures || [];

  const filteredGroups = useMemo(() => {
    const out = {};
    Object.keys(groups).forEach(k => {
      out[k] = enclosureFilter === "semua"
        ? groups[k]
        : groups[k].filter(t => t.enclosure === enclosureFilter);
    });
    return out;
  }, [groups, enclosureFilter]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isManagerLevel(role)) {
    return <AccessDenied message="Halaman deteksi kura diam hanya untuk Owner, Manajer, dan Admin." />;
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
        <div className="h-7 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center py-32 text-muted-foreground">
        <Shell className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-semibold">Gagal memuat laporan kura diam</p>
        <p className="text-sm mt-1">Coba muat ulang halaman.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" /> Deteksi Kura Diam
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kura aktif yang lama tidak tersentuh pencatatan — pencegahan dini kura sakit/menurun tanpa ketahuan.
          Total {report?.total || 0} kura aktif dianalisis.
        </p>
      </div>

      {/* KARTU RINGKAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GROUPS.map(g => (
          <div key={g.key} className={`rounded-xl border p-3 ${g.card}`}>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${g.dot}`} />
              <span className="text-[11px] font-semibold uppercase tracking-wide">{g.label}</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${g.text}`}>{counts[g.key]}</p>
          </div>
        ))}
      </div>

      {/* FILTER KANDANG */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Kandang:</span>
        <Select value={enclosureFilter} onValueChange={setEnclosureFilter}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua kandang</SelectItem>
            {enclosures.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* DAFTAR PER KELOMPOK */}
      <div className="space-y-5">
        {GROUPS.map(g => {
          const items = filteredGroups[g.key] || [];
          if (items.length === 0) return null;
          return (
            <div key={g.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${g.dot}`} />
                <h2 className="text-sm font-bold">{g.label}</h2>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${g.badge}`}>{items.length}</span>
              </div>
              <div className="grid gap-2">
                {items.map(t => (
                  <Link key={t.id} to="/tortoise" className={`block rounded-xl border p-3 hover:shadow-md transition-shadow ${g.card}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Shell className="w-4 h-4 shrink-0" />
                          <span className="font-semibold text-sm truncate">{t.code}</span>
                          {t.species && <span className="text-[10px] text-muted-foreground">{SPECIES_LABEL[t.species] || t.species}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {t.enclosure}</span>
                          {t.lastActivityType ? (
                            <span className="flex items-center gap-0.5"><CalendarClock className="w-3 h-3" /> {t.lastActivityType} · {fmtDate(t.lastActivityDate)}</span>
                          ) : (
                            <span>belum ada riwayat pencatatan</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {t.daysAgo !== null ? (
                          <>
                            <p className={`text-base font-bold ${g.text}`}>{t.daysAgo}</p>
                            <p className="text-[10px] text-muted-foreground">hari lalu</p>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {g.key === "abu" && items.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1.5 italic">
                  Kura ini belum punya catatan apa pun di app. Mulai timbang/cek untuk memantau — datanya memang belum ada, bukan berarti kura bermasalah.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {report && counts.merah + counts.kuning + counts.hijau + counts.abu === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Shell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">Tidak ada kura aktif terdata</p>
        </div>
      )}
    </div>
  );
}