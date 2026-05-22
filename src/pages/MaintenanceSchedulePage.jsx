import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatIndonesian } from "@/lib/formatIndonesian";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";

const TASK_TYPES = {
  pakan: "Pemberian Pakan",
  kebersihan_harian: "Kebersihan Harian",
  kebersihan_mingguan: "Kebersihan Mingguan",
  kebersihan_bulanan: "Kebersihan Bulanan"
};

export default function MaintenanceSchedulePage() {
  const { user } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [filterType, setFilterType] = useState("");

  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['maintenance-schedules'],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ is_active: true }),
    initialData: [],
  });

  const { data: enclosures } = useQuery({
    queryKey: ['enclosures'],
    queryFn: () => base44.entities.Enclosure.filter({ is_active: true }),
    initialData: [],
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data) => {
      // Auto-calculate next_due
      const lastDone = data.last_done ? new Date(data.last_done) : new Date();
      const nextDue = new Date(lastDone);
      nextDue.setDate(nextDue.getDate() + (data.frequency_days || 1));
      
      return await base44.entities.MaintenanceSchedule.create({
        ...data,
        next_due: nextDue.toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      setShowForm(false);
      toast.success("Jadwal perawatan berhasil ditambahkan");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createScheduleMutation.mutate({
      enclosure_name: formData.get('enclosure_name'),
      task_type: formData.get('task_type'),
      frequency_days: parseInt(formData.get('frequency_days')) || 1,
      scheduled_time: formData.get('scheduled_time'),
      assigned_to: formData.get('assigned_to'),
      tasks_checklist: formData.get('tasks_checklist')?.split(',').map(t => t.trim()).filter(Boolean) || [],
      last_done: formData.get('last_done') || new Date().toISOString().split('T')[0],
      is_active: true
    });
  };

  const filteredSchedules = schedules.filter(s => {
    if (!filterType) return true;
    return s.task_type === filterType;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jadwal Perawatan Kandang</h1>
          <p className="text-muted-foreground">Kelola jadwal pakan dan kebersihan kandang</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Jadwal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Jadwal Perawatan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Kandang</Label>
                <select name="enclosure_name" className="w-full p-2 border rounded" required>
                  <option value="">Pilih kandang</option>
                  {enclosures.map(e => (
                    <option key={e.id} value={e.name}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Jenis Perawatan</Label>
                <select name="task_type" className="w-full p-2 border rounded" required>
                  <option value="">Pilih jenis</option>
                  {Object.entries(TASK_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frekuensi (hari)</Label>
                  <Input name="frequency_days" type="number" defaultValue={1} min={1} required />
                </div>
                <div>
                  <Label>Waktu (HH:mm)</Label>
                  <Input name="scheduled_time" type="time" required />
                </div>
              </div>

              <div>
                <Label>Petugas</Label>
                <Input name="assigned_to" placeholder="Nama petugas" />
              </div>

              <div>
                <Label>Checklist Tugas (pisahkan dengan koma)</Label>
                <Input name="tasks_checklist" placeholder="e.g., Bersihkan sisa makanan, Ganti air" />
              </div>

              <div>
                <Label>Terakhir Dilakukan</Label>
                <Input name="last_done" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-6">
        <select
          className="p-2 border rounded"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Semua Jenis</option>
          {Object.entries(TASK_TYPES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {filteredSchedules.length === 0 ? (
        <EmptyState
          title="Belum Ada Jadwal"
          description="Belum ada jadwal perawatan yang dibuat"
          icon={AlertCircle}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSchedules.map(schedule => {
            const nextDue = schedule.next_due ? new Date(schedule.next_due) : null;
            const isOverdue = nextDue && nextDue < new Date();
            
            return (
              <Card key={schedule.id} className={isOverdue ? "border-red-300 bg-red-50" : ""}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{schedule.enclosure_name}</span>
                    <Badge variant={isOverdue ? "destructive" : "secondary"}>
                      {TASK_TYPES[schedule.task_type]}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Terakhir: {schedule.last_done ? formatIndonesian.date(schedule.last_done) : 'Belum ada'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Berikutnya: {nextDue ? formatIndonesian.date(nextDue) : '-'}
                    </p>
                    {schedule.assigned_to && (
                      <p>Petugas: {schedule.assigned_to}</p>
                    )}
                    {schedule.scheduled_time && (
                      <p>Waktu: {schedule.scheduled_time}</p>
                    )}
                  </div>
                  {schedule.tasks_checklist?.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium">Checklist:</p>
                      <ul className="list-disc list-inside">
                        {schedule.tasks_checklist.map((task, idx) => (
                          <li key={idx}>{task}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}