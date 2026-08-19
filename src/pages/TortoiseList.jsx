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
import { Plus, Search, ChevronDown, ChevronRight, Shell, PenLine, Home, Trees, Thermometer, Droplets, Users, Edit, Trash2, AlertTriangle, CalendarX, Skull, ShoppingBag } from "lucide-react";
import TortoiseTerjualTab from "@/components/tortoise/TortoiseTerjualTab";
import ExportButton from "@/components/common/ExportButton";
import SaleWizard from "@/components/sales/SaleWizard";
import TortoiseCard from "@/components/tortoise/TortoiseCard";
import TortoiseForm from "@/components/tortoise/TortoiseForm";
import MoveEnclosureDialog from "@/components/tortoise/MoveEnclosureDialog";
import RenameEnclosureDialog from "@/components/tortoise/RenameEnclosureDialog";
import EnclosureForm from "@/components/enclosure/EnclosureForm";
import EmptyState from "@/components/common/EmptyState";
import CardSkeleton from "@/components/common/Skeleton";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getPerms, canDelete as canDeleteGlobal, isManagerLevel } from "@/lib/permissions";

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
  const canEditEnclosure = isManagerLevel(role);
  // Hapus permanen hanya untuk owner
  const ownerCanDelete = canDeleteGlobal(role);
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
  const [speciesFilter, setSpeciesFilter] = useState("semua");
  const [enclosureFilter, setEnclosureFilter] = useState(null);
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [viewMode, setViewMode] = useState("kandang");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Enclosure state
  const [showEnclosureForm, setShowEnclosureForm] = useState(false);
  const [editingEnclosure, setEditingEnclosure] = useState(null);
  const [showSellWizard, setShowSellWizard] = useState(false);
  const [sellTarget, setSellTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedEnclosureDetail, setSelectedEnclosureDetail] = useState(null);

  // Karantina state
  const [quarantineFilter, setQuarantineFilter] = useState("all");
  const [weightFilter, setWeightFilter] = useState("semua");
  const [shellLengthFilter, setShellLengthFilter] = useState("semua");

  // ── Data Queries ──
  const { data: tortoises = [], isLoading } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 2000),
  });
  const { data: healthRecords = [] } = useQuery({
    queryKey: ["health-records-all"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 2000),
  });
  const { data: breedingRecords = [] } = useQuery({
    queryKey: ["breeding-records-all"],
    queryFn: () => base44.entities.Breeding.list("-mating_date", 2000),
  });
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list("-created_date", 200),
  });
  const { data: deathRecords = [] } = useQuery({
    queryKey: ["death-records"],
    queryFn: () => base44.entities.DeathRecord.list("-death_date", 200),
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

  // Kura-kura dengan HealthRecord sakit aktif (belum ada follow_up atau follow_up di masa depan)
  const sickTortoiseIds = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const sickSet = new Set();
    healthRecords.forEach(r => {
      if (r.type === "sakit" && r.tortoise_id) {
        if (!r.follow_up_date || r.follow_up_date >= today) {
          sickSet.add(r.tortoise_id);
        }
      }
    });
    return sickSet;
  }, [healthRecords]);

  // Gunakan incompleteChecks.js sebagai sumber kebenaran tunggal
  const isIncomplete = (t) => {
    if (!t.weight_grams || t.weight_grams === 0) return true;
    if (!t.shell_length_cm || t.shell_length_cm === 0) return true;
    if (!t.birth_date) return true;
    // Gender hanya wajib untuk kura >= 20 cm (bukan baby)
    const isSmall = (t.shell_length_cm && t.shell_length_cm < 20) || t.age_category === "baby";
    if (!isSmall && (!t.gender || t.gender === "belum_diketahui")) return true;
    if (!t.enclosure) return true;
    if (!t.species) return true;
    const hasPhoto = (Array.isArray(t.photos) && t.photos.length > 0) || t.photo_url;
    if (!hasPhoto) return true;
    return false;
  };

  const filtered = tortoises.filter((t) => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase());
    let matchStatus;
    if (statusFilter === "semua") matchStatus = true;
    else if (statusFilter === "baby") matchStatus = t.age_category === "baby" && t.status === "aktif";
    else matchStatus = t.status === statusFilter;
    const matchGender = genderFilter === "semua" || t.gender === genderFilter;
    const matchMorph = morphFilter === "semua" || (t.morph || "normal") === morphFilter;
    const matchShell = shellTypeFilter === "semua" || (t.shell_type || "normal") === shellTypeFilter;
    const matchEnclosure = !enclosureFilter || (t.enclosure || "Tidak Ada Kandang") === enclosureFilter;
    const matchProven = provenFilter === "semua" || (provenFilter === "proven" ? !!t.is_proven : !t.is_proven);
    const matchSpecies = speciesFilter === "semua" || (t.species || "sulcata") === speciesFilter;
    const matchQuarantine = quarantineFilter === "all" || (quarantineFilter === "yes" ? t.in_quarantine : !t.in_quarantine);
    const matchIncomplete = !incompleteFilter || isIncomplete(t);

    let matchWeight = true;
    if (weightFilter !== "semua") {
      const w = t.weight_grams;
      if (!w || w === 0) return false;
      if (weightFilter === "newborn") matchWeight = w < 100;
      else if (weightFilter === "baby") matchWeight = w >= 100 && w <= 500;
      else if (weightFilter === "juvenile") matchWeight = w > 500 && w <= 2000;
      else if (weightFilter === "subadult") matchWeight = w > 2000 && w <= 8000;
      else if (weightFilter === "adult") matchWeight = w > 8000;
    }

    let matchShellLength = true;
    if (shellLengthFilter !== "semua") {
      const sl = t.shell_length_cm;
      if (!sl || sl === 0) return false;
      if (shellLengthFilter === "xs") matchShellLength = sl < 8;
      else if (shellLengthFilter === "s") matchShellLength = sl >= 8 && sl < 15;
      else if (shellLengthFilter === "m") matchShellLength = sl >= 15 && sl < 25;
      else if (shellLengthFilter === "l") matchShellLength = sl >= 25 && sl < 35;
      else if (shellLengthFilter === "xl1") matchShellLength = sl >= 35 && sl < 40;
      else if (shellLengthFilter === "xl2") matchShellLength = sl >= 40 && sl <= 45;
      else if (shellLengthFilter === "xl3") matchShellLength = sl >= 46 && sl <= 50;
      else if (shellLengthFilter === "xl4") matchShellLength = sl >= 50 && sl <= 55;
      else if (shellLengthFilter === "xl5") matchShellLength = sl >= 55 && sl <= 60;
      else if (shellLengthFilter === "xl6") matchShellLength = sl > 60;
    }

    return matchSearch && matchStatus && matchGender && matchMorph && matchShell && matchEnclosure && matchProven && matchSpecies && matchQuarantine && matchIncomplete && matchWeight && matchShellLength;
  });

  const grouped = useMemo(() => {
    const map = {};
    // Di view kandang, kura mati & terjual tidak ditampilkan (kecuali filter eksplisit status mati/terjual)
    const forGrouped = (statusFilter === "mati" || statusFilter === "terjual" || statusFilter === "diarsipkan")
      ? filtered
      : filtered.filter(t => t.status !== "mati" && t.status !== "terjual" && t.status !== "diarsipkan");
    forGrouped.forEach((t) => {
      const key = t.enclosure || "Tidak Ada Kandang";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    const statusOrder = { aktif: 0, baby: 1, sakit: 2, mati: 3, terjual: 4 };
    Object.values(map).forEach((arr) => { arr.sort((a, b) => (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)); });
    const order = ["W1","W2","W3","W4","W5","N1","N2","E1","E2","E3","E4","E5","L2","Baby 1","Baby 2","Baby 3"];
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
  const handleSell = (tortoise) => { setSellTarget(tortoise); setShowSellWizard(true); };
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

  // Karantina tortoises
  const quarantinedTortoises = tortoises.filter(t => t.in_quarantine === true);

  const handleSaveEnclosure = () => { setShowEnclosureForm(false); queryClient.invalidateQueries({ queryKey: ["enclosures"] }); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Kura-kura & Kandang</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola kura-kura dan kandang dalam satu tempat</p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="kura" className="flex-1 sm:flex-none gap-1.5">
            <Shell className="w-4 h-4" /> Kura-kura
            <Badge variant="secondary" className="text-xs ml-1">{tortoises.filter(t => t.status === "aktif" && !t.is_archived).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="kandang" className="flex-1 sm:flex-none gap-1.5">
            <Home className="w-4 h-4" /> Kandang
            <Badge variant="secondary" className="text-xs ml-1">{enclosures.filter(e => e.is_active !== false).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="karantina" className="flex-1 sm:flex-none gap-1.5">
            <CalendarX className="w-4 h-4" /> Karantina
            <Badge variant="secondary" className="text-xs ml-1">{tortoises.filter(t => t.in_quarantine === true).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="kematian" className="flex-1 sm:flex-none gap-1.5">
            <Skull className="w-4 h-4" /> Kematian
            <Badge variant="secondary" className="text-xs ml-1">{tortoises.filter(t => t.status === "mati" || t.is_archived).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="terjual" className="flex-1 sm:flex-none gap-1.5">
            <ShoppingBag className="w-4 h-4" /> Terjual
            <Badge variant="secondary" className="text-xs ml-1">{tortoises.filter(t => t.status === "terjual").length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ══════════ TAB KURA-KURA ══════════ */}
        <TabsContent value="kura" className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> kura dari {tortoises.filter(t => t.status === "aktif" && !t.is_archived).length} aktif</p>
              {(() => {
                const activeCount = tortoises.filter(t => t.status === "aktif" && !t.is_archived).length;
                const visibleActive = filtered.filter(t => t.status === "aktif" && !t.is_archived).length;
                const hidden = activeCount - visibleActive;
                return (statusFilter === "semua" && !incompleteFilter && !enclosureFilter && !search && hidden > 0) ? (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⚠️ {hidden} kura tidak tampil</span>
                ) : null;
              })()}
            </div>
            <div className="flex gap-2 flex-wrap">
              <ExportButton
                data={filtered}
                filename={`tortoise-${new Date().toISOString().split("T")[0]}`}
                title="Data Kura-kura"
                columns={[
                  {key:"name",label:"Nama"},{key:"code",label:"Kode"},{key:"gender",label:"Gender"},
                  {key:"morph",label:"Morph"},{key:"status",label:"Status"},{key:"enclosure",label:"Kandang"},
                  {key:"weight_grams",label:"Berat (g)"},{key:"shell_length_cm",label:"Panjang (cm)"},
                  {key:"birth_date",label:"Tgl Lahir"},{key:"source",label:"Sumber"},
                ]}
              />
              {perms.canCreate && (
                <Button onClick={() => { setEditData(null); setShowForm(true); }} className="bg-primary gap-2">
                  <Plus className="w-4 h-4" /> Tambah Tortoise
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Cari nama atau kode tortoise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-11 rounded-xl" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status ({tortoises.length})</SelectItem>
                <SelectItem value="aktif">Aktif ({tortoises.filter(t => t.status === "aktif").length})</SelectItem>
                <SelectItem value="baby">🐣 Baby ({tortoises.filter(t => t.age_category === "baby" && t.status === "aktif").length})</SelectItem>
                <SelectItem value="sakit">Sakit ({tortoises.filter(t => t.status === "sakit").length})</SelectItem>
                <SelectItem value="breeding">Breeding ({tortoises.filter(t => t.status === "breeding").length})</SelectItem>
                <SelectItem value="terjual">Terjual ({tortoises.filter(t => t.status === "terjual").length})</SelectItem>
                <SelectItem value="mati">Mati ({tortoises.filter(t => t.status === "mati").length})</SelectItem>
                <SelectItem value="diarsipkan">Diarsipkan ({tortoises.filter(t => t.status === "diarsipkan" || t.is_archived).length})</SelectItem>
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
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Morph" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="semua">Semua Morph</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="het_albino">Het. Albino (Carrier)</SelectItem>
                <SelectItem value="het_caramel_albino">Het. Caramel Albino</SelectItem>
                <SelectItem value="het_hypo">Het. Hypo</SelectItem>
                <SelectItem value="het_ivory">Het. Ivory</SelectItem>
                <SelectItem value="double_het">Double Het</SelectItem>
                <SelectItem value="albino">Albino</SelectItem>
                <SelectItem value="ivory">Ivory</SelectItem>
                <SelectItem value="caramel_albino">Caramel Albino</SelectItem>
                <SelectItem value="hypo">Hypo</SelectItem>
                <SelectItem value="golden_greek">Golden Greek</SelectItem>
                <SelectItem value="piebald">Piebald</SelectItem>
                <SelectItem value="genetic_stripe">Genetic Stripe</SelectItem>
                <SelectItem value="high_yellow">High Yellow</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="paradox">Paradox</SelectItem>
                <SelectItem value="anerythristic">Anerythristic</SelectItem>
                <SelectItem value="axanthic">Axanthic</SelectItem>
                <SelectItem value="melanistic">Melanistic</SelectItem>
                <SelectItem value="mix">Mix</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
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
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Pilih Kandang..." /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="semua">Semua Kandang</SelectItem>
                {[
                  { label: "Barat", prefix: "W" },
                  { label: "Utara", prefix: "N" },
                  { label: "Timur", prefix: "E" },
                  { label: "Lainnya", prefix: "L" },
                  { label: "Kandang Baby", prefix: "Baby" },
                ].map(group => {
                  const groupEncs = enclosures.filter(e => e.name.startsWith(group.prefix)).sort((a,b) => a.name.localeCompare(b.name));
                  if (groupEncs.length === 0) {
                    // Fallback: cek dari data tortoise yang ada enclosure-nya tapi belum jadi Enclosure entity
                    const virtualEncs = [...new Set(tortoises.filter(t => t.enclosure?.startsWith(group.prefix)).map(t => t.enclosure))].sort();
                    if (virtualEncs.length === 0) return null;
                    return (
                      <div key={group.label}>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">{group.label}</div>
                        {virtualEncs.map(name => (
                          <SelectItem key={`virtual-${name}`} value={name}>
                            {name} ({tortoises.filter(t => t.enclosure === name && t.status !== "mati" && t.status !== "terjual" && t.status !== "diarsipkan").length})
                          </SelectItem>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div key={group.label}>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">{group.label}</div>
                      {groupEncs.map(enc => (
                        <SelectItem key={enc.id} value={enc.name}>
                          {enc.name} ({tortoises.filter(t => t.enclosure === enc.name && t.status !== "mati" && t.status !== "terjual" && t.status !== "diarsipkan").length})
                        </SelectItem>
                      ))}
                      </div>
                      );
                      })}
                      {enclosures.filter(e => !["W","N","E","L","B"].some(p => e.name.startsWith(p)) && !e.name.startsWith("Baby")).map(enc => (
                      <SelectItem key={enc.id} value={enc.name}>{enc.name} ({tortoises.filter(t => t.enclosure === enc.name && t.status !== "mati" && t.status !== "terjual" && t.status !== "diarsipkan").length})</SelectItem>
                      ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border overflow-hidden h-9">
              <button onClick={() => setViewMode("kandang")} className={`px-3 text-xs font-medium transition-colors ${viewMode === "kandang" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Per Kandang</button>
              <button onClick={() => setViewMode("semua")} className={`px-3 text-xs font-medium transition-colors ${viewMode === "semua" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Semua</button>
            </div>
            <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Spesies" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Spesies</SelectItem>
                <SelectItem value="sulcata">Sulcata</SelectItem>
                <SelectItem value="red_foot">Red Foot</SelectItem>
                <SelectItem value="leopard">Leopard</SelectItem>
                <SelectItem value="aldabra">Aldabra</SelectItem>
                <SelectItem value="russian">Russian</SelectItem>
                <SelectItem value="hermann">Hermann</SelectItem>
                <SelectItem value="greek">Greek</SelectItem>
                <SelectItem value="indian_star">Indian Star</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Berat */}
            <Select value={weightFilter} onValueChange={setWeightFilter}>
              <SelectTrigger className={`w-36 h-9 text-xs ${weightFilter !== "semua" ? "border-primary bg-primary/5 text-primary font-semibold" : ""}`}>
                <SelectValue placeholder="Berat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Berat</SelectItem>
                <SelectItem value="newborn">Newborn (&lt;100g)</SelectItem>
                <SelectItem value="baby">Baby (100–500g)</SelectItem>
                <SelectItem value="juvenile">Juvenile (500–2000g)</SelectItem>
                <SelectItem value="subadult">Sub-Adult (2–8kg)</SelectItem>
                <SelectItem value="adult">Adult (&gt;8kg)</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Panjang Karapas */}
            <Select value={shellLengthFilter} onValueChange={setShellLengthFilter}>
              <SelectTrigger className={`w-40 h-9 text-xs ${shellLengthFilter !== "semua" ? "border-primary bg-primary/5 text-primary font-semibold" : ""}`}>
                <SelectValue placeholder="Panjang Karapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Ukuran</SelectItem>
                <SelectItem value="xs">&lt; 8 cm</SelectItem>
                <SelectItem value="s">8 – 15 cm</SelectItem>
                <SelectItem value="m">15 – 25 cm</SelectItem>
                <SelectItem value="l">25 – 35 cm</SelectItem>
                <SelectItem value="xl1">35 – 40 cm</SelectItem>
                <SelectItem value="xl2">40 – 45 cm</SelectItem>
                <SelectItem value="xl3">46 – 50 cm</SelectItem>
                <SelectItem value="xl4">50 – 55 cm</SelectItem>
                <SelectItem value="xl5">55 – 60 cm</SelectItem>
                <SelectItem value="xl6">&gt; 60 cm</SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle Proven Breeder */}
            <button
              onClick={() => setProvenFilter(v => v === "proven" ? "semua" : "proven")}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${provenFilter === "proven" ? "bg-green-100 border-green-500 text-green-800" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
            >
              ⭐ Proven Breeder
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${provenFilter === "proven" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>{tortoises.filter(t => t.is_proven).length}</span>
            </button>

            {/* Toggle Sakit Saat Ini */}
            <button
              onClick={() => { setStatusFilter(v => v === "sakit" ? "semua" : "sakit"); }}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${statusFilter === "sakit" ? "bg-red-100 border-red-400 text-red-800" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
            >
              🏥 Sakit Saat Ini
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === "sakit" ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"}`}>{tortoises.filter(t => t.is_currently_sick).length}</span>
            </button>

            <button
              onClick={() => setIncompleteFilter(v => !v)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${incompleteFilter ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
            >
              ⚠️ Data Belum Lengkap
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${incompleteFilter ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>{tortoises.filter(t => t.status !== "mati" && t.status !== "terjual" && t.status !== "diarsipkan").filter(isIncomplete).length}</span>
            </button>

            {(search || statusFilter !== "semua" || genderFilter !== "semua" || morphFilter !== "semua" || shellTypeFilter !== "semua" || enclosureFilter || provenFilter !== "semua" || speciesFilter !== "semua" || weightFilter !== "semua" || shellLengthFilter !== "semua" || incompleteFilter) && (
              <button
                onClick={() => {
                  setSearch(""); setStatusFilter("semua"); setGenderFilter("semua");
                  setMorphFilter("semua"); setShellTypeFilter("semua"); setEnclosureFilter(null);
                  setProvenFilter("semua"); setSpeciesFilter("semua");
                  setWeightFilter("semua"); setShellLengthFilter("semua"); setIncompleteFilter(false);
                }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-destructive/40 bg-destructive/5 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
              >
                ✕ Reset Filter
              </button>
            )}
          </div>

          {enclosureFilter && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm">
              <span className="font-medium text-primary">Kandang: {enclosureFilter}</span>
              <button onClick={() => setEnclosureFilter(null)} className="ml-auto text-xs text-muted-foreground hover:text-destructive underline">Tampilkan Semua</button>
            </div>
          )}

          {isLoading ? (
            <CardSkeleton count={6} />
          ) : filtered.length === 0 ? (
            // Bedakan "belum ada data sama sekali" dari "tidak ada yang cocok dengan filter".
            // Sebelumnya keduanya menampilkan "Belum ada kura-kura terdaftar",
            // padahal datanya ada dan hanya tersaring.
            tortoises.length > 0 ? (
              <div className="text-center py-14 px-4">
                <p className="text-base font-semibold text-foreground">
                  Tidak ada kura yang cocok dengan filter
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ada {activeCount} kura aktif ({tortoises.length} termasuk mati, terjual,
                  dan diarsipkan), tapi tidak ada yang memenuhi kombinasi filter yang sedang aktif.
                </p>
                <button
                  onClick={() => {
                    setSearch(""); setStatusFilter("semua"); setGenderFilter("semua");
                    setMorphFilter("semua"); setShellTypeFilter("semua"); setEnclosureFilter(null);
                    setProvenFilter("semua"); setSpeciesFilter("semua");
                    setWeightFilter("semua"); setShellLengthFilter("semua"); setIncompleteFilter(false);
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  Hapus semua filter
                </button>
              </div>
            ) : (
              <EmptyState
                type="tortoise"
                onAction={perms.canCreate ? () => { setEditData(null); setShowForm(true); } : null}
              />
            )
          ) : viewMode === "semua" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...filtered].sort((a, b) => ({ aktif: 0, baby: 1, sakit: 2, breeding: 3, mati: 4, terjual: 5, diarsipkan: 6 }[a.status] ?? 0) - ({ aktif: 0, baby: 1, sakit: 2, breeding: 3, mati: 4, terjual: 5, diarsipkan: 6 }[b.status] ?? 0)).map((t) => (
                <TortoiseCard key={t.id} tortoise={t} healthStatus={getHealthStatus(t.id)} latestHealth={latestHealthMap[t.id]} parentIndicator={getParentIndicator(t)} isSick={sickTortoiseIds.has(t.id)} onEdit={perms.canEdit ? handleEdit : null} onDelete={ownerCanDelete ? handleDelete : null} onMove={perms.canEdit ? handleMove : null} onSell={perms.canCreate ? handleSell : null} />
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
                          {enclosure.startsWith("Baby") ? enclosure : `Kandang ${enclosure}`}
                        </button>
                        <Badge variant="secondary" className="text-xs">{items.length} ekor</Badge>
                        <div className="flex gap-1 text-xs text-muted-foreground">
                          <span>♂ {items.filter(t => t.gender === "jantan").length}</span>
                          <span>·</span>
                          <span>♀ {items.filter(t => t.gender === "betina").length}</span>
                        </div>
                        <div className="flex gap-1 text-xs">
                          <span className="text-green-600">{items.filter(t => t.status === "aktif").length}</span>
                          <span className="text-blue-600">·{items.filter(t => t.age_category === "baby").length}</span>
                          <span className="text-yellow-600">·{items.filter(t => t.status === "sakit").length}</span>
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
                           <TortoiseCard key={t.id} tortoise={t} healthStatus={getHealthStatus(t.id)} latestHealth={latestHealthMap[t.id]} parentIndicator={getParentIndicator(t)} isSick={sickTortoiseIds.has(t.id)} onEdit={perms.canEdit ? handleEdit : null} onDelete={ownerCanDelete ? handleDelete : null} onMove={perms.canEdit ? handleMove : null} onSell={perms.canCreate ? handleSell : null} />
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

          {enclosures.length === 0 ? (
            <EmptyState
              type="enclosure"
              onAction={canEditEnclosure ? () => { setEditingEnclosure(null); setShowEnclosureForm(true); } : null}
            />
          ) : (
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
          )}
        </TabsContent>

        {/* ══════════ TAB KARANTINA ══════════ */}
        <TabsContent value="karantina" className="mt-5 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{quarantinedTortoises.length} tortoise dalam karantina</p>
            <Select value={quarantineFilter} onValueChange={setQuarantineFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="yes">Sedang Karantina</SelectItem>
                <SelectItem value="no">Tidak Karantina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {quarantinedTortoises.length === 0 ? (
            <EmptyState
              type="health"
              customTitle="Tidak Ada Karantina"
              customDescription="Tidak ada tortoise yang sedang dikarantina saat ini"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quarantinedTortoises.map(t => (
                <Card key={t.id} className="border-amber-300 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span>{t.name}</span>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">Karantina</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">Alasan: {t.quarantine_reason || '-'}</p>
                    {t.quarantine_start_date && (
                      <p className="text-sm text-muted-foreground">
                        Mulai: {new Date(t.quarantine_start_date).toLocaleDateString('id-ID')}
                      </p>
                    )}
                    {t.quarantine_notes && (
                      <p className="text-xs text-muted-foreground">{t.quarantine_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ══════════ TAB KEMATIAN ══════════ */}
        <TabsContent value="kematian" className="mt-5 space-y-4">
          {(() => {
            const deadTortoises = tortoises.filter(t => t.status === "mati");
            // Gabungkan data deathRecord ke tortoise berdasarkan tortoise_id
            const deathMap = {};
            deathRecords.forEach(r => { if (r.tortoise_id) deathMap[r.tortoise_id] = r; });

            return (
              <>
                <p className="text-sm text-muted-foreground">{deadTortoises.length} catatan kematian</p>
                {deadTortoises.length === 0 ? (
                  <EmptyState
                    type="sop"
                    customTitle="Belum Ada Catatan Kematian"
                    customDescription="Belum ada catatan kematian tortoise"
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {deadTortoises.map(t => {
                      const dr = deathMap[t.id];
                      const deathDate = dr?.death_date || t.death_date;
                      const deathCause = dr?.cause_of_death || t.death_cause;
                      const recordedBy = dr?.recorded_by;
                      return (
                        <Card key={t.id} className="border-red-200 bg-red-50/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between">
                              <span>{t.name}</span>
                              <Badge variant="destructive" className="text-xs">Mati</Badge>
                            </CardTitle>
                            {t.code && <p className="text-xs text-muted-foreground font-mono">{t.code}</p>}
                          </CardHeader>
                          <CardContent className="space-y-1.5">
                            <p className="text-sm text-muted-foreground">
                              Kandang terakhir: <span className="text-foreground">{t.enclosure || "—"}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Tanggal kematian: <span className="text-foreground">
                                {deathDate ? new Date(deathDate).toLocaleDateString("id-ID") : "Tidak dicatat"}
                              </span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Penyebab: <span className="text-foreground">{deathCause || "—"}</span>
                            </p>
                            {recordedBy && (
                              <p className="text-xs text-muted-foreground">Dicatat oleh: {recordedBy}</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* ══════════ TAB TERJUAL ══════════ */}
        <TabsContent value="terjual" className="mt-5">
          <TortoiseTerjualTab tortoises={tortoises} isOwner={ownerCanDelete} />
        </TabsContent>

      </Tabs>

      {/* ── Dialogs ── */}
      {showSellWizard && (
        <SaleWizard open={showSellWizard} preSelectedTortoiseId={sellTarget?.id} onClose={(success) => {
          setShowSellWizard(false);
          setSellTarget(null);
          if (success) queryClient.invalidateQueries({ queryKey: ["tortoises"] });
        }} />
      )}
      {showForm && <TortoiseForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />}
      {moveTarget && <MoveEnclosureDialog tortoise={moveTarget} open={!!moveTarget} onClose={() => setMoveTarget(null)} onMoved={handleMoved} />}
      {renameEnclosure && <RenameEnclosureDialog open={!!renameEnclosure} onClose={() => setRenameEnclosure(null)} enclosureName={renameEnclosure.name} tortoiseIds={renameEnclosure.ids} />}
      {showEnclosureForm && (
        <EnclosureForm enclosure={editingEnclosure} onClose={() => setShowEnclosureForm(false)} onSaved={handleSaveEnclosure} />
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
    </div>
  );
}