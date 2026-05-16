import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const categoryColors = {
  pakan: "bg-green-100 text-green-700",
  kebersihan: "bg-blue-100 text-blue-700",
  pemeriksaan: "bg-amber-100 text-amber-700",
  breeding: "bg-purple-100 text-purple-700",
  administrasi: "bg-gray-100 text-gray-700",
  lainnya: "bg-muted text-muted-foreground",
};

const DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

const DEFAULT_FORM = {
  title: "", description: "", category: "lainnya", points: 10, frequency: "harian",
  deadline_time: "", is_active: true,
  weekly_days: [], monthly_dates: [],
  target_enclosures: [], target_tortoise_ids: [], target_tortoise_names: [],
};

function ToggleChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
    >
      {label}
    </button>
  );
}

export default function SOPTaskManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [enclosureInput, setEnclosureInput] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["sop-tasks-all"],
    queryFn: () => base44.entities.SOPTask.list("-created_date", 200),
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 300),
  });

  const enclosures = [...new Set(tortoises.map(t => t.enclosure).filter(Boolean))].sort();

  const openNew = () => { setForm(DEFAULT_FORM); setEditData(null); setEnclosureInput(""); setShowForm(true); };
  const openEdit = (t) => {
    setForm({
      ...DEFAULT_FORM,
      ...t,
      weekly_days: t.weekly_days || [],
      monthly_dates: t.monthly_dates || [],
      target_enclosures: t.target_enclosures || [],
      target_tortoise_ids: t.target_tortoise_ids || [],
      target_tortoise_names: t.target_tortoise_names || [],
    });
    setEditData(t);
    setShowForm(true);
  };

  const toggleDay = (day) => {
    setForm(p => ({
      ...p,
      weekly_days: p.weekly_days.includes(day) ? p.weekly_days.filter(d => d !== day) : [...p.weekly_days, day],
    }));
  };

  const toggleMonthDate = (date) => {
    setForm(p => ({
      ...p,
      monthly_dates: p.monthly_dates.includes(date) ? p.monthly_dates.filter(d => d !== date) : [...p.monthly_dates, date],
    }));
  };

  const toggleEnclosure = (enc) => {
    setForm(p => ({
      ...p,
      target_enclosures: p.target_enclosures.includes(enc) ? p.target_enclosures.filter(e => e !== enc) : [...p.target_enclosures, enc],
    }));
  };

  const toggleTortoise = (t) => {
    setForm(p => {
      const ids = p.target_tortoise_ids || [];
      if (ids.includes(t.id)) {
        return {
          ...p,
          target_tortoise_ids: ids.filter(id => id !== t.id),
          target_tortoise_names: (p.target_tortoise_names || []).filter(n => n !== t.name),
        };
      }
      return {
        ...p,
        target_tortoise_ids: [...ids, t.id],
        target_tortoise_names: [...(p.target_tortoise_names || []), t.name],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, points: parseInt(form.points) || 0 };
    if (editData) await base44.entities.SOPTask.update(editData.id, data);
    else await base44.entities.SOPTask.create(data);
    queryClient.invalidateQueries({ queryKey: ["sop-tasks-all"] });
    queryClient.invalidateQueries({ queryKey: ["sop-tasks"] });
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (task) => {
    if (confirm(`Hapus task "${task.title}"?`)) {
      await base44.entities.SOPTask.delete(task.id);
      queryClient.invalidateQueries({ queryKey: ["sop-tasks-all"] });
      queryClient.invalidateQueries({ queryKey: ["sop-tasks"] });
    }
  };

  const handleToggleActive = async (task) => {
    await base44.entities.SOPTask.update(task.id, { is_active: !task.is_active });
    queryClient.invalidateQueries({ queryKey: ["sop-tasks-all"] });
  };

  // Tortoise filtered by selected enclosures
  const filteredTortoises = form.target_enclosures.length > 0
    ? tortoises.filter(t => form.target_enclosures.includes(t.enclosure))
    : tortoises;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{tasks.length} task terdaftar</p>
        <Button onClick={openNew} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Task
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id} className={`p-4 ${!t.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{t.title}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium capitalize ${categoryColors[t.category] || ""}`}>
                      {t.category}
                    </span>
                    <Badge variant="outline" className="text-[11px] text-amber-600">
                      <Star className="w-2.5 h-2.5 mr-1 fill-current" />
                      {t.points} poin
                    </Badge>
                    <span className="text-[11px] text-muted-foreground capitalize">{t.frequency}</span>
                    {t.frequency === "mingguan" && t.weekly_days?.length > 0 && (
                      <span className="text-[11px] text-primary">
                        ({DAYS.filter(d => t.weekly_days.includes(d.value)).map(d => d.label).join(", ")})
                      </span>
                    )}
                    {t.frequency === "bulanan" && t.monthly_dates?.length > 0 && (
                      <span className="text-[11px] text-primary">
                        (Tgl {t.monthly_dates.sort((a,b)=>a-b).join(", ")})
                      </span>
                    )}
                    {t.deadline_time && (
                      <span className="text-[11px] text-red-500 font-medium">⏰ {t.deadline_time}</span>
                    )}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                  {(t.target_enclosures?.length > 0 || t.target_tortoise_names?.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.target_enclosures?.map(e => <span key={e} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">📦 {e}</span>)}
                      {t.target_tortoise_names?.slice(0, 3).map(n => <span key={n} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">🐢 {n}</span>)}
                      {t.target_tortoise_names?.length > 3 && <span className="text-[10px] text-muted-foreground">+{t.target_tortoise_names.length - 3} lainnya</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={t.is_active} onCheckedChange={() => handleToggleActive(t)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editData ? "Edit Task SOP" : "Tambah Task SOP"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Basic info */}
            <div>
              <label className="text-xs font-medium mb-1 block">Nama Task *</label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Contoh: Beri makan tortoise pagi" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Deskripsi</label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="resize-none h-16 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Kategori</label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pakan","kebersihan","pemeriksaan","breeding","administrasi","lainnya"].map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Frekuensi</label>
                <Select value={form.frequency} onValueChange={(v) => setForm((p) => ({ ...p, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="harian">Harian</SelectItem>
                    <SelectItem value="mingguan">Mingguan</SelectItem>
                    <SelectItem value="bulanan">Bulanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Weekly days */}
            {form.frequency === "mingguan" && (
              <div>
                <label className="text-xs font-medium mb-2 block">Pilih Hari *</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(d => (
                    <ToggleChip key={d.value} label={d.label} selected={form.weekly_days.includes(d.value)} onClick={() => toggleDay(d.value)} />
                  ))}
                </div>
                {form.weekly_days.length === 0 && <p className="text-xs text-muted-foreground mt-1">Pilih minimal 1 hari</p>}
              </div>
            )}

            {/* Monthly dates */}
            {form.frequency === "bulanan" && (
              <div>
                <label className="text-xs font-medium mb-2 block">Pilih Tanggal *</label>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <ToggleChip key={d} label={String(d)} selected={form.monthly_dates.includes(d)} onClick={() => toggleMonthDate(d)} />
                  ))}
                </div>
                {form.monthly_dates.length === 0 && <p className="text-xs text-muted-foreground mt-1">Pilih minimal 1 tanggal</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Poin per Task</label>
                <Input type="number" value={form.points} onChange={(e) => setForm((p) => ({ ...p, points: e.target.value }))} min={1} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Batas Waktu (opsional)</label>
                <Input type="time" value={form.deadline_time} onChange={(e) => setForm((p) => ({ ...p, deadline_time: e.target.value }))} />
              </div>
            </div>

            {/* Target kandang */}
            <div>
              <label className="text-xs font-medium mb-2 block">Target Kandang (kosong = semua)</label>
              {enclosures.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {enclosures.map(e => (
                    <ToggleChip key={e} label={`📦 ${e}`} selected={form.target_enclosures.includes(e)} onClick={() => toggleEnclosure(e)} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada kandang terdaftar</p>
              )}
            </div>

            {/* Target kura-kura */}
            <div>
              <label className="text-xs font-medium mb-2 block">
                Target Kura-kura (kosong = semua
                {form.target_enclosures.length > 0 ? " dalam kandang dipilih" : ""})
              </label>
              {filteredTortoises.length > 0 ? (
                <div className="max-h-36 overflow-y-auto border rounded-lg p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {filteredTortoises.map(t => (
                      <ToggleChip
                        key={t.id}
                        label={`🐢 ${t.name}${t.enclosure ? ` (${t.enclosure})` : ""}`}
                        selected={(form.target_tortoise_ids || []).includes(t.id)}
                        onClick={() => toggleTortoise(t)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada kura-kura terdaftar</p>
              )}
              {(form.target_tortoise_ids || []).length > 0 && (
                <p className="text-xs text-primary mt-1">{form.target_tortoise_ids.length} kura-kura dipilih</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.title}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}