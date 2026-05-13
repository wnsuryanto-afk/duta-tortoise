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

const DEFAULT_FORM = { title: "", description: "", category: "lainnya", points: 10, frequency: "harian", is_active: true };

export default function SOPTaskManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["sop-tasks-all"],
    queryFn: () => base44.entities.SOPTask.list("-created_date", 200),
  });

  const openNew = () => { setForm(DEFAULT_FORM); setEditData(null); setShowForm(true); };
  const openEdit = (t) => { setForm({ ...t }); setEditData(t); setShowForm(true); };

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
    queryClient.invalidateQueries({ queryKey: ["sop-tasks"] });
  };

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
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editData ? "Edit Task SOP" : "Tambah Task SOP"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Nama Task *</label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Contoh: Beri makan tortoise pagi" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Deskripsi</label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="resize-none h-16 text-sm" placeholder="Detail task..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Kategori</label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pakan", "kebersihan", "pemeriksaan", "breeding", "administrasi", "lainnya"].map((c) => (
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
            <div>
              <label className="text-xs font-medium mb-1 block">Poin per Task</label>
              <Input type="number" value={form.points} onChange={(e) => setForm((p) => ({ ...p, points: e.target.value }))} min={1} />
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