import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ChevronDown, ChevronRight, Shell, PenLine, Home, Trees, Thermometer, Droplets, Users, Edit, Trash2, AlertTriangle, ClipboardCheck, Eye, TrendingUp } from "lucide-react";
import TortoiseCard from "@/components/tortoise/TortoiseCard";
import TortoiseForm from "@/components/tortoise/TortoiseForm";
import MoveEnclosureDialog from "@/components/tortoise/MoveEnclosureDialog";
import RenameEnclosureDialog from "@/components/tortoise/RenameEnclosureDialog";
import EnclosureForm from "@/components/enclosure/EnclosureForm";
import EnclosureAuditForm from "@/components/enclosure/EnclosureAuditForm";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getPerms } from "@/lib/permissions";
import { differenceInDays, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const GRADE_COLORS = { A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-yellow-100 text-yellow-800", D: "bg-red-100 text-red-800" };

function getEnclosureStatus(enc) {
  if (!enc.max_capacity) return "normal";
  if (enc.current_count > enc.max_capacity) return "overcrowded";
  if (enc.current_count >= enc.max_capacity * 0.8) return "warning";
  return "normal";
}

export default function TortoiseList() {
  const queryClient = useQueryClient();
  const { role, user } = useCurrentUser();
  const perms = getPerms(role, "tortoise");
  const canEditEnclosure = ["admin", "owner", "manajer"].includes(role);
  const canAudit = ["owner", "admin", "manajer"].includes(role);
  const [mainTab, setMainTab] = useState("kura");

  // Tortoise state
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [renameEnclosure, setRenameEnclosure] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [genderFilter, setGenderFilter] = useState("semua");
  const [morphFilter, setMorphFilter] = useState("semua");
  const [shellTypeFilter, setShellTypeFilter] = useState("semua");
  const [provenFilter, setProvenFilter] = useState("semua");
  const [enclosureFilter, setEnclosureFilter] = useState(null);
  const [viewMode, setViewMode] = useState("kandang");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Enclosure state
  const [showEnclosureForm, setShowEnclosureForm] = useState(false);
  const [editingEnclosure, setEditingEnclosure] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedEnclosureDetail, setSelectedEnclosureDetail] = useState(null);

  // Audit state
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [editAudit, setEditAudit] = useState(null);
  const [auditEnclosureFilter, setAuditEnclosureFilter] = useState("semua");
  const [viewAudit, setViewAudit] = useState(null);

  // ── Data Queries ──
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
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list("-created_date"),
  });
  const { data: audits = [], isLoading: auditsLoading } = useQuery({
    queryKey: ["enclosure-audits"],
    queryFn: () => base44.entities.EnclosureAudit.list("-audit_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Enclosure.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enclosures"] }); setDeleteTarget(null); },
  });

  // ── Tortoise derived ──
  const latestHealthMap = useMemo(() => {
    const map = {};
    healthRecords.forEach((r) => {
      if (!r.tortoise_id) return;
      if (!map[r.tortoise_id] || r.date > map[r.tortoise_id].date) map[r.tortoise_id] = r;
    });
    return map;
  }, [healthRecords]);

  const hasLaidEggs = useMemo(() => {
    const s = new Set();
    breedingRecords.forEach((b) => { if (b.egg_laying_date && b.female_id) s.add(b.female_id); });
    return s;
  }, [breedingRecords]);

  const getParentIndicator = (tortoise) => {
    const rec = latestHealthMap[tortoise.id];
    if (rec && (rec.type === "sakit" || rec.type === "obat")) return "sick";
    if ((tortoise.notes || "").toLowerCase().includes("rare")) return "rare";
    if (tortoise.gender === "betina" && hasLaidEggs.has(tortoise.id)) return "hasEggs";
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
    const matchShell = shellTypeFilter === "semua" || (t.shell_type || "normal") === shellTypeFilter;
    const matchEnclosure = !enclosureFilter || (t.enclosure || "Tidak Ada Kandang") === enclosureFilter;
    const matchProven = provenFilter === "semua" || (provenFilter === "proven" ? !!t.is_proven : !t.is_proven);
    return matchSearch && matchStatus && matchGender && matchMorph && matchShell && matchEnclosure && matchProven;
  });

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const key = t.enclosure || "Tidak Ada Kandang";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    const statusOrder = { aktif: 0, baby: 1, sakit: 2, mati: 3, terjual: 4 };
    Object.values(map).forEach((arr) => { arr.sort((a, b) => (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)); });
    const order = ["W1","W2","W3","W4","W5","N1","N2","E1","E2","E3","E4","E5","L2"];
    return Object.entries(map).sort(([a], [b]) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1; if (bi >= 0) return 1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const toggleGroup = (key) => setCollapsedGroups(p => ({ ...p, [key]: !p[key] }));
  const handleEdit = (tortoise) => { setEditData(tortoise); setShowForm(true); };
  const handleDelete = async (tortoise) => {
    if (confirm(`Hapus ${tortoise.name}?`)) {
      await base44.entities.Tortoise.delete(tortoise.id);
      queryClient.invalidateQueries({ queryKey: ["tortoises"] });
    }
  };
  const handleMove = (tortoise) => setMoveTarget(tortoise);
  const handleMoved = () => queryClient.invalidateQueries({ queryKey: ["tortoises"] });

  // ── Enclosure derived ──
  const typeLabel = { indoor: "Indoor", outdoor: "Outdoor", greenhouse: "Greenhouse" };
  const typeIcon = { indoor: Home, outdoor: Trees, greenhouse: Thermometer };
  const statusStyle = { overcrowded: "border-red-400 bg-red-50", warning: "border-amber-400 bg-amber-50", normal: "border-border bg-card" };
  const statusBadge = {
    overcrowded: <Badge className="bg-red-100 text-red-700 border-red-300">Overcrowding!</Badge>,
    warning: <Badge className="bg-amber-100 text-amber-700 border-amber-300">Hampir Penuh</Badge>,
    normal: <Badge className="bg-green-100 text-green-700 border-green-300">Normal</Badge>,
  };
  const encTortoises = selectedEnclosureDetail
    ? tortoises.filter(t => t.enclosure === selectedEnclosureDetail.name && t.status !== "terjual" && t.status !== "mati")
    : [];

  // ── Audit derived ──
  const today = new Date();
  const enclosureNames = [...new Set(audits.map(a => a.enclosure_name))];
  const overdueAlerts = useMemo(() => {
    const lastAudit = {};
    audits.forEach(a => { if (!lastAudit[a.enclosure_name] || a.audit_date > lastAudit[a.enclosure_name]) lastAudit[a.enclosure_name] = a.audit_date; });
    return enclosures.filter(e => e.is_active !== false).filter(e => {
      const last = lastAudit[e.name];
      if (!last) return true;
      return differenceInDays(today, parseISO(last)) > 30;
    }).map(e => ({ name: e.name, lastAudit: lastAudit[e.name] || null }));
  }, [audits, enclosures]);

  const filteredAudits = auditEnclosureFilter === "semua" ? audits : audits.filter(a => a.enclosure_name === auditEnclosureFilter);
  const chartData = useMemo(() => {
    const grp = {};
    filteredAudits.forEach(a => {
      if (!grp[a.enclosure_name]) grp[a.enclosure_name] = [];
      grp[a.enclosure_name].push({ date: a.audit_date, score: a.total_score || 0 });
    });
    return grp;
  }, [filteredAudits]);

  const handleAuditSaved = () => { queryClient.invalidateQueries({ queryKey: ["enclosure-audits"] }); setShowAuditForm(false); setEditAudit(null); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Tortoise & Kandang</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola kura-kura dan kandang dalam satu tempat</p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="kura" className="flex-1 sm:flex-none gap-1.5">
            <Shell className="w-4 h-4" /> Kura-kura
            <Badge variant="secondary" className="text-xs ml-1">{tortoises.filter(t => t.status === "aktif" || t.status === "baby").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="kandang" className="flex-1 sm:flex-none gap-1.5">
            <Home className="w-4 h-4" /> Kandang
            <Badge variant="secondary" className="text-xs ml-1">{enclosures.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-1 sm:flex-none gap-1.5">
            <ClipboardCheck className="w-4 h-4" /> Audit
          </TabsTrigger>
        </TabsList>

        {/* ══════════ TAB KURA-KURA ══════════ */}
        <TabsContent value="kura" className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{filtered.length} dari {tortoises.length} tortoise</p>
            {perms.canCreate && (
              <Button onClick={() => { setEditData(null); setShowForm(true); }} className="bg-primary gap-2">
                <Plus className="w-4 h-4" /> Tambah Tortoise
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Cari nama atau kode tortoise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-11 rounded-xl" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
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
              <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Gender</SelectItem>
                <SelectItem value="jantan">♂ Jantan</SelectItem>
                <SelectItem value="betina">♀ Betina</SelectItem>
                <SelectItem value="belum_diketahui">? Belum Diketahui</SelectItem>
              </SelectContent>
            </Select>
            <Select value={morphFilter} onValueChange={setMorphFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Morph" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="semua">Semua Morph</SelectItem>
                {["normal","albino","ivory","caramel_albino","hypo","golden_greek","piebald","genetic_stripe","high_yellow","dark","paradox","anerythristic","axanthic","melanistic","mix","unknown"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={shellTypeFilter} onValueChange={setShellTypeFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Tempurung" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Tempurung</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="less_scute">Less Scute</SelectItem>
                <SelectItem value="over_scute">Over Scute</SelectItem>
                <SelectItem value="pyramiding">Pyramiding</SelectItem>
                <SelectItem value="smooth">Smooth</SelectItem>
                <SelectItem value="wavy">Wavy</SelectItem>
                <SelectItem value="irregular">Irregular</SelectItem>
              </SelectContent>
            </Select>
            <Select value={enclosureFilter || "semua"} onValueChange={v => setEnclosureFilter(v === "semua" ? null : v)}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Kandang" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Kandang</SelectItem>
                {[...new Set(tortoises.map(t => t.enclosure || "Tidak Ada Kandang"))].sort().map(enc => (
                  <SelectItem key={enc} value={enc}>Kandang {enc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border overflow-hidden h-9">
              <button onClick={() => setViewMode("kandang")} className={`px-3 text-xs font-medium transition-colors ${viewMode === "kandang" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Per Kandang</button>
              <button onClick={() => setViewMode("semua")} className={`px-3 text-xs font-medium transition-colors ${viewMode === "semua" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Semua</button>
            </div>
          </div>

          {enclosureFilter && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm">
              <span className="font-medium text-primary">Kandang: {enclosureFilter}</span>
              <button onClick={() => setEnclosureFilter(null)} className="ml-auto text-xs text-muted-foreground hover:text-destructive underline">Tampilkan Semua</button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground"><Shell className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Belum ada tortoise</p></div>
          ) : viewMode === "semua" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...filtered].sort((a, b) => ({ aktif: 0, baby: 1, sakit: 2, mati: 3, terjual: 4 }[a.status] ?? 0) - ({ aktif: 0, baby: 1, sakit: 2, mati: 3, terjual: 4 }[b.status] ?? 0)).map((t) => (
                <TortoiseCard key={t.id} tortoise={t} healthStatus={getHealthStatus(t.id)} latestHealth={latestHealthMap[t.id]} parentIndicator={getParentIndicator(t)} onEdit={perms.canEdit ? handleEdit : null} onDelete={perms.canDelete ? handleDelete : null} onMove={perms.canEdit ? handleMove : null} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([enclosure, items]) => {
                const collapsed = !!collapsedGroups[enclosure];
                return (
                  <div key={enclosure} className="border rounded-xl overflow-hidden">
                    <button onClick={() => toggleGroup(enclosure)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-3">
                        {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEnclosureFilter(enclosureFilter === enclosure ? null : enclosure); }} className={`font-semibold text-sm hover:text-primary hover:underline transition-colors ${enclosureFilter === enclosure ? "text-primary underline" : ""}`}>
                          Kandang {enclosure}
                        </button>
                        <Badge variant="secondary" className="text-xs">{items.length} ekor</Badge>
                        <div className="flex gap-1 text-xs text-muted-foreground">
                          <span>♂ {items.filter(t => t.gender === "jantan").length}</span>
                          <span>·</span>
                          <span>♀ {items.filter(t => t.gender === "betina").length}</span>
                        </div>
                      </div>
                      {canEditEnclosure && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setRenameEnclosure({ name: enclosure, ids: items.map(t => t.id) }); }} className="mr-2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <PenLine className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>
                    {!collapsed && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {items.map((t) => (
                          <TortoiseCard key={t.id} tortoise={t} healthStatus={getHealthStatus(t.id)} latestHealth={latestHealthMap[t.id]} parentIndicator={getParentIndicator(t)} onEdit={perms.canEdit ? handleEdit : null} onDelete={perms.canDelete ? handleDelete : null} onMove={perms.canEdit ? handleMove : null} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ══════════ TAB KANDANG ══════════ */}
        <TabsContent value="kandang" className="mt-5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">{enclosures.length} kandang terdaftar</p>
            {canEditEnclosure && (
              <Button onClick={() => { setEditingEnclosure(null); setShowEnclosureForm(true); }} className="gap-2 bg-primary">
                <Plus className="w-4 h-4" /> Tambah Kandang
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Kandang", val: enclosures.filter(e=>e.is_active).length, color: "text-green-700" },
              { label: "Overcrowding", val: enclosures.filter(e=>getEnclosureStatus(e)==="overcrowded").length, color: "text-red-600" },
              { label: "Hampir Penuh", val: enclosures.filter(e=>getEnclosureStatus(e)==="warning").length, color: "text-amber-600" },
              { label: "Total Kapasitas", val: enclosures.reduce((s,e)=>s+(e.max_capacity||0),0), color: "text-green-700" },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enclosures.map(enc => {
              const status = getEnclosureStatus(enc);
              const Icon = typeIcon[enc.type] || Home;
              const encCount = tortoises.filter(t => t.enclosure === enc.name && t.status !== "terjual" && t.status !== "mati").length;
              return (
                <Card key={enc.id} className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${statusStyle[status]}`} onClick={() => setSelectedEnclosureDetail(enc)}>
                  {enc.photo_url && <div className="h-32 overflow-hidden rounded-t-xl"><img src={enc.photo_url} alt={enc.name} className="w-full h-full object-cover" /></div>}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-green-700" /><CardTitle className="text-base">{enc.name}</CardTitle></div>
                      {statusBadge[status]}
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">{typeLabel[enc.type]}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground"><Users className="w-3.5 h-3.5" /><span>Isi / Kapasitas</span></div>
                      <span className="font-semibold">{encCount}{enc.max_capacity ? ` / ${enc.max_capacity}` : ""}</span>
                    </div>
                    {status === "overcrowded" && <div className="flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" />Kapasitas melebihi batas!</div>}
                    {enc.ideal_temp_min && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Thermometer className="w-3.5 h-3.5" /><span>{enc.ideal_temp_min}°–{enc.ideal_temp_max}°C</span>
                        {enc.ideal_humidity && <><Droplets className="w-3.5 h-3.5 ml-1" /><span>{enc.ideal_humidity}%</span></>}
                      </div>
                    )}
                    {enc.location && <p className="text-xs text-muted-foreground truncate">{enc.location}</p>}
                    {canEditEnclosure && (
                      <div className="flex justify-end gap-2 pt-1" onClick={e=>e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={()=>{setEditingEnclosure(enc);setShowEnclosureForm(true);}}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={()=>setDeleteTarget(enc)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ══════════ TAB AUDIT ══════════ */}
        <TabsContent value="audit" className="mt-5 space-y-5">
          {!canAudit ? (
            <div className="text-center py-16 text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-muted-foreground">{audits.length} rekaman audit kandang</p>
                <div className="flex items-center gap-2">
                  <Select value={auditEnclosureFilter} onValueChange={setAuditEnclosureFilter}>
                    <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Semua Kandang" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Kandang</SelectItem>
                      {enclosureNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { setEditAudit(null); setShowAuditForm(true); }} className="gap-2 bg-primary">
                    <Plus className="w-4 h-4" /> Audit Baru
                  </Button>
                </div>
              </div>

              {overdueAlerts.length > 0 && (
                <div className="space-y-2">
                  {overdueAlerts.map(a => (
                    <div key={a.name} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span><strong>{a.name}</strong> belum diaudit {a.lastAudit ? `sejak ${differenceInDays(today, parseISO(a.lastAudit))} hari lalu` : "— belum pernah diaudit"}.</span>
                    </div>
                  ))}
                </div>
              )}

              {auditsLoading ? (
                <div className="text-center py-16 text-muted-foreground">Memuat...</div>
              ) : filteredAudits.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Belum ada data audit</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(chartData).map(([name, data]) => data.length > 1 && (
                    <Card key={name}>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Tren Skor: {name}</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={[...data].sort((a, b) => a.date > b.date ? 1 : -1)}>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis domain={[0, 35]} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={v => [`${v}`, "Skor"]} />
                            <Line type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAudits.map(audit => (
                      <Card key={audit.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div><div className="font-semibold">{audit.enclosure_name}</div><div className="text-xs text-muted-foreground">{audit.audit_date} · oleh {audit.auditor_name}</div></div>
                            {audit.grade && <Badge className={`${GRADE_COLORS[audit.grade] || ""} border-0 font-bold text-sm`}>Grade {audit.grade}</Badge>}
                          </div>
                          {audit.total_score != null && <div className="text-sm">Skor Total: <span className="font-bold">{audit.total_score}</span><span className="text-muted-foreground">/35</span></div>}
                          {audit.action_items && <div className="mt-2 text-xs text-muted-foreground line-clamp-2">🔧 {audit.action_items}</div>}
                          <div className="flex gap-1 mt-3 pt-2 border-t">
                            <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => setViewAudit(audit)}><Eye className="w-3 h-3 mr-1" /> Detail</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      {showForm && <TortoiseForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />}
      {moveTarget && <MoveEnclosureDialog tortoise={moveTarget} open={!!moveTarget} onClose={() => setMoveTarget(null)} onMoved={handleMoved} />}
      {renameEnclosure && <RenameEnclosureDialog open={!!renameEnclosure} onClose={() => setRenameEnclosure(null)} enclosureName={renameEnclosure.name} tortoiseIds={renameEnclosure.ids} />}
      {showEnclosureForm && (
        <EnclosureForm enclosure={editingEnclosure} onClose={() => setShowEnclosureForm(false)} onSaved={() => { setShowEnclosureForm(false); queryClient.invalidateQueries({ queryKey: ["enclosures"] }); }} />
      )}

      <Dialog open={!!selectedEnclosureDetail} onOpenChange={() => setSelectedEnclosureDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shell className="w-5 h-5 text-green-700" />Kandang: {selectedEnclosureDetail?.name}</DialogTitle></DialogHeader>
          {selectedEnclosureDetail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedEnclosureDetail.ideal_temp_min && <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg"><Thermometer className="w-4 h-4 text-orange-500" /><span>{selectedEnclosureDetail.ideal_temp_min}°–{selectedEnclosureDetail.ideal_temp_max}°C</span></div>}
                {selectedEnclosureDetail.ideal_humidity && <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg"><Droplets className="w-4 h-4 text-blue-500" /><span>{selectedEnclosureDetail.ideal_humidity}% kelembapan</span></div>}
                {selectedEnclosureDetail.size_m2 && <div className="p-2 bg-muted/40 rounded-lg"><span className="text-muted-foreground text-xs">Ukuran: </span><span className="font-medium">{selectedEnclosureDetail.size_m2} m²</span></div>}
                {selectedEnclosureDetail.location && <div className="p-2 bg-muted/40 rounded-lg"><span className="text-muted-foreground text-xs">Lokasi: </span><span className="font-medium">{selectedEnclosureDetail.location}</span></div>}
              </div>
              <p className="text-sm text-muted-foreground font-medium">{encTortoises.length} kura-kura aktif di kandang ini</p>
              {encTortoises.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Tidak ada kura-kura di kandang ini</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {encTortoises.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      {t.photo_url ? <img src={t.photo_url} alt={t.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Shell className="w-5 h-5 text-green-700" /></div>}
                      <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{t.name}</p><p className="text-xs text-muted-foreground">{t.morph} · {t.gender}</p></div>
                      <Badge variant="outline" className="text-xs">{t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kandang?</AlertDialogTitle>
            <AlertDialogDescription>Kandang <b>{deleteTarget?.name}</b> akan dihapus permanen. Data kura-kura tidak akan ikut terhapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleteMutation.mutate(deleteTarget.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAuditForm} onOpenChange={() => { setShowAuditForm(false); setEditAudit(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Form Audit Kandang</DialogTitle></DialogHeader>
          <EnclosureAuditForm data={editAudit} enclosures={enclosures} onSave={handleAuditSaved} onClose={() => { setShowAuditForm(false); setEditAudit(null); }} auditorName={user?.full_name || user?.email} />
        </DialogContent>
      </Dialog>

      {viewAudit && (
        <Dialog open={!!viewAudit} onOpenChange={() => setViewAudit(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Hasil Audit: {viewAudit.enclosure_name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-4 text-sm flex-wrap">
                <div><span className="text-muted-foreground">Tanggal: </span>{viewAudit.audit_date}</div>
                <div><span className="text-muted-foreground">Auditor: </span>{viewAudit.auditor_name}</div>
                {viewAudit.grade && <Badge className={`${GRADE_COLORS[viewAudit.grade]} border-0`}>Grade {viewAudit.grade}</Badge>}
              </div>
              {viewAudit.checklist?.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/40 rounded-lg text-sm">
                  <span className="font-medium capitalize">{item.aspect}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <div key={s} className={`w-4 h-4 rounded-sm ${s <= item.score ? "bg-green-500" : "bg-muted"}`} />)}</div>
                    <span className="text-xs text-muted-foreground">{item.score}/5</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-sm p-2 bg-primary/5 rounded-lg">
                <span>Total Skor</span><span>{viewAudit.total_score}/{(viewAudit.checklist?.length || 7) * 5}</span>
              </div>
              {viewAudit.action_items && <div><p className="text-sm font-medium mb-1">Tindakan Perbaikan:</p><p className="text-sm text-muted-foreground">{viewAudit.action_items}</p></div>}
              {viewAudit.follow_up_date && <p className="text-sm"><span className="font-medium">Follow Up: </span>{viewAudit.follow_up_date}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}