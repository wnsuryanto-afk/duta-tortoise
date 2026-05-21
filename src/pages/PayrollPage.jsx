import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Wallet, Settings, Plus, Calculator, Users, Clock, Leaf, Star, Pencil } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";

const ROLE_OPTIONS = [
  { value: "keeper", label: "Keeper" },
  { value: "admin", label: "Admin" },
  { value: "manajer", label: "Manajer" },
];

function SalaryConfigDialog({ open, onClose, editData }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(editData || {
    role: "keeper", base_salary: "", overtime_rate_per_hour: "",
    vegetable_rate_per_trip: "", point_value: "", absent_deduction: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      base_salary: Number(form.base_salary) || 0,
      overtime_rate_per_hour: Number(form.overtime_rate_per_hour) || 0,
      vegetable_rate_per_trip: Number(form.vegetable_rate_per_trip) || 0,
      point_value: Number(form.point_value) || 0,
      absent_deduction: Number(form.absent_deduction) || 0,
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gaji Pokok (Rp/bulan)</Label>
              <Input type="number" value={form.base_salary} onChange={e => set("base_salary", e.target.value)} placeholder="3000000" />
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
            <div>
              <Label>Potongan Absen (Rp/hari)</Label>
              <Input type="number" value={form.absent_deduction} onChange={e => set("absent_deduction", e.target.value)} placeholder="100000" />
            </div>
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
  const { role } = useCurrentUser();
  const isOwnerOrManajer = ["owner", "admin", "manajer"].includes(role);
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editConfig, setEditConfig] = useState(null);
  const [showOvertime, setShowOvertime] = useState(false);
  const [showVegetable, setShowVegetable] = useState(false);

  const monthStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });
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

  const employees = users.filter(u => ["keeper", "admin", "manajer"].includes(u.role));

  const monthAttendances = attendances.filter(a => a.date >= monthStart && a.date <= monthEnd);
  const monthOvertime = overtimeLogs.filter(o => o.date >= monthStart && o.date <= monthEnd);
  const monthVegetable = vegetablePickups.filter(v => v.date >= monthStart && v.date <= monthEnd);

  const payrollData = useMemo(() => {
    return employees.map(emp => {
      const config = salaryConfigs.find(c => c.role === emp.role);
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
      const deduction = absenDays * absentDeduction;
      const totalSalary = baseSalary + overtimePay + vegPay + pointPay - deduction;

      return {
        emp, config, baseSalary, hadirDays, absenDays,
        totalOvertimeHours, overtimePay, totalVegTrips, vegPay,
        totalPoints, pointPay, deduction, totalSalary,
      };
    });
  }, [employees, salaryConfigs, monthAttendances, monthOvertime, monthVegetable, bonusRewards, selectedMonth]);

  const fmt = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  if (!canAccess(role, "payroll")) return <AccessDenied />;

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

      <Tabs defaultValue="payroll">
        <TabsList>
          <TabsTrigger value="payroll"><Calculator className="w-4 h-4 mr-1.5" />Rekap Gaji</TabsTrigger>
          <TabsTrigger value="config"><Settings className="w-4 h-4 mr-1.5" />Konfigurasi Gaji</TabsTrigger>
          <TabsTrigger value="overtime"><Clock className="w-4 h-4 mr-1.5" />Log Lembur</TabsTrigger>
          <TabsTrigger value="vegetable"><Leaf className="w-4 h-4 mr-1.5" />Log Sayur</TabsTrigger>
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
              {payrollData.map(({ emp, config, baseSalary, hadirDays, absenDays, totalOvertimeHours, overtimePay, totalVegTrips, vegPay, totalPoints, pointPay, deduction, totalSalary }) => (
                <Card key={emp.id} className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {(emp.full_name || emp.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{emp.full_name || emp.email}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">{emp.role}</Badge>
                        {!config && <p className="text-xs text-orange-600 mt-0.5">⚠ Belum ada konfigurasi gaji</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Gaji</p>
                      <p className="text-xl font-bold text-primary">{fmt(totalSalary)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-muted/40">
                      <p className="text-xs text-muted-foreground">Gaji Pokok</p>
                      <p className="font-semibold">{fmt(baseSalary)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-50">
                      <p className="text-xs text-muted-foreground">Hadir</p>
                      <p className="font-semibold text-green-700">{hadirDays} hari</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50">
                      <p className="text-xs text-muted-foreground">Lembur</p>
                      <p className="font-semibold text-blue-700">{totalOvertimeHours} jam → {fmt(overtimePay)}</p>
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
                        <p className="font-semibold text-red-600">-{fmt(deduction)} ({absenDays} hari)</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
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
                      <div className="flex justify-between"><span className="text-muted-foreground">Gaji Pokok</span><span className="font-medium">{fmt(cfg.base_salary)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tarif Lembur</span><span className="font-medium">{fmt(cfg.overtime_rate_per_hour)}/jam</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tunjangan Sayur</span><span className="font-medium">{fmt(cfg.vegetable_rate_per_trip)}/trip</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Nilai Poin KPI</span><span className="font-medium">{fmt(cfg.point_value)}/poin</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Potongan Absen</span><span className="font-medium text-red-600">-{fmt(cfg.absent_deduction)}/hari</span></div>
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