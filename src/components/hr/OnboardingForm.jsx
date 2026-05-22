import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_TASKS = {
  hari_1: [
    "Orientasi lingkungan dan fasilitas farm",
    "Perkenalan dengan tim dan manajemen",
    "Membaca SOP Perawatan Harian",
    "Membaca SOP Keselamatan Kerja",
    "Observasi rutinitas pagi (pemberian pakan)",
  ],
  minggu_1: [
    "Praktik langsung pemberian pakan tortoise",
    "Membaca SOP Penanganan Sakit",
    "Membaca SOP Breeding",
    "Praktik pencatatan data harian",
    "Belajar identifikasi morph dan gender",
    "Mengikuti sesi penimbangan mingguan",
    "Memahami sistem kandang dan zonasi",
  ],
  bulan_1: [
    "Mandiri dalam rutinitas harian tanpa pengawasan",
    "Memahami dan mengisi laporan bulanan",
    "Praktik penanganan kura-kura sakit (supervised)",
    "Menyelesaikan semua modul pelatihan dasar",
    "Evaluasi performa bulan pertama",
  ],
};

export default function OnboardingForm({ onSave, onClose }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    employee_name: "",
    employee_email: "",
    start_date: today,
    phase: "hari_1",
    status: "berjalan",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Generate tasks from template for all phases
    const allTasks = Object.entries(DEFAULT_TASKS).flatMap(([phase, titles]) =>
      titles.map(t => ({ task_title: t, sop_id: "", is_completed: false, completed_date: null, verified_by: "" }))
    );
    await base44.entities.OnboardingChecklist.create({
      ...form,
      tasks: DEFAULT_TASKS[form.phase].map(t => ({ task_title: t, sop_id: "", is_completed: false, completed_date: null, verified_by: "" })),
      overall_progress: 0,
    });
    onSave();
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nama Karyawan *</Label>
        <Input required value={form.employee_name} onChange={e => set("employee_name", e.target.value)} placeholder="Nama lengkap" />
      </div>
      <div>
        <Label>Email Karyawan *</Label>
        <Input required type="email" value={form.employee_email} onChange={e => set("employee_email", e.target.value)} placeholder="email@domain.com" />
      </div>
      <div>
        <Label>Tanggal Mulai Kerja</Label>
        <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
      </div>
      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p className="font-medium mb-1">Task akan dibuat otomatis:</p>
        <ul className="text-xs space-y-0.5">
          {DEFAULT_TASKS[form.phase].map((t, i) => <li key={i}>• {t}</li>)}
        </ul>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={saving}>{saving ? "Membuat..." : "Buat Onboarding"}</Button>
      </div>
    </form>
  );
}