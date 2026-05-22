import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_TASKS = {
  hari_1: [
    { task_title: "Orientasi lingkungan peternakan", is_completed: false },
    { task_title: "Baca SOP Perawatan Harian", is_completed: false },
    { task_title: "Perkenalan dengan tim", is_completed: false },
    { task_title: "Pelajari lokasi kandang dan denah area", is_completed: false },
  ],
  minggu_1: [
    { task_title: "Praktik pemberian pakan harian", is_completed: false },
    { task_title: "Pelajari SOP Penanganan Sakit", is_completed: false },
    { task_title: "Latihan timbang dan ukur kura-kura", is_completed: false },
    { task_title: "Pelajari sistem absensi & checklist harian", is_completed: false },
    { task_title: "Ujian praktek perawatan dasar", is_completed: false },
  ],
  bulan_1: [
    { task_title: "Pelajari proses breeding dan inkubasi", is_completed: false },
    { task_title: "Pelajari prosedur karantina", is_completed: false },
    { task_title: "Pahami sistem inventaris gudang", is_completed: false },
    { task_title: "Evaluasi kinerja bulan pertama", is_completed: false },
  ],
};

export default function OnboardingForm({ onSave, onClose }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ employee_name: "", employee_email: "", start_date: today, phase: "hari_1", status: "berjalan" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tasks = DEFAULT_TASKS[form.phase] || [];
    await base44.entities.OnboardingChecklist.create({ ...form, tasks, overall_progress: 0 });
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nama Karyawan *</Label>
        <Input required value={form.employee_name} onChange={e => set("employee_name", e.target.value)} />
      </div>
      <div>
        <Label>Email Karyawan *</Label>
        <Input required type="email" value={form.employee_email} onChange={e => set("employee_email", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tanggal Mulai</Label>
          <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
        </div>
        <div>
          <Label>Fase</Label>
          <Select value={form.phase} onValueChange={v => set("phase", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hari_1">Hari Pertama</SelectItem>
              <SelectItem value="minggu_1">Minggu Pertama</SelectItem>
              <SelectItem value="bulan_1">Bulan Pertama</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">
        Template task otomatis akan dibuat berdasarkan fase yang dipilih ({DEFAULT_TASKS[form.phase]?.length || 0} task).
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit">Buat Onboarding</Button>
      </div>
    </form>
  );
}