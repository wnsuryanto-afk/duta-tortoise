import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ListTodo, Plus, Pencil, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import AccessDenied from "@/components/common/AccessDenied";

const ROLE_COLORS = { keeper: "bg-green-100 text-green-800", admin: "bg-blue-100 text-blue-800", manajer: "bg-purple-100 text-purple-800" };
const TIME_LABELS = { pagi: "🌅 Pagi", siang: "☀️ Siang", sore: "🌆 Sore", malam: "🌙 Malam" };
const ROLES = ["keeper", "admin", "manajer"];

function TaskForm({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || { role: "keeper", task_title: "", description: "", time_of_day: "pagi", points: 10, is_active: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (data?.id) await base44.entities.DailyTaskTemplate.update(data.id, form);
    else await base44.entities.DailyTaskTemplate.create(form);
    onSave();
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Role</Label>
          <Select value={form.role} onValueChange={v => set("role", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Waktu</Label>
          <Select value={form.time_of_day} onValueChange={v => set("time_of_day", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TIME_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Judul Task *</Label>
        <Input required value={form.task_title} onChange={e => set("task_title", e.target.value)} placeholder="Contoh: Beri makan tortoise kandang A" />
      </div>
      <div>
        <Label>Deskripsi</Label>
        <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3} placeholder="Detail cara mengerjakan task..." />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label>Poin</Label>
          <Input type="number" value={form.points} onChange={e => set("points", Number(e.target.value))} min={0} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
          <Label>Aktif</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  );
}

export default function DailyTaskTemplatePage() {
  const { role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterRole, setFilterRole] = useState("semua");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["daily-task-templates"],
    queryFn: () => base44.entities.DailyTaskTemplate.list(),
  });

  if (!["owner", "admin", "manajer"].includes(role)) return <AccessDenied />;

  const filtered = filterRole === "semua" ? templates : templates.filter(t => t.role === filterRole);
  const grouped = ROLES.map(r => ({ role: r, items: filtered.filter(t => t.role === r) })).filter(g => g.items.length > 0);

  const handleDelete = async (t) => {
    if (!confirm(`Hapus template "${t.task_title}"?`)) return;
    await base44.entities.DailyTaskTemplate.delete(t.id);
    queryClient.invalidateQueries({ queryKey: ["daily-task-templates"] });
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["daily-task-templates"] });
    setShowForm(false);
    setEditItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl"><ListTodo className="w-6 h-6 text-purple-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Template Task Harian</h1>
            <p className="text-sm text-muted-foreground">{templates.length} template terdaftar</p>
            <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
              <span className="font-semibold">ℹ️ Fungsi halaman ini:</span> Template tugas <span className="font-semibold">rutin harian per role</span> (keeper, admin, manajer)
              yang muncul otomatis di checklist setiap hari. Berbeda dengan <span className="font-semibold">SOP Task</span> yang merupakan tugas spesifik per kandang atau per kura-kura tertentu.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Filter Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Role</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Belum ada template task</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(g => (
            <div key={g.role}>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${ROLE_COLORS[g.role]} border-0 capitalize`}>{g.role}</Badge>
                <span className="text-sm text-muted-foreground">{g.items.length} task</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.sort((a, b) => {
                  const order = ["pagi", "siang", "sore", "malam"];
                  return order.indexOf(a.time_of_day) - order.indexOf(b.time_of_day);
                }).map(t => (
                  <Card key={t.id} className={`${!t.is_active ? "opacity-50" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{t.task_title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{TIME_LABELS[t.time_of_day]} · {t.points || 0} poin</div>
                          {t.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(t); setShowForm(true); }}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Template Task" : "Tambah Template Task"}</DialogTitle></DialogHeader>
          <TaskForm data={editItem} onSave={handleSaved} onClose={() => { setShowForm(false); setEditItem(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}