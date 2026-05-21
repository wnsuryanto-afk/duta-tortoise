import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ChevronDown, ChevronRight, Shell, PenLine } from "lucide-react";
import TortoiseCard from "@/components/tortoise/TortoiseCard";
import TortoiseForm from "@/components/tortoise/TortoiseForm";
import MoveEnclosureDialog from "@/components/tortoise/MoveEnclosureDialog";
import RenameEnclosureDialog from "@/components/tortoise/RenameEnclosureDialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getPerms } from "@/lib/permissions";

export default function TortoiseList() {
  const queryClient = useQueryClient();
  const { role } = useCurrentUser();
  const perms = getPerms(role, "tortoise");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [renameEnclosure, setRenameEnclosure] = useState(null); // { name, ids }
  const canRenameEnclosure = ["admin", "owner", "manajer"].includes(role);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [genderFilter, setGenderFilter] = useState("semua");
  const [morphFilter, setMorphFilter] = useState("semua");
  const [provenFilter, setProvenFilter] = useState("semua"); // "semua" | "proven" | "belum"
  const [enclosureFilter, setEnclosureFilter] = useState(null); // null = tampil semua
  const [viewMode, setViewMode] = useState("kandang"); // "kandang" | "semua"
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const { data: tortoises = [], isLoading } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 300),
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["health-records-all"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 500),
  });

  const { data: breedingRecords = [] } = useQuery({
    queryKey: ["breeding-records-all"],
    queryFn: () => base44.entities.Breeding.list("-mating_date", 500),
  });

  // Buat map: tortoise_id -> record kesehatan terbaru
  const latestHealthMap = useMemo(() => {
    const map = {};
    healthRecords.forEach((r) => {
      if (!r.tortoise_id) return;
      if (!map[r.tortoise_id] || r.date > map[r.tortoise_id].date) {
        map[r.tortoise_id] = r;
      }
    });
    return map;
  }, [healthRecords]);

  // Set betina yang pernah bertelur (ada egg_laying_date)
  const hasLaidEggs = useMemo(() => {
    const s = new Set();
    breedingRecords.forEach((b) => {
      if (b.egg_laying_date && b.female_id) s.add(b.female_id);
    });
    return s;
  }, [breedingRecords]);

  // Indikator warna induk: prioritas merah > orange > hijau
  const getParentIndicator = (tortoise) => {
    const rec = latestHealthMap[tortoise.id];
    const isSick = rec && (rec.type === "sakit" || rec.type === "obat");
    if (isSick) return "sick"; // merah
    const notes = (tortoise.notes || "").toLowerCase();
    if (notes.includes("rare")) return "rare"; // orange
    if (tortoise.gender === "betina" && hasLaidEggs.has(tortoise.id)) return "hasEggs"; // hijau
    return null;
  };

  const getHealthStatus = (tortoiseId) => {
    const rec = latestHealthMap[tortoiseId];
    if (!rec) return "none";
    if (rec.type === "sakit" || rec.type === "obat") return "critical";
    if (rec.type === "vaksin") return "warning";
    return "ok";
  };

  const filtered = tortoises.filter((t) => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "semua" || t.status === statusFilter;
    const matchGender = genderFilter === "semua" || t.gender === genderFilter;
    const matchMorph = morphFilter === "semua" || (t.morph || "normal") === morphFilter;
    const matchEnclosure = !enclosureFilter || (t.enclosure || "Tidak Ada Kandang") === enclosureFilter;
    const matchProven = provenFilter === "semua" || (provenFilter === "proven" ? !!t.is_proven : !t.is_proven);
    return matchSearch && matchStatus && matchGender && matchMorph && matchEnclosure && matchProven;
  });

  // Group by enclosure
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const key = t.enclosure || "Tidak Ada Kandang";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    // Sort terjual/mati to bottom within each group
    const statusOrder = { aktif: 0, baby: 1, sakit: 2, mati: 3, terjual: 4 };
    Object.values(map).forEach((arr) => {
      arr.sort((a, b) => (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0));
    });
    // Sort: standard enclosures first
    const order = ["W1","W2","W3","W4","W5","N1","N2","E1","E2","E3","E4","E5","L2"];
    return Object.entries(map).sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const toggleGroup = (key) => {
    setCollapsedGroups(p => ({ ...p, [key]: !p[key] }));
  };

  const handleEdit = (tortoise) => { setEditData(tortoise); setShowForm(true); };
  const handleDelete = async (tortoise) => {
    if (confirm(`Hapus ${tortoise.name}?`)) {
      await base44.entities.Tortoise.delete(tortoise.id);
      queryClient.invalidateQueries({ queryKey: ["tortoises"] });
    }
  };
  const handleMove = (tortoise) => setMoveTarget(tortoise);
  const handleMoved = () => queryClient.invalidateQueries({ queryKey: ["tortoises"] });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Tortoise</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} tortoise ditemukan</p>
        </div>
        {perms.canCreate && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Tortoise
          </Button>
        )}
      </div>

      {/* Search bar besar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau kode tortoise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-12 text-base rounded-xl shadow-sm"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="baby">🐣 Baby</SelectItem>
            <SelectItem value="sakit">Sakit</SelectItem>
            <SelectItem value="terjual">Terjual</SelectItem>
            <SelectItem value="mati">Mati</SelectItem>
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Gender</SelectItem>
            <SelectItem value="jantan">♂ Jantan</SelectItem>
            <SelectItem value="betina">♀ Betina</SelectItem>
            <SelectItem value="belum_diketahui">? Belum Diketahui</SelectItem>
          </SelectContent>
        </Select>
        <Select value={morphFilter} onValueChange={setMorphFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Morph" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Morph</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="over_scute">Over Scute</SelectItem>
            <SelectItem value="less_scute">Less Scute</SelectItem>
            <SelectItem value="het_albino">Het Albino</SelectItem>
            <SelectItem value="ivory">Ivory</SelectItem>
            <SelectItem value="albino">Albino</SelectItem>
            <SelectItem value="wc">WC (Wild Caught)</SelectItem>
            <SelectItem value="cb">CB (Captive Bred)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={provenFilter} onValueChange={setProvenFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Proven" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua</SelectItem>
            <SelectItem value="proven">✅ Proven</SelectItem>
            <SelectItem value="belum">Belum Proven</SelectItem>
          </SelectContent>
        </Select>
        <Select value={enclosureFilter || "semua"} onValueChange={v => setEnclosureFilter(v === "semua" ? null : v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Kandang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kandang</SelectItem>
            {[...new Set(tortoises.map(t => t.enclosure || "Tidak Ada Kandang"))].sort().map(enc => (
              <SelectItem key={enc} value={enc}>Kandang {enc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setViewMode("kandang")}
            className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === "kandang" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
          >
            Per Kandang
          </button>
          <button
            onClick={() => setViewMode("semua")}
            className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === "semua" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Filter kandang aktif */}
      {enclosureFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <span className="font-medium text-primary">Menampilkan: Kandang {enclosureFilter}</span>
          <button onClick={() => setEnclosureFilter(null)} className="ml-auto text-xs text-muted-foreground hover:text-destructive underline">
            Tampilkan Semua
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Shell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg">Belum ada tortoise</p>
        </div>
      ) : viewMode === "semua" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...filtered].sort((a, b) => {
            const o = { aktif: 0, baby: 1, sakit: 2, mati: 3, terjual: 4 };
            return (o[a.status] ?? 0) - (o[b.status] ?? 0);
          }).map((t) => (
            <TortoiseCard
              key={t.id}
              tortoise={t}
              healthStatus={getHealthStatus(t.id)}
              latestHealth={latestHealthMap[t.id]}
              parentIndicator={getParentIndicator(t)}
              onEdit={perms.canEdit ? handleEdit : null}
              onDelete={perms.canDelete ? handleDelete : null}
              onMove={perms.canEdit ? handleMove : null}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([enclosure, items]) => {
            const collapsed = !!collapsedGroups[enclosure];
            return (
              <div key={enclosure} className="border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(enclosure)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEnclosureFilter(enclosureFilter === enclosure ? null : enclosure); }}
                      className={`font-semibold text-sm hover:text-primary hover:underline transition-colors ${enclosureFilter === enclosure ? "text-primary underline" : ""}`}
                    >
                      Kandang {enclosure}
                    </button>
                    <Badge variant="secondary" className="text-xs">{items.length} ekor</Badge>
                    <div className="flex gap-1 text-xs text-muted-foreground">
                      <span>♂ {items.filter(t => t.gender === "jantan").length}</span>
                      <span>·</span>
                      <span>♀ {items.filter(t => t.gender === "betina").length}</span>
                    </div>
                  </div>
                  {canRenameEnclosure && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setRenameEnclosure({ name: enclosure, ids: items.map(t => t.id) }); }}
                      className="mr-2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Ubah nama kandang"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                    </button>
                  )}
                </button>
                {!collapsed && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map((t) => (
                      <TortoiseCard
                        key={t.id}
                        tortoise={t}
                        healthStatus={getHealthStatus(t.id)}
                        latestHealth={latestHealthMap[t.id]}
                        parentIndicator={getParentIndicator(t)}
                        onEdit={perms.canEdit ? handleEdit : null}
                        onDelete={perms.canDelete ? handleDelete : null}
                        onMove={perms.canEdit ? handleMove : null}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TortoiseForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />
      )}

      {moveTarget && (
        <MoveEnclosureDialog
          tortoise={moveTarget}
          open={!!moveTarget}
          onClose={() => setMoveTarget(null)}
          onMoved={handleMoved}
        />
      )}

      {renameEnclosure && (
        <RenameEnclosureDialog
          open={!!renameEnclosure}
          onClose={() => setRenameEnclosure(null)}
          enclosureName={renameEnclosure.name}
          tortoiseIds={renameEnclosure.ids}
        />
      )}
    </div>
  );
}