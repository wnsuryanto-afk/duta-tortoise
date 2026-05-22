import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Thermometer, Droplets, Egg, Edit, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

function IncubatorForm({ incubator, onClose, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: incubator?.name || "",
    capacity_eggs: incubator?.capacity_eggs || "",
    current_eggs: incubator?.current_eggs || 0,
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
      current_eggs: Number(form.current_eggs) || 0,
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
          <Label className="text-xs">Telur Saat Ini</Label>
          <Input type="number" min={0} value={form.current_eggs} onChange={e => set("current_eggs", e.target.value)} className="mt-0.5" />
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
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

export default function IncubatorPage() {
  const qc = useQueryClient();
  const [editIncubator, setEditIncubator] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: incubators = [], isLoading } = useQuery({
    queryKey: ["incubators"],
    queryFn: () => base44.entities.Incubator.list(),
  });

  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 100),
  });

  const getClutchesInIncubator = (incName) =>
    breedings.filter(b => b.incubator_name === incName && (b.status === "inkubasi" || b.status === "bertelur"));

  const fillPct = (inc) => {
    if (!inc.capacity_eggs || inc.capacity_eggs === 0) return 0;
    return Math.min(100, Math.round(((inc.current_eggs || 0) / inc.capacity_eggs) * 100));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Inkubator Telur</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau kapasitas dan status inkubator</p>
        </div>
        <Button onClick={() => { setEditIncubator(null); setShowForm(true); }} className="gap-2">
          <Egg className="w-4 h-4" /> Tambah Inkubator
        </Button>
      </div>

      {isLoading ? (
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
            const pct = fillPct(inc);
            const isFull = inc.capacity_eggs && inc.current_eggs >= inc.capacity_eggs;
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
                      <Badge variant={inc.is_active ? "default" : "secondary"} className={inc.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}>
                        {inc.is_active ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditIncubator(inc); setShowForm(true); }}>
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

                  {/* Kapasitas */}
                  {inc.capacity_eggs > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Kapasitas Telur</span>
                        <span className={`font-bold ${isFull ? "text-red-600" : isNearFull ? "text-amber-600" : "text-foreground"}`}>
                          {inc.current_eggs || 0} / {inc.capacity_eggs}
                        </span>
                      </div>
                      <Progress value={pct} className={`h-2.5 ${isFull ? "[&>div]:bg-red-500" : isNearFull ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-600"}`} />
                      {isFull && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Inkubator sudah penuh!
                        </div>
                      )}
                      {isNearFull && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Hampir penuh ({pct}%)
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

      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editIncubator?.id ? "Edit Inkubator" : "Tambah Inkubator"}</DialogTitle>
          </DialogHeader>
          <IncubatorForm
            incubator={editIncubator}
            onClose={() => setShowForm(false)}
            onSaved={() => qc.invalidateQueries({ queryKey: ["incubators"] })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}