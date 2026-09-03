import { hitungGajiKaryawan, karyawanBergaji } from "@/lib/hitungGaji";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Star, TrendingUp, FileText, CheckCircle2, Loader2, Eye, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, formatRole } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { toast } from "sonner";
import SalarySlipDetail from "@/components/salary/SalarySlipDetail";
import { useCompanySettings } from "@/lib/useCompanySettings";
import AlurGaji from "@/components/salary/AlurGaji";
import { useVegTrips } from "@/hooks/useVegTrips";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function RekapPoinGajiPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [generating, setGenerating] = useState(null);
  const [viewSlip, setViewSlip] = useState(null);

  const settings = useCompanySettings();
  const TARGET_POIN_SETTING = settings.min_poin_bulanan || 0;
  const NILAI_PER_POIN_SETTING = settings.nilai_per_poin || 0;
  // Sakelar bonus poin dihormati di dalam lib/hitungGaji.js, tidak lagi di sini.

  const { data: users = [] } = useActiveUsers();

  const { data: salaryConfigs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
  });

  const { data: bonusRewards = [] } = useQuery({
    queryKey: ["bonus-rewards"],
    queryFn: () => base44.entities.BonusReward.list("-period", 200),
  });

  const { data: dailyChecklists = [] } = useQuery({
    queryKey: ["daily-checklists-month", selectedMonth],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 500),
  });

  const { data: slips = [] } = useQuery({
    queryKey: ["salary-slips"],
    queryFn: () => base44.entities.SalarySlip.list("-period", 200),
  });

  const { data: kasbons = [] } = useQuery({
    queryKey: ["kasbons"],
    queryFn: () => base44.entities.Kasbon.list("-request_date", 200),
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["attendances-all"],
    queryFn: () => base44.entities.Attendance.list("-date", 500),
  });

  const { data: overtimeLogs = [] } = useQuery({
    queryKey: ["overtime-logs"],
    queryFn: () => base44.entities.OvertimeLog.list("-date", 300),
  });

  const { data: vegTripsMap = {} } = useVegTrips(selectedMonth);

  const monthStart = selectedMonth + "-01";
  const monthEnd = format(new Date(selectedMonth + "-01").setMonth(new Date(selectedMonth + "-01").getMonth() + 1), "yyyy-MM") + "-01";

  const employees = karyawanBergaji(users);

  /**
   * SATU rumus gaji — lib/hitungGaji.js.
   *
   * Halaman ini dulu menuliskan ulang seluruh perhitungan gaji baris demi
   * baris: nilai poin, gaji pokok, potongan absen, lembur, uang sayur, kasbon,
   * sampai penjumlahan akhir. Rumusnya memang sudah disamakan dengan pustaka
   * secara manual, tetapi tidak ada apa pun yang menjaganya tetap sama — dan
   * halaman inilah yang benar-benar MENERBITKAN slip. Setiap perbaikan di
   * pustaka (mis. sakelar poin_bonus_enabled, atau menyaring data Mode Uji)
   * harus diingat untuk disalin ke sini, dan sejarahnya menunjukkan itu tidak
   * terjadi.
   *
   * Sekarang halaman ini memanggil pustakanya, lalu hanya memetakan hasilnya ke
   * nama kolom yang dipakai tabel dan penyusun slip di bawah.
   */
  const rekapData = useMemo(() => {
    const sumber = {
      salaryConfigs,
      checklists: dailyChecklists,
      bonusRewards,
      attendances,
      overtimeLogs,
      vegTripsMap,
      kasbons,
      periode: selectedMonth,
      awal: monthStart,
      akhir: monthEnd,
      targetPoin: TARGET_POIN_SETTING,
      companySettings: settings,
    };

    return employees.map((emp) => {
      const h = hitungGajiKaryawan(emp, sumber);
      return {
        emp,
        config: h.config,
        totalPoin: h.totalPoin,
        targetTercapai: h.targetTercapai,
        selisihPoin: h.selisihPoin,
        bonus: h.bonusPoin,
        potonganPoin: 0,
        kpiBonus: h.bonusPoin,
        netTotal: h.bersih,
        effectiveBase: h.gajiPokok,
        overtimePay: h.upahLembur,
        vegPay: h.upahSayur,
        vegTrips: h.tripSayur,
        vegDates: h.tanggalSayur,
        deduction: h.potonganAbsen,
        kasbonDeduction: h.potonganKasbon,
        kasbonIdsToDeduct: h.idKasbonDipotong,
        kasbonRemaining: h.sisaKasbon,
        hadirDays: h.hariHadir,
        hariLibur: h.hariLibur,
        hariTanpaCatatan: h.hariTanpaCatatan,
        pekanPenuh: h.pekanPenuh,
        bonusPekanPenuh: h.bonusPekanPenuh,
        pointValue: h.nilaiPoin,
        existingSlip: slips.find(
          (sl) => sl.employee_email === emp.email && sl.period === selectedMonth,
        ),
      };
    });
  }, [employees, salaryConfigs, bonusRewards, dailyChecklists, slips, kasbons, attendances, overtimeLogs, vegTripsMap, selectedMonth, monthStart, monthEnd, TARGET_POIN_SETTING, settings]);

  if (!canAccess(role, "payroll")) return <AccessDenied />;

  // Render SalarySlipDetail modal jika ada viewSlip.
  // Nama karyawan di-resolve dari entity User berdasarkan email supaya
  // perubahan nama di Manajemen User langsung terlihat di slip.
  if (viewSlip) {
    const slipUser = users.find((u) => u.email === viewSlip.employee_email);
    const resolvedSlip = slipUser?.full_name
      ? { ...viewSlip, employee_name: slipUser.full_name }
      : viewSlip;
    return (
      <SalarySlipDetail
        slip={resolvedSlip}
        companySettings={settings}
        onClose={() => {
          setViewSlip(null);
          qc.invalidateQueries({ queryKey: ["salary-slips"] });
        }}
      />
    );
  }

  /**
   * SATU susunan data slip, dipakai tombol per-orang MAUPUN "Generate Semua".
   *
   * Sebelumnya keduanya menyusun objek yang sama secara terpisah, dan salinan
   * di "Generate Semua" tertinggal: ia tidak menulis nilai_poin_saat_itu,
   * target_poin_saat_itu, maupun attend_days. Akibatnya nyata dan sempat
   * tersimpan - dua slip Agustus 2026 punya bonus poin Rp 166.450 dengan
   * catatan nilai poin 0, dan gaji pokok terisi dengan hari hadir 0. Slip
   * seperti itu tidak bisa direkonstruksi lagi setelah tarifnya berubah.
   *
   * Karena itu susunannya sekarang hanya ada di satu tempat.
   */
  const bangunDataSlip = (row) => ({
    employee_id: row.emp.id,
    employee_name: row.emp.full_name || row.emp.email,
    employee_email: row.emp.email,
    employee_role: row.emp.role,
    period: selectedMonth,
    period_type: "monthly",
    base_salary: row.effectiveBase,
    attend_days: row.hadirDays,
    kpi_bonus: row.kpiBonus,
    // Bonus pekan penuh dicatat TERPISAH, bukan dilebur ke base_salary.
    // Kalau dilebur, slip lama tidak bisa lagi menjawab "kenapa gaji
    // pokoknya lebih besar daripada hari hadir x tarif".
    pekan_penuh: row.pekanPenuh,
    bonus_pekan_penuh: row.bonusPekanPenuh,
    overtime_pay: row.overtimePay,
    vegetable_pay: row.vegPay,
    vegetable_trips: row.vegTrips,
    vegetable_trip_dates: row.vegDates,
    absent_deduction: row.deduction,
    kasbon_deduction: row.kasbonDeduction,
    kasbon_ids: row.kasbonIdsToDeduct,
    kasbon_remaining: row.kasbonRemaining,
    net_total: row.netTotal,
    total_poin: row.totalPoin,
    // Snapshot tarif & target SAAT slip dibuat. Tanpa ini, rincian
    // "N poin x Rp X" pada slip lama ikut berubah setiap kali tarifnya diubah,
    // sehingga tidak lagi cocok dengan jumlah yang benar-benar dibayarkan.
    nilai_poin_saat_itu: row.pointValue,
    target_poin_saat_itu: TARGET_POIN_SETTING,
    poin_bonus: row.bonus,
    poin_deduction: row.potonganPoin,
    poin_status: row.targetTercapai ? "Tercapai" : `Kurang ${row.selisihPoin} poin`,
    status: "draft",
    generated_date: format(new Date(), "yyyy-MM-dd"),
  });

  const handleGenerateSlip = async (row) => {
    setGenerating(row.emp.id);
    const data = bangunDataSlip(row);
    let slipId;
    if (row.existingSlip) {
      await base44.entities.SalarySlip.update(row.existingSlip.id, data);
      slipId = row.existingSlip.id;
      toast.success(`Slip gaji ${row.emp.full_name || row.emp.email} diperbarui`);
    } else {
      const created = await base44.entities.SalarySlip.create(data);
      slipId = created.id;
      toast.success(`Slip gaji ${row.emp.full_name || row.emp.email} dibuat`);
    }
    // Update kasbon: total_paid + deduction_log (anti-dobel via salary_slip_id)
    for (const kasbonId of row.kasbonIdsToDeduct || []) {
      const k = kasbons.find(kk => kk.id === kasbonId);
      if (!k) continue;
      const sisaK = (k.amount || 0) - (k.total_paid || 0);
      if (sisaK <= 0) continue;
      const deduction = Math.min(k.weekly_deduction || 100000, sisaK);
      const newPaid = (k.total_paid || 0) + deduction;
      const newStatus = newPaid >= k.amount ? "lunas" : "approved";
      const newLog = [...(k.deduction_log || []), {
        amount: deduction,
        date: format(new Date(), "yyyy-MM-dd"),
        method: "salary_slip",
        salary_period: selectedMonth,
        salary_slip_id: slipId,
        recorded_by: user?.full_name || user?.email,
      }];
      await base44.entities.Kasbon.update(k.id, {
        total_paid: newPaid,
        status: newStatus,
        deduction_log: newLog,
      });
    }
    if ((row.kasbonIdsToDeduct || []).length > 0) {
      qc.invalidateQueries({ queryKey: ["kasbons"] });
    }
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    setGenerating(null);
  };

  const totalPoinTertinggi = Math.max(...rekapData.map(r => r.totalPoin), 0);
  const totalGaji = rekapData.reduce((s, r) => s + r.netTotal, 0);

  const handleGenerateAll = async () => {
    setGenerating("all");
    for (const row of rekapData) {
      const data = bangunDataSlip(row);
      let slipId;
      if (row.existingSlip) {
        await base44.entities.SalarySlip.update(row.existingSlip.id, data);
        slipId = row.existingSlip.id;
      } else {
        const created = await base44.entities.SalarySlip.create(data);
        slipId = created.id;
      }
      for (const kasbonId of row.kasbonIdsToDeduct || []) {
        const k = kasbons.find(kk => kk.id === kasbonId);
        if (!k) continue;
        const sisaK = (k.amount || 0) - (k.total_paid || 0);
        if (sisaK <= 0) continue;
        const deduction = Math.min(k.weekly_deduction || 100000, sisaK);
        const newPaid = (k.total_paid || 0) + deduction;
        const newStatus = newPaid >= k.amount ? "lunas" : "approved";
        const newLog = [...(k.deduction_log || []), {
          amount: deduction,
          date: format(new Date(), "yyyy-MM-dd"),
          method: "salary_slip",
          salary_period: selectedMonth,
          salary_slip_id: slipId,
          recorded_by: user?.full_name || user?.email,
        }];
        await base44.entities.Kasbon.update(k.id, {
          total_paid: newPaid,
          status: newStatus,
          deduction_log: newLog,
        });
      }
    }
    qc.invalidateQueries({ queryKey: ["salary-slips"] });
    qc.invalidateQueries({ queryKey: ["kasbons"] });
    toast.success(`${rekapData.length} slip gaji berhasil dibuat/diperbarui`);
    setGenerating(null);
  };

  return (
    <div className="space-y-6">
      <AlurGaji aktif="hitung" periode={selectedMonth} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Rekap Poin & Generate Slip Gaji Rutin</h1>
          <p className="text-muted-foreground text-sm">Kalkulasi KPI, poin, dan gaji rutin per karyawan · Generate slip untuk dicetak</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAll}
            disabled={generating !== null || rekapData.length === 0}
            className="gap-1.5"
          >
            {generating === "all" ? <><span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" /> Generating...</> : <><FileText className="w-3.5 h-3.5" /> Generate Semua</>}
          </Button>
        </div>
      </div>

      {NILAI_PER_POIN_SETTING === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Nilai per poin belum diatur (Rp 0). Atur di halaman Pengaturan Poin & Simulasi.
        </div>
      )}
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <Users className="w-5 h-5 text-primary mb-1.5" />
          <p className="text-2xl font-bold">{employees.length}</p>
          <p className="text-xs text-muted-foreground">Karyawan</p>
        </Card>
        <Card className="p-4">
          <Star className="w-5 h-5 text-amber-500 mb-1.5" />
          <p className="text-2xl font-bold">{totalPoinTertinggi}</p>
          <p className="text-xs text-muted-foreground">Poin Tertinggi</p>
        </Card>
        <Card className="p-4">
          <CheckCircle2 className="w-5 h-5 text-green-500 mb-1.5" />
          <p className="text-2xl font-bold">{rekapData.filter(r => r.targetTercapai).length}</p>
          <p className="text-xs text-muted-foreground">Capai Target</p>
        </Card>
        <Card className="p-4">
          <TrendingUp className="w-5 h-5 text-primary mb-1.5" />
          <p className="text-lg font-bold text-primary">{fmt(totalGaji)}</p>
          <p className="text-xs text-muted-foreground">Total Gaji</p>
        </Card>
      </div>

      {/* Tabel rekap */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Rekap per Karyawan — {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: id })}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Target minimum: {TARGET_POIN_SETTING} poin/bulan · Nilai: {fmt(NILAI_PER_POIN_SETTING)}/poin</p>
        </div>
        <div className="divide-y">
          {rekapData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Belum ada karyawan</p>
            </div>
          ) : rekapData.map((row) => (
            <div key={row.emp.id} className="p-4 hover:bg-muted/20 transition-colors">
              {/*
                HARI TANPA CATATAN ABSENSI — ditampilkan SEBELUM slip diterbitkan.

                Gaji pokok dihitung dari hari masuk, jadi setiap hari yang
                absensinya tidak terisi diam-diam memotong Rp 70.000 tanpa ada
                yang pernah memutuskannya. Pada Agustus 2026 ada enam hari
                seperti itu pada Angsolo (Rp 420.000) dan empat pada
                Sholehuddin — dan tidak ada satu layar pun yang menyebutkannya.

                Aplikasi TIDAK menebak isinya. Ia hanya menolak diam: tanggalnya
                disebutkan supaya bisa dikejar sekarang, bukan ditemukan nanti
                di slip gaji yang sudah dibayar.
              */}
              {row.hariTanpaCatatan?.length > 0 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-2.5">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    {row.hariTanpaCatatan.length} hari tanpa catatan absensi — berpotensi
                    kurang bayar {fmt(row.hariTanpaCatatan.length * (row.config?.base_salary || 0))}
                  </p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 break-words">
                    {row.hariTanpaCatatan.join(", ")}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Bukan berarti tidak masuk — berarti belum diisi. Tandai libur atau isi
                    absensinya dulu sebelum slip diterbitkan.
                  </p>
                </div>
              )}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Info karyawan */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                    {(row.emp.full_name || row.emp.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{row.emp.full_name || row.emp.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[11px]">{formatRole(row.emp.role)}</Badge>
                      {row.pekanPenuh > 0 && (
                        <Badge className="text-[10px] bg-green-100 text-green-700">
                          {row.pekanPenuh} pekan penuh
                        </Badge>
                      )}
                      {row.hariLibur > 0 && (
                        <Badge className="text-[10px] bg-slate-100 text-slate-600">
                          {row.hariLibur} hari libur
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1">
                  {/* Total Poin */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Total Poin</p>
                    <p className="text-xl font-bold">{row.totalPoin}</p>
                    {row.targetTercapai ? (
                      <Badge className="text-[10px] bg-green-100 text-green-700 mt-0.5">✓ Target</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-red-100 text-red-700 mt-0.5">✗ -{row.selisihPoin} poin</Badge>
                    )}
                  </div>

                  {/* Bonus Poin */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Bonus KPI</p>
                    <p className={`text-sm font-bold ${row.kpiBonus >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {row.kpiBonus >= 0 ? "+" : ""}{fmt(row.kpiBonus)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {row.totalPoin}p × {fmt(row.pointValue)}
                      {row.potonganPoin > 0 && ` − ${fmt(row.potonganPoin)}`}
                    </p>
                  </div>

                  {/* Gaji Pokok */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Gaji Pokok</p>
                    <p className="text-sm font-semibold">{fmt(row.effectiveBase)}</p>
                    {row.overtimePay > 0 && <p className="text-[10px] text-blue-600">+{fmt(row.overtimePay)} lembur</p>}
                  </div>

                  {/* Potongan */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Potongan</p>
                    <p className="text-sm font-semibold text-red-600">
                      -{fmt(row.deduction + row.kasbonDeduction)}
                    </p>
                    {row.kasbonDeduction > 0 && <p className="text-[10px] text-orange-600">kasbon: {fmt(row.kasbonDeduction)}</p>}
                  </div>

                  {/* Total Gaji */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Take Home</p>
                    <p className="text-base font-bold text-primary">{fmt(row.netTotal)}</p>
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
                  <div className="flex gap-1.5">
                    {row.existingSlip && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewSlip(row.existingSlip)}
                        className="gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={row.existingSlip ? "outline" : "default"}
                      onClick={() => handleGenerateSlip(row)}
                      disabled={generating === row.emp.id}
                    >
                      {generating === row.emp.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 mr-1" />
                      )}
                      {row.existingSlip ? "Update" : "Generate"}
                    </Button>
                  </div>
                  {row.existingSlip && (
                    <Badge className={`text-[10px] ${
                      row.existingSlip.status === "paid" ? "bg-green-100 text-green-700" :
                      row.existingSlip.status === "approved" ? "bg-blue-100 text-blue-700" :
                      "bg-muted text-foreground"
                    }`}>
                      {row.existingSlip.status === "paid" ? "✓ Dibayar" :
                       row.existingSlip.status === "approved" ? "Disetujui" : "Draft"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}