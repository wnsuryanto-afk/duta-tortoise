import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, AlertTriangle, GraduationCap, Clock, Carrot, CreditCard, Calendar, Building2, Save } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const fmt = (d) => d ? format(new Date(d), "d MMM yyyy", { locale: id }) : "-";

// ─── Warning Letter Tab ───────────────────────────────────────────────────────
const SP_COLORS = { SP1: "bg-amber-100 text-amber-700", SP2: "bg-orange-100 text-orange-700", SP3: "bg-red-100 text-red-700" };

function WarningLetterTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { data: letters = [] } = useQuery({ queryKey: ["warning-letters"], queryFn: () => base44.entities.WarningLetter.list("-date") });
  const deleteMutation = useMutation({ mutationFn: id => base44.entities.WarningLetter.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["warning-letters"] }); setDeleteTarget(null); } });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-primary">
          <Plus className="w-4 h-4" /> Buat Surat Peringatan
        </Button>
      </div>
      <div className="space-y-3">
        {letters.map(l => {
          const daysSince = l.date ? Math.floor((Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const isActive = daysSince < 180;
          return (
          <Card key={l.id} className={!isActive ? "opacity-60" : ""}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${SP_COLORS[l.level]} border-0`}>{l.level}</Badge>
                  <p className="font-semibold">{l.employee_name}</p>
                  {l.acknowledged && <Badge className="bg-green-100 text-green-700 border-0 text-xs">✓ Diakui</Badge>}
                  {!isActive
                    ? <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Kadaluarsa</Badge>
                    : <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Aktif</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{fmt(l.date)} · {l.issued_by && `Oleh: ${l.issued_by}`}</p>
                <p className="text-sm font-medium mt-1">{l.reason}</p>
                {l.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(l); setShowForm(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
        {letters.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">Belum ada surat peringatan</CardContent></Card>}
      </div>
      {showForm && <WarnLetterForm data={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["warning-letters"] }); }} />}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Surat Peringatan?</AlertDialogTitle><AlertDialogDescription>Data ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => deleteMutation.mutate(deleteTarget.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WarnLetterForm({ data, onClose, onSaved }) {
  const isEdit = !!data;
  const [form, setForm] = useState(data || { employee_name: "", employee_email: "", date: new Date().toISOString().split("T")[0], level: "SP1", reason: "", description: "", issued_by: "", acknowledged: false, notes: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const mutation = useMutation({ mutationFn: () => isEdit ? base44.entities.WarningLetter.update(data.id, form) : base44.entities.WarningLetter.create(form), onSuccess: onSaved });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Buat"} Surat Peringatan</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: "Nama Karyawan *", key: "employee_name", col: 2 }, { label: "Email Karyawan *", key: "employee_email", col: 2, type: "email" }, { label: "Tanggal *", key: "date", type: "date" }, { label: "Diterbitkan Oleh", key: "issued_by" }].map(f => (
            <div key={f.key} className={`space-y-1 ${f.col === 2 ? "col-span-2" : ""}`}>
              <Label>{f.label}</Label>
              <Input type={f.type || "text"} value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
            </div>
          ))}
          <div className="space-y-1">
            <Label>Tingkat SP *</Label>
            <Select value={form.level} onValueChange={v => set("level", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="SP1">SP1</SelectItem><SelectItem value="SP2">SP2</SelectItem><SelectItem value="SP3">SP3</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Sudah Diakui?</Label>
            <Select value={String(form.acknowledged)} onValueChange={v => set("acknowledged", v === "true")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="false">Belum</SelectItem><SelectItem value="true">Ya, sudah</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1"><Label>Alasan *</Label><Input value={form.reason} onChange={e => set("reason", e.target.value)} /></div>
          <div className="col-span-2 space-y-1"><Label>Deskripsi Lengkap</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.employee_name || !form.reason || mutation.isPending}>{mutation.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Training Log Tab ─────────────────────────────────────────────────────────
const RESULT_COLORS = { lulus: "bg-green-100 text-green-700", tidak_lulus: "bg-red-100 text-red-700", dalam_proses: "bg-blue-100 text-blue-700" };
const RESULT_LABELS = { lulus: "Lulus", tidak_lulus: "Tidak Lulus", dalam_proses: "Dalam Proses" };

function TrainingTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { data: logs = [] } = useQuery({ queryKey: ["training-logs"], queryFn: () => base44.entities.TrainingLog.list("-training_date") });
  const deleteMutation = useMutation({ mutationFn: id => base44.entities.TrainingLog.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["training-logs"] }); setDeleteTarget(null); } });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-primary">
          <Plus className="w-4 h-4" /> Tambah Log Training
        </Button>
      </div>
      <div className="space-y-3">
        {logs.map(l => (
          <Card key={l.id}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <p className="font-semibold">{l.training_title}</p>
                  {l.result && <Badge className={`${RESULT_COLORS[l.result]} border-0 text-xs`}>{RESULT_LABELS[l.result]}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{l.employee_name} · {fmt(l.training_date)}</p>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                  {l.category && <span className="bg-muted px-2 py-0.5 rounded-full capitalize">{l.category}</span>}
                  {l.duration_hours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{l.duration_hours} jam</span>}
                  {l.trainer && <span>Trainer: {l.trainer}</span>}
                </div>
                {l.certificate_url && <a href={l.certificate_url} target="_blank" className="text-xs text-primary underline mt-1 block">Lihat Sertifikat</a>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(l); setShowForm(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(l)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {logs.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">Belum ada log training</CardContent></Card>}
      </div>
      {showForm && <TrainingForm data={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["training-logs"] }); }} />}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Log Training?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => deleteMutation.mutate(deleteTarget.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TrainingForm({ data, onClose, onSaved }) {
  const isEdit = !!data;
  const [form, setForm] = useState(data || { employee_name: "", employee_email: "", training_title: "", training_date: new Date().toISOString().split("T")[0], duration_hours: "", trainer: "", category: "lainnya", result: "dalam_proses", certificate_url: "", notes: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const mutation = useMutation({ mutationFn: () => isEdit ? base44.entities.TrainingLog.update(data.id, form) : base44.entities.TrainingLog.create(form), onSuccess: onSaved });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Tambah"} Log Training</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: "Nama Karyawan *", key: "employee_name", col: 2 }, { label: "Email Karyawan *", key: "employee_email", col: 2, type: "email" }, { label: "Judul Training *", key: "training_title", col: 2 }, { label: "Tanggal *", key: "training_date", type: "date" }, { label: "Durasi (jam)", key: "duration_hours", type: "number" }, { label: "Trainer", key: "trainer" }, { label: "URL Sertifikat", key: "certificate_url", col: 2 }, { label: "Catatan", key: "notes", col: 2, multiline: true }].map(f => (
            <div key={f.key} className={`space-y-1 ${f.col === 2 ? "col-span-2" : ""}`}>
              <Label>{f.label}</Label>
              {f.multiline ? <Textarea value={form[f.key]} onChange={e => set(f.key, e.target.value)} rows={2} /> : <Input type={f.type || "text"} value={form[f.key]} onChange={e => set(f.key, f.type === "number" ? (parseFloat(e.target.value) || "") : e.target.value)} />}
            </div>
          ))}
          <div className="space-y-1">
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["perawatan","breeding","kesehatan","administrasi","lainnya"].map(v=><SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Hasil</Label>
            <Select value={form.result} onValueChange={v => set("result", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(RESULT_LABELS).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.employee_name || !form.training_title || mutation.isPending}>{mutation.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attendance Quick Tab ─────────────────────────────────────────────────────
function AttendanceSummaryTab() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const { data: records = [] } = useQuery({ queryKey: ["attendance", date], queryFn: () => base44.entities.Attendance.filter({ date }) });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label>Tanggal</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{ label: "Hadir", val: records.filter(r=>r.status==="hadir").length, color: "text-green-600" }, { label: "Izin", val: records.filter(r=>r.status==="izin").length, color: "text-amber-600" }, { label: "Sakit", val: records.filter(r=>r.status==="sakit").length, color: "text-red-600" }].map(item => (
          <Card key={item.label}><CardContent className="p-4 text-center"><p className={`text-2xl font-bold ${item.color}`}>{item.val}</p><p className="text-xs text-muted-foreground">{item.label}</p></CardContent></Card>
        ))}
      </div>
      <div className="space-y-2">
        {records.map(r => (
          <Card key={r.id}><CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{r.employee_name}</p>
              <p className="text-xs text-muted-foreground">{r.check_in && `Masuk: ${r.check_in}`}{r.check_out && ` · Pulang: ${r.check_out}`}</p>
              {r.late_minutes > 0 && <p className="text-xs text-amber-600">Terlambat {r.late_minutes} menit</p>}
            </div>
            <Badge className={r.status==="hadir"?"bg-green-100 text-green-700":r.status==="izin"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"}>{r.status}</Badge>
          </CardContent></Card>
        ))}
        {records.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">Belum ada absensi pada tanggal ini</CardContent></Card>}
      </div>
    </div>
  );
}

// ─── KOP Surat / Company Settings Tab ────────────────────────────────────────
function CompanySettingsTab() {
  const qc = useQueryClient();
  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.list(),
  });
  const existing = settings[0];
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    company_name: "Duta Tortoise Farm",
    company_address: "",
    company_city: "",
    company_phone: "",
    company_email: "",
    company_logo_url: "",
    director_name: "",
    director_title: "Pimpinan",
    min_poin_bulanan: 300,
    nilai_per_poin: 500,
    farm_lat: "",
    farm_lng: "",
    farm_location_radius: 200,
    stok_approval_threshold: 500000,
  };

  // Sync form dengan data yang sudah ada
  if (!form && existing) {
    setTimeout(() => setForm({
      ...defaultForm,
      company_name: existing.company_name || "",
      company_address: existing.company_address || "",
      company_city: existing.company_city || "",
      company_phone: existing.company_phone || "",
      company_email: existing.company_email || "",
      company_logo_url: existing.company_logo_url || "",
      director_name: existing.director_name || "",
      director_title: existing.director_title || "Pimpinan",
      min_poin_bulanan: existing.min_poin_bulanan ?? 300,
      nilai_per_poin: existing.nilai_per_poin ?? 500,
      farm_lat: existing.farm_lat ?? "",
      farm_lng: existing.farm_lng ?? "",
      farm_location_radius: existing.farm_location_radius ?? 200,
      stok_approval_threshold: existing.stok_approval_threshold ?? 500000,
    }), 0);
  }

  const currentForm = form || defaultForm;
  const set = (k, v) => setForm(p => ({ ...(p || defaultForm), [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (existing?.id) {
      await base44.entities.CompanySettings.update(existing.id, currentForm);
    } else {
      await base44.entities.CompanySettings.create({ ...currentForm, setting_key: "main" });
    }
    qc.invalidateQueries({ queryKey: ["company-settings"] });
    setSaving(false);
  };

  return (
    <div className="max-w-xl space-y-5">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <p className="font-medium">📄 KOP Surat Peringatan</p>
        <p className="mt-0.5 text-xs">Informasi ini akan otomatis muncul di header surat peringatan (SP) yang dicetak.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Nama Perusahaan *</Label>
          <Input value={currentForm.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Duta Tortoise Farm" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Alamat</Label>
          <Textarea value={currentForm.company_address} onChange={e => set("company_address", e.target.value)} placeholder="Jl. Contoh No. 1, Kel. ABC" rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Kota</Label>
          <Input value={currentForm.company_city} onChange={e => set("company_city", e.target.value)} placeholder="Yogyakarta" />
        </div>
        <div className="space-y-1.5">
          <Label>Telepon</Label>
          <Input value={currentForm.company_phone} onChange={e => set("company_phone", e.target.value)} placeholder="0812-xxxx-xxxx" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={currentForm.company_email} onChange={e => set("company_email", e.target.value)} placeholder="info@dutatortoice.com" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>URL Logo (opsional)</Label>
          <Input value={currentForm.company_logo_url} onChange={e => set("company_logo_url", e.target.value)} placeholder="https://..." />
          {currentForm.company_logo_url && (
            <img src={currentForm.company_logo_url} alt="Logo" className="h-12 mt-1 rounded object-contain border p-1" />
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Nama Pimpinan (penanda tangan)</Label>
          <Input value={currentForm.director_name} onChange={e => set("director_name", e.target.value)} placeholder="Nama pimpinan" />
        </div>
        <div className="space-y-1.5">
          <Label>Jabatan Pimpinan</Label>
          <Input value={currentForm.director_title} onChange={e => set("director_title", e.target.value)} placeholder="Pimpinan / Direktur" />
        </div>
      </div>

      {/* Konfigurasi GPS Lokasi Kandang */}
      <div className="border-t pt-5 space-y-4">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">📍 Lokasi Kandang (GPS Checkout)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Karyawan hanya bisa checkout jika berada dalam radius ini dari koordinat kandang</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Latitude Kandang</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentForm.farm_lat}
              onChange={e => set("farm_lat", e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="-7.733925"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Longitude Kandang</Label>
            <Input
              type="number"
              step="0.000001"
              value={currentForm.farm_lng}
              onChange={e => set("farm_lng", e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="113.445944"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Radius Toleransi (meter)</Label>
            <Input
              type="number"
              min={50}
              max={2000}
              value={currentForm.farm_location_radius}
              onChange={e => set("farm_location_radius", Number(e.target.value) || 200)}
              placeholder="200"
            />
          </div>
        </div>
        {currentForm.farm_lat && currentForm.farm_lng ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
            <p className="font-medium">✅ GPS Aktif</p>
            <p className="mt-0.5">Kandang: {currentForm.farm_lat}, {currentForm.farm_lng} · Radius: {currentForm.farm_location_radius}m</p>
            <a
              href={`https://www.google.com/maps?q=${currentForm.farm_lat},${currentForm.farm_lng}`}
              target="_blank"
              rel="noreferrer"
              className="underline mt-1 block"
            >
              Lihat di Google Maps →
            </a>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
            <p>⚠️ Koordinat kandang belum diisi. Checkout GPS tidak aktif.</p>
          </div>
        )}
      </div>

      {/* Konfigurasi Poin & Gaji */}
      <div className="border-t pt-5 space-y-4">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">⭐ Konfigurasi Poin & Gaji</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Digunakan untuk menghitung bonus/potongan di Rekap Poin & Gaji</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Target Poin Minimum/Bulan</Label>
            <Input
              type="number"
              min={0}
              value={currentForm.min_poin_bulanan}
              onChange={e => set("min_poin_bulanan", Number(e.target.value) || 0)}
              placeholder="300"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nilai per Poin (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={currentForm.nilai_per_poin}
              onChange={e => set("nilai_per_poin", Number(e.target.value) || 0)}
              placeholder="500"
            />
          </div>
        </div>
        {/* Approval threshold stok */}
        <div className="grid grid-cols-1 gap-4 mt-2">
          <div className="space-y-1.5">
            <Label>Batas Nilai Stok Keluar Perlu Approval (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={currentForm.stok_approval_threshold ?? 500000}
              onChange={e => set("stok_approval_threshold", Number(e.target.value) || 0)}
              placeholder="500000"
            />
            <p className="text-xs text-muted-foreground">Jika nilai stok keluar melebihi batas ini, butuh persetujuan admin/owner terlebih dahulu.</p>
          </div>
        </div>
        {/* Contoh perhitungan dinamis */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
          <p className="font-medium">📊 Contoh Perhitungan:</p>
          {(() => {
            const target = currentForm.min_poin_bulanan || 300;
            const nilai = currentForm.nilai_per_poin || 500;
            const contohPoin = target + 20;
            return (
              <>
                <p>• {contohPoin} poin = bonus Rp {(contohPoin * nilai).toLocaleString("id-ID")} (tidak ada potongan, target ≥{target})</p>
                <p>• {target - 30} poin = potongan Rp {(30 * nilai).toLocaleString("id-ID")} (kurang 30 poin dari target {target})</p>
                <p>• Tepat {target} poin = bonus Rp {(target * nilai).toLocaleString("id-ID")}, tidak ada potongan</p>
              </>
            );
          })()}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </div>
  );
}

// ─── Main HR Page ─────────────────────────────────────────────────────────────
export default function HRPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Manajemen SDM</h1>
        <p className="text-sm text-muted-foreground">Absensi, lembur, surat peringatan, dan training karyawan</p>
      </div>
      <Tabs defaultValue="attendance">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="attendance" className="gap-1.5"><Calendar className="w-3.5 h-3.5" />Absensi</TabsTrigger>
          <TabsTrigger value="warning" className="gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Surat Peringatan</TabsTrigger>
          <TabsTrigger value="training" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" />Training</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />KOP Surat</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="mt-4"><AttendanceSummaryTab /></TabsContent>
        <TabsContent value="warning" className="mt-4"><WarningLetterTab /></TabsContent>
        <TabsContent value="training" className="mt-4"><TrainingTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><CompanySettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}