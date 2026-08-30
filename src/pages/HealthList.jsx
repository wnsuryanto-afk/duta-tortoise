import { idKuraDenganKasusTerbuka, sedangSakitLengkap } from "@/lib/kesehatanKura";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, X, RotateCcw, Heart, CalendarDays, BookOpen } from "lucide-react";
import DiagnosisProtocolPanel from "@/components/health/DiagnosisProtocolPanel";
import CareTaskSuggestionPanel from "@/components/health/CareTaskSuggestionPanel";
import { format, parseISO, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import HealthForm from "@/components/health/HealthForm";
import SickTortoiseClosePanel from "@/components/health/SickTortoiseClosePanel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getPerms } from "@/lib/permissions";
import PageHeader from "@/components/common/PageHeader";
import { HealthArt } from "@/components/common/Illustration";

const TYPE_CONFIG = {
  checkup: { label: "Cek Kesehatan", color: "bg-blue-100 text-blue-700" },
  sakit:   { label: "Sakit",         color: "bg-red-100 text-red-700" },
  sembuh:  { label: "Sembuh",        color: "bg-emerald-100 text-emerald-700" },
  obat:    { label: "Obat",          color: "bg-orange-100 text-orange-700" },
  vaksin:  { label: "Vaksin",        color: "bg-green-100 text-green-700" },
  timbang: { label: "Timbang",       color: "bg-amber-100 text-amber-700" },
  lainnya: { label: "Lainnya",       color: "bg-muted text-muted-foreground" },
};

export default function HealthList() {
  const qc = useQueryClient();
  const { user, role } = useCurrentUser();
  const perms = getPerms(role, "health");
  const showSickPanel = ["owner", "manajer", "admin"].includes(role);

  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("semua");
  const [tortoiseSearch, setTortoiseSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["health-records"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 500),
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-names"],
    queryFn: () => base44.entities.Tortoise.list("name", 300),
  });

  const tortoiseSuggestions = useMemo(() => {
    if (!tortoiseSearch || tortoiseSearch.length < 2) return [];
    return tortoises.filter(t => t.name?.toLowerCase().includes(tortoiseSearch.toLowerCase())).slice(0, 6);
  }, [tortoises, tortoiseSearch]);

  // Build tortoise lookup maps for code-based search
  const tortoiseCodeMap = useMemo(() => {
    const nameToCode = {};
    const idToCode = {};
    const idToStatus = {};
    tortoises.forEach(t => {
      idToStatus[t.id] = t.status;
      if (t.code) {
        nameToCode[t.name?.toLowerCase()] = t.code.toLowerCase();
        idToCode[t.id] = t.code.toLowerCase();
      }
    });
    return { nameToCode, idToCode, idToStatus };
  }, [tortoises]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r => {
      // Exclude health records milik kura yang sudah mati/terjual (hanya di list ini)
      const tortoiseStatus = tortoiseCodeMap.idToStatus[r.tortoise_id];
      if (tortoiseStatus === "mati" || tortoiseStatus === "terjual") return false;

      // Search: name, description, OR tortoise code
      const matchSearch = !q
        || r.tortoise_name?.toLowerCase().includes(q)
        || r.description?.toLowerCase().includes(q)
        || tortoiseCodeMap.idToCode[r.tortoise_id]?.includes(q)
        || tortoiseCodeMap.nameToCode[r.tortoise_name?.toLowerCase()]?.includes(q);
      const matchType = typeFilter === "semua" || r.type === typeFilter;
      const matchTortoise = !tortoiseSearch || r.tortoise_name?.toLowerCase().includes(tortoiseSearch.toLowerCase());
      let matchDate = true;
      if (dateFrom || dateTo) {
        const d = r.date ? parseISO(r.date) : null;
        if (d) {
          if (dateFrom && dateTo) matchDate = isWithinInterval(d, { start: parseISO(dateFrom), end: parseISO(dateTo) });
          else if (dateFrom) matchDate = d >= parseISO(dateFrom);
          else if (dateTo) matchDate = d <= parseISO(dateTo);
        } else matchDate = false;
      }
      return matchSearch && matchType && matchTortoise && matchDate;
    });
  }, [records, search, typeFilter, tortoiseSearch, dateFrom, dateTo, tortoiseCodeMap]);

  const hasActiveFilters = typeFilter !== "semua" || tortoiseSearch || dateFrom || dateTo;

  const resetFilters = () => {
    setTypeFilter("semua");
    setTortoiseSearch("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  // Ringkasan untuk kepala halaman. "Sedang sakit" dihitung dari data kura,
  // bukan dari jumlah catatan: satu kura bisa punya banyak catatan sekaligus.
  const ringkasanSehat = (() => {
    const bulanIni = format(new Date(), "yyyy-MM");
    return {
      // Definisi lengkap: bendera pada kura ATAU kasus kesehatan yang masih
      // terbuka. Halaman ini punya kedua datanya, jadi tidak ada alasan memakai
      // yang setengah.
      sedangSakit: tortoises.filter(
        t => !t.is_archived && sedangSakitLengkap(t, idKuraDenganKasusTerbuka(records))
      ).length,
      bulanIni: records.filter(r => (r.date || "").startsWith(bulanIni) && r.type === "sakit").length,
    };
  })();

  const handleEdit = (r) => { setEditData(r); setShowForm(true); };
  const handleDelete = async (r) => {
    if (confirm(`Hapus catatan untuk ${r.tortoise_name}?`)) {
      await base44.entities.HealthRecord.delete(r.id);
      qc.invalidateQueries({ queryKey: ["health-records"] });
      qc.invalidateQueries({ queryKey: ["health-records-all"] });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catatan Sakit"
        subtitle="Riwayat kesehatan kura-kura"
        icon={Heart}
        art={<HealthArt size="md" />}
        chips={[
          { key: "sakit", icon: Heart, label: "Sedang sakit", value: ringkasanSehat.sedangSakit,
            tone: ringkasanSehat.sedangSakit > 0 ? "warn" : "good" },
          { key: "bulan", icon: CalendarDays, label: "Kasus bulan ini", value: ringkasanSehat.bulanIni },
          { key: "total", icon: BookOpen, label: "Total catatan", value: records.length },
        ]}
        actions={perms.canCreate && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }} className="gap-2 bg-primary hover-lift">
            <Plus className="w-4 h-4" /> Tambah Catatan
          </Button>
        )}
      />

      {showSickPanel && (
        <SickTortoiseClosePanel user={user} />
      )}

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama / kode kura (cth: B65) / deskripsi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant={showFilters ? "default" : "outline"} className="gap-2 h-10 shrink-0" onClick={() => setShowFilters(p => !p)}>
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-orange-400" />}
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-muted/40 border rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Jenis Catatan</p>
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              {["semua", ...Object.keys(TYPE_CONFIG)].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                  {t === "semua" ? "Semua Jenis" : TYPE_CONFIG[t]?.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Nama Kura-kura</p>
            <div className="relative max-w-xs">
              <Input placeholder="Cari nama kura-kura..." value={tortoiseSearch} onChange={e => setTortoiseSearch(e.target.value)} className="h-9 text-sm pr-8" />
              {tortoiseSearch && <button onClick={() => setTortoiseSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
              {tortoiseSuggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-background border rounded-xl shadow-lg overflow-hidden">
                  {tortoiseSuggestions.map(t => (
                    <button key={t.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => setTortoiseSearch(t.name)}>{t.name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Rentang Tanggal</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm w-36" />
              </div>
              <span className="text-muted-foreground text-sm">s/d</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-sm w-36" />
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs text-destructive hover:underline font-medium mt-1">
              <RotateCcw className="w-3.5 h-3.5" /> Reset semua filter
            </button>
          )}
        </div>
      )}

      {/* Result count + active chips */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> dari <span className="font-semibold">{records.length}</span> rekaman
        </p>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            {typeFilter !== "semua" && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {TYPE_CONFIG[typeFilter]?.label}<button onClick={() => setTypeFilter("semua")}><X className="w-3 h-3 ml-1" /></button>
              </span>
            )}
            {tortoiseSearch && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                🐢 {tortoiseSearch}<button onClick={() => setTortoiseSearch("")}><X className="w-3 h-3 ml-1" /></button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                📅 {dateFrom || "..."} – {dateTo || "..."}<button onClick={() => { setDateFrom(""); setDateTo(""); }}><X className="w-3 h-3 ml-1" /></button>
              </span>
            )}
            <button onClick={resetFilters} className="text-xs text-destructive hover:underline flex items-center gap-1"><X className="w-3 h-3" /> Reset</button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Tidak ada rekaman ditemukan</p>
          {hasActiveFilters && <button onClick={resetFilters} className="mt-2 text-sm text-primary underline">Reset filter</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.lainnya;
            return (
              <Card key={r.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${cfg.color}`}>{cfg.label}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.tortoise_name}</p>
                        <Badge variant="outline" className="text-[11px]">{r.date ? format(parseISO(r.date), "d MMM yyyy", { locale: id }) : "-"}</Badge>
                        {r.weight_grams && <span className="text-xs text-muted-foreground">{r.weight_grams}g</span>}
                        {r.shell_length_cm && <span className="text-xs text-muted-foreground">{r.shell_length_cm}cm</span>}
                      </div>
                      {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                      {r.treatment && <p className="text-xs text-blue-600 mt-0.5">💊 {r.treatment}</p>}
                      {r.vet_name && <p className="text-xs text-muted-foreground mt-0.5">👨‍⚕️ {r.vet_name}</p>}
                      {r.follow_up_date && <p className="text-xs text-orange-600 mt-0.5">📅 Follow up: {r.follow_up_date}</p>}
                      {r.biaya_obat > 0 && <p className="text-xs text-emerald-700 mt-0.5">💰 Biaya: Rp {Number(r.biaya_obat).toLocaleString("id-ID")}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {perms.canEdit && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => handleEdit(r)}>Edit</Button>}
                    {perms.canDelete && <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => handleDelete(r)}>Hapus</Button>}
                  </div>
                </div>
                {(r.diagnosis || r.diagnoses)?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <button
                      onClick={() => setExpandedGuide(expandedGuide === r.id ? null : r.id)}
                      className="text-xs text-[#1B4332] font-medium hover:underline flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Panduan Penanganan {expandedGuide === r.id ? "▲" : "▼"}
                    </button>
                    {expandedGuide === r.id && (
                      <div className="mt-2 space-y-2">
                        <DiagnosisProtocolPanel diagnoses={r.diagnosis || r.diagnoses} />
                        <CareTaskSuggestionPanel
                          diagnoses={r.diagnosis || r.diagnoses}
                          severity={r.severity}
                          type={r.type}
                          tortoiseId={r.tortoise_id}
                          tortoiseName={r.tortoise_name}
                          tortoiseCode={tortoises.find((t) => t.id === r.tortoise_id)?.code}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <HealthForm
          open={showForm}
          editData={editData}
          onClose={() => { qc.invalidateQueries({ queryKey: ["health-records"] }); qc.invalidateQueries({ queryKey: ["health-records-all"] }); setShowForm(false); }}
        />
      )}
    </div>
  );
}