import { useState, useMemo } from "react";
import PanelKasbon from "@/components/kasbon/PanelKasbon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { useTestMode } from "@/lib/useTestMode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Plus, Calculator, Users, Clock, Leaf, Pencil, CreditCard, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import { sudahAdaRempesan, tripSah } from "@/lib/rempesan";
import AccessDenied from "@/components/common/AccessDenied";
import { hitungGajiKaryawan, karyawanBergaji } from "@/lib/hitungGaji";
import { useCompanySettings } from "@/lib/useCompanySettings";
import { rupiah } from "@/lib/rupiah";

const MAX_KASBON = 1000000;

/*
 * KasbonTab yang dulu ditulis lengkap di sini DIBUANG pada 30-09-2026.
 *
 * Ia implementasi KEDUA dari layar kasbon, dan aturannya berbeda dari
 * halaman /kasbon: pinjaman kedua boleh asal total <= Rp 1.000.000
 * (halaman itu melarangnya sama sekali), dan potongan mingguannya
 * amount/(1|2|4) alih-alih tetap Rp 100.000 — sehingga rencana "1x"
 * memotong seluruh pinjaman dari gaji satu minggu.
 *
 * Orang yang sama mengajukan lewat pintu berbeda mendapat jawaban
 * berbeda. Sekarang keduanya memakai components/kasbon/PanelKasbon.jsx;
 * catatan lengkapnya ada di sana.
 */

// Bagian 4: Exclude owner & investor dari konfigurasi gaji
const ROLE_OPTIONS = [
  { value: "manajer", label: "Manajer" },
  { value: "admin", label: "Admin" },
  { value: "kepala_feeder", label: "Kepala Feeder" },
  { value: "keeper", label: "Keeper" },
];

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
  const { testModeTag } = useTestMode();
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
      ...testModeTag,
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

/**
 * Pemilik mencatatkan trip ambil sayur atas nama karyawan.
 *
 * Dulu menulis `VegetablePickup` — entitas yang tidak dibaca oleh satu pun
 * layar yang menerbitkan slip, jadi trip yang dicatat di sini tidak pernah
 * sampai ke gaji siapa pun. Sekarang menulis `RempesanLog`, sumber yang sama
 * dengan slip mingguan dan bulanan.
 *
 * Langsung berstatus `approved`: yang mencatat adalah pemilik, dan pemilik
 * adalah yang menyetujui — meminta dia menyetujui catatannya sendiri hanya
 * menambah satu ketukan tanpa menambah pengawasan apa pun.
 *
 * Kolom "Jumlah Trip" dihapus. Ia dulu boleh diisi lebih dari satu dan
 * dijumlahkan tanpa membuang tanggal kembar, padahal slip mingguan, halaman
 * Rempesan, dan formulir keeper semuanya sepakat maksimal satu trip per hari.
 */
function VegetableDialog({ open, onClose, employees }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), weight_kg: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [galat, setGalat] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const emp = employees.find(e => e.email === form.employee_email);
    setSaving(true);
    setGalat("");
    try {
      // Dibaca ulang dari server tepat sebelum membuat — penjaga yang sama
      // dipakai formulir keeper. Satu trip per hari berlaku untuk siapa pun
      // yang mencatatnya, termasuk pemilik.
      const adaDulu = await base44.entities.RempesanLog.filter({
        employee_email: form.employee_email,
        date: form.date,
      });
      if (sudahAdaRempesan(adaDulu, form.employee_email, form.date)) {
        setGalat("Tanggal ini sudah punya catatan rempesan — satu trip per hari.");
        setSaving(false);
        return;
      }
      await base44.entities.RempesanLog.create({
        employee_email: form.employee_email,
        employee_name: emp?.full_name || emp?.email || "",
        employee_id: emp?.id || "",
        date: form.date,
        weight_kg: Number(form.weight_kg) || 0,
        notes: form.notes || "",
        status: "approved",
        approved_by: "Dicatat pemilik di Hitung Gaji",
        approved_date: format(new Date(), "yyyy-MM-dd"),
        recorded_by_name: "Pemilik",
      });
      qc.invalidateQueries({ queryKey: ["rempesan-logs"] });
      setSaving(false);
      onClose();
      setForm({ employee_email: "", date: format(new Date(), "yyyy-MM-dd"), weight_kg: "", notes: "" });
    } catch (e) {
      setGalat(e?.message || "Gagal menyimpan.");
      setSaving(false);
    }
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
            <div><Label>Berat (kg)</Label><Input type="number" step="0.1" min="0" value={form.weight_kg} onChange={e => set("weight_kg", e.target.value)} placeholder="opsional" /></div>
          </div>
          <div><Label>Catatan</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">
            Tercatat langsung sebagai <b>disetujui</b> — satu trip per hari, masuk slip periode itu.
          </p>
          {galat && <p className="text-xs text-destructive">{galat}</p>}
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

  const monthStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
  // lib/hitungGaji memakai batas atas EKSKLUSIF (date < akhir); memberi
  // tanggal terakhir bulan akan membuang catatan hari terakhir.
  const monthEndExclusive = format(
    new Date(new Date(selectedMonth + "-01").setMonth(new Date(selectedMonth + "-01").getMonth() + 1)),
    "yyyy-MM-dd",
  );

  const settings = useCompanySettings();
  const { data: dailyChecklists = [] } = useQuery({
    queryKey: ["payroll-daily-checklists", selectedMonth],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 1000),
  });

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
  // Dulu halaman ini membaca `VegetablePickup`, entitas yang hanya ditulis oleh
  // dialog "Catat Sayur" di halaman ini sendiri — dan tidak dibaca oleh satu
  // pun layar yang benar-benar menerbitkan slip. Jadi trip yang dicatat pemilik
  // di sini tidak pernah sampai ke gaji siapa pun. Sekarang sumbernya sama
  // dengan slip mingguan dan bulanan: RempesanLog.
  const { data: rempesanLogs = [] } = useQuery({
    queryKey: ["rempesan-logs"],
    queryFn: () => base44.entities.RempesanLog.list("-date", 300),
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
  // Definisi bersama, sama dengan layar yang menerbitkan slip. Saringan lama
  // "semua kecuali owner/investor/kicked" ikut memasukkan admin dan manajer —
  // dua orang yang tidak akan pernah menerima slip dari aplikasi ini, dan yang
  // gaji pokoknya dihitung flat tanpa memandang kehadiran. Lihat PERAN_BERGAJI
  // di lib/hitungGaji.js.
  const employees = karyawanBergaji(users);

  const monthAttendances = attendances.filter(a => a.date >= monthStart && a.date <= monthEnd);
  const monthOvertime = overtimeLogs.filter(o => o.date >= monthStart && o.date <= monthEnd);
  const monthRempesan = rempesanLogs.filter(r => r.date >= monthStart && r.date <= monthEnd);

  /**
   * Ringkasan trip per orang untuk tab "Log Sayur".
   *
   * Tab itu dulu menerima PETA `{email: {trips, dates}}` dari `useVegTrips`.
   * Saat sumbernya dipindah ke RempesanLog, yang berganti hanya NAMA
   * variabelnya — `rempesanLogs` adalah DAFTAR catatan, bukan peta. JSX-nya
   * tetap memanggil `Object.entries(...)` dan membaca `data.trips`/`data.dates`
   * yang tidak ada pada sebuah catatan.
   *
   * Hari ini RempesanLog kosong, jadi `Object.keys([])` bernilai nol dan
   * halaman itu menampilkan "Belum ada trip" — jawaban yang benar karena
   * kebetulan. Begitu ada SATU catatan, tiap baris akan bernama "0", "1", "2"
   * (indeks arraynya), tanggalnya "–", dan jumlah tripnya kosong.
   *
   * Yang ditampilkan adalah yang DIBAYAR: `tripSah` menyaring ke yang
   * disetujui dan membuang tanggal kembar, aturan yang sama dengan slipnya.
   * Yang masih menunggu persetujuan ikut disebut terpisah — pemilik membuka
   * halaman ini justru pada saat ia peduli bahwa ada yang perlu disetujui.
   */
  const ringkasTrip = useMemo(() => {
    const peta = new Map();
    const ambil = (email) => {
      if (!peta.has(email)) peta.set(email, { trips: 0, dates: [], menunggu: 0 });
      return peta.get(email);
    };
    for (const l of tripSah(monthRempesan)) {
      const b = ambil(l.employee_email);
      b.trips += 1;
      b.dates.push(l.date);
    }
    for (const l of monthRempesan) {
      if (l?.status === "pending" && l.employee_email) ambil(l.employee_email).menunggu += 1;
    }
    return [...peta.entries()]
      .map(([email, d]) => ({ email, ...d, dates: d.dates.sort() }))
      .sort((x, y) => y.trips - x.trips);
  }, [monthRempesan]);


  /**
   * SATU rumus gaji — lib/hitungGaji.js.
   *
   * Layar ini menghitung sendiri, dan salinannya adalah yang paling jauh
   * menyimpang dari tiga salinan yang ada. Tiga selisih yang nyata:
   *
   *   1. Poin hanya diambil dari BonusReward. Poin DailyChecklist — sumber
   *      hampir seluruh poin kiper — tidak dihitung sama sekali. Untuk Agustus
   *      2026 itu berarti Rp 515.625 tidak muncul (3.722 + 3.153 poin x Rp 75),
   *      sementara BonusReward bulan itu kosong.
   *   2. Uang sayur dibaca dari VegetablePickup, yang tidak berisi satu catatan
   *      pun. Sumber sebenarnya sekarang RempesanLog yang sudah disetujui.
   *   3. Kasbon dijumlahkan tanpa memeriksa sisa maupun apakah sudah dipotong
   *      untuk periode ini, sehingga kasbon lunas tetap ikut memotong.
   *
   * Layar ini memang tidak menerbitkan slip — ia hanya menampilkan. Tapi
   * namanya "Penggajian Karyawan", dan angka yang ditampilkannya bukan angka
   * yang dibayarkan. Sekarang ia memanggil pustaka yang sama dengan penerbit.
   */
  const payrollData = useMemo(() => {
    const sumber = {
      salaryConfigs,
      checklists: dailyChecklists,
      bonusRewards,
      attendances: monthAttendances,
      overtimeLogs: monthOvertime,
      rempesanLogs,
      kasbons,
      periode: selectedMonth,
      awal: monthStart,
      akhir: monthEndExclusive,
      targetPoin: settings.min_poin_bulanan || 0,
      companySettings: settings,
    };

    return employees.map((emp) => {
      const h = hitungGajiKaryawan(emp, sumber);
      return {
        emp,
        config: h.config,
        salaryType: h.harian ? "harian" : "bulanan",
        baseSalary: h.config?.base_salary || 0,
        effectiveBaseSalary: h.gajiPokok,
        hadirDays: h.hariHadir,
        absenDays: h.hariAbsen,
        totalOvertimeHours: h.jamLembur,
        overtimePay: h.upahLembur,
        totalVegTrips: h.tripSayur,
        vegPay: h.upahSayur,
        totalPoints: h.totalPoin,
        pointPay: h.bonusPoin,
        deduction: h.potonganAbsen,
        kasbonDeduction: h.potonganKasbon,
        totalSalary: h.bersih,
      };
    });
  }, [employees, salaryConfigs, dailyChecklists, monthAttendances, monthOvertime, rempesanLogs, bonusRewards, kasbons, selectedMonth, monthStart, monthEndExclusive, settings]);


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
                      <p className="text-xl font-bold text-primary">{rupiah(totalSalary)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {salaryType === "harian" ? (
                      <>
                        <div className="p-3 rounded-xl bg-green-50 col-span-2 sm:col-span-1">
                          <p className="text-xs text-muted-foreground">Hari Masuk</p>
                          <p className="font-semibold text-green-700">{hadirDays} hari × {rupiah(baseSalary)}</p>
                          <p className="font-bold text-green-800">{rupiah(effectiveBaseSalary)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 rounded-xl bg-muted/40">
                          <p className="text-xs text-muted-foreground">Gaji Pokok</p>
                          <p className="font-semibold">{rupiah(baseSalary)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-green-50">
                          <p className="text-xs text-muted-foreground">Hadir</p>
                          <p className="font-semibold text-green-700">{hadirDays} hari</p>
                        </div>
                      </>
                    )}
                    <div className="p-3 rounded-xl bg-blue-50">
                      <p className="text-xs text-muted-foreground">Lembur</p>
                      <p className="font-semibold text-blue-700">{totalOvertimeHours}j → {rupiah(overtimePay)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-lime-50">
                      <p className="text-xs text-muted-foreground">Sayur</p>
                      <p className="font-semibold text-lime-700">{totalVegTrips} trip → {rupiah(vegPay)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50">
                      <p className="text-xs text-muted-foreground">Poin KPI</p>
                      <p className="font-semibold text-amber-700">{totalPoints} poin → {rupiah(pointPay)}</p>
                    </div>
                    {deduction > 0 && (
                      <div className="p-3 rounded-xl bg-red-50">
                        <p className="text-xs text-muted-foreground">Potongan Absen</p>
                        <p className="font-semibold text-red-600">-{rupiah(deduction)} ({absenDays}h)</p>
                      </div>
                    )}
                    {kasbonDeduction > 0 && (
                      <div className="p-3 rounded-xl bg-orange-50">
                        <p className="text-xs text-muted-foreground">Potongan Kasbon</p>
                        <p className="font-semibold text-orange-600">-{rupiah(kasbonDeduction)}</p>
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
          <PanelKasbon tanpaKepala />
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
                        <span className="font-medium">{rupiah(cfg.base_salary)}/{cfg.salary_type === "harian" ? "hari" : "bln"}</span>
                      </div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tarif Lembur</span><span className="font-medium">{rupiah(cfg.overtime_rate_per_hour)}/jam</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tunjangan Sayur</span><span className="font-medium">{rupiah(cfg.vegetable_rate_per_trip)}/trip</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Nilai Poin KPI</span><span className="font-medium">{rupiah(cfg.point_value)}/poin</span></div>
                      {cfg.salary_type !== "harian" && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Potongan Absen</span><span className="font-medium text-red-600">-{rupiah(cfg.absent_deduction)}/hari</span></div>
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
          {/*
            Sumbernya RempesanLog — sama dengan yang membayar di slip mingguan
            maupun bulanan. Bentuk datanya DAFTAR catatan, bukan peta per orang;
            ringkasannya dibuat di `ringkasTrip` di atas. Lihat komentar di sana
            untuk apa yang dulu salah.

            Sebelumnya tab ini punya formnya sendiri yang menulis ke entitas
            VegetablePickup, dan penghitung gaji tidak pernah membacanya. Form
            itu dihapus; pencatatan atas nama karyawan kini lewat dialog "Catat
            Sayur" di halaman ini, yang menulis RempesanLog langsung disetujui.
          */}
          <p className="text-sm text-muted-foreground">
            Trip rempesan {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: id })} — dari catatan rempesan yang sudah disetujui, satu trip per orang per hari
          </p>
          {ringkasTrip.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Belum ada trip rempesan bulan ini
            </Card>
          ) : (
            <div className="space-y-2">
              {ringkasTrip.map((r) => {
                const emp = users.find((u) => u.email === r.email);
                return (
                  <Card key={r.email} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{emp?.full_name || r.email}</p>
                      <p className="text-xs text-muted-foreground break-words">
                        {r.dates.map((d) => format(new Date(d), "d MMM", { locale: id })).join(" · ") || "–"}
                      </p>
                      {r.menunggu > 0 && (
                        <Link to="/rempesan" className="text-xs text-amber-600 hover:underline">
                          {r.menunggu} lagi menunggu persetujuan — belum dibayar
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Leaf className="w-4 h-4 text-lime-600" />
                      <span className="font-semibold text-lime-700 tabular-nums">{r.trips} trip</span>
                    </div>
                  </Card>
                );
              })}
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
    </div>
  );
}