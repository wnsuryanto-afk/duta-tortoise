import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Settings, Plus, Calculator, Users, Clock, Leaf, Star, Pencil, CreditCard, CheckCircle2, XCircle, Minus, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addWeeks, nextSaturday } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AlurGaji from "@/components/salary/AlurGaji";
import AccessDenied from "@/components/common/AccessDenied";

const MAX_KASBON = 1000000;

function KasbonTab({ user, role, isOwnerOrManajer }) {
  const qc = useQueryClient();
  // Bagian 2: semua role kecuali owner & investor bisa ajukan kasbon
  const canApply = !["owner", "investor", "kicked"].includes(role);
  const isOwner = role === "owner";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", reason_category: "kebutuhan_mendesak", reason: "", installment_plan: "1x" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: kasbons = [], isLoading } = useQuery({
    queryKey: ["kasbons"],
    queryFn: () => base44.entities.Kasbon.list("-request_date", 200),
  });

  const myKasbons = useMemo(() => {
    if (isOwnerOrManajer) return kasbons;
    return kasbons.filter(k => k.employee_email === user?.email);
  }, [kasbons, user, isOwnerOrManajer]);

  const activeKasbon = myKasbons.find(k => k.employee_email === user?.email && k.status === "approved");

  // Hitung total kasbon aktif (pending + approved)
  const totalAktif = myKasbons
    .filter(k => k.employee_email === user?.email && ["approved", "pending"].includes(k.status))
    .reduce((s, k) => s + ((k.amount || 0) - (k.total_paid || 0)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setFormError("Nominal kasbon harus diisi."); return; }
    if (amt > MAX_KASBON) { setFormError(`Maksimal kasbon Rp ${MAX_KASBON.toLocaleString("id-ID")}`); return; }
    if (totalAktif + amt > MAX_KASBON) {
      setFormError(`Sisa kasbon aktif Rp ${totalAktif.toLocaleString("id-ID")}. Total akan melebihi maksimal Rp ${MAX_KASBON.toLocaleString("id-ID")}.`);
      return;
    }
    const planMap = { "1x": 1, "2x": 2, "4x": 4 };
    const totalCicilan = planMap[form.installment_plan] || 1;
    const perCicilan = Math.ceil(amt / totalCicilan);
    setSaving(true);
    await base44.entities.Kasbon.create({
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      amount: amt,
      reason_category: form.reason_category,
      reason: form.reason,
      installment_plan: form.installment_plan,
      installments_total: totalCicilan,
      installments_paid: 0,
      request_date: format(new Date(), "yyyy-MM-dd"),
      // Satu field untuk satu hal. `installment_amount` dulu ditulis di sini
      // dengan nilai yang persis sama dengan `weekly_deduction` — dan tidak ada
      // di skema, jadi nilainya dibuang dan setiap pembacaannya jatuh ke
      // `weekly_deduction` juga. Pembacaannya sengaja dibiarkan berjenjang
      // untuk berjaga-jaga bila ada data lama yang sempat menyimpannya.
      weekly_deduction: perCicilan,
      total_paid: 0,
      status: "pending",
    });
    qc.invalidateQueries({ queryKey: ["kasbons"] });
    setSaving(false);
    setShowForm(false);
    setForm({ amount: "", reason_category: "kebutuhan_mendesak", reason: "", installment_plan: "1x" });
  };

  const handleApprove = async (kasbon) => {
    await base44.entities.Kasbon.update(kasbon.id, {
      status: "approved",
      approved_by: user.full_name || user.email,
      approved_date: format(new Date(), "yyyy-MM-dd"),
    });
    qc.invalidateQueries({ queryKey: ["kasbons"] });
  };

  const handleReject = async (kasbon) => {
    const alasan = prompt("Alasan penolakan kasbon:");
    if (alasan === null) return;
    // `rejection_reason`, bukan `reject_reason` — yang kedua tidak ada di skema
    // sehingga alasannya hilang. Halaman Kasbon menulis nama yang benar dan
    // KasbonCard menampilkannya, jadi penolakan dari layar ini saja yang
    // alasannya tidak pernah muncul.
    await base44.entities.Kasbon.update(kasbon.id, { status: "rejected", rejection_reason: alasan });
    qc.invalidateQueries({ queryKey: ["kasbons"] });
  };

  const handlePotong = async (kasbon) => {
    const perCicilan = kasbon.installment_amount || kasbon.weekly_deduction || 100000;
    const sisa = (kasbon.amount || 0) - (kasbon.total_paid || 0);
    const potongan = Math.min(perCicilan, sisa);
    const newPaid = (kasbon.total_paid || 0) + potongan;
    const newInstallmentsPaid = (kasbon.installments_paid || 0) + 1;
    const lunas = newPaid >= kasbon.amount;
    await base44.entities.Kasbon.update(kasbon.id, {
      total_paid: newPaid,
      installments_paid: newInstallmentsPaid,
      status: lunas ? "lunas" : "approved",
    });
    qc.invalidateQueries({ queryKey: ["kasbons"] });
  };

  const statusConfig = {
    pending:  { label: "Menunggu",  color: "bg-amber-100 text-amber-700" },
    approved: { label: "Disetujui", color: "bg-green-100 text-green-700" },
    rejected: { label: "Ditolak",   color: "bg-red-100 text-red-700" },
    lunas:    { label: "Lunas",     color: "bg-muted text-muted-foreground" },
  };

  const REASON_LABELS = {
    kebutuhan_mendesak: "Kebutuhan Mendesak",
    biaya_kesehatan: "Biaya Kesehatan",
    kebutuhan_keluarga: "Kebutuhan Keluarga",
    transportasi: "Transportasi",
    lainnya: "Lainnya",
  };

  return (
    <div className="space-y-4">
      <AlurGaji aktif="masukan" />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Maksimal Rp {MAX_KASBON.toLocaleString("id-ID")} · Dipotong sesuai rencana cicilan
        </p>
        {canApply && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Ajukan Kasbon
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {isOwnerOrManajer ? "Semua Pengajuan Kasbon" : "Riwayat Kasbon Saya"}
          </h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
        ) : myKasbons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Belum ada pengajuan kasbon</div>
        ) : (
          <div className="divide-y">
            {myKasbons.map(k => {
              const sisa = (k.amount || 0) - (k.total_paid || 0);
              const pct = k.amount ? Math.round(((k.total_paid || 0) / k.amount) * 100) : 0;
              const conf = statusConfig[k.status] || statusConfig.pending;
              return (
                <div key={k.id} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{k.employee_name}</span>
                        <Badge className={`text-[11px] ${conf.color}`}>{conf.label}</Badge>
                        {k.installment_plan && (
                          <Badge variant="outline" className="text-[11px]">
                            Cicil {k.installment_plan} ({k.installments_paid || 0}/{k.installments_total || 1}x)
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary">Rp {(k.amount || 0).toLocaleString("id-ID")}</p>
                      {k.reason_category && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {REASON_LABELS[k.reason_category] || k.reason_category}{k.reason ? ` — "${k.reason}"` : ""}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Diajukan: {k.request_date ? format(new Date(k.request_date), "d MMM yyyy", { locale: id }) : "—"}
                        {k.approved_date && ` · Disetujui: ${format(new Date(k.approved_date), "d MMM yyyy", { locale: id })}`}
                      </p>
                      {k.installment_plan && <p className="text-xs text-muted-foreground">Cicilan: {k.installment_plan} · Rp {(k.installment_amount || k.weekly_deduction || 0).toLocaleString("id-ID")}/periode</p>}
                      {k.status === "approved" && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Terbayar: Rp {(k.total_paid || 0).toLocaleString("id-ID")}</span>
                            <span>Sisa: Rp {sisa.toLocaleString("id-ID")} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    {isOwnerOrManajer && (
                      <div className="flex gap-2 flex-shrink-0 flex-col">
                        {k.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleApprove(k)} className="gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> ✅ Setujui</Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(k)} className="gap-1 text-destructive border-destructive hover:bg-destructive/10"><XCircle className="w-3.5 h-3.5" /> ❌ Tolak</Button>
                          </>
                        )}
                        {k.status === "approved" && sisa > 0 && (
                          <Button size="sm" variant="outline" onClick={() => handlePotong(k)} className="gap-1">
                            <Minus className="w-3.5 h-3.5" /> Potong Cicilan
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Ajukan Kasbon</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <p>• Maksimal kasbon: <strong>Rp {MAX_KASBON.toLocaleString("id-ID")}</strong></p>
              <p>• Disetujui oleh Owner dan akan dipotong dari gaji</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nominal Kasbon (Rp) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="500000" max={MAX_KASBON} required />
            </div>
            <div className="space-y-1.5">
              <Label>Alasan Pengajuan *</Label>
              <Select value={form.reason_category} onValueChange={v => setForm(p => ({ ...p, reason_category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kebutuhan_mendesak">Kebutuhan Mendesak</SelectItem>
                  <SelectItem value="biaya_kesehatan">Biaya Kesehatan</SelectItem>
                  <SelectItem value="kebutuhan_keluarga">Kebutuhan Keluarga</SelectItem>
                  <SelectItem value="transportasi">Transportasi</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
              {form.reason_category === "lainnya" && (
                <Textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Jelaskan keperluan..." rows={2} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Rencana Cicilan *</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: "1x", label: "Potong 1x", desc: "Gaji berikutnya" },
                  { val: "2x", label: "Cicil 2x", desc: "2 periode" },
                  { val: "4x", label: "Cicil 4x", desc: "4 periode" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, installment_plan: opt.val }))}
                    className={`py-2 px-2 rounded-lg border-2 text-xs text-center transition-all ${
                      form.installment_plan === opt.val
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[10px] opacity-70">{opt.desc}</div>
                    {form.amount && (
                      <div className="font-bold mt-1">
                        Rp {Math.ceil(Number(form.amount) / parseInt(opt.val)).toLocaleString("id-ID")}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {formError && <p className="text-xs text-destructive font-medium">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Mengajukan..." : "Ajukan Kasbon"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Bagian 4: Exclude owner & investor dari konfigurasi gaji
const ROLE_OPTIONS = [
  { value: "manajer", label: "Manajer" },
  { value: "admin", label: "Admin" },
  { value: "kepala_feeder", label: "Kepala Feeder" },
  { value: "keeper", label: "Keeper" },
];

// Roles yang dikecualikan dari laporan gaji
const EXCLUDED_ROLES = ["owner", "investor"];

function SalaryConfigDialog({ open, onClose, editData }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(editData || {
    role: "keeper", salary_type: "bulanan", payment_period: "bulanan",
    base_salary: "", overtime_rate_per_hour: "",
    vegetable_rate_per_trip: "", point_value: "", absent_deduction: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const isHarian = form.salary_type === "harian";

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      base_salary: Number(form.base_salary) || 0,
      overtime_rate_per_hour: Number(form.overtime_rate_per_hour) || 0,
      vegetable_rate_per_trip: Number(form.vegetable_rate_per_trip) || 0,
      point_value: Number(form.point_value) || 0,
      absent_deduction: isHarian ? 0 : (Number(form.absent_deduction) || 0),
    };
    if (editData?.id) await base44.entities.SalaryConfig.update(editData.id, data);
    else await base44.entities.SalaryConfig.create(data);
    qc.invalidateQueries({ queryKey: ["salary-configs"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData?.id ? "Edit Konfigurasi Gaji" : "Tambah Konfigurasi Gaji"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Role *</Label>
            <Select value={form.role} onValueChange={v => set("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Bagian 3: Tipe Gaji */}
          <div>
            <Label>Tipe Gaji *</Label>
            <div className="flex gap-2 mt-1.5">
              {[
                { val: "bulanan", label: "📅 Bulanan (Rp/bulan)" },
                { val: "harian", label: "📆 Harian (Rp/hari)" },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => set("salary_type", opt.val)}
                  className={`flex-1 py-2 px-2 rounded-lg border-2 font-medium text-xs transition-all ${
                    form.salary_type === opt.val
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {isHarian && (
              <div className="mt-2">
                <Label className="text-xs">Dibayar Setiap</Label>
                <div className="flex gap-2 mt-1">
                  {["mingguan", "bulanan"].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set("payment_period", p)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs transition-all ${
                        form.payment_period === p ? "border-primary bg-primary/5 text-primary" : "border-muted bg-muted/30"
                      }`}
                    >
                      {p === "mingguan" ? "Minggu" : "Bulan"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>{isHarian ? "Gaji Pokok (Rp/hari)" : "Gaji Pokok (Rp/bulan)"}</Label>
              <Input type="number" value={form.base_salary} onChange={e => set("base_salary", e.target.value)} placeholder={isHarian ? "100000" : "3000000"} />
            </div>
            <div>
              <Label>Tarif Lembur (Rp/jam)</Label>
              <Input type="number" value={form.overtime_rate_per_hour} onChange={e => set("overtime_rate_per_hour", e.target.value)} placeholder="25000" />
            </div>
            <div>
              <Label>Tunjangan Sayur (Rp/trip)</Label>
              <Input type="number" value={form.vegetable_rate_per_trip} onChange={e => set("vegetable_rate_per_trip", e.target.value)} placeholder="15000" />
            </div>
            <div>
              <Label>Nilai Poin KPI (Rp/poin)</Label>
              <Input type="number" value={form.point_value} onChange={e => set("point_value", e.target.value)} placeholder="500" />
            </div>
            {!isHarian ? (
              <div>
                <Label>Potongan Absen (Rp/hari)</Label>
                <Input type="number" value={form.absent_deduction} onChange={e => set("absent_deduction", e.target.value)} placeholder="100000" />
              </div>
            ) : (
              <div className="flex items-end">
                <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                  💡 Gaji harian: hari masuk × Rp/hari (absen tidak dibayar)
                </p>
              </div>
            )}
          </div>
          <div>
            <Label>Catatan</Label>
            <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OvertimeDialog({ open, onClose, employees }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), hours: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const emp = employees.find(e => e.email === form.employee_email);
    setSaving(true);
    await base44.entities.OvertimeLog.create({
      ...form,
      hours: Number(form.hours),
      employee_id: emp?.id || "",
      employee_name: emp?.full_name || emp?.email || "",
    });
    qc.invalidateQueries({ queryKey: ["overtime-logs"] });
    setSaving(false);
    onClose();
    setForm({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), hours: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Catat Lembur</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Karyawan *</Label>
            <Select value={form.employee_email} onValueChange={v => set("employee_email", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.email}>{e.full_name || e.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label>Jam Lembur</Label><Input type="number" step="0.5" value={form.hours} onChange={e => set("hours", e.target.value)} placeholder="2.5" /></div>
          </div>
          <div><Label>Catatan</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.employee_email || !form.hours}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VegetableDialog({ open, onClose, employees }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), trips: "1", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const emp = employees.find(e => e.email === form.employee_email);
    setSaving(true);
    await base44.entities.VegetablePickup.create({
      ...form,
      trips: Number(form.trips),
      employee_id: emp?.id || "",
      employee_name: emp?.full_name || emp?.email || "",
    });
    qc.invalidateQueries({ queryKey: ["vegetable-pickups"] });
    setSaving(false);
    onClose();
    setForm({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), trips: "1", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Catat Pengambilan Sayur</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Karyawan *</Label>
            <Select value={form.employee_email} onValueChange={v => set("employee_email", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.email}>{e.full_name || e.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label>Jumlah Trip</Label><Input type="number" value={form.trips} onChange={e => set("trips", e.target.value)} min={1} /></div>
          </div>
          <div><Label>Catatan</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.employee_email}>{saving ? "..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PayrollPage() {
  const { user, role } = useCurrentUser();
  const isOwnerOrManajer = ["owner", "admin", "manajer"].includes(role);
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editConfig, setEditConfig] = useState(null);
  const [showOvertime, setShowOvertime] = useState(false);
  const [showVegetable, setShowVegetable] = useState(false);

  const monthStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");

  const { data: users = [] } = useActiveUsers();
  const { data: salaryConfigs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
  });
  const { data: attendances = [] } = useQuery({
    queryKey: ["attendances-month", monthStart, monthEnd],
    queryFn: () => base44.entities.Attendance.list("-date", 500),
  });
  const { data: overtimeLogs = [] } = useQuery({
    queryKey: ["overtime-logs"],
    queryFn: () => base44.entities.OvertimeLog.list("-date", 300),
  });
  const { data: vegetablePickups = [] } = useQuery({
    queryKey: ["vegetable-pickups"],
    queryFn: () => base44.entities.VegetablePickup.list("-date", 300),
  });
  const { data: bonusRewards = [] } = useQuery({
    queryKey: ["bonus-rewards"],
    queryFn: () => base44.entities.BonusReward.list("-period", 50),
  });
  const { data: kasbons = [] } = useQuery({
    queryKey: ["kasbons"],
    queryFn: () => base44.entities.Kasbon.list("-request_date", 200),
  });

  // Bagian 4: Exclude owner & investor dari rekap gaji
  const employees = users.filter(u => !EXCLUDED_ROLES.includes(u.role) && u.role !== "kicked" && u.role !== "investor");

  const monthAttendances = attendances.filter(a => a.date >= monthStart && a.date <= monthEnd);
  const monthOvertime = overtimeLogs.filter(o => o.date >= monthStart && o.date <= monthEnd);
  const monthVegetable = vegetablePickups.filter(v => v.date >= monthStart && v.date <= monthEnd);

  const payrollData = useMemo(() => {
    return employees.map(emp => {
      const config = salaryConfigs.find(c => c.role === emp.role);
      const salaryType = config?.salary_type || "bulanan";
      const baseSalary = config?.base_salary || 0;
      const overtimeRate = config?.overtime_rate_per_hour || 0;
      const vegRate = config?.vegetable_rate_per_trip || 0;
      const pointValue = config?.point_value || 0;
      const absentDeduction = config?.absent_deduction || 0;

      const empAttendances = monthAttendances.filter(a => a.employee_email === emp.email);
      const hadirDays = empAttendances.filter(a => a.status === "hadir").length;
      const absenDays = empAttendances.filter(a => a.status !== "hadir" && a.status !== "izin" && a.status !== "sakit").length;

      const empOvertime = monthOvertime.filter(o => o.employee_email === emp.email);
      const totalOvertimeHours = empOvertime.reduce((s, o) => s + (o.hours || 0), 0);

      const empVegetable = monthVegetable.filter(v => v.employee_email === emp.email);
      const totalVegTrips = empVegetable.reduce((s, v) => s + (v.trips || 0), 0);

      const period = selectedMonth;
      const empBonus = bonusRewards.find(b => b.employee_email === emp.email && b.period === period);
      const totalPoints = empBonus?.total_points || 0;

      const overtimePay = totalOvertimeHours * overtimeRate;
      const vegPay = totalVegTrips * vegRate;
      const pointPay = totalPoints * pointValue;

      // Bagian 3: Logika sesuai tipe gaji
      let effectiveBaseSalary = baseSalary;
      let deduction = 0;
      if (salaryType === "harian") {
        effectiveBaseSalary = hadirDays * baseSalary;
        deduction = 0;
      } else {
        deduction = absenDays * absentDeduction;
      }

      // Potongan kasbon aktif karyawan ini
      const empKasbons = kasbons.filter(k => k.employee_email === emp.email && k.status === "approved");
      const kasbonDeduction = empKasbons.reduce((s, k) => s + (k.installment_amount || k.weekly_deduction || 0), 0);

      const totalSalary = effectiveBaseSalary + overtimePay + vegPay + pointPay - deduction - kasbonDeduction;

      return {
        emp, config, salaryType, baseSalary, effectiveBaseSalary,
        hadirDays, absenDays, totalOvertimeHours, overtimePay,
        totalVegTrips, vegPay, totalPoints, pointPay, deduction, kasbonDeduction, totalSalary,
      };
    });
  }, [employees, salaryConfigs, monthAttendances, monthOvertime, monthVegetable, bonusRewards, kasbons, selectedMonth]);

  const fmt = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  // Keeper hanya bisa akses tab kasbon
  const isKeeper = role === "keeper";
  if (!canAccess(role, "payroll") && !isKeeper) return <AccessDenied />;

  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get("tab") || "payroll";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Penggajian Karyawan</h1>
          <p className="text-muted-foreground mt-1">Hitung gaji otomatis berdasarkan absensi, lembur, sayur & KPI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40" />
          {isOwnerOrManajer && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/rekap-poin-gaji"><BarChart3 className="w-4 h-4 mr-1.5" /> Rekap Poin & Gaji</Link>
            </Button>
          )}
          {isOwnerOrManajer && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowOvertime(true)}>
                <Clock className="w-4 h-4 mr-1.5" /> Catat Lembur
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowVegetable(true)}>
                <Leaf className="w-4 h-4 mr-1.5" /> Catat Sayur
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue={isKeeper ? "kasbon" : defaultTab}>
        <TabsList className="flex-wrap h-auto">
          {!isKeeper && <TabsTrigger value="payroll"><Calculator className="w-4 h-4 mr-1.5" />Rekap Gaji</TabsTrigger>}
          <TabsTrigger value="kasbon"><CreditCard className="w-4 h-4 mr-1.5" />Kasbon</TabsTrigger>
          {!isKeeper && <TabsTrigger value="config"><Settings className="w-4 h-4 mr-1.5" />Konfigurasi Gaji</TabsTrigger>}
          {!isKeeper && <TabsTrigger value="overtime"><Clock className="w-4 h-4 mr-1.5" />Log Lembur</TabsTrigger>}
          {!isKeeper && <TabsTrigger value="vegetable"><Leaf className="w-4 h-4 mr-1.5" />Log Sayur</TabsTrigger>}
        </TabsList>

        {/* TAB: Rekap Gaji */}
        <TabsContent value="payroll" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Periode: {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: id })}
          </p>
          {payrollData.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Belum ada karyawan</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {payrollData.map(({ emp, config, salaryType, baseSalary, effectiveBaseSalary, hadirDays, absenDays, totalOvertimeHours, overtimePay, totalVegTrips, vegPay, totalPoints, pointPay, deduction, kasbonDeduction, totalSalary }) => (
                <Card key={emp.id} className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {(emp.full_name || emp.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{emp.full_name || emp.email}</p>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant="outline" className="text-xs">{emp.role}</Badge>
                          {config && <Badge variant="outline" className="text-xs bg-muted">{salaryType}</Badge>}
                        </div>
                        {!config && <p className="text-xs text-orange-600 mt-0.5">⚠ Belum ada konfigurasi gaji</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Bersih</p>
                      <p className="text-xl font-bold text-primary">{fmt(totalSalary)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {salaryType === "harian" ? (
                      <>
                        <div className="p-3 rounded-xl bg-green-50 col-span-2 sm:col-span-1">
                          <p className="text-xs text-muted-foreground">Hari Masuk</p>
                          <p className="font-semibold text-green-700">{hadirDays} hari × {fmt(baseSalary)}</p>
                          <p className="font-bold text-green-800">{fmt(effectiveBaseSalary)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 rounded-xl bg-muted/40">
                          <p className="text-xs text-muted-foreground">Gaji Pokok</p>
                          <p className="font-semibold">{fmt(baseSalary)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-green-50">
                          <p className="text-xs text-muted-foreground">Hadir</p>
                          <p className="font-semibold text-green-700">{hadirDays} hari</p>
                        </div>
                      </>
                    )}
                    <div className="p-3 rounded-xl bg-blue-50">
                      <p className="text-xs text-muted-foreground">Lembur</p>
                      <p className="font-semibold text-blue-700">{totalOvertimeHours}j → {fmt(overtimePay)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-lime-50">
                      <p className="text-xs text-muted-foreground">Sayur</p>
                      <p className="font-semibold text-lime-700">{totalVegTrips} trip → {fmt(vegPay)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50">
                      <p className="text-xs text-muted-foreground">Poin KPI</p>
                      <p className="font-semibold text-amber-700">{totalPoints} poin → {fmt(pointPay)}</p>
                    </div>
                    {deduction > 0 && (
                      <div className="p-3 rounded-xl bg-red-50">
                        <p className="text-xs text-muted-foreground">Potongan Absen</p>
                        <p className="font-semibold text-red-600">-{fmt(deduction)} ({absenDays}h)</p>
                      </div>
                    )}
                    {kasbonDeduction > 0 && (
                      <div className="p-3 rounded-xl bg-orange-50">
                        <p className="text-xs text-muted-foreground">Potongan Kasbon</p>
                        <p className="font-semibold text-orange-600">-{fmt(kasbonDeduction)}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Kasbon */}
        <TabsContent value="kasbon" className="mt-4">
          <KasbonTab user={user} role={role} isOwnerOrManajer={isOwnerOrManajer} />
        </TabsContent>

        {/* TAB: Konfigurasi Gaji */}
        <TabsContent value="config" className="mt-4 space-y-4">
          {!isOwnerOrManajer ? (
            <Card className="p-8 text-center text-muted-foreground">Hanya Owner/Manajer/Admin yang dapat mengelola konfigurasi gaji.</Card>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Tentukan besaran gaji pokok, lembur, tunjangan sayur, dan nilai poin per role</p>
                <Button size="sm" onClick={() => { setEditConfig(null); setShowConfigForm(true); }}>
                  <Plus className="w-4 h-4 mr-1.5" /> Tambah Konfigurasi
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {salaryConfigs.map(cfg => (
                  <Card key={cfg.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="capitalize">{cfg.role}</Badge>
                      {isOwnerOrManajer && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditConfig(cfg); setShowConfigForm(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipe Gaji</span>
                        <Badge variant="outline" className="text-xs">{cfg.salary_type === "harian" ? "📆 Harian" : "📅 Bulanan"}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gaji {cfg.salary_type === "harian" ? "Harian" : "Pokok"}</span>
                        <span className="font-medium">{fmt(cfg.base_salary)}/{cfg.salary_type === "harian" ? "hari" : "bln"}</span>
                      </div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tarif Lembur</span><span className="font-medium">{fmt(cfg.overtime_rate_per_hour)}/jam</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tunjangan Sayur</span><span className="font-medium">{fmt(cfg.vegetable_rate_per_trip)}/trip</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Nilai Poin KPI</span><span className="font-medium">{fmt(cfg.point_value)}/poin</span></div>
                      {cfg.salary_type !== "harian" && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Potongan Absen</span><span className="font-medium text-red-600">-{fmt(cfg.absent_deduction)}/hari</span></div>
                      )}
                    </div>
                  </Card>
                ))}
                {salaryConfigs.length === 0 && (
                  <Card className="col-span-full p-8 text-center text-muted-foreground">
                    <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Belum ada konfigurasi gaji. Klik "Tambah Konfigurasi" untuk memulai.</p>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB: Log Lembur */}
        <TabsContent value="overtime" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Log lembur {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: id })}</p>
            {isOwnerOrManajer && <Button size="sm" onClick={() => setShowOvertime(true)}><Plus className="w-4 h-4 mr-1.5" />Catat Lembur</Button>}
          </div>
          {monthOvertime.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Belum ada log lembur bulan ini</Card>
          ) : (
            <div className="space-y-2">
              {monthOvertime.map(o => (
                <Card key={o.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{o.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(o.date), "d MMM yyyy", { locale: id })} · {o.notes || "–"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-blue-700">{o.hours} jam</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Log Sayur */}
        <TabsContent value="vegetable" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Log pengambilan sayur {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: id })}</p>
            {isOwnerOrManajer && <Button size="sm" onClick={() => setShowVegetable(true)}><Plus className="w-4 h-4 mr-1.5" />Catat Sayur</Button>}
          </div>
          {monthVegetable.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Belum ada log pengambilan sayur bulan ini</Card>
          ) : (
            <div className="space-y-2">
              {monthVegetable.map(v => (
                <Card key={v.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{v.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(v.date), "d MMM yyyy", { locale: id })} · {v.notes || "–"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-lime-600" />
                    <span className="font-semibold text-lime-700">{v.trips} trip</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showConfigForm && (
        <SalaryConfigDialog
          open={showConfigForm}
          onClose={() => { setShowConfigForm(false); setEditConfig(null); }}
          editData={editConfig}
        />
      )}
      {showOvertime && (
        <OvertimeDialog open={showOvertime} onClose={() => setShowOvertime(false)} employees={employees} />
      )}
      {showVegetable && (
        <VegetableDialog open={showVegetable} onClose={() => setShowVegetable(false)} employees={employees} />
      )}
    </div>
  );
}