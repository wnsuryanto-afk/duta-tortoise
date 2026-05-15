import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ChevronDown, ChevronRight, Shell } from "lucide-react";
import TortoiseCard from "@/components/tortoise/TortoiseCard";
import TortoiseForm from "@/components/tortoise/TortoiseForm";
import MoveEnclosureDialog from "@/components/tortoise/MoveEnclosureDialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getPerms } from "@/lib/permissions";

export default function TortoiseList() {
  const queryClient = useQueryClient();
  const { role } = useCurrentUser();
  const perms = getPerms(role, "tortoise");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
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
    return matchSearch && matchStatus;
  });

  // Group by enclosure
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const key = t.enclosure || "Tidak Ada Kandang";
      if (!map[key]) map[key] = [];
      map[key].push(t);
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau kode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="breeding">Breeding</SelectItem>
            <SelectItem value="terjual">Terjual</SelectItem>
            <SelectItem value="mati">Mati</SelectItem>
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
          {filtered.map((t) => (
            <TortoiseCard
              key={t.id}
              tortoise={t}
              healthStatus={getHealthStatus(t.id)}
              latestHealth={latestHealthMap[t.id]}
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
                    <span className="font-semibold text-sm">Kandang {enclosure}</span>
                    <Badge variant="secondary" className="text-xs">{items.length} ekor</Badge>
                    <div className="flex gap-1 text-xs text-muted-foreground">
                      <span>♂ {items.filter(t => t.gender === "jantan").length}</span>
                      <span>·</span>
                      <span>♀ {items.filter(t => t.gender === "betina").length}</span>
                    </div>
                  </div>
                </button>
                {!collapsed && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map((t) => (
                      <TortoiseCard
                        key={t.id}
                        tortoise={t}
                        healthStatus={getHealthStatus(t.id)}
                        latestHealth={latestHealthMap[t.id]}
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
    </div>
  );
}