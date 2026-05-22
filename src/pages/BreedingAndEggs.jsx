import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Egg, Thermometer, Droplets, AlertTriangle, Edit, Calendar } from "lucide-react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { id } from "date-fns/locale";
import BreedingForm from "@/components/breeding/BreedingForm";
import HatchDialog from "@/components/breeding/HatchDialog";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, getPerms } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import PageTooltip from "@/components/tutorial/PageTooltip";

const statusColors = {
  kawin: "bg-accent/10 text-accent border-accent/20",
  bertelur: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  inkubasi: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  menetas: "bg-primary/10 text-primary border-primary/20",
  gagal: "bg-destructive/10 text-destructive border-destructive/20",
};

function IncubatorForm({ incubator, onClose, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: incubator?.name || "",
    capacity_eggs: incubator?.capacity_eggs || "",
    temp_setting: incubator?.temp_setting || "",
    humidity_setting: incubator?.humidity_setting || "",
    brand: incubator?.brand || "",
    is_active: incubator?.is_active !== false,
    notes: incubator?.notes || "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      capacity_eggs: form.capacity_eggs ? Number(form.capacity_eggs) : undefined,
      temp_setting: form.temp_setting ? Number(form.temp_setting) : undefined,
      humidity_setting: form.humidity_setting ? Number(form.humidity_setting) : undefined,
    };
    if (incubator?.id) {
      await base44.entities.Incubator.update(incubator.id, data);
    } else {
      await base44.entities.Incubator.create(data);
    }
    qc.invalidateQueries({ queryKey: ["incubators"] });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Nama Inkubator <span className="text-red-500">*</span></Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Inkubator 1" className="mt-0.5" required />
        </div>
        <div>
          <Label className="text-xs">Kapasitas Telur</Label>
          <Input type="number" min={0} value={form.capacity_eggs} onChange={e => set("capacity_eggs", e.target.value)} placeholder="50" className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Suhu Setting (°C)</Label>
          <Input type="number" step="0.1" value={form.temp_setting} onChange={e => set("temp_setting", e.target.value)} placeholder="30.5" className="mt-0.5" />
        </div>
        <div>
          <Label className="text-xs">Kelembapan Setting (%)</Label>
          <Input type="number" step="1" min={0} max={100} value={form.humidity_setting} onChange={e => set("humidity_setting", e.target.value)} placeholder="80" className="mt-0.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Merk Inkubator</Label>
          <Input value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="Merk inkubator..." className="mt-0.5" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Catatan</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className="mt-0.5 resize-none" />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
          <Label className="text-sm">Inkubator Aktif</Label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button type="submit" className="flex-1" disabled={saving || !form.name}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

export default function BreedingAndEggs() {
  const queryClient = useQueryClient();
  const { role } = useCurrentUser();
  const perms = getPerms(role, "breeding");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [hatchBreeding, setHatchBreeding] = useState(null);
  const [editIncubator, setEditIncubator] = useState(null);
  const [showIncubatorForm, setShowIncubatorForm] = useState(false);
  const [activeTab, setActiveTab] = useState("pembiakan");

  const { data: breedings = [], isLoading: breedingLoading } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 200),
  });

  const { data: incubators = [], isLoading: incubatorLoading } = useQuery({
    queryKey: ["incubators"],
    queryFn: () => base44.entities.Incubator.list(),
  });

  if (!canAccess(role, "breeding")) return <AccessDenied />;

  const handleDelete = async (breeding) => {
    if (confirm("Hapus data pembiakan ini?")) {
      await base44.entities.Breeding.delete(breeding.id);
      queryClient.invalidateQueries({ queryKey: ["breedings"] });
    }
  };

  const today = new Date();

  // KALKULASI TELUR INKUBATOR DARI BREEDING DATA
  const calculateIncubatorEggs = (incubatorName) => {
    return breedings
      .filter(b => b.incubator_name === incubatorName && (b.status === "bertelur" || b.status === "inkubasi"))
      .reduce((sum, b) => sum + (b.egg_count || 0), 0);
  };

  const getClutchesInIncubator = (incName) =>
    breedings.filter(b => b.incubator_name === incName && (b.status === "inkubasi" || b.status === "bertelur"));

  const activeBreedings = breedings.filter(b => b.status !== "menetas" && b.status !== "gagal");
  const historyBreedings = breedings.filter(b => b.status === "menetas" || b.status === "gagal");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold">Breeding & Telur</h1>
            <PageTooltip page="breeding" />
          </div>
          <p className="text-muted-foreground mt-1">Kelola pembiakan, inkubasi telur, dan penetasan</p>
        </div>
        {perms.canCreate && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Data
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pembiakan">Pembiakan</TabsTrigger>
          <TabsTrigger value="telur">Telur & Inkubasi</TabsTrigger>
          <TabsTrigger value="inkubator">Inkubator</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>

        {/* TAB 1: PEMBIAKAN */}
        <TabsContent value="pembiakan" className="space-y-4">
          {breedingLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : breedings.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Egg className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Belum ada data pembiakan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {breedings.map((b) => {
                const active = b.status !== "menetas" && b.status !== "gagal";
                const startDate = b.estimated_hatch_date_start ? parseISO(b.estimated_hatch_date_start) : null;
                const endDate = b.estimated_hatch_date_end ? parseISO(b.estimated_hatch_date_end) : null;
                const daysToStart = startDate && active ? differenceInDays(startDate, today) : null;
                const daysToEnd = endDate && active ? differenceInDays(endDate, today) : null;

                const dayInRange = (inRange, start, end) => {
                  if (!inRange || !start || !end) return null;
                  const totalDays = differenceInDays(end, start);
                  const daysSinceStart = differenceInDays(today, start);
                  return daysSinceStart + 1;
                };

                const isMenetas = b.status === "menetas";
                const isGagal = b.status === "gagal";
                const isOverdue = active && daysToEnd !== null && daysToEnd < 0;
                const inHatchRange = active && daysToStart !== null && daysToEnd !== null && daysToStart <= 0 && daysToEnd >= 0;
                const beforeRange = active && daysToStart !== null && daysToStart > 0;
                
                const dayInHatchRange = dayInRange(inHatchRange, startDate, endDate);

                return (
                  <Card key={b.id} className={`p-5 hover:shadow-md transition-shadow group ${
                    isOverdue ? "border-red-400 bg-red-50" : 
                    inHatchRange ? "border-red-500 bg-red-100" : 
                    ""
                  }`}>
                    {b.photos?.length > 0 && (
                      <div className="flex gap-1.5 mb-3 overflow-x-auto">
                        {b.photos.slice(0, 4).map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border" />
                        ))}
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{b.male_name} × {b.female_name}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className={`text-[11px] capitalize ${statusColors[b.status] || ""}`}>
                            {b.status}
                          </Badge>
                          
                          {isMenetas && (
                            <Badge className="text-[11px] bg-gray-200 text-gray-700 border-gray-300 font-semibold">
                              ✅ Sudah menetas
                            </Badge>
                          )}
                          {isGagal && (
                            <Badge className="text-[11px] bg-gray-800 text-white border-gray-900 font-semibold">
                              ❌ Gagal menetas
                            </Badge>
                          )}
                          {active && inHatchRange && dayInHatchRange && (
                            <Badge className="text-[11px] bg-red-600 text-white border-red-700 font-bold animate-pulse px-3 py-1">
                              🔴 DALAM MASA PENETASAN! Hari ke-{dayInHatchRange}
                            </Badge>
                          )}
                          {active && isOverdue && (
                            <Badge className="text-[11px] bg-red-800 text-white border-red-900 font-bold px-3 py-1">
                              ⚠️ Melewati estimasi! Segera cek telur.
                            </Badge>
                          )}
                          {active && beforeRange && daysToStart !== null && daysToStart <= 7 && (
                            <Badge className="text-[11px] bg-green-600 text-white border-green-700 font-semibold px-3 py-1">
                              🥚 Mulai menetas dalam {daysToStart} hari
                            </Badge>
                          )}
                          {active && beforeRange && daysToStart !== null && daysToStart > 7 && (
                            <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              ⏳ {daysToStart} hari lagi
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {perms.canEdit && b.status !== "menetas" && b.status !== "gagal" && (
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Tandai Menetas"
                            onClick={() => setHatchBreeding(b)}
                          >
                            <Egg className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {perms.canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditData(b); setShowForm(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {perms.canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
                      {b.egg_laying_date && (
                        <div>
                          <p className="text-muted-foreground">Bertelur</p>
                          <p className="font-medium">{format(new Date(b.egg_laying_date), "d MMM yyyy", { locale: id })}</p>
                        </div>
                      )}
                      {b.egg_count > 0 && (
                        <div>
                          <p className="text-muted-foreground">Telur</p>
                          <p className="font-medium">{b.egg_count} butir</p>
                        </div>
                      )}
                      {(b.estimated_hatch_date_start || b.estimated_hatch_date_end || b.estimated_hatch_date) && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Perkiraan Menetas</p>
                          <p className={`font-medium text-xs ${inHatchRange ? "text-green-700" : ""}`}>
                            {b.estimated_hatch_date_start
                              ? `${format(new Date(b.estimated_hatch_date_start), "d MMM", { locale: id })} s/d ${b.estimated_hatch_date_end ? format(new Date(b.estimated_hatch_date_end), "d MMM yyyy", { locale: id }) : "-"}`
                              : b.estimated_hatch_date ? format(new Date(b.estimated_hatch_date), "d MMM yyyy", { locale: id }) : "-"
                            }
                          </p>
                        </div>
                      )}
                      {b.incubator_name && (
                        <div>
                          <p className="text-muted-foreground">Inkubator</p>
                          <p className="font-medium">{b.incubator_name}</p>
                        </div>
                      )}
                      {b.status === "menetas" && b.hatched_count > 0 && (
                        <div>
                          <p className="text-muted-foreground">Menetas</p>
                          <p className="font-medium text-primary">{b.hatched_count} ekor 🐢</p>
                        </div>
                      )}
                      {b.status === "menetas" && b.failed_count > 0 && (
                        <div>
                          <p className="text-muted-foreground">Gagal</p>
                          <p className="font-medium text-destructive">{b.failed_count} butir ❌</p>
                        </div>
                      )}
                      {b.incubation_temp > 0 && (
                        <div>
                          <p className="text-muted-foreground">Suhu</p>
                          <p className="font-medium">{b.incubation_temp}°C</p>
                        </div>
                      )}
                      {b.hatch_date && b.status === "menetas" && (
                        <div>
                          <p className="text-muted-foreground">Tgl Menetas</p>
                          <p className="font-medium">{format(new Date(b.hatch_date), "d MMM yyyy", { locale: id })}</p>
                        </div>
                      )}
                    </div>
                    {b.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{b.notes}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: TELUR & INKUBASI */}
        <TabsContent value="telur" className="space-y-4">
          {breedingLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : activeBreedings.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Egg className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Tidak ada telur aktif dalam inkubasi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeBreedings.map((b) => {
                const startDate = b.estimated_hatch_date_start ? parseISO(b.estimated_hatch_date_start) : null;
                const endDate = b.estimated_hatch_date_end ? parseISO(b.estimated_hatch_date_end) : null;
                const daysToStart = startDate ? differenceInDays(startDate, today) : null;
                const daysToEnd = endDate ? differenceInDays(endDate, today) : null;
                const inHatchRange = daysToStart !== null && daysToEnd !== null && daysToStart <= 0 && daysToEnd >= 0;
                const dayInRange = inHatchRange ? differenceInDays(today, startDate) + 1 : null;

                return (
                  <Card key={b.id} className={`p-5 hover:shadow-md transition-shadow ${
                    daysToEnd !== null && daysToEnd < 0 ? "border-red-400 bg-red-50" : 
                    inHatchRange ? "border-red-500 bg-red-100" : 
                    ""
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{b.male_name} × {b.female_name}</h3>
                        <Badge variant="outline" className={`text-[11px] capitalize mt-2 ${statusColors[b.status] || ""}`}>
                          {b.status}
                        </Badge>
                      </div>
                      <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
                        {b.egg_count} butir
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      {b.egg_laying_date && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tanggal Bertelur</span>
                          <span className="font-medium">{format(new Date(b.egg_laying_date), "d MMM yyyy", { locale: id })}</span>
                        </div>
                      )}
                      {b.incubator_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Inkubator</span>
                          <span className="font-medium">{b.incubator_name}</span>
                        </div>
                      )}
                      {b.estimated_hatch_date_start && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimasi Menetas</span>
                          <span className={`font-medium ${inHatchRange ? "text-red-600 font-bold" : ""}`}>
                            {format(new Date(b.estimated_hatch_date_start), "d MMM")} - {b.estimated_hatch_date_end ? format(new Date(b.estimated_hatch_date_end), "d MMM yyyy", { locale: id }) : "-"}
                          </span>
                        </div>
                      )}
                      {inHatchRange && dayInRange && (
                        <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                          <p className="text-red-700 font-bold">🔴 Hari ke-{dayInRange} dari masa penetasan</p>
                        </div>
                      )}
                      {daysToStart !== null && daysToStart > 0 && (
                        <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                          <p className="text-green-700 font-semibold">🥚 {daysToStart} hari lagi mulai menetas</p>
                        </div>
                      )}
                      {daysToEnd !== null && daysToEnd < 0 && (
                        <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                          <p className="text-red-700 font-bold">⚠️ Melewati estimasi {Math.abs(daysToEnd)} hari!</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: INKUBATOR */}
        <TabsContent value="inkubator" className="space-y-4">
          {incubatorLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : incubators.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
              <Egg className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Belum ada inkubator terdaftar</p>
              <p className="text-sm mt-1">Tambahkan inkubator untuk mulai memantau</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {incubators.map(inc => {
                // KALKULASI REAL-TIME DARI BREEDING
                const calculatedEggs = calculateIncubatorEggs(inc.name);
                const pct = inc.capacity_eggs && inc.capacity_eggs > 0 
                  ? Math.min(100, Math.round((calculatedEggs / inc.capacity_eggs) * 100)) 
                  : 0;
                const isFull = inc.capacity_eggs && calculatedEggs >= inc.capacity_eggs;
                const isNearFull = !isFull && pct >= 80;
                const clutches = getClutchesInIncubator(inc.name);

                return (
                  <Card key={inc.id} className={`border-2 ${isFull ? "border-red-300 bg-red-50/30" : isNearFull ? "border-amber-300 bg-amber-50/30" : "border-border"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Egg className="w-5 h-5 text-amber-600" />
                            {inc.name}
                          </CardTitle>
                          {inc.brand && <p className="text-xs text-muted-foreground mt-0.5">{inc.brand}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={inc.is_active !== false ? "default" : "secondary"} className={inc.is_active !== false ? "bg-green-100 text-green-800 border-green-200" : ""}>
                            {inc.is_active !== false ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditIncubator(inc); setShowIncubatorForm(true); }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        {inc.temp_setting && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-100">
                            <Thermometer className="w-4 h-4 text-orange-500" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Suhu Setting</p>
                              <p className="text-sm font-bold text-orange-700">{inc.temp_setting}°C</p>
                            </div>
                          </div>
                        )}
                        {inc.humidity_setting && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                            <Droplets className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Kelembapan</p>
                              <p className="text-sm font-bold text-blue-700">{inc.humidity_setting}%</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Kapasitas - READ ONLY dari kalkulasi Breeding */}
                      {inc.capacity_eggs > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Kapasitas Telur</span>
                            <span className={`font-bold ${isFull ? "text-red-600" : isNearFull ? "text-amber-600" : "text-foreground"}`}>
                              {calculatedEggs} / {inc.capacity_eggs}
                            </span>
                          </div>
                          <Progress value={pct} className={`h-2.5 ${isFull ? "[&>div]:bg-red-500" : isNearFull ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-600"}`} />
                          {isFull && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              🔴 Inkubator penuh! Tidak bisa tambah telur.
                            </div>
                          )}
                          {isNearFull && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              ⚠️ Inkubator hampir penuh ({pct}%)
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clutch list */}
                      {clutches.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Clutch aktif ({clutches.length}):</p>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {clutches.map(c => (
                              <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50 text-xs">
                                <span className="font-medium">{c.male_name} × {c.female_name}</span>
                                <span className="text-muted-foreground">{c.egg_count} butir</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">Tidak ada clutch aktif</p>
                      )}

                      {inc.notes && (
                        <p className="text-xs text-muted-foreground border-t pt-2">{inc.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: RIWAYAT PENETASAN */}
        <TabsContent value="riwayat" className="space-y-4">
          {breedingLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : historyBreedings.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Egg className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Belum ada riwayat penetasan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {historyBreedings.map((b) => (
                <Card key={b.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{b.male_name} × {b.female_name}</h3>
                      <Badge variant="outline" className={`text-[11px] capitalize mt-2 ${statusColors[b.status] || ""}`}>
                        {b.status}
                      </Badge>
                    </div>
                    {b.hatch_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(b.hatch_date), "d MMM yyyy", { locale: id })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
                    {b.egg_laying_date && (
                      <div>
                        <p className="text-muted-foreground">Bertelur</p>
                        <p className="font-medium">{format(new Date(b.egg_laying_date), "d MMM yyyy", { locale: id })}</p>
                      </div>
                    )}
                    {b.egg_count > 0 && (
                      <div>
                        <p className="text-muted-foreground">Total Telur</p>
                        <p className="font-medium">{b.egg_count} butir</p>
                      </div>
                    )}
                    {b.hatched_count > 0 && (
                      <div>
                        <p className="text-muted-foreground">Menetas</p>
                        <p className="font-medium text-primary">{b.hatched_count} ekor 🐢</p>
                      </div>
                    )}
                    {b.failed_count > 0 && (
                      <div>
                        <p className="text-muted-foreground">Gagal</p>
                        <p className="font-medium text-destructive">{b.failed_count} butir ❌</p>
                      </div>
                    )}
                    {b.egg_count > 0 && b.hatched_count >= 0 && (
                      <div>
                        <p className="text-muted-foreground">Hatch Rate</p>
                        <p className="font-medium">{Math.round((b.hatched_count / b.egg_count) * 100)}%</p>
                      </div>
                    )}
                  </div>
                  {b.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{b.notes}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showForm && (
        <BreedingForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />
      )}
      <HatchDialog
        open={!!hatchBreeding}
        onClose={() => setHatchBreeding(null)}
        breeding={hatchBreeding}
      />

      <Dialog open={showIncubatorForm} onOpenChange={() => setShowIncubatorForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editIncubator?.id ? "Edit Inkubator" : "Tambah Inkubator"}</DialogTitle>
          </DialogHeader>
          <IncubatorForm
            incubator={editIncubator}
            onClose={() => setShowIncubatorForm(false)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["incubators"] })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}