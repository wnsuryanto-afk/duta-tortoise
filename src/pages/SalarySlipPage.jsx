import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, TrendingUp, Users, Filter } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { toast } from "sonner";

const statusConfig = {
  draft:    { label: "Draft",     color: "bg-gray-100 text-gray-700" },
  approved: { label: "Disetujui", color: "bg-blue-100 text-blue-700" },
  paid:     { label: "Dibayar",   color: "bg-green-100 text-green-700" },
};

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function SalarySlipPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("");

  const { data: slips = [], isLoading } = useQuery({
    queryKey: ["salary-slips"],
    queryFn: () => base44.entities.SalarySlip.list("-period", 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const employees = users.filter(u => ["keeper", "admin", "manajer", "kepala_feeder"].includes(u.role));

  if (!canAccess(role, "payroll")) return <AccessDenied />;

  const markPaidMutation = useMutation({
    mutationFn: (slip) => base44.entities.SalarySlip.update(slip.id, {
      status: "paid",
      paid_date: format(new Date(), "yyyy-MM-dd"),
      paid_by: user?.full_name || user?.email,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-slips"] });
      toast.success("Slip gaji ditandai dibayar");
    }
  });

  const filtered = useMemo(() => {
    return slips.filter(s => {
      const empMatch = filterEmployee === "all" || s.employee_email === filterEmployee;
      const periodMatch = !filterPeriod || s.period === filterPeriod;
      return empMatch && periodMatch;
    });
  }, [slips, filterEmployee, filterPeriod]);

  // Stats
  const totalPaid = filtered.filter(s => s.status === "paid").reduce((sum, s) => sum + (s.net_total || 0), 0);
  const totalPending = filtered.filter(s => s.status !== "paid").reduce((sum, s) => sum + (s.net_total || 0), 0);

  // Group by period for monthly stats
  const byPeriod = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      if (!map[s.period]) map[s.period] = 0;
      map[s.period] += s.net_total || 0;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Riwayat Slip Gaji</h1>
        <p className="text-muted-foreground mt-1">Histori slip gaji karyawan yang sudah dicetak</p>
      </div>

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
            <p className="text-xs text-muted-foreground">Total Slip</p>
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
            {byPeriod.map(([period, total]) => (
              <div key={period} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(period + "-01"), "MMMM yyyy", { locale: id })}
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
          <p className="font-semibold">Belum ada slip gaji</p>
          <p className="text-sm mt-1">Slip gaji dibuat dari halaman Rekap Gaji saat cetak slip</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(slip => {
            const conf = statusConfig[slip.status] || statusConfig.draft;
            return (
              <Card key={slip.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold">{slip.employee_name}</span>
                      <Badge className={`text-[11px] ${conf.color}`}>{conf.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Periode: {slip.period ? format(new Date(slip.period + "-01"), "MMMM yyyy", { locale: id }) : slip.period}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Gaji Pokok:</span>
                        <p className="font-medium">{fmt(slip.base_salary)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bonus KPI:</span>
                        <p className="font-medium text-green-600">+{fmt(slip.kpi_bonus)}</p>
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
                    {slip.paid_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Dibayar: {format(new Date(slip.paid_date), "d MMMM yyyy", { locale: id })}
                        {slip.paid_by && ` oleh ${slip.paid_by}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {slip.pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={slip.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Ulang
                        </a>
                      </Button>
                    )}
                    {slip.status !== "paid" && ["owner", "manajer", "admin"].includes(role) && (
                      <Button
                        size="sm"
                        onClick={() => markPaidMutation.mutate(slip)}
                        disabled={markPaidMutation.isPending}
                      >
                        Tandai Dibayar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}