import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, TrendingUp, Users, Filter, Star, CheckCircle2, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, formatRole } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import SalarySlipDetail from "@/components/salary/SalarySlipDetail";
import WeeklySlipManager from "@/components/salary/WeeklySlipManager";
import { useCompanySettings } from "@/lib/useCompanySettings";
import { formatWeekLabel, safeFormatDate, isMonthPeriod } from "@/lib/weeklySalaryUtils";
import AlurGaji from "@/components/salary/AlurGaji";
import { useEmployeeUsers } from "@/hooks/useEmployeeUsers";
import { ringkasUangSlip, rupaStatusSlip } from "@/lib/slipGaji";
import PageHeader from "@/components/common/PageHeader";
import { WalletArt } from "@/components/common/Illustration";
import { Receipt } from "lucide-react";

// Rupa status pindah ke lib/slipGaji.js. Peta lama di sini tidak memuat
// "dibatalkan", dan pemanggilnya jatuh ke `|| statusConfig.draft` — slip yang
// sudah dibatalkan tampil persis seperti slip yang menunggu diproses.

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function SalarySlipPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [mode, setMode] = useState("weekly"); // default mingguan
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [selectedSlip, setSelectedSlip] = useState(null);

  const { data: slips = [], isLoading } = useQuery({
    queryKey: ["salary-slips"],
    queryFn: () => base44.entities.SalarySlip.list("-period", 200),
  });

  const { data: users = [] } = useEmployeeUsers();

  const settings = useCompanySettings();
  const employees = users.filter(u => ["keeper", "kepala_feeder"].includes(u.role));
  const isManagerRole = ["owner", "admin", "manajer"].includes(role);
  const isKeeperView = !isManagerRole;

  // Nama karyawan selalu di-resolve dari entity User berdasarkan email
  // (bukan dari field nama yang tersalin di slip) supaya perubahan nama di
  // Manajemen User langsung berlaku di semua tempat.
  const nameByEmail = useMemo(() => {
    const m = {};
    users.forEach((u) => { if (u.email) m[u.email] = u.full_name || u.email; });
    return m;
  }, [users]);
  const resolveName = (email, fallback) => nameByEmail[email] || fallback || email || "—";

  const periodLabelOf = (s) => {
    if (s.period_type === "weekly" && s.week_start) {
      return formatWeekLabel(s.week_start);
    }
    // Slip bulanan / lama: turunkan dari period "YYYY-MM"
    if (isMonthPeriod(s.period)) {
      return safeFormatDate(s.period + "-01", "MMMM yyyy", s.period);
    }
    return s.period || "—";
  };

  // Monthly mode: hanya slip bulanan (period_type !== "weekly")
  const filtered = useMemo(() => {
    return slips.filter(s => {
      if (["owner", "manajer", "admin"].includes(s.employee_role)) return false;
      if (!isManagerRole && s.employee_email !== user?.email) return false;
      if (mode === "monthly" && s.period_type === "weekly") return false;
      const empMatch = filterEmployee === "all" || s.employee_email === filterEmployee;
      const periodMatch = !filterPeriod || s.period === filterPeriod;
      return empMatch && periodMatch;
    });
  }, [slips, filterEmployee, filterPeriod, isManagerRole, user, mode]);

  const byPeriod = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const key = s.period || "-";
      if (!map[key]) map[key] = 0;
      map[key] += s.net_total || 0;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
  }, [filtered]);

  // `status !== "paid"` bukan "belum dibayar", melainkan "apa pun selain
  // dibayar" — dan yang ikut tertangkap adalah slip yang sudah DIBATALKAN.
  // Di data yang ada, kelima slip berstatus dibatalkan dan ditandai
  // dikecualikan dari laporan; jumlahnya Rp 4.925.850 terbaca sebagai gaji
  // yang masih harus dibayarkan padahal tidak sepeser pun terutang.
  const { dibayar: totalPaid, terutang: totalPending, batal: totalBatal, jumlahBatal } =
    ringkasUangSlip(filtered);

  if (!canAccess(role, "payroll") && !canAccess(role, "salary-slip")) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <AlurGaji aktif="slip" />
      {/* Anak kalimat lamanya 121 huruf karena menggabungkan tiga hal: siapa
          yang digaji, siklusnya, dan cara memakai layarnya. Yang ketiga tidak
          perlu ditulis — tombol "Lihat" sudah ada di tiap baris. */}
      <PageHeader
        title="Slip Gaji Rutin"
        subtitle={
          mode === "weekly"
            ? "Keeper & Kepala Feeder · siklus Minggu–Sabtu"
            : "Rekap bulanan, termasuk bonus poin KPI"
        }
        icon={Receipt}
        art={<WalletArt size="md" />}
        chips={[
          { key: "belum", label: "Belum dibayar", value: fmt(totalPending), tone: totalPending > 0 ? "warn" : "good" },
          { key: "lunas", label: "Sudah dibayar", value: fmt(totalPaid) },
          // Slip batal disebut, bukan dihilangkan: lima slip yang lenyap dari
          // hitungan tanpa keterangan lebih membingungkan daripada lima slip
          // yang tertulis batal.
          ...(jumlahBatal > 0
            ? [{ key: "batal", label: `${jumlahBatal} slip dibatalkan`, value: fmt(totalBatal) }]
            : []),
        ]}
      />

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button variant={mode === "weekly" ? "default" : "outline"} size="sm" onClick={() => setMode("weekly")}>
          📆 Mingguan
        </Button>
        <Button variant={mode === "monthly" ? "default" : "outline"} size="sm" onClick={() => setMode("monthly")}>
          📅 Bulanan (Rekap)
        </Button>
      </div>

      {mode === "weekly" ? (
        <WeeklySlipManager settings={settings} isManagerRole={isManagerRole} user={user} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sudah Dibayar</p>
                <p className="font-bold text-green-700">{fmt(totalPaid)}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Belum Dibayar</p>
                <p className="font-bold text-amber-700">{fmt(totalPending)}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Slip Bulanan</p>
                <p className="font-bold">{filtered.length} slip</p>
              </div>
            </Card>
          </div>

          {/* Monthly breakdown */}
          {byPeriod.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Total Gaji per Bulan
              </h3>
              <div className="space-y-2">
                {byPeriod.map(([per, total]) => (
                  <div key={per} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isMonthPeriod(per) ? safeFormatDate(per + "-01", "MMMM yyyy", per) : per}
                    </span>
                    <span className="font-semibold">{fmt(total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {isManagerRole && (
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Karyawan</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.email}>{e.full_name || e.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              type="month"
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="w-40"
              placeholder="Filter periode"
            />
            {filterPeriod && (
              <Button variant="ghost" size="sm" onClick={() => setFilterPeriod("")}>Reset</Button>
            )}
          </div>

          {/* Slip list */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">Belum ada slip gaji bulanan</p>
              <p className="text-sm mt-1">Slip gaji bulanan dibuat dari halaman Rekap Poin & Gaji</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(slip => {
                const conf = rupaStatusSlip(slip.status);
                return (
                  <Card key={slip.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{resolveName(slip.employee_email, slip.employee_name)}</span>
                          <Badge className={`text-[11px] ${conf.kelas}`}>{conf.label}</Badge>
                          <Badge variant="outline" className="text-[11px]">{formatRole(slip.employee_role)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Periode: {periodLabelOf(slip)}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Gaji Pokok:</span>
                            <p className="font-medium">{fmt(slip.base_salary)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Bonus KPI:</span>
                            <p className={`font-medium ${(slip.kpi_bonus || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {(slip.kpi_bonus || 0) >= 0 ? "+" : ""}{fmt(slip.kpi_bonus)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Potongan:</span>
                            <p className="font-medium text-red-600">-{fmt((slip.absent_deduction || 0) + (slip.kasbon_deduction || 0))}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Take Home:</span>
                            <p className="font-bold text-primary">{fmt(slip.net_total)}</p>
                          </div>
                        </div>
                        {!isKeeperView && (slip.total_poin !== undefined || slip.total_points !== undefined) && (
                        <div className="mt-2 p-2 rounded-lg bg-muted/40 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Star className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-xs font-medium">{slip.total_poin || slip.total_points || 0} poin</span>
                            </div>
                            {(slip.total_poin || 0) >= (settings.min_poin_bulanan || 300) ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="text-xs">Target tercapai</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-500">
                                <XCircle className="w-3.5 h-3.5" />
                                <span className="text-xs">{slip.poin_status || `Kurang ${(settings.min_poin_bulanan || 300) - (slip.total_poin || 0)} poin`}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {slip.paid_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Dibayar: {safeFormatDate(slip.paid_date, "d MMMM yyyy", "—")}
                            {slip.paid_by && ` oleh ${slip.paid_by}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSlip(slip)}
                          className="gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat Slip
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Slip Detail Modal (monthly mode) */}
      {selectedSlip && (
        <SalarySlipDetail
          slip={{ ...selectedSlip, employee_name: resolveName(selectedSlip.employee_email, selectedSlip.employee_name) }}
          companySettings={settings}
          onClose={() => {
            setSelectedSlip(null);
            qc.invalidateQueries({ queryKey: ["salary-slips"] });
          }}
        />
      )}
    </div>
  );
}