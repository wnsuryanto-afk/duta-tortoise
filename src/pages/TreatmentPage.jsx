import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle2, Circle, CalendarClock, ListChecks, Pencil, Trash2, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";

const FREQ_LABELS = { harian: "Harian", mingguan: "Mingguan", bulanan: "Bulanan", tahunan: "Tahunan" };
const FREQ_COLORS = {
  harian:   "bg-blue-100 text-blue-700",
  mingguan: "bg-green-100 text-green-700",
  bulanan:  "bg-orange-100 text-orange-700",
  tahunan:  "bg-purple-100 text-purple-700",
};

function getPeriodRange(freq) {
  const now = new Date();
  if (freq === "harian")   return { start: new Date(format(now,"yyyy-MM-dd")), end: new Date(format(now,"yyyy-MM-dd") + "T23:59:59") };
  if (freq === "mingguan") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  if (freq === "bulanan")  return { start: startOfMonth(now), end: endOfMonth(now) };
  if (freq === "tahunan")  return { start: startOfYear(now), end: endOfYear(now) };
  return { start: now, end: now };
}

export default function TreatmentPage() {
  const qc = useQueryClient();
  const { user, role } = useCurrentUser();
  const canEdit = ["admin", "owner", "manajer"].includes(role);

  const { data: schedules = [] } = useQuery({
    queryKey: ["treatment-schedules"],
    queryFn: () => base44.entities.TreatmentSchedule.list("-created_date", 100),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["treatment-logs"],
    queryFn: () => base44.entities.TreatmentLog.list("-done_date", 500),
  });
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-active"],
    queryFn: () => base44.entities.Tortoise.filter({ status: "aktif" }, "name", 200),
  });

  const [tab, setTab] = useState("jadwal");
  const [freqFilter, setFreqFilter] = useState("semua");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [logDialog, setLogDialog] = useState(null); // { schedule, tortoise }
  const [logNote, setLogNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "", frequency: "mingguan", apply_to_all: true,
    tortoise_ids: [], tortoise_names: [], notes: "",
  });

  const openForm = (s = null) => {
    setEditData(s);
    setForm(s ? {
      title: s.title, frequency: s.frequency,
      apply_to_all: s.apply_to_all ?? true,
      tortoise_ids: s.tortoise_ids || [],
      tortoise_names: s.tortoise_names || [],
      notes: s.notes || "",
    } : { title: "", frequency: "mingguan", apply_to_all: true, tortoise_ids: [], tortoise_names: [], notes: "" });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    if (editData?.id) {
      await base44.entities.TreatmentSchedule.update(editData.id, data);
    } else {
      const created = await base44.entities.TreatmentSchedule.create(data);
      // Auto-insert SOP task
      await base44.entities.SOPTask.create({
        title: `[Treatment] ${form.title}`,
        category: "pemeriksaan",
        points: 15,
        frequency: form.frequency === "harian" ? "harian" : form.frequency === "mingguan" ? "mingguan" : "bulanan",
        is_active: true,
      });
    }
    qc.invalidateQueries({ queryKey: ["treatment-schedules"] });
    qc.invalidateQueries({ queryKey: ["sop-tasks"] });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (s) => {
    if (confirm(`Hapus jadwal "${s.title}"?`)) {
      await base44.entities.TreatmentSchedule.delete(s.id);
      qc.invalidateQueries({ queryKey: ["treatment-schedules"] });
    }
  };

  const handleLogDone = async () => {
    if (!logDialog) return;
    setSaving(true);
    await base44.entities.TreatmentLog.create({
      schedule_id: logDialog.schedule.id,
      schedule_title: logDialog.schedule.title,
      tortoise_id: logDialog.tortoise?.id || "",
      tortoise_name: logDialog.tortoise?.name || "Semua",
      done_date: format(new Date(), "yyyy-MM-dd"),
      done_by: user?.full_name || user?.email || "",
      notes: logNote,
    });
    qc.invalidateQueries({ queryKey: ["treatment-logs"] });
    setLogDialog(null);
    setLogNote("");
    setSaving(false);
  };

  const toggleTortoise = (t) => {
    const ids = form.tortoise_ids.includes(t.id)
      ? form.tortoise_ids.filter(i => i !== t.id)
      : [...form.tortoise_ids, t.id];
    const names = tortoises.filter(x => ids.includes(x.id)).map(x => x.name);
    setForm(p => ({ ...p, tortoise_ids: ids, tortoise_names: names }));
  };

  const filtered = freqFilter === "semua" ? schedules : schedules.filter(s => s.frequency === freqFilter);

  // Progress per jadwal dalam periode aktif
  const getProgress = (schedule) => {
    const range = getPeriodRange(schedule.frequency);
    const periodLogs = logs.filter(l =>
      l.schedule_id === schedule.id &&
      isWithinInterval(parseISO(l.done_date), range)
    );
    const targetTortoises = schedule.apply_to_all
      ? tortoises
      : tortoises.filter(t => (schedule.tortoise_ids || []).includes(t.id));
    const doneTortoises = [...new Set(periodLogs.map(l => l.tortoise_name))];
    return { done: doneTortoises.length, total: targetTortoises.length, logs: periodLogs, targetTortoises };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Jadwal Treatment</h1>
          <p className="text-muted-foreground text-sm">Mandi, timbang, obat cacing, dan perawatan rutin</p>
        </div>
        {canEdit && (
          <Button onClick={() => openForm()} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Jadwal
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="jadwal">Jadwal & Progress</TabsTrigger>
          <TabsTrigger value="log">Log Treatment</TabsTrigger>
        </TabsList>

        <TabsContent value="jadwal" className="mt-4 space-y-4">
          {/* Freq filter */}
          <div className="flex flex-wrap gap-1.5">
            {["semua", "harian", "mingguan", "bulanan", "tahunan"].map(f => (
              <button key={f} onClick={() => setFreqFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${freqFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                {f === "semua" ? "Semua" : FREQ_LABELS[f]}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card className="py-16 text-center text-muted-foreground">
              <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada jadwal treatment</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map(schedule => {
                const prog = getProgress(schedule);
                const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                const donedTortoiseNames = new Set(
                  logs.filter(l => {
                    const range = getPeriodRange(schedule.frequency);
                    return l.schedule_id === schedule.id && isWithinInterval(parseISO(l.done_date), range);
                  }).map(l => l.tortoise_name)
                );

                return (
                  <Card key={schedule.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{schedule.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FREQ_COLORS[schedule.frequency]}`}>
                            {FREQ_LABELS[schedule.frequency]}
                          </span>
                          {schedule.apply_to_all && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Semua Kura</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Progress periode ini: {prog.done}/{prog.total} kura-kura selesai ({pct}%)
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(schedule)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(schedule)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>

                    {/* List kura-kura */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {prog.targetTortoises.map(t => {
                        const isDone = donedTortoiseNames.has(t.name);
                        return (
                          <button
                            key={t.id}
                            onClick={() => !isDone && setLogDialog({ schedule, tortoise: t })}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                              isDone
                                ? "bg-green-50 border-green-200 text-green-700 cursor-default"
                                : "bg-background border-border hover:bg-muted cursor-pointer"
                            }`}
                          >
                            {isDone
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              : <Circle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            }
                            <span className="truncate font-medium">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4 space-y-2">
          {logs.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">Belum ada log treatment</p>
          ) : (
            logs.slice(0, 100).map(l => (
              <Card key={l.id} className="p-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{l.schedule_title}</p>
                  <p className="text-xs text-muted-foreground">{l.tortoise_name}{l.done_by ? ` · oleh ${l.done_by}` : ""}{l.notes ? ` · ${l.notes}` : ""}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {format(parseISO(l.done_date), "d MMM yyyy", { locale: id })}
                </span>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editData ? "Edit Jadwal" : "Tambah Jadwal Treatment"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Nama Treatment *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
                placeholder="cth: Mandi rutin, Obat cacing, Timbang" required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Frekuensi</Label>
              <Select value={form.frequency} onValueChange={v => setForm(p => ({...p, frequency: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="harian">Harian</SelectItem>
                  <SelectItem value="mingguan">Mingguan</SelectItem>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="tahunan">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="apply_all" checked={form.apply_to_all}
                onChange={e => setForm(p => ({...p, apply_to_all: e.target.checked}))}
                className="w-4 h-4" />
              <Label htmlFor="apply_all" className="text-xs cursor-pointer">Berlaku untuk semua kura-kura aktif</Label>
            </div>
            {!form.apply_to_all && (
              <div>
                <Label className="text-xs mb-2 block">Pilih Kura-kura</Label>
                <div className="max-h-40 overflow-y-auto border rounded-xl p-2 space-y-1">
                  {tortoises.map(t => (
                    <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted text-xs">
                      <input type="checkbox" checked={form.tortoise_ids.includes(t.id)}
                        onChange={() => toggleTortoise(t)} className="w-3 h-3" />
                      {t.name} {t.code ? `(${t.code})` : ""}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">Catatan</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                placeholder="Opsional..." className="mt-1" />
            </div>
            {!editData && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                ℹ️ Jadwal baru akan otomatis ditambahkan ke SOP sebagai task.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log done dialog */}
      <Dialog open={!!logDialog} onOpenChange={o => !o && setLogDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Tandai Selesai
            </DialogTitle>
          </DialogHeader>
          {logDialog && (
            <div className="space-y-3 pt-1">
              <div className="bg-muted/40 rounded-xl p-3 text-sm">
                <p><span className="text-muted-foreground">Treatment:</span> <strong>{logDialog.schedule.title}</strong></p>
                <p className="mt-1"><span className="text-muted-foreground">Kura-kura:</span> <strong>{logDialog.tortoise?.name}</strong></p>
              </div>
              <div>
                <Label className="text-xs">Catatan (opsional)</Label>
                <Input value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="Kondisi, dosis, dll..." className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground">Dicatat oleh: {user?.full_name || user?.email}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setLogDialog(null)}>Batal</Button>
                <Button className="flex-1 gap-2" onClick={handleLogDone} disabled={saving}>
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? "Menyimpan..." : "Selesai"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}