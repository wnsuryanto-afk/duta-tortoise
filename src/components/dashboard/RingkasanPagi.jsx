/**
 * RingkasanPagi — layar ringkas "apa yang butuh perhatianku hari ini" untuk owner/manajer/admin.
 * Dipasang paling atas dashboard owner & admin. Keeper/kepala_feeder tidak melihat ini.
 * HANYA MEMBACA data — tidak mengubah logika modul lain.
 */
import { useQuery } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { isBatchSegera, getNextMilestone } from "@/lib/breedingCalendarUtils";
import { categorizeFinding } from "@/lib/temuanCategorize";
import HarusDibeliWidget from "@/components/dashboard/HarusDibeliWidget";
import ToolLoanWidget from "@/components/dashboard/ToolLoanWidget";
import ToolRequestWidget from "@/components/dashboard/ToolRequestWidget";
import KeputusanHariIni from "@/components/dashboard/KeputusanHariIni";
import ArahMingguIni from "@/components/dashboard/ArahMingguIni";
import { masukLaporan } from "@/lib/laporan";

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
  const { data: users = [] } = useActiveUsers();
  const { data: pendingToolReqs = [] } = useQuery({
    queryKey: ["tool-requests-pending"],
    queryFn: () => base44.entities.ToolRequest.filter({ status: "menunggu" }, "-request_date", 200),
    staleTime: 60 * 1000,
  });
  const { data: todayChecklists = [] } = useQuery({
    queryKey: ["owner-checklists"],
    queryFn: () => base44.entities.DailyChecklist.filter({ date: today }),
    staleTime: 2 * 60 * 1000,
  });

  const aiFindings = (todayChecklists || []).flatMap(cl =>
    (cl.completed_tasks || [])
      .filter(t => t.ai_temuan_penting && t.ai_temuan_penting.trim())
      .map(t => ({
        employee: cl.employee_name,
        task: t.task_title,
        finding: t.ai_temuan_penting,
        category: categorizeFinding(t.ai_temuan_penting),
      }))
  );
  const temuanKesehatanCount = aiFindings.filter(f => f.category === "kesehatan_kura").length;

  // ── Calcs ──
  const sickTortoises = tortoises.filter(t => (t.status === "sakit" || t.is_currently_sick) && !t.is_archived);
  const activeTortoises = tortoises.filter(t => t.status === "aktif" && !t.is_archived);
  const waitingMaterials = incidental.filter(t => t.status === "pending" && t.material_status === "waiting_materials").length;
  const saldoKas = ledger.length > 0 ? Math.round(ledger[0].balance_after || 0) : 0;

  const activeSales = sales.filter(masukLaporan);
  const salesYesterday = activeSales.filter(s => s.sale_date === yesterday).reduce((s, x) => s + (x.price || 0), 0);
  const sales7 = activeSales.filter(s => s.sale_date >= weekAgo && s.sale_date <= today).reduce((s, x) => s + (x.price || 0), 0);

  const activeFin = finances.filter(masukLaporan);
  const exp7 = activeFin.filter(f => f.type === "pengeluaran" && f.date >= weekAgo && f.date <= today).reduce((s, f) => s + (f.amount || 0), 0);

  const activeBreedings = breedings.filter(b => ["bertelur", "inkubasi"].includes(b.status));
  const pakanBaskets = pakan.reduce((s, p) => s + (p.basket_count || 0), 0);

  // Penyebut "Hadir X/Y" hanya karyawan harian (keeper & kepala_feeder).
  // Admin/manajer/owner tidak dihitung sebagai "belum masuk".
  const staff = users.filter(u => ["keeper", "kepala_feeder"].includes(u.role));
  const staffEmails = new Set(staff.map(u => u.email));
  // Dedup absensi per orang — ambil jam masuk paling awal, hindari hitung ganda.
  const checkedInRaw = attendances.filter(a => a.check_in && a.status === "hadir" && staffEmails.has(a.employee_email));
  const checkedInMap = new Map();
  for (const a of checkedInRaw) {
    const key = a.employee_email;
    if (!checkedInMap.has(key) || (a.check_in || "").localeCompare(checkedInMap.get(key).check_in || "") < 0) {
      checkedInMap.set(key, a);
    }
  }
  const checkedIn = Array.from(checkedInMap.values());
  const checkedInEmails = new Set(checkedIn.map(a => a.employee_email).filter(Boolean));
  const belumMasuk = staff.filter(u => !checkedInEmails.has(u.email));

  const attentionLoading = tLoading || iLoading;
  // Bobot dibedakan: kura sakit menyangkut hewan hidup, barang menunggu kiriman
  // bisa ditangani minggu depan. Sebelumnya kelimanya dirender merah identik,
  // sehingga merah berhenti berarti darurat dan mata belajar mengabaikannya.
  const attention = [
    { count: sickTortoises.length, icon: "🤒", label: "Kura sakit", href: "/health", bobot: "gawat" },
    { count: kuraDiamMerah, icon: "🔍", label: "Kura diam >90 hari", href: "/kura-diam", bobot: "waspada" },
    { count: pendingToolReqs.length, icon: "🔴", label: "Barang rusak", href: "/alat-kerja", bobot: "waspada" },
    { count: waitingMaterials, icon: "⏳", label: "Menunggu barang", href: "/daftar-belanja", bobot: "kabar" },
  ].filter(a => a.count > 0);

  const GAYA_BOBOT = {
    gawat:   "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900",
    waspada: "bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-900",
    kabar:   "bg-muted/50 border-border hover:bg-muted",
  };
  const GAYA_ANGKA = {
    gawat:   "text-red-600 dark:text-red-400",
    waspada: "text-amber-600 dark:text-amber-400",
    kabar:   "text-foreground",
  };
  const GAYA_LABEL = {
    gawat:   "text-red-700 dark:text-red-300/80",
    waspada: "text-amber-700 dark:text-amber-300/80",
    kabar:   "text-muted-foreground",
  };

  const segeraBatches = breedings.filter(b => isBatchSegera(b, now));

  const todayLabel = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });

  return (
    <div className="space-y-3">
      {/* 0. LAPIS KEPUTUSAN — hal yang bisa dituntaskan dari layar ini juga */}
      <KeputusanHariIni />

      {/* 0.5 LAPIS ARAH — peringatan dini, tidak menuntut tindakan hari ini */}
      <ArahMingguIni />

      {/* HEADER */}
      <div className="pt-1">
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
            <Link
              key={i}
              to={a.href}
              className={`border rounded-xl p-2.5 text-center transition-colors ${GAYA_BOBOT[a.bobot]}`}
            >
              <p className={`text-xl font-bold leading-none tabular ${GAYA_ANGKA[a.bobot]}`}>{a.count}</p>
              <p className={`text-[10px] leading-tight mt-1 ${GAYA_LABEL[a.bobot]}`}>{a.icon} {a.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* 1.4 TEMUAN AI DARI FOTO */}
      {aiFindings.length > 0 && (
        <Link to="/temuan-foto" className="block bg-purple-50 border border-purple-200 rounded-xl p-3 hover:bg-purple-100 transition-colors">
          <p className="text-sm font-bold text-purple-800">
            🔎 Temuan baru dari foto: {aiFindings.length}
            {temuanKesehatanCount > 0 && ` (${temuanKesehatanCount} soal kesehatan kura)`}
          </p>
          <div className="mt-1 space-y-0.5">
            {aiFindings.slice(0, 2).map((f, i) => (
              <p key={i} className="text-xs text-purple-700">
                {f.employee} — {f.task}: {f.finding}
              </p>
            ))}
            {aiFindings.length > 2 && <p className="text-[10px] text-purple-600 italic">+{aiFindings.length - 2} temuan lainnya</p>}
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