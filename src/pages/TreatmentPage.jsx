import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle2, Circle, CalendarClock, Pencil, Trash2, Bell, Clock, Pill, Stethoscope, Syringe, Weight, ClipboardList } from "lucide-react";
import DailyChecklistTab from "@/components/treatment/DailyChecklistTab";
import SearchableDropdownFilter from "@/components/tutorial/TortoiseDropdownFilter";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { diPeternakan } from "@/lib/populasiKura";

const FREQ_LABELS = {
  harian:       "Harian",
  dua_harian:   "2 Hari Sekali",
  mingguan:     "Mingguan",
  dua_mingguan: "2 Minggu Sekali",
  bulanan:      "Bulanan",
  quarterly:    "3 Bulanan",
  tahunan:      "Tahunan",
  musiman:      "Musiman",
};
const FREQ_COLORS = {
  harian:       "bg-blue-100 text-blue-700",
  dua_harian:   "bg-sky-100 text-sky-700",
  mingguan:     "bg-green-100 text-green-700",
  dua_mingguan: "bg-teal-100 text-teal-700",
  bulanan:      "bg-orange-100 text-orange-700",
  quarterly:    "bg-amber-100 text-amber-700",
  tahunan:      "bg-purple-100 text-purple-700",
  musiman:      "bg-pink-100 text-pink-700",
};
const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const reminderTypeConfig = {
  vitamin:  { icon: Pill,        label: "Vitamin",       color: "bg-purple-100 text-purple-700" },
  checkup:  { icon: Stethoscope, label: "Cek Kesehatan", color: "bg-blue-100 text-blue-700" },
  obat:     { icon: Pill,        label: "Obat",          color: "bg-red-100 text-red-700" },
  vaksin:   { icon: Syringe,     label: "Vaksin",        color: "bg-green-100 text-green-700" },
  timbang:  { icon: Weight,      label: "Timbang",       color: "bg-amber-100 text-amber-700" },
  lainnya:  { icon: Clock,       label: "Lainnya",       color: "bg-muted text-muted-foreground" },
};

function getPeriodRange(freq) {
  const now = new Date();
  if (freq === "harian")   return { start: new Date(format(now,"yyyy-MM-dd")), end: new Date(format(now,"yyyy-MM-dd") + "T23:59:59") };
  if (freq === "mingguan") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  if (freq === "bulanan")  return { start: startOfMonth(now), end: endOfMonth(now) };
  if (freq === "tahunan")  return { start: startOfYear(now), end: endOfYear(now) };
  return { start: now, end: now };
}


/**
 * Sakelar musim bertelur.
 *
 * Jadwal berfrekuensi "musiman" - boost kalsium betina dan cek kloaka - hanya
 * muncul di layar kiper selama sakelar ini menyala. Sengaja dijalankan manusia,
 * bukan kalender: yang menandai musim adalah betina yang mulai gelisah dan
 * menggali, dan yang melihatnya pemilik, bukan aplikasi.
 *
 * Sampai 30 Agustus 2026, frekuensi "musiman" tidak pernah ditangani sama
 * sekali, sehingga kedua jadwal itu tidak pernah tampil satu kali pun. B119
 * mati karena egg binding pada 24 Juni.
 */
function SakelarMusimBertelur({ canEdit }) {
  const qc = useQueryClient();
  const [menyimpan, setMenyimpan] = useState(false);
  const { data: settings } = useQuery({
    queryKey: ["company-settings-musim"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const aktif = settings?.musim_bertelur_aktif === true;

  const ubah = async (nilai) => {
    if (!settings?.id || menyimpan) return;
    setMenyimpan(true);
    try {
      await base44.entities.CompanySettings.update(settings.id, { musim_bertelur_aktif: nilai });
      qc.invalidateQueries({ queryKey: ["company-settings-musim"] });
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success(nilai ? "Musim bertelur dinyalakan - jadwal musiman mulai muncul di layar kiper" : "Musim bertelur dimatikan");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${aktif ? "border-pink-300 bg-pink-50 dark:bg-pink-950/30 dark:border-pink-800" : "border-border bg-card"}`}>
      <div className="flex-1">
        <p className="font-semibold text-sm text-foreground">
          Musim bertelur {aktif ? "sedang berlangsung" : "belum dinyalakan"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Selama sakelar ini menyala, <strong>Boost Kalsium Betina</strong> dan <strong>Cek Kloaka Betina</strong> muncul
          setiap hari di layar kiper. Nyalakan saat betina mulai gelisah, menggali, atau mencari tempat bertelur &mdash;
          bukan menurut kalender. Kekurangan kalsium saat betina gravid adalah pemicu egg binding.
        </p>
      </div>
      {canEdit && (
        <Switch checked={aktif} onCheckedChange={ubah} disabled={menyimpan || !settings?.id} aria-label="Musim bertelur" />
      )}
    </div>
  );
}

export default function TreatmentPage() {
  // Keadaan yang membuat sebuah jadwal DIAM di layar kiper. Ditampilkan di
  // kartunya masing-masing supaya tidak ada jadwal yang terlihat aktif padahal
  // tidak pernah muncul - kesalahan yang pernah membuat dua jadwal pencegah
  // egg binding diam berbulan-bulan.
  const { data: pengaturanMusim } = useQuery({
    queryKey: ["company-settings-musim"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const musimAktif = pengaturanMusim?.musim_bertelur_aktif === true;

  const { data: stokRacikan = 0 } = useQuery({
    queryKey: ["stok-racikan-repro"],
    queryFn: async () => {
      const res = await base44.entities.WarehouseItem.filter({ sku: "VIT-REP00" });
      return Number(res?.[0]?.current_stock || 0);
    },
    staleTime: 5 * 60 * 1000,
  });
  const sedangMundur = (j) => j?.nonaktif_bila_racikan_ada === true && stokRacikan > 0;

  const qc = useQueryClient();
  const { user, role } = useCurrentUser();
  const canEdit = ["admin", "owner", "manajer"].includes(role);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: schedules = [] } = useQuery({
    queryKey: ["treatment-schedules"],
    queryFn: () => base44.entities.TreatmentSchedule.list("-created_date", 100),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["treatment-logs"],
    queryFn: () => base44.entities.TreatmentLog.list("-done_date", 500),
  });
  // Penyaringan `status: "aktif"` di server membuat kura SAKIT, breeding, dan
  // karantina hilang dari seluruh halaman ini — padahal kura sakit justru yang
  // paling perlu dijadwalkan pengobatan, dan tidak ada satu pun cara memilihnya
  // dari layar ini. Seluruh kura yang masih ada di peternakan diambil, lalu
  // disaring dengan aturan populasi bersama.
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-treatment"],
    queryFn: () => base44.entities.Tortoise.list("name", 500),
    select: (data) => (data || []).filter(diPeternakan),
  });
  const { data: reminders = [] } = useQuery({
    queryKey: ["health-reminders-all"],
    queryFn: () => base44.entities.HealthReminder.list("-due_date", 200),
  });

  const enclosures = [...new Set(tortoises.map(t => t.enclosure).filter(Boolean))].sort();

  // Items for dropdown filters
  const tortoiseFilterItems = tortoises.map(t => ({ id: t.id, label: t.name }));
  const enclosureFilterItems = enclosures.map(e => ({ id: e, label: `📍 ${e}` }));

  const [tab, setTab] = useState("checklist");
  const [freqFilter, setFreqFilter] = useState("semua");
  const [modFilter, setModFilter] = useState("semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tortoiseFilter, setTortoiseFilter] = useState("semua");
  const [filterMode, setFilterMode] = useState("kura"); // "kura" | "kandang"
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [logDialog, setLogDialog] = useState(null);
  const [logNote, setLogNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Reminder state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderFilterStatus, setReminderFilterStatus] = useState("pending");
  const [reminderForm, setReminderForm] = useState({
    title: "", type: "checkup", tortoise_name: "", enclosure: "", due_date: "", interval_days: "", notes: "",
  });

  const EMPTY_FORM = {
    title: "", frequency: "mingguan", mod_type: "lainnya", apply_to_all: true,
    gender_filter: "semua", tortoise_ids: [], tortoise_names: [],
    weekly_days: [], monthly_dates: [], deadline_time: "", notes: "",
  };
  const [form, setForm] = useState(EMPTY_FORM);

  const openForm = (s = null) => {
    setEditData(s);
    setForm(s ? {
      title: s.title, frequency: s.frequency, mod_type: s.mod_type || "lainnya",
      apply_to_all: s.apply_to_all ?? true,
      gender_filter: s.gender_filter || "semua",
      tortoise_ids: s.tortoise_ids || [],
      tortoise_names: s.tortoise_names || [],
      weekly_days: s.weekly_days || [],
      monthly_dates: s.monthly_dates || [],
      deadline_time: s.deadline_time || "",
      notes: s.notes || "",
    } : EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let resolvedIds = form.tortoise_ids;
    let resolvedNames = form.tortoise_names;
    if (form.apply_to_all) {
      let pool = form.gender_filter !== "semua" ? tortoises.filter(t => t.gender === form.gender_filter) : tortoises;
      resolvedIds = pool.map(t => t.id);
      resolvedNames = pool.map(t => t.name);
    }
    const data = { ...form, tortoise_ids: resolvedIds, tortoise_names: resolvedNames };
    if (editData?.id) {
      await base44.entities.TreatmentSchedule.update(editData.id, data);
    } else {
      await base44.entities.TreatmentSchedule.create(data);
      const sopFreq = form.frequency === "harian" ? "harian" : form.frequency === "mingguan" ? "mingguan" : "bulanan";
      const sopData = {
        title: `[Treatment] ${form.title}`,
        category: "pemeriksaan", points: 15, frequency: sopFreq, is_active: true,
      };
      if (form.frequency === "mingguan" && form.weekly_days?.length > 0) sopData.weekly_days = form.weekly_days;
      if (form.frequency === "bulanan" && form.monthly_dates?.length > 0) sopData.monthly_dates = form.monthly_dates;
      if (form.deadline_time) sopData.deadline_time = form.deadline_time;
      await base44.entities.SOPTask.create(sopData);
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
    const ids = form.tortoise_ids.includes(t.id) ? form.tortoise_ids.filter(i => i !== t.id) : [...form.tortoise_ids, t.id];
    const names = tortoises.filter(x => ids.includes(x.id)).map(x => x.name);
    setForm(p => ({ ...p, tortoise_ids: ids, tortoise_names: names }));
  };
  const toggleDay = (day) => {
    const days = form.weekly_days.includes(day) ? form.weekly_days.filter(d => d !== day) : [...form.weekly_days, day].sort();
    setForm(p => ({ ...p, weekly_days: days }));
  };
  const toggleDate = (date) => {
    const dates = form.monthly_dates.includes(date) ? form.monthly_dates.filter(d => d !== date) : [...form.monthly_dates, date].sort((a,b)=>a-b);
    setForm(p => ({ ...p, monthly_dates: dates }));
  };

  const getTargetTortoises = (schedule) => {
    if (schedule.apply_to_all) {
      let pool = tortoises;
      if (schedule.gender_filter && schedule.gender_filter !== "semua") pool = tortoises.filter(t => t.gender === schedule.gender_filter);
      return pool;
    }
    return tortoises.filter(t => (schedule.tortoise_ids || []).includes(t.id));
  };

  const getProgress = (schedule) => {
    const range = getPeriodRange(schedule.frequency);
    const periodLogs = logs.filter(l => l.schedule_id === schedule.id && isWithinInterval(parseISO(l.done_date), range));
    const targetTortoises = getTargetTortoises(schedule);
    const doneTortoises = [...new Set(periodLogs.map(l => l.tortoise_id || l.tortoise_name))];
    return { done: doneTortoises.length, total: targetTortoises.length, logs: periodLogs, targetTortoises };
  };

  // Reminders
  const filteredReminders = reminders.filter(r =>
    reminderFilterStatus === "semua" ? true :
    reminderFilterStatus === "pending" ? !r.is_done : r.is_done
  ).sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  const handleSaveReminder = async () => {
    if (!reminderForm.title || !reminderForm.due_date) return;
    await base44.entities.HealthReminder.create({
      ...reminderForm, interval_days: reminderForm.interval_days ? Number(reminderForm.interval_days) : null, is_done: false,
    });
    qc.invalidateQueries({ queryKey: ["health-reminders-all"] });
    qc.invalidateQueries({ queryKey: ["health-reminders"] });
    setShowReminderForm(false);
    setReminderForm({ title: "", type: "checkup", tortoise_name: "", enclosure: "", due_date: "", interval_days: "", notes: "" });
  };

  const handleReminderDone = async (reminder) => {
    if (reminder.interval_days) {
      const nextDate = new Date(reminder.due_date);
      nextDate.setDate(nextDate.getDate() + reminder.interval_days);
      await base44.entities.HealthReminder.create({ ...reminder, id: undefined, due_date: format(nextDate, "yyyy-MM-dd"), is_done: false, done_date: null });
    }
    await base44.entities.HealthReminder.update(reminder.id, { is_done: true, done_date: today });
    qc.invalidateQueries({ queryKey: ["health-reminders-all"] });
    qc.invalidateQueries({ queryKey: ["health-reminders"] });
  };

  const handleReminderDelete = async (id) => {
    if (!confirm("Hapus pengingat ini?")) return;
    await base44.entities.HealthReminder.delete(id);
    qc.invalidateQueries({ queryKey: ["health-reminders-all"] });
    qc.invalidateQueries({ queryKey: ["health-reminders"] });
  };

  const filtered = schedules.filter(s => {
    const matchFreq = freqFilter === "semua" || s.frequency === freqFilter;
    const matchMod = modFilter === "semua" || (s.mod_type || "lainnya") === modFilter;
    let matchTortoise = true;
    if (tortoiseFilter && tortoiseFilter !== "semua") {
      if (filterMode === "kura") {
        matchTortoise = getTargetTortoises(s).some(t => t.id === tortoiseFilter);
      } else {
        matchTortoise = getTargetTortoises(s).some(t => t.enclosure === tortoiseFilter);
      }
    }
    return matchFreq && matchMod && matchTortoise;
  });

  const filteredLogs = logs.filter(l => {
    if (!dateFrom && !dateTo) return true;
    const d = l.done_date || "";
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });
  const formTortoises = form.gender_filter !== "semua" ? tortoises.filter(t => t.gender === form.gender_filter) : tortoises;
  const pendingRemindersCount = reminders.filter(r => !r.is_done).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Treatment & Pengingat</h1>
          <p className="text-muted-foreground text-sm">Jadwal treatment rutin & pengingat kesehatan kura-kura</p>
        </div>
        {canEdit && (
          <Button onClick={() => openForm()} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Jadwal
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="checklist" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Checklist Harian
          </TabsTrigger>
          <TabsTrigger value="jadwal">Jadwal Treatment</TabsTrigger>
          <TabsTrigger value="pengingat" className="relative">
            Pengingat Kesehatan
            {pendingRemindersCount > 0 && (
              <span className="ml-1.5 text-[10px] bg-destructive text-white rounded-full px-1.5 py-0.5">{pendingRemindersCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="log">Log Treatment</TabsTrigger>
        </TabsList>

        {/* ── Tab Checklist Harian ── */}
        <TabsContent value="checklist" className="mt-4">
          <DailyChecklistTab />
        </TabsContent>

        {/* ── Tab Jadwal Treatment ── */}
        <TabsContent value="jadwal" className="mt-4 space-y-4">
          <SakelarMusimBertelur canEdit={canEdit} />
          <div className="space-y-2">
            {/* Filter Frekuensi */}
            <div className="flex flex-wrap gap-1.5">
              {["semua", "harian", "dua_harian", "mingguan", "dua_mingguan", "bulanan", "quarterly", "musiman", "tahunan"].map(f => (
                <button key={f} onClick={() => setFreqFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${freqFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                  {f === "semua" ? "Semua Frekuensi" : FREQ_LABELS[f]}
                </button>
              ))}
            </div>
            {/* Filter Jenis Mod */}
            <div className="flex flex-wrap gap-1.5">
              {[["semua","Semua Mod"],["obat","💊 Obat"],["vitamin","🌿 Vitamin"],["perawatan_luka","🩹 Perawatan Luka"],["mandi","🛁 Mandi"],["lainnya","Lainnya"]].map(([v,l]) => (
                <button key={v} onClick={() => setModFilter(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${modFilter === v ? "bg-accent text-accent-foreground border-accent" : "bg-background border-border hover:bg-muted"}`}>
                  {l}
                </button>
              ))}
            </div>
            {/* Filter per Kura / Kandang — dropdown searchable */}
            <div className="flex items-center gap-2 flex-wrap">
              <SearchableDropdownFilter
                items={tortoiseFilterItems}
                selected={filterMode === "kura" ? tortoiseFilter : null}
                onSelect={id => { setFilterMode("kura"); setTortoiseFilter(id || "semua"); }}
                placeholder="Cari nama kura-kura..."
                allLabel="Semua Kura-kura"
              />
              <SearchableDropdownFilter
                items={enclosureFilterItems}
                selected={filterMode === "kandang" ? tortoiseFilter : null}
                onSelect={id => { setFilterMode("kandang"); setTortoiseFilter(id || "semua"); }}
                placeholder="Cari kandang..."
                allLabel="Semua Kandang"
              />
            </div>
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
                const range = getPeriodRange(schedule.frequency);
                const doneTortoiseIds = new Set(
                  logs.filter(l => l.schedule_id === schedule.id && isWithinInterval(parseISO(l.done_date), range))
                    .map(l => l.tortoise_id || l.tortoise_name)
                );

                return (
                  <Card key={schedule.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{schedule.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FREQ_COLORS[schedule.frequency]}`}>{FREQ_LABELS[schedule.frequency]}</span>
                          {schedule.gender_filter && schedule.gender_filter !== "semua" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                              {schedule.gender_filter === "jantan" ? "♂ Jantan" : "♀ Betina"}
                            </span>
                          )}
                          {schedule.apply_to_all && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Semua</span>}
                          {pct === 100 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✓ Semua Selesai</span>}
                          {sedangMundur(schedule) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">⏸ Mundur — racikan tersedia</span>
                          )}
                          {schedule.frequency === "musiman" && !musimAktif && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">⏸ Menunggu musim bertelur</span>
                          )}
                        </div>
                        {/* Sebuah jadwal yang tidak muncul di layar kiper harus MENGATAKAN kenapa.
                            Mekanisme tersembunyi persis yang membuat dua jadwal pencegah egg binding
                            diam selama berbulan-bulan tanpa ada yang menyadarinya. */}
                        {sedangMundur(schedule) && (
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            Tidak muncul di layar kiper sekarang: kandungannya sudah ada di dalam racikan Duta Repro yang tersedia.
                            Begitu racikan habis, jadwal ini muncul lagi sendiri.
                          </p>
                        )}
                        {schedule.frequency === "musiman" && !musimAktif && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Tidak muncul di layar kiper sampai sakelar musim bertelur di atas dinyalakan.
                          </p>
                        )}
                        {schedule.frequency === "mingguan" && schedule.weekly_days?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">Hari: {schedule.weekly_days.map(d => DAY_NAMES[d]).join(", ")}</p>
                        )}
                        {schedule.frequency === "bulanan" && schedule.monthly_dates?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">Tanggal: {schedule.monthly_dates.join(", ")} setiap bulan</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Progress: {prog.done}/{prog.total} kura-kura ({pct}%)
                          {prog.done < prog.total && prog.total > 0 && (
                            <span className="ml-1.5 text-orange-600 font-medium">· {prog.total - prog.done} belum treatment</span>
                          )}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(schedule)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(schedule)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>

                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {prog.targetTortoises.map(t => {
                        const isDone = doneTortoiseIds.has(t.id) || doneTortoiseIds.has(t.name);
                        return (
                          <button key={t.id}
                            onClick={() => !isDone && setLogDialog({ schedule, tortoise: t })}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                              isDone
                                ? "bg-green-50 border-green-300 text-green-700 cursor-default shadow-sm"
                                : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 cursor-pointer"
                            }`}>
                            {isDone
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              : <Circle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                            }
                            <span className={`truncate font-medium ${isDone ? "line-through opacity-60" : ""}`}>{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {schedule.notes && <p className="text-xs text-muted-foreground mt-2 italic">{schedule.notes}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab Pengingat Kesehatan ── */}
        <TabsContent value="pengingat" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              {[["pending","Aktif"],["done","Selesai"],["semua","Semua"]].map(([v, l]) => (
                <button key={v} onClick={() => setReminderFilterStatus(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${reminderFilterStatus === v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                  {l}
                </button>
              ))}
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowReminderForm(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Tambah Pengingat
              </Button>
            )}
          </div>

          {filteredReminders.length === 0 ? (
            <Card className="py-16 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Belum ada pengingat</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReminders.map(reminder => {
                const daysLeft = reminder.due_date ? differenceInDays(parseISO(reminder.due_date), parseISO(today)) : 0;
                const conf = reminderTypeConfig[reminder.type] || reminderTypeConfig.lainnya;
                const Icon = conf.icon;
                const isOverdue = !reminder.is_done && daysLeft < 0;
                const isToday = !reminder.is_done && daysLeft === 0;
                return (
                  <Card key={reminder.id} className={`p-4 flex items-center gap-4 ${isOverdue ? "border-red-300 bg-red-50" : isToday ? "border-orange-300 bg-orange-50" : ""}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${conf.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-sm ${reminder.is_done ? "line-through text-muted-foreground" : ""}`}>{reminder.title}</p>
                        <Badge variant="outline" className={`text-[11px] ${conf.color}`}>{conf.label}</Badge>
                        {reminder.interval_days && <Badge variant="outline" className="text-[11px]">🔄 {reminder.interval_days} hari</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                        <span>{reminder.tortoise_name || "Semua Kura-kura"}</span>
                        {reminder.enclosure && <span>📍 {reminder.enclosure}</span>}
                        {reminder.due_date && <span>{format(parseISO(reminder.due_date), "d MMMM yyyy", { locale: id })}</span>}
                        {!reminder.is_done && reminder.due_date && (
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
                        <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleReminderDone(reminder)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Selesai
                        </Button>
                      )}
                      {canEdit && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleReminderDelete(reminder.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab Log Treatment ── */}
        <TabsContent value="log" className="mt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-muted-foreground">Pilih Hari:</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
            <span className="text-xs text-muted-foreground">s/d</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">Reset</button>
            )}
          </div>
          {filteredLogs.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">Belum ada log treatment</p>
          ) : (
            filteredLogs.slice(0, 100).map(l => (
              <Card key={l.id} className="p-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{l.schedule_title}</p>
                  <p className="text-xs text-muted-foreground">{l.tortoise_name}{l.done_by ? ` · oleh ${l.done_by}` : ""}{l.notes ? ` · ${l.notes}` : ""}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{format(parseISO(l.done_date), "d MMM yyyy", { locale: id })}</span>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Form Jadwal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editData ? "Edit Jadwal" : "Tambah Jadwal Treatment"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">Nama Treatment *</Label>
              <Input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="cth: Mandi rutin, Obat cacing, Timbang" required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Jenis Mod</Label>
              <Select value={form.mod_type || "lainnya"} onValueChange={v => setForm(p=>({...p,mod_type:v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="obat">💊 Obat</SelectItem>
                  <SelectItem value="vitamin">🌿 Vitamin</SelectItem>
                  <SelectItem value="perawatan_luka">🩹 Perawatan Luka</SelectItem>
                  <SelectItem value="mandi">🛁 Mandi</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Frekuensi</Label>
              <Select value={form.frequency} onValueChange={v => setForm(p=>({...p,frequency:v,weekly_days:[],monthly_dates:[]}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="harian">Harian</SelectItem>
                  <SelectItem value="dua_harian">2 Hari Sekali</SelectItem>
                  <SelectItem value="mingguan">Mingguan</SelectItem>
                  <SelectItem value="dua_mingguan">2 Minggu Sekali</SelectItem>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="quarterly">3 Bulanan (Quarterly)</SelectItem>
                  <SelectItem value="musiman">Musiman</SelectItem>
                  <SelectItem value="tahunan">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.frequency === "harian" && (
              <div>
                <Label className="text-xs mb-1 block">Waktu Pelaksanaan (opsional)</Label>
                <Input type="time" value={form.deadline_time} onChange={e => setForm(p=>({...p,deadline_time:e.target.value}))} className="w-36" />
              </div>
            )}
            {form.frequency === "mingguan" && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs mb-2 block">Pilih Hari (opsional)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAY_NAMES.map((name, idx) => (
                      <button key={idx} type="button" onClick={() => toggleDay(idx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${form.weekly_days.includes(idx) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Waktu Pelaksanaan (opsional)</Label>
                  <Input type="time" value={form.deadline_time} onChange={e => setForm(p=>({...p,deadline_time:e.target.value}))} className="w-36" />
                </div>
              </div>
            )}
            {form.frequency === "bulanan" && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs mb-2 block">Pilih Tanggal dalam Bulan (opsional)</Label>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({length:31},(_,i)=>i+1).map(date => (
                      <button key={date} type="button" onClick={() => toggleDate(date)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium border transition-colors ${form.monthly_dates.includes(date) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                        {date}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Waktu Pelaksanaan (opsional)</Label>
                  <Input type="time" value={form.deadline_time} onChange={e => setForm(p=>({...p,deadline_time:e.target.value}))} className="w-36" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs mb-2 block">Target Kura-kura</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" checked={form.apply_to_all} onChange={e=>setForm(p=>({...p,apply_to_all:e.target.checked}))} className="w-4 h-4" />
                  Berlaku untuk semua kura-kura aktif
                </label>
                <div>
                  <Label className="text-xs mb-1 block text-muted-foreground">Filter Jenis Kelamin</Label>
                  <div className="flex gap-1.5">
                    {[{value:"semua",label:"Semua"},{value:"jantan",label:"♂ Jantan"},{value:"betina",label:"♀ Betina"}].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setForm(p=>({...p,gender_filter:opt.value,tortoise_ids:[],tortoise_names:[]}))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${form.gender_filter===opt.value?"bg-primary text-primary-foreground border-primary":"bg-background border-border hover:bg-muted"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {!form.apply_to_all && (
                  <div>
                    <Label className="text-xs mb-1 block text-muted-foreground">Pilih Kura-kura Spesifik {form.gender_filter!=="semua"&&`(${form.gender_filter})`}</Label>
                    <div className="max-h-44 overflow-y-auto border rounded-xl p-2 space-y-0.5">
                      {formTortoises.map(t => (
                        <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted text-xs">
                          <input type="checkbox" checked={form.tortoise_ids.includes(t.id)} onChange={()=>toggleTortoise(t)} className="w-3 h-3" />
                          <span>{t.name}</span>
                          {t.gender && <span className="text-muted-foreground">({t.gender})</span>}
                        </label>
                      ))}
                    </div>
                    {form.tortoise_ids.length>0&&<p className="text-xs text-primary mt-1">{form.tortoise_ids.length} kura terpilih</p>}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Catatan</Label>
              <Input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Opsional..." className="mt-1" />
            </div>
            {!editData && <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">ℹ️ Jadwal baru otomatis ditambahkan ke SOP Keeper.</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={()=>setShowForm(false)}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving?"Menyimpan...":"Simpan"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Form Pengingat */}
      <Dialog open={showReminderForm} onOpenChange={setShowReminderForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Pengingat Kesehatan</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Judul *</Label>
              <Input placeholder="cth: Pemberian Vitamin D3" value={reminderForm.title} onChange={e=>setReminderForm(p=>({...p,title:e.target.value}))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Jenis *</Label>
                <Select value={reminderForm.type} onValueChange={v=>setReminderForm(p=>({...p,type:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(reminderTypeConfig).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tanggal Jatuh Tempo *</Label>
                <Input type="date" value={reminderForm.due_date} onChange={e=>setReminderForm(p=>({...p,due_date:e.target.value}))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Kura-kura (opsional)</Label>
                <Select value={reminderForm.tortoise_name||"semua"} onValueChange={v=>setReminderForm(p=>({...p,tortoise_name:v==="semua"?"":v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Semua..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Kura-kura</SelectItem>
                    {tortoises.map(t=><SelectItem key={t.id} value={t.name}>{t.name}{t.status && t.status !== "aktif" ? ` — ${t.status}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Kandang (opsional)</Label>
                <Input placeholder="cth: W1" value={reminderForm.enclosure} onChange={e=>setReminderForm(p=>({...p,enclosure:e.target.value}))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Ulangi setiap (hari) — kosongkan jika tidak berulang</Label>
              <Input type="number" min={1} placeholder="cth: 30" value={reminderForm.interval_days} onChange={e=>setReminderForm(p=>({...p,interval_days:e.target.value}))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Catatan</Label>
              <Textarea placeholder="Dosis, instruksi, dll." value={reminderForm.notes} onChange={e=>setReminderForm(p=>({...p,notes:e.target.value}))} className="mt-1 resize-none h-16 text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={()=>setShowReminderForm(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleSaveReminder} disabled={!reminderForm.title||!reminderForm.due_date}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Done Dialog */}
      <Dialog open={!!logDialog} onOpenChange={o=>!o&&setLogDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Tandai Selesai
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
                <Input value={logNote} onChange={e=>setLogNote(e.target.value)} placeholder="Kondisi, dosis, dll..." className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground">Dicatat oleh: {user?.full_name||user?.email}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={()=>setLogDialog(null)}>Batal</Button>
                <Button className="flex-1 gap-2" onClick={handleLogDone} disabled={saving}>
                  <CheckCircle2 className="w-4 h-4" />{saving?"Menyimpan...":"Selesai"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}