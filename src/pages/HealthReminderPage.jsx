import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Plus, Trash2, CheckCircle2, Clock, Pill, Stethoscope, Syringe, Weight } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";

const typeConfig = {
  vitamin:  { icon: Pill,        label: "Vitamin",       color: "bg-purple-100 text-purple-700" },
  checkup:  { icon: Stethoscope, label: "Cek Kesehatan", color: "bg-blue-100 text-blue-700" },
  obat:     { icon: Pill,        label: "Obat",          color: "bg-red-100 text-red-700" },
  vaksin:   { icon: Syringe,     label: "Vaksin",        color: "bg-green-100 text-green-700" },
  timbang:  { icon: Weight,      label: "Timbang",       color: "bg-amber-100 text-amber-700" },
  lainnya:  { icon: Clock,       label: "Lainnya",       color: "bg-muted text-muted-foreground" },
};

const emptyForm = {
  title: "", type: "checkup", tortoise_name: "", enclosure: "",
  due_date: "", interval_days: "", notes: "",
};

function ReminderForm({ open, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 300),
  });

  const handleSave = async () => {
    await onSave({
      ...form,
      interval_days: form.interval_days ? Number(form.interval_days) : null,
      is_done: false,
    });
    setForm(emptyForm);
    onClose();
  };

  const activeTortoises = tortoises.filter(t => t.status === "aktif" || t.status === "breeding");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Pengingat Kesehatan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Judul *</Label>
            <Input placeholder="cth: Pemberian Vitamin D3" value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jenis *</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tanggal Jatuh Tempo *</Label>
              <Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kura-kura (opsional)</Label>
              <Select value={form.tortoise_name} onValueChange={v => set("tortoise_name", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Semua / Pilih..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Semua Kura-kura</SelectItem>
                  {activeTortoises.map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kandang (opsional)</Label>
              <Input placeholder="cth: W1" value={form.enclosure} onChange={e => set("enclosure", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Ulangi setiap (hari) — kosongkan jika tidak berulang</Label>
            <Input type="number" min={1} placeholder="cth: 30 untuk bulanan" value={form.interval_days} onChange={e => set("interval_days", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Textarea placeholder="Dosis, instruksi, dll." value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1 resize-none h-16 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={!form.title || !form.due_date}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HealthReminderPage() {
  const { role } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("pending");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["health-reminders-all"],
    queryFn: () => base44.entities.HealthReminder.list("-due_date", 200),
  });

  const isAdmin = role === "owner" || role === "admin" || role === "manajer";

  const filtered = reminders.filter(r =>
    filterStatus === "semua" ? true :
    filterStatus === "pending" ? !r.is_done :
    r.is_done
  ).sort((a, b) => a.due_date.localeCompare(b.due_date));

  const handleSave = async (data) => {
    await base44.entities.HealthReminder.create(data);
    queryClient.invalidateQueries({ queryKey: ["health-reminders-all"] });
    queryClient.invalidateQueries({ queryKey: ["health-reminders"] });
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus pengingat ini?")) return;
    await base44.entities.HealthReminder.delete(id);
    queryClient.invalidateQueries({ queryKey: ["health-reminders-all"] });
    queryClient.invalidateQueries({ queryKey: ["health-reminders"] });
  };

  const handleDone = async (reminder) => {
    const updates = { is_done: true, done_date: today };
    if (reminder.interval_days) {
      const nextDate = new Date(reminder.due_date);
      nextDate.setDate(nextDate.getDate() + reminder.interval_days);
      await base44.entities.HealthReminder.create({
        ...reminder,
        id: undefined,
        due_date: format(nextDate, "yyyy-MM-dd"),
        is_done: false,
        done_date: null,
      });
    }
    await base44.entities.HealthReminder.update(reminder.id, updates);
    queryClient.invalidateQueries({ queryKey: ["health-reminders-all"] });
    queryClient.invalidateQueries({ queryKey: ["health-reminders"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" /> Pengingat Kesehatan
          </h1>
          <p className="text-muted-foreground mt-1">Jadwal rutin vitamin, cek kesehatan & perawatan kura-kura</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Pengingat
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[["pending", "Aktif"], ["done", "Selesai"], ["semua", "Semua"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilterStatus(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filterStatus === v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
            }`}
          >{l}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Belum ada pengingat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((reminder) => {
            const daysLeft = differenceInDays(parseISO(reminder.due_date), parseISO(today));
            const conf = typeConfig[reminder.type] || typeConfig.lainnya;
            const Icon = conf.icon;
            const isOverdue = !reminder.is_done && daysLeft < 0;
            const isToday = !reminder.is_done && daysLeft === 0;
            return (
              <Card
                key={reminder.id}
                className={`p-4 flex items-center gap-4 ${isOverdue ? "border-red-300 bg-red-50" : isToday ? "border-orange-300 bg-orange-50" : ""}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${conf.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold text-sm ${reminder.is_done ? "line-through text-muted-foreground" : ""}`}>
                      {reminder.title}
                    </p>
                    <Badge variant="outline" className={`text-[11px] ${conf.color}`}>{conf.label}</Badge>
                    {reminder.interval_days && <Badge variant="outline" className="text-[11px]">🔄 {reminder.interval_days} hari</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                    <span>{reminder.tortoise_name || "Semua Kura-kura"}</span>
                    {reminder.enclosure && <span>📍 Kandang {reminder.enclosure}</span>}
                    <span>{format(parseISO(reminder.due_date), "d MMMM yyyy", { locale: id })}</span>
                    {!reminder.is_done && (
                      <span className={isOverdue ? "text-red-600 font-bold" : isToday ? "text-orange-600 font-bold" : ""}>
                        {isOverdue ? `${Math.abs(daysLeft)} hari terlambat` : isToday ? "Hari ini!" : `${daysLeft} hari lagi`}
                      </span>
                    )}
                    {reminder.is_done && reminder.done_date && (
                      <span className="text-green-600">✓ Selesai {format(parseISO(reminder.done_date), "d MMM yyyy", { locale: id })}</span>
                    )}
                  </div>
                  {reminder.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{reminder.notes}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!reminder.is_done && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleDone(reminder)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Selesai
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(reminder.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ReminderForm open={showForm} onClose={() => setShowForm(false)} onSave={handleSave} />
    </div>
  );
}