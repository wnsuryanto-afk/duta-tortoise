import { useState, useMemo } from "react";
import { recalcEnclosureCounts } from "@/lib/enclosureCount";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Skull, Search, ArrowLeft, ExternalLink, Plus, X } from "lucide-react";
import { toast } from "sonner";
import DeathRecordModal from "@/components/tortoise/DeathRecordModal";

const DEATH_CAUSE_LABELS = {
  sakit:           "💊 Sakit / Penyakit",
  umur_tua:        "🧓 Umur Tua",
  kecelakaan:      "💥 Kecelakaan",
  predator:        "🦅 Predator",
  stress:          "😰 Stres",
  egg_binding:     "🥚 Egg Binding",
  tidak_diketahui: "❓ Tidak Diketahui",
  lainnya:         "📝 Lainnya",
};

function DeathCard({ tortoise, onClick }) {
  const primaryPhoto = tortoise.death_photos?.[0]
    || tortoise.photos?.find(p => p.is_primary)?.url
    || tortoise.photos?.[0]?.url;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border border-border active:scale-[0.99]"
      onClick={() => onClick(tortoise)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {primaryPhoto ? (
            <img src={primaryPhoto} alt={tortoise.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border grayscale" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Skull className="w-7 h-7 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{tortoise.name}</span>
              {tortoise.code && <span className="text-xs text-muted-foreground">({tortoise.code})</span>}
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">💀 Mati</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {tortoise.death_date
                ? `Mati: ${format(new Date(tortoise.death_date), "d MMM yyyy", { locale: localeId })}`
                : "Tanggal kematian belum diisi"}
            </p>
            {tortoise.death_cause && (
              <p className="text-xs text-muted-foreground">
                Penyebab: {DEATH_CAUSE_LABELS[tortoise.death_cause] || tortoise.death_cause}
              </p>
            )}
            {tortoise.enclosure && (
              <p className="text-xs text-muted-foreground">Kandang terakhir: {tortoise.enclosure}</p>
            )}
            {tortoise.death_notes && (
              <p className="text-xs text-gray-500 line-clamp-2 italic">"{tortoise.death_notes}"</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            Lihat Detail <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeathDetail({ tortoise, onBack, onEdit }) {
  const deathPhotos = tortoise.death_photos || [];
  const regularPhotos = tortoise.photos || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>
        <h2 className="font-bold text-lg flex-1">Detail Kematian — {tortoise.name}</h2>
        <Button size="sm" variant="outline" onClick={() => onEdit(tortoise)}>Edit</Button>
      </div>

      {/* Foto utama */}
      {(deathPhotos[0] || regularPhotos.find(p => p.is_primary)?.url) && (
        <img
          src={deathPhotos[0] || regularPhotos.find(p => p.is_primary)?.url}
          alt={tortoise.name}
          className="w-full max-h-64 object-cover rounded-2xl border grayscale"
        />
      )}

      {/* Info utama */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-bold text-base border-b pb-2">Informasi Kematian</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Nama</p>
              <p className="font-medium">{tortoise.name} {tortoise.code ? `(${tortoise.code})` : ""}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Mati</p>
              <p className="font-medium">{tortoise.death_date ? format(new Date(tortoise.death_date), "d MMMM yyyy", { locale: localeId }) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Penyebab</p>
              <p className="font-medium">{DEATH_CAUSE_LABELS[tortoise.death_cause] || tortoise.death_cause || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kandang Terakhir</p>
              <p className="font-medium">{tortoise.enclosure || "-"}</p>
            </div>
            {tortoise.death_notes && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Catatan Kematian</p>
                <p className="font-medium">{tortoise.death_notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Foto bukti kematian */}
      {deathPhotos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3">Foto Bukti Kematian ({deathPhotos.length})</h3>
            <div className="flex gap-2 flex-wrap">
              {deathPhotos.map((url, i) => (
                <img key={i} src={url} alt={`bukti-${i+1}`} className="w-20 h-20 rounded-xl object-cover border grayscale" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Otopsi */}
      {tortoise.necropsy_done && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-2">🔬 Riwayat Otopsi</h3>
            <p className="text-sm text-muted-foreground">{tortoise.necropsy_findings || "Otopsi dilakukan — temuan tidak dicatat."}</p>
          </CardContent>
        </Card>
      )}

      {/* Riwayat kura */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-bold text-sm border-b pb-2">Riwayat Kura</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Lahir</p>
              <p className="font-medium">{tortoise.birth_date ? format(new Date(tortoise.birth_date), "d MMM yyyy", { locale: localeId }) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Berat Terakhir</p>
              <p className="font-medium">{tortoise.weight_grams ? `${tortoise.weight_grams} gram` : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spesies</p>
              <p className="font-medium">{tortoise.species || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jenis Kelamin</p>
              <p className="font-medium capitalize">{tortoise.gender || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Modal pilih kura untuk lapor kematian baru
function SelectTortoiseModal({ tortoises, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const LIVE_STATUSES = ["aktif", "baby", "sakit", "breeding"];
  const filtered = tortoises
    .filter(t => LIVE_STATUSES.includes(t.status))
    .filter(t => {
      const q = search.toLowerCase();
      return !q || t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q);
    });

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-base">Pilih Kura yang Meninggal</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau kode kura..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Tidak ada kura aktif ditemukan</p>
          ) : filtered.map(t => {
            const photo = t.photos?.find(p => p.is_primary)?.url || t.photos?.[0]?.url;
            return (
              <button
                key={t.id}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors border-b last:border-0 text-left"
                onClick={() => onSelect(t)}
              >
                {photo ? (
                  <img src={photo} alt={t.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Skull className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.code || ""} · {t.enclosure || "Tanpa kandang"}</p>
                  {t.is_proven && <span className="text-[10px] text-amber-600">⭐ Proven Breeder</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DeathRecordsPage() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState(null);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [deathModalTortoise, setDeathModalTortoise] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterCause, setFilterCause] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const { data: allTortoises = [], isLoading } = useQuery({
    queryKey: ["tortoises-all-death"],
    queryFn: () => base44.entities.Tortoise.list("-death_date", 500),
  });

  const deadTortoises = useMemo(() => {
    return allTortoises.filter(t => t.status === "mati");
  }, [allTortoises]);

  const filtered = useMemo(() => {
    let list = deadTortoises.filter(t => {
      const matchYear = !filterYear || !t.death_date || new Date(t.death_date).getFullYear().toString() === filterYear;
      const matchCause = filterCause === "all" || t.death_cause === filterCause;
      const q = filterSearch.toLowerCase();
      const matchSearch = !q || t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q);
      return matchYear && matchCause && matchSearch;
    });
    if (sortBy === "newest") list = [...list].sort((a, b) => (b.death_date || "") > (a.death_date || "") ? 1 : -1);
    else if (sortBy === "oldest") list = [...list].sort((a, b) => (a.death_date || "") > (b.death_date || "") ? 1 : -1);
    else if (sortBy === "cause") list = [...list].sort((a, b) => (a.death_cause || "").localeCompare(b.death_cause || ""));
    return list;
  }, [deadTortoises, filterYear, filterCause, filterSearch, sortBy]);

  const now = new Date();
  const statsThisYear = deadTortoises.filter(t => t.death_date && new Date(t.death_date).getFullYear() === now.getFullYear()).length;
  const statsThisMonth = deadTortoises.filter(t => {
    if (!t.death_date) return false;
    const d = new Date(t.death_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const years = [...new Set(deadTortoises.filter(t => t.death_date).map(t => new Date(t.death_date).getFullYear().toString()))].sort((a, b) => b - a);
  if (!years.includes(now.getFullYear().toString())) years.unshift(now.getFullYear().toString());

  const handleDeathModalSaved = async (deathData) => {
    if (!deathModalTortoise) return;
    await base44.entities.Tortoise.update(deathModalTortoise.id, {
      status: "mati",
      // Kura yang mati harus keluar dari daftar sakit, kalau tidak dia tetap
      // muncul di layar keeper dan di penghitung "Sakit" selamanya.
      is_currently_sick: false,
      ...deathData,
    });
    // Kandang harus dihitung ulang: kura mati bukan lagi penghuni.
    try {
      await recalcEnclosureCounts(deathModalTortoise.enclosure ? [deathModalTortoise.enclosure] : null);
    } catch { /* jangan batalkan pencatatan kematian kalau hitung ulang gagal */ }
    qc.invalidateQueries({ queryKey: ["tortoises-all-death"] });
    qc.invalidateQueries({ queryKey: ["enclosures"] });
    setDeathModalTortoise(null);
    setShowSelectModal(false);
    toast.success(`${deathModalTortoise.name} berhasil dicatat meninggal.`);
  };

  if (detail) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <DeathDetail
          tortoise={detail}
          onBack={() => setDetail(null)}
          onEdit={(t) => { setDeathModalTortoise(t); setDetail(null); }}
        />
        {deathModalTortoise && (
          <DeathRecordModal
            tortoise={deathModalTortoise}
            open={!!deathModalTortoise}
            onClose={() => setDeathModalTortoise(null)}
            onSaved={handleDeathModalSaved}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Skull className="w-6 h-6 text-gray-600" /> Catatan Kematian
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {statsThisYear} kura mati tahun ini · {statsThisMonth} bulan ini
          </p>
        </div>
        <Button onClick={() => setShowSelectModal(true)} className="gap-2 bg-red-600 hover:bg-red-700 text-white flex-shrink-0">
          <Plus className="w-4 h-4" /> Lapor Kematian Baru
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Cari nama/kode..." className="pl-9" />
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Tahun" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahun</SelectItem>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCause} onValueChange={setFilterCause}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Penyebab" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Penyebab</SelectItem>
            {Object.entries(DEATH_CAUSE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Terbaru</SelectItem>
            <SelectItem value="oldest">Terlama</SelectItem>
            <SelectItem value="cause">Penyebab</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Skull className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">Tidak ada catatan kematian</p>
          <p className="text-sm">Sesuaikan filter atau tambah laporan baru</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(t => (
            <DeathCard key={t.id} tortoise={t} onClick={setDetail} />
          ))}
        </div>
      )}

      {/* Modal pilih kura */}
      {showSelectModal && (
        <SelectTortoiseModal
          tortoises={allTortoises}
          onSelect={(t) => { setDeathModalTortoise(t); setShowSelectModal(false); }}
          onClose={() => setShowSelectModal(false)}
        />
      )}

      {/* Modal kematian */}
      {deathModalTortoise && (
        <DeathRecordModal
          tortoise={deathModalTortoise}
          open={!!deathModalTortoise}
          onClose={() => setDeathModalTortoise(null)}
          onSaved={handleDeathModalSaved}
        />
      )}
    </div>
  );
}