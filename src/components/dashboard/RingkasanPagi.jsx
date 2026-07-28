/**
 * RingkasanPagi — layar ringkas "apa yang butuh perhatianku hari ini" untuk owner/manajer/admin.
 * Dipasang paling atas dashboard owner & admin. Keeper/kepala_feeder tidak melihat ini.
 * HANYA MEMBACA data — tidak mengubah logika modul lain.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { isBatchSegera, getNextMilestone } from "@/lib/breedingCalendarUtils";
import HarusDibeliWidget from "@/components/dashboard/HarusDibeliWidget";
import ToolLoanWidget from "@/components/dashboard/ToolLoanWidget";
import ToolRequestWidget from "@/components/dashboard/ToolRequestWidget";

const fmtRp = (n) => `Rp ${Math.round(Number(n || 0)).toLocaleString("id-ID")}`;

export default function RingkasanPagi() {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const yesterday = format(subDays(now, 1), "yyyy-MM-dd");
  const weekAgo = format(subDays(now, 6), "yyyy-MM-dd");

  // ── Queries — shared keys leverage sibling cache (OwnerDashboard, PettyCashWidget, IncidentalTaskCard) ──
  const { data: tortoises = [], isLoading: tLoading } = useQuery({
    queryKey: ["owner-tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });
  const { data: warehouse = [], isLoading: wLoading } = useQuery({
    queryKey: ["owner-warehouse"],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 50),
    staleTime: 5 * 60 * 1000,
  });
  const { data: incidental = [], isLoading: iLoading } = useQuery({
    queryKey: ["incidental-tasks-all"],
    queryFn: () => base44.entities.IncidentalTask.list("-due_date", 300),
    staleTime: 60 * 1000,
  });
  const { data: pendingApproval = [] } = useQuery({
    queryKey: ["owner-pending-approval"],
    queryFn: () => base44.entities.DailyChecklist.filter({ status: "submitted" }, "-date", 500),
    staleTime: 60 * 1000,
  });
  const { data: attendances = [] } = useQuery({
    queryKey: ["ringkasan-attendance", today],
    queryFn: () => base44.entities.Attendance.filter({ date: today }),
    staleTime: 2 * 60 * 1000,
  });
  const { data: pakan = [] } = useQuery({
    queryKey: ["ringkasan-pakan", today],
    queryFn: () => base44.entities.PakanHarian.filter({ log_date: today }),
    staleTime: 2 * 60 * 1000,
  });
  const { data: ledger = [] } = useQuery({
    queryKey: ["petty-cash-ledger"],
    queryFn: () => base44.entities.PettyCashLedger.list("-entry_date", 200),
    staleTime: 2 * 60 * 1000,
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["owner-sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 50),
    staleTime: 5 * 60 * 1000,
  });
  const { data: finances = [] } = useQuery({
    queryKey: ["owner-finances"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 100),
    staleTime: 5 * 60 * 1000,
  });
  const { data: breedings = [] } = useQuery({
    queryKey: ["owner-breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 50),
    staleTime: 5 * 60 * 1000,
  });
  const { data: kuraDiamResp } = useQuery({
    queryKey: ["kura-diam-report"],
    queryFn: () => base44.functions.invoke("getKuraDiamReport", {}),
    staleTime: 5 * 60 * 1000,
  });
  const kuraDiamMerah = kuraDiamResp?.data?.counts?.merah || 0;
  const { data: users = [] } = useQuery({
    queryKey: ["ringkasan-staff-users"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: pendingToolReqs = [] } = useQuery({
    queryKey: ["tool-requests-pending"],
    queryFn: () => base44.entities.ToolRequest.filter({ status: "menunggu" }, "-request_date", 200),
    staleTime: 60 * 1000,
  });
  const { data: todayChecklists = [] } = useQuery({
    queryKey: ["ringkasan-today-checklists", today],
    queryFn: () => base44.entities.DailyChecklist.filter({ date: today }),
    staleTime: 2 * 60 * 1000,
  });

  const aiFindings = (todayChecklists || []).flatMap(cl =>
    (cl.completed_tasks || [])
      .filter(t => t.ai_findings && (t.ai_verified === false || (t.ai_confidence != null && t.ai_confidence < 70) || t.photo_age_warning || t.photo_time_warning))
      .map(t => ({ employee: cl.employee_name, task: t.task_title, finding: t.ai_findings }))
  );

  // ── Calcs ──
  const sickTortoises = tortoises.filter(t => (t.status === "sakit" || t.is_currently_sick) && !t.is_archived);
  const activeTortoises = tortoises.filter(t => t.status === "aktif" && !t.is_archived);
  const waitingMaterials = incidental.filter(t => t.status === "pending" && t.material_status === "waiting_materials").length;
  const lowStock = warehouse.filter(i => i.is_mandatory && (i.current_stock || 0) < (i.minimum_stock || 0));
  const saldoKas = ledger.length > 0 ? Math.round(ledger[0].balance_after || 0) : 0;

  const activeSales = sales.filter(s => !s.excluded_from_reports);
  const salesYesterday = activeSales.filter(s => s.sale_date === yesterday).reduce((s, x) => s + (x.price || 0), 0);
  const sales7 = activeSales.filter(s => s.sale_date >= weekAgo && s.sale_date <= today).reduce((s, x) => s + (x.price || 0), 0);

  const activeFin = finances.filter(f => !f.excluded_from_reports);
  const exp7 = activeFin.filter(f => f.type === "pengeluaran" && f.date >= weekAgo && f.date <= today).reduce((s, f) => s + (f.amount || 0), 0);

  const activeBreedings = breedings.filter(b => ["bertelur", "inkubasi"].includes(b.status));
  const pakanBaskets = pakan.reduce((s, p) => s + (p.basket_count || 0), 0);

  const staff = users.filter(u => ["keeper", "kepala_feeder", "admin"].includes(u.role));
  const checkedIn = attendances.filter(a => a.check_in && a.status === "hadir");
  const checkedInEmails = new Set(checkedIn.map(a => a.employee_email).filter(Boolean));
  const belumMasuk = staff.filter(u => !checkedInEmails.has(u.email));

  const attentionLoading = tLoading || wLoading || iLoading;
  const attention = [
    { count: sickTortoises.length, icon: "🤒", label: "Kura sakit", href: "/health" },
    { count: pendingToolReqs.length, icon: "🔴", label: "Barang rusak", href: "/alat-kerja" },
    { count: waitingMaterials, icon: "⏳", label: "Menunggu barang", href: "/daftar-belanja" },
    { count: lowStock.length, icon: "⚠️", label: "Stok di bawah min", href: "/dashboard-stok" },
    { count: kuraDiamMerah, icon: "🔍", label: "Kura diam >90 hari", href: "/kura-diam" },
  ].filter(a => a.count > 0);

  const segeraBatches = breedings.filter(b => isBatchSegera(b, now));

  const todayLabel = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });

  return (
    <div className="space-y-3">
      {/* HEADER */}
      <div>
        <h2 className="text-lg font-bold font-heading flex items-center gap-1.5">
          ☀️ Ringkasan Pagi
        </h2>
        <p className="text-xs text-muted-foreground">{todayLabel}</p>
      </div>

      {/* 1. BARIS PERHATIAN */}
      {attentionLoading ? (
        <div className="bg-muted rounded-xl p-3 h-12 animate-pulse" />
      ) : attention.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <span className="text-base">✅</span>
          <span className="text-sm font-semibold text-green-700">Tidak ada yang mendesak hari ini</span>
        </div>
      ) : (
        <div className={`grid gap-2 ${attention.length === 1 ? "grid-cols-1" : attention.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {attention.map((a, i) => (
            <Link key={i} to={a.href} className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-center hover:bg-red-100 transition-colors">
              <p className="text-xl font-bold text-red-600 leading-none">{a.count}</p>
              <p className="text-[10px] text-red-700 leading-tight mt-1">{a.icon} {a.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* 1.4 TEMUAN AI DARI FOTO */}
      {aiFindings.length > 0 && (
        <Link to="/approval-poin" className="block bg-purple-50 border border-purple-200 rounded-xl p-3 hover:bg-purple-100 transition-colors">
          <p className="text-sm font-bold text-purple-800">
            🔎 Temuan dari foto: {aiFindings.length} hal perlu diperiksa
          </p>
          <div className="mt-1 space-y-0.5">
            {aiFindings.slice(0, 3).map((f, i) => (
              <p key={i} className="text-xs text-purple-700">
                {f.employee} — {f.task}: {f.finding}
              </p>
            ))}
            {aiFindings.length > 3 && <p className="text-[10px] text-purple-600 italic">+{aiFindings.length - 3} temuan lainnya</p>}
          </div>
        </Link>
      )}

      {/* 1.5 HARUS DIBELI + ALAT */}
      <HarusDibeliWidget />
      <ToolLoanWidget />
      <ToolRequestWidget />

      {/* 1.6 BATCH BREEDING SEGERA */}
      {segeraBatches.length > 0 && (
        <Link to="/breeding-calendar" className="block bg-amber-50 border border-amber-300 rounded-xl p-3 hover:bg-amber-100 transition-colors">
          <p className="text-sm font-bold text-amber-800">
            🥚 Perkiraan menetas/bertelur dalam 2 minggu: {segeraBatches.length} batch
          </p>
          <div className="mt-1.5 space-y-0.5">
            {segeraBatches.slice(0, 3).map(b => {
              const next = getNextMilestone(b, now);
              return (
                <p key={b.id} className="text-xs text-amber-700">
                  ♀ {b.female_name} × ♂ {b.male_name}
                  {next?.start ? ` — ${next.label} ±${format(next.start, "d MMM", { locale: idLocale })}` : ""}
                </p>
              );
            })}
            {segeraBatches.length > 3 && (
              <p className="text-[10px] text-amber-600 italic">+{segeraBatches.length - 3} batch lainnya</p>
            )}
          </div>
        </Link>
      )}

      {/* 2. OPERASIONAL HARI INI */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Operasional Hari Ini</p>
        <div className="grid grid-cols-3 gap-2">
          <Link to="/approval-poin" className="bg-card border border-border rounded-xl p-2.5 text-center hover:shadow-md transition-shadow">
            <p className="text-xl font-bold text-amber-600 leading-none">{pendingApproval.length}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1">✅ Approval</p>
          </Link>
          <Link to="/daily-payroll" className="bg-card border border-border rounded-xl p-2.5 text-center hover:shadow-md transition-shadow">
            <p className="text-xl font-bold text-blue-600 leading-none">
              {checkedIn.length}{staff.length > 0 ? `/${staff.length}` : ""}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1">👥 Hadir</p>
          </Link>
          <Link to="/pakan-harian" className="bg-card border border-border rounded-xl p-2.5 text-center hover:shadow-md transition-shadow">
            <p className="text-xl font-bold text-green-600 leading-none">{pakanBaskets}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1">🥬 Keranjang</p>
          </Link>
        </div>
        {/* Absensi detail: nama + jam yang sudah masuk, dan yang belum */}
        {checkedIn.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {checkedIn.slice(0, 4).map((a, i) => (
              <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                {(a.employee_name || "").split(" ")[0]} {a.check_in}
              </span>
            ))}
            {belumMasuk.length > 0 && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {belumMasuk.length} belum masuk
              </span>
            )}
          </div>
        )}
        {checkedIn.length === 0 && staff.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">Belum ada yang check-in hari ini</p>
        )}
      </div>

      {/* 3. UANG */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Uang</p>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/petty-cash" className="bg-card border border-border rounded-xl p-2.5 hover:shadow-md transition-shadow">
            <p className="text-[10px] text-muted-foreground">💵 Kas Kecil</p>
            <p className={`text-base font-bold leading-tight ${saldoKas < 0 ? "text-red-600" : "text-green-700"}`}>{fmtRp(saldoKas)}</p>
          </Link>
          <Link to="/sales" className="bg-card border border-border rounded-xl p-2.5 hover:shadow-md transition-shadow">
            <p className="text-[10px] text-muted-foreground">💰 Jual Kemarin</p>
            <p className="text-base font-bold leading-tight text-foreground">{fmtRp(salesYesterday)}</p>
          </Link>
          <Link to="/sales" className="bg-card border border-border rounded-xl p-2.5 hover:shadow-md transition-shadow">
            <p className="text-[10px] text-muted-foreground">💰 Jual 7 Hari</p>
            <p className="text-base font-bold leading-tight text-foreground">{fmtRp(sales7)}</p>
          </Link>
          <Link to="/finance" className="bg-card border border-border rounded-xl p-2.5 hover:shadow-md transition-shadow">
            <p className="text-[10px] text-muted-foreground">📉 Pengeluaran 7 Hari</p>
            <p className="text-base font-bold leading-tight text-red-600">{fmtRp(exp7)}</p>
          </Link>
        </div>
      </div>

      {/* 4. POPULASI */}
      <Link to="/tortoise" className="block bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-lg font-bold text-primary leading-none">{activeTortoises.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Aktif</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-red-500 leading-none">{sickTortoises.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Sakit</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-accent leading-none">{activeBreedings.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Breeding</p>
          </div>
        </div>
      </Link>
    </div>
  );
}