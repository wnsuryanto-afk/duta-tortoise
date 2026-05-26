import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Thermometer, Droplets, Plus, AlertTriangle, CheckCircle2, Settings, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";

const alarmLabels = {
  normal:          { label: "Normal",         color: "bg-green-100 text-green-700" },
  suhu_tinggi:     { label: "Suhu Tinggi",    color: "bg-red-100 text-red-700" },
  suhu_rendah:     { label: "Suhu Rendah",    color: "bg-blue-100 text-blue-700" },
  humidity_tinggi: { label: "Lembab Tinggi",  color: "bg-orange-100 text-orange-700" },
  humidity_rendah: { label: "Lembab Rendah",  color: "bg-yellow-100 text-yellow-700" },
};

function ReadingForm({ incubators, user, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    incubator_id: "",
    incubator_name: "",
    date_time: new Date().toISOString().slice(0, 16),
    temperature_actual: "",
    humidity_actual: "",
    recorded_by: user?.full_name || user?.email || "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedInc = incubators.find(i => i.id === form.incubator_id);

  const getAlarmType = () => {
    const temp = Number(form.temperature_actual);
    const hum = Number(form.humidity_actual);
    if (!selectedInc || !temp || !hum) return "normal";
    if (temp > (selectedInc.temp_max_alarm ?? 32)) return "suhu_tinggi";
    if (temp < (selectedInc.temp_min_alarm ?? 31)) return "suhu_rendah";
    if (hum > (selectedInc.humidity_max_alarm ?? 90)) return "humidity_tinggi";
    if (hum < (selectedInc.humidity_min_alarm ?? 70)) return "humidity_rendah";
    return "normal";
  };

  const alarmType = getAlarmType();
  const alarmTriggered = alarmType !== "normal";

  const handleSave = async () => {
    if (!form.incubator_id || !form.temperature_actual || !form.humidity_actual) {
      toast.error("Lengkapi data inkubator, suhu, dan kelembapan");
      return;
    }
    setSaving(true);
    await base44.entities.IncubatorReading.create({
      ...form,
      temperature_actual: Number(form.temperature_actual),
      humidity_actual: Number(form.humidity_actual),
      alarm_triggered: alarmTriggered,
      alarm_type: alarmType,
    });
    qc.invalidateQueries({ queryKey: ["incubator-readings"] });
    setSaving(false);
    toast.success("Pembacaan suhu berhasil dicatat");
    onClose();
  };

  return (
    <div className="space-y-4 mt-2">
      <div>
        <Label>Inkubator *</Label>
        <Select
          value={form.incubator_id}
          onValueChange={v => {
            const inc = incubators.find(i => i.id === v);
            setForm(p => ({ ...p, incubator_id: v, incubator_name: inc?.name || "" }));
          }}
        >
          <SelectTrigger><SelectValue placeholder="Pilih inkubator" /></SelectTrigger>
          <SelectContent>
            {incubators.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedInc && (
        <div className="p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground">
          Target: Suhu {selectedInc.temp_setting || "—"}°C · Kelembapan {selectedInc.humidity_setting || "—"}%
          &nbsp;|&nbsp; Alarm: {selectedInc.temp_min_alarm ?? 31}–{selectedInc.temp_max_alarm ?? 32}°C, {selectedInc.humidity_min_alarm ?? 70}–{selectedInc.humidity_max_alarm ?? 90}%
        </div>
      )}

      <div>
        <Label>Waktu Pencatatan *</Label>
        <Input
          type="datetime-local"
          value={form.date_time}
          onChange={e => setForm(p => ({ ...p, date_time: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5" /> Suhu Aktual (°C) *</Label>
          <Input
            type="number"
            step="0.1"
            value={form.temperature_actual}
            onChange={e => setForm(p => ({ ...p, temperature_actual: e.target.value }))}
            placeholder="30.5"
          />
        </div>
        <div>
          <Label className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" /> Kelembapan (%) *</Label>
          <Input
            type="number"
            step="0.1"
            value={form.humidity_actual}
            onChange={e => setForm(p => ({ ...p, humidity_actual: e.target.value }))}
            placeholder="80"
          />
        </div>
      </div>

      {alarmTriggered && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          ⚠ Peringatan: <strong>{alarmLabels[alarmType]?.label}</strong> — Segera periksa inkubator!
        </div>
      )}

      <div>
        <Label>Dicatat Oleh</Label>
        <Input value={form.recorded_by} onChange={e => setForm(p => ({ ...p, recorded_by: e.target.value }))} />
      </div>

      <div>
        <Label>Catatan</Label>
        <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Pembacaan"}
        </Button>
      </div>
    </div>
  );
}

export default function IncubatorReadingPage() {
  const { user } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [filterIncubator, setFilterIncubator] = useState("all");

  const { data: incubators = [] } = useQuery({
    queryKey: ["incubators"],
    queryFn: () => base44.entities.Incubator.list(),
  });

  const { data: readings = [], isLoading } = useQuery({
    queryKey: ["incubator-readings"],
    queryFn: () => base44.entities.IncubatorReading.list("-date_time", 200),
  });

  const filtered = useMemo(() => {
    if (filterIncubator === "all") return readings;
    return readings.filter(r => r.incubator_id === filterIncubator);
  }, [readings, filterIncubator]);

  // Per-incubator latest reading
  const latestByIncubator = useMemo(() => {
    const map = {};
    readings.forEach(r => {
      if (!map[r.incubator_id] || r.date_time > map[r.incubator_id].date_time) {
        map[r.incubator_id] = r;
      }
    });
    return map;
  }, [readings]);

  const alarmCount = readings.filter(r => r.alarm_triggered).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Monitor Inkubator</h1>
          <p className="text-muted-foreground mt-1">Catat & pantau suhu dan kelembapan inkubator</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Catat Pembacaan
        </Button>
      </div>

      {/* Incubator status cards */}
      {incubators.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {incubators.filter(i => i.is_active !== false).map(inc => {
            const latest = latestByIncubator[inc.id];
            const hasAlarm = latest?.alarm_triggered;
            return (
              <Card key={inc.id} className={`p-4 ${hasAlarm ? "border-red-300 bg-red-50/30" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{inc.name}</p>
                    <p className="text-xs text-muted-foreground">{inc.brand || "—"}</p>
                  </div>
                  {hasAlarm
                    ? <AlertTriangle className="w-5 h-5 text-red-500" />
                    : <CheckCircle2 className="w-5 h-5 text-green-500" />
                  }
                </div>
                {latest ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-background rounded-lg text-center">
                      <Thermometer className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                      <p className="text-lg font-bold">{latest.temperature_actual}°C</p>
                      <p className="text-[10px] text-muted-foreground">Target: {inc.temp_setting || "—"}°C</p>
                    </div>
                    <div className="p-2 bg-background rounded-lg text-center">
                      <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg font-bold">{latest.humidity_actual}%</p>
                      <p className="text-[10px] text-muted-foreground">Target: {inc.humidity_setting || "—"}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Belum ada pembacaan</p>
                )}
                {latest && (
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    {format(new Date(latest.date_time), "d MMM HH:mm", { locale: id })} · oleh {latest.recorded_by}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {alarmCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" />
          <strong>{alarmCount} pembacaan</strong> menunjukkan kondisi di luar batas normal
        </div>
      )}

      {/* Filter & list */}
      <div className="flex items-center gap-3">
        <Select value={filterIncubator} onValueChange={setFilterIncubator}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Inkubator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Inkubator</SelectItem>
            {incubators.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Thermometer className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">Belum ada pembacaan</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const alarm = alarmLabels[r.alarm_type] || alarmLabels.normal;
            return (
              <Card key={r.id} className={`px-4 py-3 ${r.alarm_triggered ? "border-red-200 bg-red-50/20" : ""}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{r.incubator_name}</span>
                      <Badge className={`text-[11px] ${alarm.color}`}>{alarm.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.date_time ? format(new Date(r.date_time), "d MMM yyyy HH:mm", { locale: id }) : "—"}
                      {r.recorded_by && ` · ${r.recorded_by}`}
                    </p>
                    {r.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{r.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Thermometer className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold">{r.temperature_actual}°C</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold">{r.humidity_actual}%</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pembacaan Inkubator</DialogTitle>
          </DialogHeader>
          <ReadingForm incubators={incubators} user={user} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}